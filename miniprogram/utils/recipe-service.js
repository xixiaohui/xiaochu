/**
 * 菜谱服务模块 - recipe-service.js  v1.0.0
 *
 * 核心功能：getRecipeForDish(dish, cuisine)
 *   ① 先查云端数据库 recipes 集合（按 cuisineId + sourceDishName 精确匹配）
 *   ② 命中 → 直接返回，无 AI 调用，0 Token 消耗
 *   ③ 未命中 → 调用 ai-service.js callCloudAIFrontend() 生成
 *   ④ 生成成功 → 写入 recipes 集合（与 upload 页写入格式完全一致）
 *   ⑤ 全程返回统一结构 { recipe, source, docId?, tokensUsed, elapsed }
 *
 * 典型调用场景：
 *   用户在 cuisine-detail 页点击 "✨ AI生成完整食谱"
 *
 * 依赖：
 *   - wx.cloud.database()          — 云数据库（前端直查 / 直写）
 *   - utils/ai-service.js          — 前端直调混元大模型
 *
 * 数据库字段约定（与 upload/index.js v6.0.0 保持一致）：
 *   cuisineId, cuisineName, cuisineFullName, cuisineEmoji, cuisineColor,
 *   category, sourceType='user_generated'|'batch_generated',
 *   sourceDishName, sourceIngredients, aiProvider, tokensUsed,
 *   version, status='active', isPublic=true, author='system_ai',
 *   createdAt, updatedAt
 */

'use strict';

const aiService = require('./ai-service.js');

// ==================== 常量 ====================

/** 云数据库集合名 */
const RECIPES_COLLECTION = 'recipes';

/** 本模块写入记录的版本标识 */
const SERVICE_VERSION = '1.0.0';

/** 查询超时（ms）—— 云数据库查询超过此时间视为失败，直接走 AI 生成 */
const DB_QUERY_TIMEOUT_MS = 8000;

// ==================== 主接口 ====================

/**
 * 获取一道菜的完整食谱（优先云端缓存，缺失时 AI 生成并回写）
 *
 * @param {Object} dish    - 菜品信息（来自 cuisines.js representativeDishes）
 *   @param {string} dish.name         - 菜名（必填），用于数据库匹配
 *   @param {string[]} dish.ingredients - 食材列表
 *   @param {number} [dish.cookTime=30] - 烹饪时间（分钟）
 *   @param {string} [dish.difficulty='easy'] - 难度 easy|medium|hard
 *   @param {string} [dish.desc]       - 菜品描述（可选，作为附加提示）
 *
 * @param {Object} cuisine - 菜系信息（来自 cuisines.js CUISINES）
 *   @param {string} cuisine.id        - 菜系 ID（必填），用于数据库匹配
 *   @param {string} cuisine.name      - 菜系名称
 *   @param {string} [cuisine.fullName]
 *   @param {string} [cuisine.emoji]
 *   @param {string} [cuisine.color]
 *
 * @returns {Promise<RecipeResult>}
 *
 * @typedef {Object} RecipeResult
 * @property {Object}  recipe      - 标准化食谱对象
 * @property {'db'|'ai'} source    - 数据来源：'db'=云端命中，'ai'=AI 新生成
 * @property {string}  [docId]     - 写入数据库后的文档 ID（仅 source==='ai' 时有值）
 * @property {number}  tokensUsed  - 消耗 Token 数（命中缓存时为 0）
 * @property {number}  elapsed     - 总耗时（ms）
 * @property {string}  dishName    - 菜名（便于调用方日志输出）
 */
