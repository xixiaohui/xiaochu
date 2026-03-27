/**
 * 批量菜谱生成云函数 - batch-recipe-generate
 * 架构版本：5.0.0（单菜生成架构）
 *
 * ✅ 核心设计原则：
 *   "一次云函数只干一件事" —— 每次调用只生成1道菜，立即返回
 *   前端控制循环节奏，云函数永远不会超时
 *
 * 支持的 action：
 *   generate_one  - 生成1道菜的菜谱并写入 recipes（核心接口）
 *   status        - 查询各菜系已有菜谱数量
 *   check_exists  - 检查某道菜是否已存在
 *   clear_cuisine - 清空某菜系的所有菜谱（需 confirm:true）
 *
 * event 参数（generate_one）：
 *   dish          - 菜品对象 { name, desc, cookTime, difficulty, ingredients }
 *   cuisine       - 菜系对象 { id, name, fullName, emoji, color, ... }
 *   skipExisting  - 是否跳过已存在，默认 true
 */

'use strict';

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const COLLECTION = 'recipes';

// ==================== 常量 ====================
// 单菜生成，AI 调用时间 3~10s，云函数默认3s超时需调整为至少15s
// 建议在云函数配置中将超时时间设为 20s

const AI_PROVIDER   = 'hunyuan-exp';
const AI_MODEL      = 'hunyuan-turbos-latest';
const AI_TIMEOUT_MS = 30000;   // 单次 AI 调用超时 30s（与 recipe-generate 保持一致）

// ==================== Prompt ====================

const SYSTEM_PROMPT = `你是一位专业的中餐厨师助手，名叫"小厨AI"。根据用户提供的菜名和食材，生成一道完整的家常菜食谱。

输出要求：
1. 严格输出 JSON 格式，不含任何 Markdown 标记
2. JSON 结构：
{
  "name": "菜名",
  "description": "一句话特点描述",
  "cookTime": 烹饪时间（数字，分钟）,
  "difficulty": "难度（简单/中等/困难）",
  "servings": 份量人数（数字）,
  "ingredients": [{"name":"食材","amount":"用量","unit":"单位"}],
  "steps": [{"step":编号,"description":"步骤说明","tip":"贴士或null"}],
  "nutrition": {"calories":数字,"protein":数字,"carbs":数字,"fat":数字},
  "tags": ["标签1","标签2"]
}
3. 步骤5~8步，适合家庭烹饪
4. 仅输出可被 JSON.parse 直接解析的 JSON 对象`;

const buildUserPrompt = (dishName, ingredients, cookTime, difficulty) => {
  const diffMap = { easy:'简单', medium:'中等', hard:'困难', 简单:'简单', 中等:'中等', 困难:'困难' };
  const ingredStr = Array.isArray(ingredients) ? ingredients.join('、') : String(ingredients);
  return `菜名：${dishName}
主要食材：${ingredStr}
烹饪时间：${cookTime}分钟以内
难度：${diffMap[difficulty] || '简单'}

仅输出可被 JSON.parse 直接解析的 JSON 对象，不要任何解释或 Markdown。`;
};

// ==================== JSON 解析 ====================

const validateRecipe = (r) => {
  if (!r || typeof r !== 'object') throw new Error('食谱格式错误');
  return {
    name:        r.name        || '未命名食谱',
    description: r.description || '',
    cookTime:    Number(r.cookTime)  || 30,
    difficulty:  r.difficulty  || '简单',
    servings:    Number(r.servings)  || 2,
    ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
    steps:       Array.isArray(r.steps)       ? r.steps       : [],
    nutrition: {
      calories: Number((r.nutrition||{}).calories) || 0,
      protein:  Number((r.nutrition||{}).protein)  || 0,
      carbs:    Number((r.nutrition||{}).carbs)    || 0,
      fat:      Number((r.nutrition||{}).fat)      || 0,
    },
    tags: Array.isArray(r.tags) ? r.tags : [],
  };
};

