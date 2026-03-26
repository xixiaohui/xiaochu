/**
 * 批量菜谱生成云函数 - batch-recipe-generate
 * 功能：批量为指定菜系下的所有代表菜生成完整AI菜谱并存入云数据库 recipes
 *
 * 支持操作（event.action）：
 *   generate     - 批量生成（默认），支持单菜系或全部菜系
 *   status       - 查询各菜系在 recipes 表中已有的菜谱数量
 *   check_dish   - 检查某道菜是否已存在
 *   clear_cuisine - 清空某个菜系的所有菜谱（危险操作，需传 confirm:true）
 *
 * event 参数说明：
 *   action       - 操作类型，默认 'generate'
 *   cuisinesData - 菜系数据数组（generate时必传，或后端从cuisines-data.js读取）
 *   cuisineId    - 仅生成指定菜系（generate时可选）
 *   skipExisting - 是否跳过已存在的菜谱，默认 true
 *   maxDishes    - 每个菜系最多生成菜数，默认不限
 *   confirm      - clear_cuisine 操作时必须为 true
 *
 * 版本：4.0.0
 */

'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// ==================== 常量配置 ====================

const AI_PROVIDER = 'hunyuan-exp';
const HUNYUAN_MODEL = 'hunyuan-turbos-latest';
const CALL_TIMEOUT = 30000;       // 单次AI调用超时
const DISH_DELAY_MS = 2000;       // 每道菜之间间隔（ms）
const CUISINE_DELAY_MS = 3000;    // 菜系之间间隔（ms）

const COLLECTION_RECIPES = 'recipes';

// ==================== 错误码 ====================

const ERR = {
  SUCCESS: 0,
  PARAM_ERROR: 1,
  AI_CALL_FAILED: 2,
  PARSE_FAILED: 3,
  TIMEOUT: 4,
  DB_ERROR: 5,
};

// ==================== System Prompt ====================

const buildSystemPrompt = () => `你是一位专业的中餐厨师助手，名叫"小厨AI"。你的任务是根据用户提供的食材和菜名，生成一道完整的家常菜食谱。

输出要求：
1. 必须严格以 JSON 格式输出，不要包含任何 Markdown 代码块标记
2. JSON 结构如下：
{
  "name": "菜名",
  "description": "一句话描述这道菜的特点",
  "cookTime": 烹饪时间（分钟，数字类型）,
  "difficulty": "难度（简单/中等/困难）",
  "servings": 份量（人数，数字类型）,
  "ingredients": [
    {"name": "食材名", "amount": "用量", "unit": "单位"}
  ],
  "steps": [
    {"step": 步骤编号（数字）, "description": "步骤说明", "tip": "小贴士（可选，没有则为null）"}
  ],
  "nutrition": {
    "calories": 热量（千卡，数字）,
    "protein": 蛋白质（克，数字）,
    "carbs": 碳水（克，数字）,
    "fat": 脂肪（克，数字）
  },
  "tags": ["标签1", "标签2"]
}
3. 根据用户指定的烹饪时间和难度生成合适的食谱
4. 食谱必须使用用户提供的主要食材，可以补充常见调料
5. 步骤简洁清晰，5-8步，适合家庭烹饪
6. 仅输出一个可被 JSON.parse 直接解析的 JSON 对象，不要输出任何解释、前缀、后缀或 Markdown 代码块`;

const buildUserPrompt = (dishName, ingredients, cookTime, difficulty) => {
  const ingredientsStr = Array.isArray(ingredients) ? ingredients.join('、') : String(ingredients);
  const difficultyMap = {
    easy: '简单', medium: '中等', hard: '困难',
    简单: '简单', 中等: '中等', 困难: '困难',
  };
  const difficultyText = difficultyMap[difficulty] || '简单';

  return `菜名：${dishName}
主要食材：${ingredientsStr}
烹饪时间：${cookTime}分钟以内
难度：${difficultyText}

请为这道菜生成完整的食谱。仅输出一个可被 JSON.parse 直接解析的 JSON 对象，不要输出任何解释、前缀、后缀或 Markdown 代码块。`;
};