const getRecipeForDish = async (dish, cuisine) => {
  const t0 = Date.now();

  // ── 参数校验 ──────────────────────────────────────────────
  if (!dish || typeof dish.name !== 'string' || !dish.name.trim()) {
    throw new Error('[recipe-service] 缺少 dish.name 参数');
  }
  if (!cuisine || typeof cuisine.id !== 'string' || !cuisine.id.trim()) {
    throw new Error('[recipe-service] 缺少 cuisine.id 参数');
  }

  const dishName    = dish.name.trim();
  const cuisineId   = cuisine.id.trim();

  console.log(`[recipe-service] 请求菜谱：${cuisine.name || cuisineId} · ${dishName}`);

  // ── Step 1：查询云端数据库 ────────────────────────────────
  let dbRecipe = null;
  try {
    dbRecipe = await _queryFromDB(cuisineId, dishName);
  } catch (dbErr) {
    // 数据库查询失败不阻断流程，降级到 AI 生成
    console.warn(`[recipe-service] 数据库查询失败，降级到AI生成：${dbErr.message}`);
  }

  if (dbRecipe) {
    const elapsed = Date.now() - t0;
    console.log(`[recipe-service] ✅ 命中云端缓存：${dishName}，耗时 ${elapsed}ms`);
    return {
      recipe:     dbRecipe,
      source:     'db',
      tokensUsed: 0,
      elapsed,
      dishName,
    };
  }

  // ── Step 2：AI 生成 ───────────────────────────────────────
  console.log(`[recipe-service] 云端无缓存，调用 AI 生成：${dishName}`);

  const ingredients = Array.isArray(dish.ingredients) && dish.ingredients.length > 0
    ? dish.ingredients
    : [dishName]; // 兜底：以菜名作为唯一食材

  const extraHint = [
    `菜名：${dishName}`,
    `菜系：${cuisine.name || ''}（${cuisine.fullName || cuisine.name || ''}）`,
    dish.desc ? `特点：${dish.desc}` : '',
  ].filter(Boolean).join('，');

  let aiResult;
  try {
    aiResult = await aiService.callCloudAIFrontend(
      ingredients,
      dish.cookTime   || 30,
      dish.difficulty || 'easy',
      extraHint
    );
  } catch (aiErr) {
    console.error(`[recipe-service] AI 生成失败：${aiErr.message}`);
    throw new Error(`AI 生成失败：${aiErr.message}`);
  }

  const recipe = aiResult.recipe;

  // ── Step 3：写入云端数据库 ────────────────────────────────
  let docId;
  try {
    docId = await _saveToDB(recipe, dish, cuisine, aiResult.tokensUsed || 0);
    console.log(`[recipe-service] ✅ 写入数据库成功：${dishName}，docId=${docId}`);
  } catch (saveErr) {
    // 写入失败不影响返回结果，仅记录警告
    console.warn(`[recipe-service] 写入数据库失败（不影响使用）：${saveErr.message}`);
  }

  const elapsed = Date.now() - t0;
  console.log(`[recipe-service] ✅ AI 生成完成：${dishName}，耗时 ${elapsed}ms，Token=${aiResult.tokensUsed}`);

  return {
    recipe,
    source:     'ai',
    docId,
    tokensUsed: aiResult.tokensUsed || 0,
    elapsed,
    dishName,
  };
};

// ==================== 扩展接口 ====================

/**
 * 批量预检：哪些菜已有云端缓存（用于 UI 展示已生成状态）
 *
 * @param {string} cuisineId   - 菜系 ID
 * @param {string[]} dishNames - 菜名列表
 * @returns {Promise<Set<string>>} 已存在云端的菜名集合
 */
const checkExistingRecipes = async (cuisineId, dishNames) => {
  if (!Array.isArray(dishNames) || dishNames.length === 0) return new Set();

  try {
    const db  = wx.cloud.database();
    const col = db.collection(RECIPES_COLLECTION);

    // 微信云数据库单次查询上限 20 条，分批查询
    const existing = new Set();
    const BATCH = 10;

    for (let i = 0; i < dishNames.length; i += BATCH) {
      const batch = dishNames.slice(i, i + BATCH);
      const res = await col
        .where({
          cuisineId,
          sourceDishName: db.command.in(batch),
        })
        .field({ sourceDishName: true })
        .limit(batch.length)
        .get();

      (res.data || []).forEach(r => {
        if (r.sourceDishName) existing.add(r.sourceDishName);
      });
    }

    return existing;
  } catch (err) {
    console.warn('[recipe-service] checkExistingRecipes 失败：', err.message);
    return new Set();
  }
};

