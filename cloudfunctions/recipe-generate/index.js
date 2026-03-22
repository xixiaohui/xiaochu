/**
 * 食谱生成云函数 - recipe-generate
 * 功能：使用微信云开发原生 AI 能力（cloud.ai）调用混元大模型生成食谱
 *
 * ✅ 无需配置外部 API Key！
 * 通过云开发环境自动关联的 Token 资源包（如 AI小程序成长计划免费包）直接调用。
 * 调用链：cloud.ai.createModel("hunyuan") → 自动使用环境绑定的 Token 额度
 *
 * 版本：2.0.0
 */

'use strict';

// 引入微信云开发 SDK
const cloud = require('wx-server-sdk');

// 初始化云开发（使用当前云函数所在环境，自动匹配资源包）
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

// ==================== 错误码定义 ====================

// 统一错误码，方便前端判断错误类型
const ERROR_CODES = {
  SUCCESS: 0,        // 成功
  PARAM_ERROR: 1,    // 参数错误
  AI_CALL_FAILED: 2, // AI 接口调用失败
  PARSE_FAILED: 3,   // JSON 解析失败
  TIMEOUT: 4,        // 超时
};

// ==================== Prompt 构建 ====================

/**
 * 构建系统提示词（基于 prompts/recipe-generation.md Prompt 1）
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
 * @param {string} difficulty - 难度等级（easy/medium/hard）
 * @param {string} extraRequirements - 附加要求
 * @returns {string} 用户提示词
 */
const buildUserPrompt = (ingredients, cookTime, difficulty, extraRequirements) => {
  // 食材数组转为中文顿号分隔
  const ingredientsStr = Array.isArray(ingredients)
    ? ingredients.join('、')
    : String(ingredients);

  // 难度英文映射为中文
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

// ==================== 参数校验 ====================

/**
 * 校验云函数入参
 * @param {Object} event - 云函数事件对象
 * @returns {{ valid: boolean, errorMsg: string }}
 */
const validateParams = (event) => {
  const { ingredients, cookTime, difficulty } = event;

  // 食材不能为空
  if (!ingredients || (Array.isArray(ingredients) && ingredients.length === 0)) {
    return { valid: false, errorMsg: '食材列表不能为空' };
  }

  // 最多20种食材（防止 Prompt 过长消耗过多 Token）
  if (Array.isArray(ingredients) && ingredients.length > 20) {
    return { valid: false, errorMsg: '食材数量不能超过20种' };
  }

  // 烹饪时间范围校验
  if (cookTime !== undefined) {
    const time = Number(cookTime);
    if (isNaN(time) || time <= 0 || time > 300) {
      return { valid: false, errorMsg: '烹饪时间必须在1-300分钟之间' };
    }
  }

  // 难度值校验
  const validDifficulties = ['easy', 'medium', 'hard', '简单', '中等', '困难'];
  if (difficulty && !validDifficulties.includes(difficulty)) {
    return { valid: false, errorMsg: `难度参数无效，支持：${validDifficulties.join(', ')}` };
  }

  return { valid: true, errorMsg: '' };
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
    console.warn('[recipe-generate] 直接JSON解析失败，尝试提取JSON块');
  }

  // 第②层：从 Markdown 代码块提取
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return validateRecipeStructure(JSON.parse(jsonMatch[1].trim()));
    } catch (e) {
      console.warn('[recipe-generate] Markdown代码块提取JSON失败');
    }
  }

  // 第③层：找第一个 { 到最后一个 }
  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return validateRecipeStructure(JSON.parse(rawText.substring(firstBrace, lastBrace + 1)));
    } catch (e) {
      console.error('[recipe-generate] 三层解析均失败');
    }
  }

  throw Object.assign(new Error('无法从AI返回内容中解析出有效的食谱JSON'), {
    code: ERROR_CODES.PARSE_FAILED,
  });
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

// ==================== 核心：调用云开发原生 AI ====================

/**
 * 使用云开发原生 AI 接口调用混元大模型生成食谱
 *
 * 关键说明：
 * - 使用 cloud.ai.createModel("hunyuan") 无需任何 API Key
 * - Token 消耗自动计入当前云开发环境绑定的资源包
 * - 使用 streamText 流式接收，最终拼接完整文本
 *
 * @param {string[]} ingredients - 食材列表
 * @param {number} cookTime - 烹饪时间（分钟）
 * @param {string} difficulty - 难度
 * @param {string} extraRequirements - 附加要求
 * @returns {Promise<{recipe: Object, rawText: string, tokensUsed: number}>}
 */