// ==================== JSON 解析与校验 ====================

const validateRecipe = (r) => {
  if (!r || typeof r !== 'object') throw new Error('食谱格式错误');
  return {
    name: r.name || '未命名食谱',
    description: r.description || '',
    cookTime: Number(r.cookTime) || 30,
    difficulty: r.difficulty || '简单',
    servings: Number(r.servings) || 2,
    ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
    steps: Array.isArray(r.steps) ? r.steps : [],
    nutrition: {
      calories: Number((r.nutrition || {}).calories) || 0,
      protein: Number((r.nutrition || {}).protein) || 0,
      carbs: Number((r.nutrition || {}).carbs) || 0,
      fat: Number((r.nutrition || {}).fat) || 0,
    },
    tags: Array.isArray(r.tags) ? r.tags : [],
  };
};

const parseRecipeJSON = (rawText) => {
  // 方式1：直接解析
  try { return validateRecipe(JSON.parse(rawText.trim())); } catch (e) { /* ignore */ }

  // 方式2：Markdown 代码块
  const mdMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) {
    try { return validateRecipe(JSON.parse(mdMatch[1].trim())); } catch (e) { /* ignore */ }
  }

  // 方式3：提取首个 JSON 对象
  const first = rawText.indexOf('{');
  const last = rawText.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try { return validateRecipe(JSON.parse(rawText.substring(first, last + 1))); } catch (e) { /* ignore */ }
  }

  throw Object.assign(new Error('无法从AI返回内容中解析有效JSON'), { code: ERR.PARSE_FAILED });
};

// ==================== AI 调用 ====================