/**
 * 仅从数据库查询（不调 AI），查不到返回 null
 * 适合「先展示已有」场景
 *
 * @param {string} cuisineId
 * @param {string} dishName
 * @returns {Promise<Object|null>}
 */
const queryRecipeFromDB = (cuisineId, dishName) =>
  _queryFromDB(cuisineId, dishName);

// ==================== 内部实现 ====================

/**
 * 从 recipes 集合查询单条记录
 * 匹配字段：cuisineId + sourceDishName（精确匹配）
 * 优先返回 status==='active' 的最新记录
 *
 * @private
 */
const _queryFromDB = (cuisineId, dishName) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`数据库查询超时（>${DB_QUERY_TIMEOUT_MS}ms）`));
    }, DB_QUERY_TIMEOUT_MS);

    const db  = wx.cloud.database();
    const col = db.collection(RECIPES_COLLECTION);

    col
      .where({ cuisineId, sourceDishName: dishName, status: 'active' })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()
      .then(res => {
        clearTimeout(timer);
        const record = (res.data || [])[0];
        if (!record) {
          resolve(null);
          return;
        }
        // 剔除数据库元字段，只返回食谱本体 + 来源标注
        const {
          _id, _openid,
          cuisineId: cid, cuisineName, cuisineFullName, cuisineEmoji, cuisineColor,
          category, sourceType, sourceDishName, sourceIngredients,
          aiProvider, tokensUsed, version, status, isPublic, author,
          createdAt, updatedAt,
          ...recipeFields
        } = record;

        resolve({
          ...recipeFields,
          // 保留少量元字段供 UI 使用
          _id,
          _sourceType: sourceType,
        });
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

/**
 * 将 AI 生成结果写入 recipes 集合
 * 字段格式与 upload/index.js v6.0.0 完全一致
 *
 * @private
 * @returns {Promise<string>} docId
 */
const _saveToDB = async (recipe, dish, cuisine, tokensUsed) => {
  const db  = wx.cloud.database();
  const col = db.collection(RECIPES_COLLECTION);

  const record = {
    // ── 食谱本体 ──────────────────────────────
    ...recipe,

    // ── 菜系元数据 ─────────────────────────────
    cuisineId:         cuisine.id,
    cuisineName:       cuisine.name      || '',
    cuisineFullName:   cuisine.fullName  || cuisine.name || '',
    cuisineEmoji:      cuisine.emoji     || '',
    cuisineColor:      cuisine.color     || '',
    category:          cuisine.name      || '',

    // ── 来源信息 ───────────────────────────────
    sourceType:        'user_generated',   // 区别于批量上传的 batch_generated
    sourceDishName:    dish.name,
    sourceIngredients: Array.isArray(dish.ingredients) ? dish.ingredients : [],

    // ── AI 调用信息 ────────────────────────────
    aiProvider:        'hunyuan-exp',
    tokensUsed:        tokensUsed,

    // ── 记录管理 ───────────────────────────────
    version:           SERVICE_VERSION,
    status:            'active',
    isPublic:          true,
    author:            'system_ai',
    createdAt:         db.serverDate(),
    updatedAt:         db.serverDate(),
  };

  const res = await col.add({ data: record });
  return res._id;
};

// ==================== 模块导出 ====================

module.exports = {
  /** 核心接口：查云端缓存 → 缺失时 AI 生成并回写 */
  getRecipeForDish,

  /** 辅助：批量检查哪些菜已有云端记录 */
  checkExistingRecipes,

  /** 辅助：仅查数据库，不调 AI */
  queryRecipeFromDB,

  // 常量导出（便于测试和其他模块引用）
  RECIPES_COLLECTION,
  SERVICE_VERSION,
};
