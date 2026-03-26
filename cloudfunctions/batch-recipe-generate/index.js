/**
 * 批量菜谱生成云函数 - batch-recipe-generate
 * 
 * 关键：直接集成 recipe-generate 的所有逻辑（包括 cloud.ai 初始化）
 * 这样确保 cloud.ai 在完全相同的上下文中被调用
 * 
 * 版本：3.0.0
 */

'use strict';

const cloud = require('wx-server-sdk');

// ✅ 在模块加载时立即初始化（与 recipe-generate 完全相同）
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// ==================== 常量配置 ====================

const AI_PROVIDER = 'hunyuan-exp';
const HUNYUAN_MODEL = 'hunyuan-turbos-latest';
const CALL_TIMEOUT = 30000;
const CONCURRENT_LIMIT = 1; // 降低为 1 以降低并发风险
const RECIPE_TIMEOUT = 28;

// ==================== 错误码定义 ====================

const ERROR_CODES = {
  SUCCESS: 0,
  PARAM_ERROR: 1,
  AI_CALL_FAILED: 2,
  PARSE_FAILED: 3,
  TIMEOUT: 4,
};

// ==================== Prompt 构建（完全相同）====================

const buildSystemPrompt = () => {
  return `你是一位专业的中餐厨师助手，名叫"小厨AI"。你的任务是根据用户提供的食材，快速生成一道美味可口的家常菜食谱。

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
5. 步骤简洁清晰，适合家庭烹饪
6. 仅输出一个可被 JSON.parse 直接解析的 JSON 对象，不要输出任何解释、前缀、后缀或 Markdown 代码块`;
};

const buildUserPrompt = (ingredients, cookTime, difficulty, extraRequirements) => {
  const ingredientsStr = Array.isArray(ingredients)
    ? ingredients.join('、')
    : String(ingredients);

  const difficultyMap = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
    简单: '简单',
    中等: '中等',
    困难: '困难',
  };
  const difficultyText = difficultyMap[difficulty] || '简单';

  return `我有以下食材：${ingredientsStr}

请帮我生成一道菜的食谱。
- 烹饪时间要求：${cookTime}分钟以内
- 难度要求：${difficultyText}
- 其他要求：${extraRequirements || '无'}

请仅输出一个可被 JSON.parse 直接解析的 JSON 对象，不要输出任何解释、前缀、后缀或 Markdown 代码块。`;
};

// ==================== JSON 解析（完全相同）====================

const parseRecipeJSON = (rawText) => {
  try {
    return validateRecipeStructure(JSON.parse(rawText.trim()));
  } catch (e) {
    console.warn('[batch-recipe-generate] 直接JSON解析失败');
  }

  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return validateRecipeStructure(JSON.parse(jsonMatch[1].trim()));
    } catch (e) {
      console.warn('[batch-recipe-generate] Markdown代码块提取失败');
    }
  }

  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return validateRecipeStructure(JSON.parse(rawText.substring(firstBrace, lastBrace + 1)));
    } catch (e) {
      console.error('[batch-recipe-generate] 三层解析均失败');
    }
  }

  throw Object.assign(new Error('无法从AI返回内容中解析出有效的食谱JSON'), {
    code: ERROR_CODES.PARSE_FAILED,
  });
};

const validateRecipeStructure = (recipe) => {
  if (!recipe || typeof recipe !== 'object') {
    throw new Error('食谱数据格式错误');
  }
  return {
    name: recipe.name || '未命名食谱',
    description: recipe.description || '',
    cookTime: Number(recipe.cookTime) || 30,
    difficulty: recipe.difficulty || '简单',
    servings: Number(recipe.servings) || 2,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    nutrition: {
      calories: Number((recipe.nutrition || {}).calories) || 0,
      protein: Number((recipe.nutrition || {}).protein) || 0,
      carbs: Number((recipe.nutrition || {}).carbs) || 0,
      fat: Number((recipe.nutrition || {}).fat) || 0,
    },
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
  };
};

// ==================== 核心：调用云开发原生 AI（完全相同）====================

const callCloudAI = async (ingredients, cookTime, difficulty, extraRequirements) => {
  // ✅ 在每次调用时创建新的 model 实例
  const model = cloud.ai.createModel(AI_PROVIDER);

  console.log('[callCloudAI] 调用AI，食材：', ingredients.join('、'));
  const startTime = Date.now();

  const requestPromise = (async () => {
    const res = await model.streamText({
      model: HUNYUAN_MODEL,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(),
        },
        {
          role: 'user',
          content: buildUserPrompt(ingredients, cookTime, difficulty, extraRequirements),
        },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    let rawText = '';

    for await (const chunk of res.textStream) {
      rawText += chunk;
    }

    const elapsed = Date.now() - startTime;
    console.log(`[callCloudAI] AI调用完成，耗时：${elapsed}ms`);

    if (!rawText || rawText.trim().length === 0) {
      throw Object.assign(new Error('AI返回内容为空'), {
        code: ERROR_CODES.AI_CALL_FAILED,
      });
    }

    const recipe = parseRecipeJSON(rawText);

    let tokensUsed = 0;
    try {
      const usage = await res.usage;
      if (usage && typeof usage.total_tokens === 'number') {
        tokensUsed = usage.total_tokens;
      } else {
        tokensUsed = Math.ceil(rawText.length / 1.5) + 60;
      }
    } catch (e) {
      tokensUsed = Math.ceil(rawText.length / 1.5) + 60;
    }

    return { recipe, rawText, tokensUsed };
  })();

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(Object.assign(new Error('AI调用超时'), {
        code: ERROR_CODES.TIMEOUT,
      }));
    }, CALL_TIMEOUT);
  });

  return Promise.race([requestPromise, timeoutPromise]);
};

