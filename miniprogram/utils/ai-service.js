/**
 * AI 服务统一接口模块 - ai-service.js
 * 功能：使用微信云开发原生 AI 能力（wx.cloud.extend.AI）调用混元大模型
 *
 * ✅ 无需任何 API Key！
 * 使用云开发绑定的 Token 资源包（AI小程序成长计划免费包）直接在前端调用。
 * 调用链：wx.cloud.extend.AI → 云开发 AI 服务 → 混元大模型
 *
 * 支持两种调用方案：
 * 1. 【推荐】前端直调：wx.cloud.extend.AI.model.invoke()  — 延迟低，无云函数费用
 * 2. 【备用】云函数中转：wx.cloud.callFunction('recipe-generate') — 安全性更高
 */

'use strict';

// 引入缓存工具
const cache = require('./cache');

// ==================== 常量配置 ====================

// 请求超时时间（毫秒）
const CALL_TIMEOUT = 30000;

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 2,    // 最大重试次数
  retryDelay: 1000, // 重试间隔（毫秒）
};

// 混元模型名称（lite 版本节省 Token）
const HUNYUAN_MODEL = 'hunyuan-lite';

// ==================== Prompt 构建 ====================

/**
 * 构建系统提示词
 * @returns {string} 系统提示词
 */
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
5. 步骤简洁清晰，适合家庭烹饪`;
};

/**
 * 构建用户提示词
 * @param {string[]} ingredients - 食材列表
 * @param {number} cookTime - 烹饪时间（分钟）
 * @param {string} difficulty - 难度等级
 * @param {string} extraRequirements - 附加要求
 * @returns {string} 用户提示词
 */
const buildUserPrompt = (ingredients, cookTime, difficulty, extraRequirements) => {
  const ingredientsStr = Array.isArray(ingredients)
    ? ingredients.join('、')
    : String(ingredients);

  const difficultyMap = {
    easy: '简单', medium: '中等', hard: '困难',
    简单: '简单', 中等: '中等', 困难: '困难',
  };
  const difficultyText = difficultyMap[difficulty] || '简单';

  return `我有以下食材：${ingredientsStr}

请帮我生成一道菜的食谱。
- 烹饪时间要求：${cookTime}分钟以内
- 难度要求：${difficultyText}
- 其他要求：${extraRequirements || '无'}