const callCloudAI = async (ingredients, cookTime, difficulty, extraRequirements) => {
  // ✅ 使用云开发原生 AI，无需 API Key
  // 资源包自动关联：cloud.DYNAMIC_CURRENT_ENV 对应的环境绑定了 Token 资源包
  const model = cloud.ai.createModel('hunyuan');

  console.log('[recipe-generate] 使用云开发原生AI，食材：', ingredients.join('、'));
  const startTime = Date.now();

  // 调用流式文本生成
  const res = await model.streamText({
    data: {
      model: 'hunyuan-lite',  // 使用 lite 版本节省 Token
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
      temperature: 0.7,    // 保持适度创意
      max_tokens: 1024,    // 食谱内容控制在 1024 tokens 内
    },
  });

  // 拼接流式返回的文本片段
  let rawText = '';
  for await (const chunk of res.textStream) {
    rawText += chunk;
  }

  const elapsed = Date.now() - startTime;
  console.log(`[recipe-generate] AI调用完成，耗时：${elapsed}ms，文本长度：${rawText.length}`);

  if (!rawText || rawText.trim().length === 0) {
    throw Object.assign(new Error('AI返回内容为空'), {
      code: ERROR_CODES.AI_CALL_FAILED,
    });
  }

  // 解析食谱 JSON
  const recipe = parseRecipeJSON(rawText);

  // 估算 Token 消耗（云开发 AI 不直接返回 usage，按输出字符粗估）
  // 中文约 1.5 字符/token，英文约 4 字符/token，这里保守估算
  const tokensUsed = Math.ceil(rawText.length / 1.5) + 60; // 加60为 Prompt 固定消耗

  return { recipe, rawText, tokensUsed };
};

// ==================== 云函数主入口 ====================

/**
 * 云函数主入口
 *
 * 入参（event）：
 *   - ingredients  {string[]}  食材列表（必填）
 *   - cookTime     {number}    烹饪时间分钟（选填，默认30）
 *   - difficulty   {string}    难度 easy/medium/hard（选填，默认easy）
 *   - extraRequirements {string} 附加要求（选填）
 *
 * 返回：
 *   { code: 0, message: 'success', data: { recipe, rawText, tokensUsed } }
 *   { code: 非0, message: '错误描述', data: null }
 */
exports.main = async (event, context) => {
  console.log('[recipe-generate] 收到请求：', JSON.stringify(event));

  // ---- 参数校验 ----
  const validation = validateParams(event);
  if (!validation.valid) {
    console.warn('[recipe-generate] 参数校验失败：', validation.errorMsg);
    return {
      code: ERROR_CODES.PARAM_ERROR,
      message: validation.errorMsg,
      data: null,
    };
  }

  // 提取参数并设置默认值
  const {
    ingredients,
    cookTime = 30,
    difficulty = 'easy',
    extraRequirements = '',
  } = event;

  try {
    // ---- 调用云开发原生 AI ----
    const { recipe, rawText, tokensUsed } = await callCloudAI(
      ingredients,
      Number(cookTime),
      difficulty,
      extraRequirements
    );

    console.log('[recipe-generate] 食谱生成成功：', recipe.name, '，估算Token：', tokensUsed);

    return {
      code: ERROR_CODES.SUCCESS,
      message: 'success',
      data: {
        recipe,
        rawText,
        tokensUsed,
      },
    };

  } catch (err) {
    const errorCode = err.code || ERROR_CODES.AI_CALL_FAILED;
    const errorMsg = err.message || 'AI食谱生成失败，请稍后重试';

    console.error('[recipe-generate] 生成失败：', errorCode, errorMsg);

    return {
      code: errorCode,
      message: errorMsg,
      data: null,
    };
  }
};

// ==================== 测试环境导出 ====================

// 仅测试环境暴露内部函数（供 Jest 单元测试使用）
if (process.env.NODE_ENV === 'test') {
  module.exports._testExports = {
    validateParams,
    parseRecipeJSON,
    validateRecipeStructure,
    buildSystemPrompt,
    buildUserPrompt,
    ERROR_CODES,
  };
}