const callCloudAI = async (dishName, ingredients, cookTime, difficulty) => {
  const model = cloud.ai.createModel(AI_PROVIDER);
  console.log(`[AI] 生成：${dishName}`);
  const t0 = Date.now();

  const main = (async () => {
    const res = await model.streamText({
      model: HUNYUAN_MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(dishName, ingredients, cookTime, difficulty) },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    let raw = '';
    for await (const chunk of res.textStream) raw += chunk;

    console.log(`[AI] 完成：${dishName}，耗时${Date.now() - t0}ms`);
    if (!raw.trim()) throw Object.assign(new Error('AI返回内容为空'), { code: ERR.AI_CALL_FAILED });

    const recipe = parseRecipeJSON(raw);

    let tokensUsed = 0;
    try {
      const usage = await res.usage;
      tokensUsed = (usage && usage.total_tokens) ? usage.total_tokens : Math.ceil(raw.length / 1.5) + 60;
    } catch (_) {
      tokensUsed = Math.ceil(raw.length / 1.5) + 60;
    }
    return { recipe, tokensUsed };
  })();

  const timeout = new Promise((_, rej) =>
    setTimeout(() => rej(Object.assign(new Error('AI调用超时'), { code: ERR.TIMEOUT })), CALL_TIMEOUT)
  );

  return Promise.race([main, timeout]);
};

// ==================== 辅助：检查菜谱是否已存在 ====================

const checkDishExists = async (cuisineId, dishName) => {
  try {
    const res = await db.collection(COLLECTION_RECIPES)
      .where({ cuisineId, sourceDishName: dishName })
      .count();
    return res.total > 0;
  } catch (e) {
    console.warn(`[checkDishExists] 查询失败：${e.message}`);
    return false;
  }
};

// ==================== 辅助：查询各菜系已有菜谱数量 ====================

const getCuisineRecipeCounts = async (cuisineIds) => {
  const counts = {};
  for (const id of cuisineIds) {
    try {
      const res = await db.collection(COLLECTION_RECIPES)
        .where({ cuisineId: id })
        .count();
      counts[id] = res.total;
    } catch (e) {
      counts[id] = -1; // 查询出错
    }
  }
  return counts;
};

// ==================== 生成并保存单道菜谱 ====================

const generateAndSaveDish = async (dish, cuisineInfo, skipExisting = true) => {
  const { name: dishName, ingredients, cookTime, difficulty, desc } = dish;

  try {
    // 跳过已存在的菜谱
    if (skipExisting) {
      const exists = await checkDishExists(cuisineInfo.id, dishName);
      if (exists) {
        console.log(`[skip] ${dishName} 已存在，跳过`);
        return { success: true, skipped: true, dishName, cuisineName: cuisineInfo.name };
      }
    }

    const normDifficulty = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'easy';
    const { recipe, tokensUsed } = await callCloudAI(dishName, ingredients, Number(cookTime), normDifficulty);

    const record = {
      ...recipe,
      // 菜系信息
      cuisineId: cuisineInfo.id,
      cuisineName: cuisineInfo.name,
      cuisineFullName: cuisineInfo.fullName || cuisineInfo.name,
      cuisineEmoji: cuisineInfo.emoji || '',
      cuisineColor: cuisineInfo.color || '#333333',
      cuisineLightColor: cuisineInfo.lightColor || '#f5f5f5',
      cuisineTags: cuisineInfo.tags || [],
      category: cuisineInfo.name,
      // 来源信息
      sourceType: 'batch_generated',
      sourceDishName: dishName,
      sourceDescription: desc || '',
      sourceIngredients: ingredients || [],
      sourceCookTime: Number(cookTime) || 30,
      sourceDifficulty: normDifficulty,
      // 系统字段
      version: '4.0.0',
      status: 'active',
      isPublic: true,
      author: 'system_batch',
      aiProvider: AI_PROVIDER,
      aiModel: HUNYUAN_MODEL,
      tokensUsed,
      // 用户互动字段
      rating: 0,
      ratingCount: 0,
      likeCount: 0,
      viewCount: 0,
      userComments: [],
      // 时间戳
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    };

    const addResult = await db.collection(COLLECTION_RECIPES).add({ data: record });
    console.log(`[save] ✓ ${dishName} -> ${addResult._id}`);

    return {
      success: true,
      skipped: false,
      dishName,
      cuisineName: cuisineInfo.name,
      docId: addResult._id,
    };

  } catch (err) {
    console.error(`[generateAndSaveDish] ✗ ${dishName}：${err.message}`);
    return {
      success: false,
      skipped: false,
      dishName,
      cuisineName: cuisineInfo.name,
      error: err.message,
      errorCode: err.code,
    };
  }
};

// ==================== 批量生成主流程 ====================

const batchGenerate = async (event) => {
  const {
    cuisinesData,
    cuisineId,
    skipExisting = true,
    maxDishes,
  } = event;

  if (!cuisinesData || !Array.isArray(cuisinesData) || cuisinesData.length === 0) {
    return { code: ERR.PARAM_ERROR, message: '请提供 cuisinesData 数组', data: null };
  }

  // 如果指定了 cuisineId，只处理该菜系
  let targets = cuisinesData;
  if (cuisineId) {
    targets = cuisinesData.filter(c => c.id === cuisineId);
    if (targets.length === 0) {
      return { code: ERR.PARAM_ERROR, message: `未找到菜系：${cuisineId}`, data: null };
    }
  }

  const t0 = Date.now();
  const results = {
    success: [],
    failed: [],
    skipped: [],
    statistics: {
      totalCuisines: targets.length,
      totalDishes: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      startTime: new Date().toISOString(),
    },
  };

  for (let ci = 0; ci < targets.length; ci++) {
    const cuisine = targets[ci];
    const dishes = cuisine.representativeDishes || [];
    const dishesToProcess = maxDishes ? dishes.slice(0, maxDishes) : dishes;

    console.log(`\n[菜系 ${ci + 1}/${targets.length}] ${cuisine.name}，共 ${dishesToProcess.length} 道菜`);

    for (let di = 0; di < dishesToProcess.length; di++) {
      const dish = dishesToProcess[di];
      const res = await generateAndSaveDish(dish, cuisine, skipExisting);

      results.statistics.totalDishes++;
      if (res.skipped) {
        results.skipped.push(res);
        results.statistics.skippedCount++;
      } else if (res.success) {
        results.success.push(res);
        results.statistics.successCount++;
      } else {
        results.failed.push(res);
        results.statistics.failedCount++;
      }

      // 不是最后一道菜则等待
      if (di < dishesToProcess.length - 1) {
        await new Promise(r => setTimeout(r, DISH_DELAY_MS));
      }
    }

    // 不是最后一个菜系则等待
    if (ci < targets.length - 1) {
      await new Promise(r => setTimeout(r, CUISINE_DELAY_MS));
    }
  }

  const duration = Date.now() - t0;
  results.statistics.endTime = new Date().toISOString();
  results.statistics.durationSeconds = (duration / 1000).toFixed(1);

  console.log('\n[完成] 批量生成结束');
  console.log(`  成功: ${results.statistics.successCount}`);
  console.log(`  失败: ${results.statistics.failedCount}`);
  console.log(`  跳过: ${results.statistics.skippedCount}`);
  console.log(`  耗时: ${results.statistics.durationSeconds}s`);

  return {
    code: ERR.SUCCESS,
    message: `批量生成完成：成功${results.statistics.successCount}，失败${results.statistics.failedCount}，跳过${results.statistics.skippedCount}`,
    data: results,
  };
};

// ==================== 查询状态 ====================

const queryStatus = async (event) => {
  const { cuisinesData } = event;
  if (!cuisinesData || !Array.isArray(cuisinesData)) {
    return { code: ERR.PARAM_ERROR, message: '请提供 cuisinesData 数组', data: null };
  }

  const cuisineIds = cuisinesData.map(c => c.id);
  const counts = await getCuisineRecipeCounts(cuisineIds);

  // 汇总信息
  const statusList = cuisinesData.map(c => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    totalDishes: (c.representativeDishes || []).length,
    recipesInDB: counts[c.id] || 0,
  }));

  const totalDishes = statusList.reduce((s, c) => s + c.totalDishes, 0);
  const totalInDB = statusList.reduce((s, c) => s + c.recipesInDB, 0);

  return {
    code: ERR.SUCCESS,
    message: 'ok',
    data: {
      statusList,
      summary: {
        totalCuisines: statusList.length,
        totalDishes,
        totalInDB,
        pendingCount: totalDishes - totalInDB,
      },
    },
  };
};