请直接输出 JSON 格式的食谱，不要有任何其他文字说明。`;
};

// ==================== JSON 解析（三层兜底）====================

/**
 * 解析 AI 返回的食谱 JSON，支持三层兜底
 * ① 直接 JSON.parse
 * ② 提取 Markdown 代码块中的 JSON
 * ③ 提取首个 { 到末尾 } 之间的内容
 * @param {string} rawText - AI 返回的原始文本
 * @returns {Object} 解析后的食谱对象
 */
const parseRecipeJSON = (rawText) => {
  // 第①层：直接解析
  try {
    return validateRecipeStructure(JSON.parse(rawText.trim()));
  } catch (e) {
    console.warn('[ai-service] 直接JSON解析失败，尝试提取JSON块');
  }

  // 第②层：从 Markdown 代码块提取
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return validateRecipeStructure(JSON.parse(jsonMatch[1].trim()));
    } catch (e) {
      console.warn('[ai-service] Markdown代码块提取JSON失败');
    }
  }

  // 第③层：找第一个 { 到最后一个 }
  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return validateRecipeStructure(JSON.parse(rawText.substring(firstBrace, lastBrace + 1)));
    } catch (e) {
      console.error('[ai-service] 三层解析均失败');
    }
  }

  throw new Error('无法从AI返回内容中解析出有效的食谱JSON，请重试');
};

/**
 * 校验并补全食谱数据结构中的缺失字段
 * @param {Object} recipe - 原始食谱对象
 * @returns {Object} 补全后的食谱对象
 */
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

// ==================== 方案A：前端直调 wx.cloud.extend.AI ====================

/**
 * 使用 wx.cloud.extend.AI 直接调用混元大模型（无需云函数，无需 API Key）
 *
 * 原理：
 * - wx.cloud.extend.AI 是微信云开发提供的前端 AI 调用接口
 * - 需要基础库 >= 3.7.1，并在云开发控制台开启 AI 功能
 * - Token 消耗自动计入环境绑定的资源包（如 pkg-3l8hj0zy-ai-inspire-free）
 *
 * @param {string[]} ingredients - 食材列表
 * @param {number} cookTime - 烹饪时间（分钟）
 * @param {string} difficulty - 难度
 * @param {string} extraRequirements - 附加要求
 * @returns {Promise<{recipe: Object, rawText: string, tokensUsed: number}>}
 */
const callCloudAIFrontend = (ingredients, cookTime, difficulty, extraRequirements) => {
  return new Promise((resolve, reject) => {
    // 超时保护
    const timer = setTimeout(() => {
      reject(new Error('AI 响应超时，请检查网络后重试'));
    }, CALL_TIMEOUT);

    console.log('[ai-service] 使用 wx.cloud.extend.AI 直调，食材：', ingredients.join('、'));
    const startTime = Date.now();

    // 拼接流式输出文本
    let rawText = '';

    // 检查 wx.cloud.extend.AI 是否可用（需基础库 >= 3.7.1）
    if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.extend || !wx.cloud.extend.AI) {
      clearTimeout(timer);
      // 降级到测试/Node.js 环境的模拟响应
      reject(new Error('wx.cloud.extend.AI 不可用，请确认：①基础库≥3.7.1 ②已在云开发控制台开启AI功能'));
      return;
    }

    try {
      // 调用云开发 AI 流式接口
      wx.cloud.extend.AI.model.invoke({
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
        // 流式回调：每次收到文本片段时触发
        onMessage(chunk) {
          if (chunk && chunk.text) {
            rawText += chunk.text;
          }
        },
        // 完成回调
        success() {
          clearTimeout(timer);
          const elapsed = Date.now() - startTime;
          console.log(`[ai-service] AI调用完成，耗时：${elapsed}ms，文本长度：${rawText.length}`);

          if (!rawText || rawText.trim().length === 0) {
            reject(new Error('AI返回内容为空，请重试'));
            return;
          }

          try {
            const recipe = parseRecipeJSON(rawText);
            // 按输出字符估算 Token（中文约1.5字符/token）
            const tokensUsed = Math.ceil(rawText.length / 1.5) + 60;
            resolve({ recipe, rawText, tokensUsed });
          } catch (parseErr) {
            reject(parseErr);
          }
        },
        // 失败回调
        fail(err) {
          clearTimeout(timer);
          console.error('[ai-service] wx.cloud.extend.AI 调用失败：', err);
          const errMsg = (err && (err.errMsg || err.message || err.msg)) || '未知错误';
          reject(new Error(`AI调用失败：${errMsg}`));
        },
      });
    } catch (syncErr) {
      clearTimeout(timer);
      reject(syncErr);
    }
  });
};

// ==================== 方案B：云函数中转 ====================

/**
 * 通过云函数 recipe-generate 中转调用（备用方案）
 * 适用场景：
 * - wx.cloud.extend.AI 不可用时的降级
 * - 需要服务端处理逻辑时
 *
 * @param {string[]} ingredients - 食材列表
 * @param {number} cookTime - 烹饪时间
 * @param {string} difficulty - 难度
 * @param {string} extraRequirements - 附加要求
 * @returns {Promise<{recipe: Object, rawText: string, tokensUsed: number}>}
 */
const callCloudFunctionFallback = (ingredients, cookTime, difficulty, extraRequirements) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('云函数响应超时，请稍后重试'));
    }, CALL_TIMEOUT);

    console.log('[ai-service] 使用云函数中转方案，食材：', ingredients.join('、'));

    wx.cloud.callFunction({
      name: 'recipe-generate',
      data: {
        ingredients,
        cookTime: Number(cookTime),
        difficulty,
        extraRequirements,
      },
      success(res) {
        clearTimeout(timer);
        const result = res && res.result;
        if (!result) {
          reject(new Error('云函数返回结果为空'));
          return;
        }
        if (result.code !== 0) {
          reject(new Error(result.message || '云函数返回业务错误'));
          return;
        }
        resolve(result.data);
      },
      fail(err) {
        clearTimeout(timer);
        console.error('[ai-service] 云函数调用失败：', err);
        const errMsg = (err && err.errMsg) || '云函数调用失败';

        // 友好化错误信息
        let friendlyMsg = errMsg;
        if (errMsg.includes('not found') || errMsg.includes('functionName')) {
          friendlyMsg = '云函数未部署：请在微信开发者工具右键 cloudfunctions/recipe-generate → 上传并部署';
        } else if (errMsg.includes('env') || errMsg.includes('environment')) {
          friendlyMsg = '云开发环境错误：请检查 miniprogram/app.js 中 env 字段是否已填写正确的环境ID';
        }
        reject(new Error(friendlyMsg));
      },
    });
  });
};

// ==================== 智能调用（自动选择方案）====================

/**
 * 带重试的 AI 调用（自动选择前端直调或云函数中转）
 * 优先使用 wx.cloud.extend.AI，失败时自动降级到云函数
 *
 * @param {string[]} ingredients - 食材列表
 * @param {number} cookTime - 烹饪时间
 * @param {string} difficulty - 难度
 * @param {string} extraRequirements - 附加要求
 * @returns {Promise<{recipe: Object, rawText: string, tokensUsed: number}>}
 */
const callAIWithFallback = async (ingredients, cookTime, difficulty, extraRequirements) => {
  let lastError;

  // 首先尝试前端直调
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[ai-service] 第 ${attempt} 次重试...`);
        await new Promise(r => setTimeout(r, RETRY_CONFIG.retryDelay * attempt));
      }

      // 检查 wx.cloud.extend.AI 是否可用
      if (typeof wx !== 'undefined' && wx.cloud && wx.cloud.extend && wx.cloud.extend.AI) {
        console.log('[ai-service] 使用前端直调方案（wx.cloud.extend.AI）');
        return await callCloudAIFrontend(ingredients, cookTime, difficulty, extraRequirements);
      } else {
        // Node.js 测试环境或旧基础库：直接走云函数
        console.log('[ai-service] wx.cloud.extend.AI 不可用，使用云函数中转');
        return await callCloudFunctionFallback(ingredients, cookTime, difficulty, extraRequirements);
      }
    } catch (err) {
      lastError = err;
      console.warn(`[ai-service] 第 ${attempt + 1} 次调用失败：`, err.message);

      // 如果是 wx.cloud.extend.AI 不可用，直接降级到云函数（不重试）
      if (err.message && err.message.includes('wx.cloud.extend.AI 不可用')) {
        try {
          return await callCloudFunctionFallback(ingredients, cookTime, difficulty, extraRequirements);
        } catch (fallbackErr) {
          throw fallbackErr;
        }
      }
    }
  }

  throw lastError;
};