const parseRecipeJSON = (raw) => {
  // 方式1：直接解析
  try { return validateRecipe(JSON.parse(raw.trim())); } catch (_) {}
  // 方式2：Markdown 代码块
  const md = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (md) { try { return validateRecipe(JSON.parse(md[1].trim())); } catch (_) {} }
  // 方式3：提取首个 {} 区间
  const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
  if (s !== -1 && e > s) { try { return validateRecipe(JSON.parse(raw.slice(s, e + 1))); } catch (_) {} }
  throw new Error('无法解析 AI 返回的 JSON');
};

// ==================== AI 调用（与 recipe-generate 完全一致：streamText only）====================
// ⚠️ 重要：cloud.ai 由微信云函数运行时注入，仅在云端可用。
//    不能使用 invoke()（该方法不存在于 wx-server-sdk ~2.4.0）。
//    必须使用 model.streamText() + for await (const chunk of res.textStream)。

const callAI = async (dishName, ingredients, cookTime, difficulty) => {
  // cloud.ai 在云端运行时由 wx-server-sdk 注入，本地无法使用
  const model = cloud.ai.createModel(AI_PROVIDER);
  const t0 = Date.now();

  const aiCall = (async () => {
    const res = await model.streamText({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: buildUserPrompt(dishName, ingredients, cookTime, difficulty) },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    let raw = '';
    for await (const chunk of res.textStream) {
      raw += chunk;
    }

    const elapsed = Date.now() - t0;
    console.log(`[callAI] AI调用完成，菜名：${dishName}，耗时：${elapsed}ms，文本长度：${raw.length}`);

    if (!raw || raw.trim().length === 0) {
      throw new Error('AI 返回内容为空');
    }

    const recipe = parseRecipeJSON(raw);

    // 优先使用 SDK 真实 usage，否则按字符估算
    let tokensUsed = 0;
    try {
      const usage = await res.usage;
      if (usage && typeof usage.total_tokens === 'number') {
        tokensUsed = usage.total_tokens;
      } else {
        tokensUsed = Math.ceil(raw.length / 1.5) + 60;
      }
    } catch (_) {
      tokensUsed = Math.ceil(raw.length / 1.5) + 60;
    }

    return { recipe, tokensUsed };
  })();

  const timeout = new Promise((_, rej) =>
    setTimeout(() => rej(new Error('AI 调用超时')), AI_TIMEOUT_MS)
  );

  return Promise.race([aiCall, timeout]);
};

// ==================== 检查是否已存在 ====================

const checkExists = async (cuisineId, dishName) => {
  try {
    const r = await db.collection(COLLECTION)
      .where({ cuisineId, sourceDishName: dishName })
      .count();
    return r.total > 0;
  } catch (_) { return false; }
};

// ==================== action: generate_one ====================
// 核心接口：只生成 1 道菜，立即返回，永不超时

const actionGenerateOne = async (event) => {
  const { dish, cuisine, skipExisting = true } = event;

  if (!dish || !dish.name || !cuisine || !cuisine.id) {
    return { code: 1, message: '缺少 dish 或 cuisine 参数', data: null };
  }

  // 跳过已存在
  if (skipExisting) {
    const exists = await checkExists(cuisine.id, dish.name);
    if (exists) {
      console.log(`[generate_one] 跳过（已存在）: ${dish.name}`);
      return {
        code: 0,
        message: 'skipped',
        data: { skipped: true, dishName: dish.name, cuisineName: cuisine.name },
      };
    }
  }

  try {
    const normDiff = ['easy','medium','hard'].includes(dish.difficulty) ? dish.difficulty : 'easy';
    const { recipe, tokensUsed } = await callAI(
      dish.name,
      dish.ingredients || [],
      Number(dish.cookTime) || 30,
      normDiff
    );

    const record = {
      ...recipe,
      cuisineId:        cuisine.id,
      cuisineName:      cuisine.name,
      cuisineFullName:  cuisine.fullName  || cuisine.name,
      cuisineEmoji:     cuisine.emoji     || '',
      cuisineColor:     cuisine.color     || '#333',
      cuisineLightColor:cuisine.lightColor|| '#f5f5f5',
      cuisineTags:      cuisine.tags      || [],
      category:         cuisine.name,
      sourceType:       'batch_generated',
      sourceDishName:   dish.name,
      sourceDescription:dish.desc         || '',
      sourceIngredients:dish.ingredients  || [],
      sourceCookTime:   Number(dish.cookTime) || 30,
      sourceDifficulty: normDiff,
      version:          '5.0.0',
      status:           'active',
      isPublic:         true,
      author:           'system_batch',
      aiProvider:       AI_PROVIDER,
      aiModel:          AI_MODEL,
      tokensUsed,
      rating: 0, ratingCount: 0, likeCount: 0, viewCount: 0,
      userComments: [],
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    };

    const result = await db.collection(COLLECTION).add({ data: record });
    console.log(`[generate_one] ✓ ${dish.name} -> ${result._id}`);

    return {
      code: 0,
      message: 'ok',
      data: {
        skipped:    false,
        dishName:   dish.name,
        cuisineName:cuisine.name,
        docId:      result._id,
        tokensUsed,
      },
    };
  } catch (err) {
    console.error(`[generate_one] ✗ ${dish.name}: ${err.message}`);
    return {
      code: 2,
      message: err.message,
      data: {
        skipped:    false,
        failed:     true,
        dishName:   dish.name,
        cuisineName:cuisine.name,
      },
    };
  }
};

// ==================== action: status ====================

const actionStatus = async (event) => {
  const { cuisinesData } = event;
  if (!Array.isArray(cuisinesData) || !cuisinesData.length) {
    return { code: 1, message: '缺少 cuisinesData', data: null };
  }

  const statusList = [];
  for (const c of cuisinesData) {
    let count = 0;
    try {
      const r = await db.collection(COLLECTION).where({ cuisineId: c.id }).count();
      count = r.total;
    } catch (_) { count = -1; }
    statusList.push({
      id:          c.id,
      name:        c.name,
      emoji:       c.emoji || '',
      totalDishes: (c.representativeDishes || []).length,
      recipesInDB: count,
    });
  }

  const totalDishes = statusList.reduce((s, c) => s + c.totalDishes, 0);
  const totalInDB   = statusList.reduce((s, c) => s + Math.max(0, c.recipesInDB), 0);

  return {
    code: 0,
    message: 'ok',
    data: {
      statusList,
      summary: {
        totalCuisines: statusList.length,
        totalDishes,
        totalInDB,
        pendingCount: Math.max(0, totalDishes - totalInDB),
      },
    },
  };
};

// ==================== action: check_exists ====================

const actionCheckExists = async (event) => {
  const { cuisineId, dishName } = event;
  if (!cuisineId || !dishName) {
    return { code: 1, message: '缺少 cuisineId 或 dishName', data: null };
  }
  const exists = await checkExists(cuisineId, dishName);
  return { code: 0, message: 'ok', data: { exists } };
};

// ==================== action: clear_cuisine ====================

const actionClearCuisine = async (event) => {
  const { cuisineId, confirm } = event;
  if (!cuisineId) return { code: 1, message: '缺少 cuisineId', data: null };
  if (!confirm)   return { code: 1, message: '危险操作，请传 confirm:true', data: null };

  let total = 0;
  for (let round = 0; round < 100; round++) {
    const res = await db.collection(COLLECTION).where({ cuisineId }).limit(20).get();
    if (!res.data || res.data.length === 0) break;
    await Promise.all(res.data.map(r => db.collection(COLLECTION).doc(r._id).remove()));
    total += res.data.length;
    if (res.data.length < 20) break;
  }
  return { code: 0, message: `已删除 ${total} 条`, data: { cuisineId, deletedCount: total } };
};

// ==================== 云函数入口 ====================

exports.main = async (event = {}) => {
  const action = event.action || 'generate_one';
  console.log(`[batch-recipe-generate v5] action=${action}`);

  try {
    switch (action) {
      case 'generate_one':   return await actionGenerateOne(event);
      case 'status':         return await actionStatus(event);
      case 'check_exists':   return await actionCheckExists(event);
      case 'clear_cuisine':  return await actionClearCuisine(event);
      default:
        return { code: 1, message: `未知 action: ${action}`, data: null };
    }
  } catch (err) {
    console.error('[batch-recipe-generate] 未捕获异常:', err);
    return { code: 500, message: err.message, data: null };
  }
};