// ==================== 清空菜系菜谱 ====================

const clearCuisineRecipes = async (event) => {
  const { cuisineId, confirm } = event;
  if (!cuisineId) return { code: ERR.PARAM_ERROR, message: '请提供 cuisineId', data: null };
  if (!confirm) return { code: ERR.PARAM_ERROR, message: '危险操作，请传入 confirm: true', data: null };

  try {
    // 云开发数据库每次最多删除 20 条，需循环
    let total = 0;
    let round = 0;
    while (true) {
      round++;
      const res = await db.collection(COLLECTION_RECIPES)
        .where({ cuisineId })
        .limit(20)
        .get();
      if (!res.data || res.data.length === 0) break;

      const deletePromises = res.data.map(r =>
        db.collection(COLLECTION_RECIPES).doc(r._id).remove()
      );
      await Promise.all(deletePromises);
      total += res.data.length;
      console.log(`[clearCuisine] 第${round}批，已删除${total}条`);
      if (res.data.length < 20) break;
    }

    return {
      code: ERR.SUCCESS,
      message: `已清空菜系 ${cuisineId} 的 ${total} 条菜谱`,
      data: { cuisineId, deletedCount: total },
    };
  } catch (err) {
    return { code: ERR.DB_ERROR, message: err.message, data: null };
  }
};

// ==================== 云函数入口 ====================

exports.main = async (event = {}) => {
  const action = event.action || 'generate';
  console.log(`[batch-recipe-generate] action=${action}`);

  try {
    switch (action) {
      case 'generate':
        return await batchGenerate(event);
      case 'status':
        return await queryStatus(event);
      case 'clear_cuisine':
        return await clearCuisineRecipes(event);
      default:
        return { code: ERR.PARAM_ERROR, message: `未知操作：${action}`, data: null };
    }
  } catch (err) {
    console.error('[batch-recipe-generate] 未捕获异常：', err);
    return { code: 500, message: err.message, data: null };
  }
};