// ==================== 快速食谱生成（主接口）====================

/**
 * 快速食谱生成（Prompt 1）
 * 根据食材列表、烹饪时间和难度生成一道家常菜的完整食谱
 *
 * @param {Object} params - 请求参数
 * @param {string[]} params.ingredients - 食材列表（必填）
 * @param {number} [params.cookTime=30] - 最大烹饪时间（分钟），默认30
 * @param {string} [params.difficulty='easy'] - 难度：easy/medium/hard，默认easy
 * @param {string} [params.extraRequirements=''] - 附加要求
 * @param {boolean} [params.useCache=true] - 是否使用本地缓存，默认true
 * @returns {Promise<Object>} 食谱数据
 *
 * @example
 * const result = await quickRecipe({
 *   ingredients: ['鸡蛋', '西红柿'],
 *   cookTime: 20,
 *   difficulty: 'easy'
 * });
 */
const quickRecipe = async (params) => {
  const {
    ingredients,
    cookTime = 30,
    difficulty = 'easy',
    extraRequirements = '',
    useCache = true,
  } = params;

  // ---- 前置参数验证 ----
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    throw new Error('食材列表不能为空');
  }

  // 过滤空字符串食材
  const cleanIngredients = ingredients
    .map(item => String(item).trim())
    .filter(item => item.length > 0);

  if (cleanIngredients.length === 0) {
    throw new Error('食材列表不能全为空值');
  }

  console.log(`[ai-service] quickRecipe 调用，食材：${cleanIngredients.join('、')}，时间：${cookTime}min，难度：${difficulty}`);

  // ---- 查询本地缓存 ----
  if (useCache) {
    const cachedData = cache.getRecipeCache(cleanIngredients, cookTime, difficulty);
    if (cachedData) {
      console.log('[ai-service] 命中本地缓存，跳过AI调用');
      return {
        ...cachedData,
        fromCache: true,
      };
    }
  }

  // ---- 调用 AI（自动选择方案）----
  let aiResult;
  try {
    aiResult = await callAIWithFallback(
      cleanIngredients,
      Number(cookTime),
      difficulty,
      extraRequirements
    );
  } catch (err) {
    throw new Error(`食谱生成失败：${err.message}`);
  }

  if (!aiResult || !aiResult.recipe) {
    throw new Error('AI 返回数据异常，请重试');
  }

  // ---- 构建结果并写入缓存 ----
  const resultData = {
    recipe: aiResult.recipe,
    rawText: aiResult.rawText || '',
    tokensUsed: aiResult.tokensUsed || 0,
    fromCache: false,
    generatedAt: Date.now(),
  };

  // 写入本地缓存（2小时有效期）
  if (useCache) {
    cache.setRecipeCache(cleanIngredients, cookTime, difficulty, resultData);
  }

  console.log(`[ai-service] 食谱生成成功：${aiResult.recipe.name}，Token消耗：${aiResult.tokensUsed}`);

  return resultData;
};

// ==================== 缓存管理 ====================

/**
 * 清除指定条件的食谱缓存
 */
const clearRecipeCache = (ingredients, cookTime, difficulty) => {
  const key = cache.buildRecipeCacheKey(ingredients, cookTime, difficulty);
  return cache.deleteCache(key);
};

/**
 * 清除所有食谱缓存
 */
const clearAllRecipeCache = () => {
  return cache.clearAllCache();
};

/**
 * 获取 AI 服务缓存统计
 */
const getCacheStats = () => {
  return cache.getCacheStats();
};

// ==================== 模块导出 ====================

module.exports = {
  // 核心 AI 功能
  quickRecipe,

  // 缓存管理
  clearRecipeCache,
  clearAllRecipeCache,
  getCacheStats,

  // 内部工具（暴露给高级用法和测试）
  parseRecipeJSON,
  validateRecipeStructure,
  buildSystemPrompt,
  buildUserPrompt,
  callCloudAIFrontend,
  callCloudFunctionFallback,
};