// ==================== 生成并保存单个菜谱 ====================

const generateAndSaveDish = async (dish, cuisineInfo) => {
  try {
    console.log(`[generateAndSaveDish] 开始生成：${dish.name}（${cuisineInfo.name}）`);

    let difficulty = dish.difficulty;
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      difficulty = 'easy';
    }

    // 调用 AI 生成菜谱
    const { recipe, tokensUsed } = await callCloudAI(
      dish.ingredients,
      Number(dish.cookTime),
      difficulty,
      ''
    );

    // 构建数据库记录
    const dbRecord = {
      ...recipe,
      cuisineId: cuisineInfo.id,
      cuisineName: cuisineInfo.name,
      cuisineFullName: cuisineInfo.fullName,
      cuisineEmoji: cuisineInfo.emoji,
      cuisineColor: cuisineInfo.color,
      category: cuisineInfo.name,
      sourceType: 'batch_generated',
      sourceDishName: dish.name,
      sourceDescription: dish.desc,
      sourceIngredients: dish.ingredients,
      version: '2.1.0',
      status: 'active',
      isPublic: true,
      author: 'system_batch',
      aiModel: HUNYUAN_MODEL,
      tokensUsed: tokensUsed,
      rating: 0,
      ratingCount: 0,
      liked: false,
      likeCount: 0,
      userComments: [],
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    };

    // 保存到数据库
    const addResult = await db.collection('recipes').add({
      data: dbRecord,
    });

    console.log(`[generateAndSaveDish] ✓ 成功：${dish.name}，ID：${addResult._id}`);

    return {
      success: true,
      dishName: dish.name,
      cuisineName: cuisineInfo.name,
      docId: addResult._id,
    };

  } catch (err) {
    console.error(`[generateAndSaveDish] ✗ 失败：${dish.name}，错误：${err.message}`);
    return {
      success: false,
      dishName: dish.name,
      cuisineName: cuisineInfo.name,
      error: err.message,
    };
  }
};

// ==================== 批量生成主函数 ====================

const batchGenerateRecipes = async (cuisinesData) => {
  console.log('[batchGenerateRecipes] 开始批量生成，菜系数量：', cuisinesData.length);

  const startTime = Date.now();

  const results = {
    success: [],
    failed: [],
    statistics: {
      totalDishes: 0,
      successCount: 0,
      failedCount: 0,
      totalCuisines: cuisinesData.length,
      startTime: new Date().toISOString(),
    },
  };

  try {
    // 顺序处理（不使用并发，避免问题）
    for (let cuisineIndex = 0; cuisineIndex < cuisinesData.length; cuisineIndex++) {
      const cuisineInfo = cuisinesData[cuisineIndex];

      console.log(`\n处理菜系 ${cuisineIndex + 1}/${cuisinesData.length}：${cuisineInfo.name}`);

      const representativeDishes = cuisineInfo.representativeDishes || [];

      // 顺序处理每道菜
      for (let dishIndex = 0; dishIndex < representativeDishes.length; dishIndex++) {
        const dish = representativeDishes[dishIndex];
        
        const result = await generateAndSaveDish(dish, cuisineInfo);
        
        results.statistics.totalDishes++;
        if (result.success) {
          results.success.push(result);
          results.statistics.successCount++;
        } else {
          results.failed.push(result);
          results.statistics.failedCount++;
        }

        // 每道菜之间延迟 2 秒，避免过载
        if (dishIndex < representativeDishes.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      // 菜系之间延迟 3 秒
      if (cuisineIndex < cuisinesData.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    const duration = Date.now() - startTime;
    results.statistics.endTime = new Date().toISOString();
    results.statistics.duration = `${(duration / 1000).toFixed(2)}秒`;

    console.log('\n✓ 批量生成完成！');
    console.log(`总菜数：${results.statistics.totalDishes}`);
    console.log(`成功：${results.statistics.successCount}`);
    console.log(`失败：${results.statistics.failedCount}`);
    console.log(`耗时：${results.statistics.duration}`);

    return {
      code: 0,
      message: '批量菜谱生成完成',
      data: results,
    };

  } catch (err) {
    console.error('[batchGenerateRecipes] 批量生成失败：', err);
    results.statistics.endTime = new Date().toISOString();
    results.statistics.duration = `${((Date.now() - startTime) / 1000).toFixed(2)}秒`;

    return {
      code: 1,
      message: '批量生成过程中出错：' + err.message,
      data: results,
    };
  }
};

// ==================== 云函数主入口 ====================

exports.main = async (event, context) => {
  console.log('[batch-recipe-generate] 收到请求');

  const cuisinesData = event.cuisinesData;

  if (!cuisinesData || !Array.isArray(cuisinesData) || cuisinesData.length === 0) {
    return {
      code: ERROR_CODES.PARAM_ERROR,
      message: '请在 event.cuisinesData 中提供菜系数据数组',
      data: null,
    };
  }

  return batchGenerateRecipes(cuisinesData);
};
