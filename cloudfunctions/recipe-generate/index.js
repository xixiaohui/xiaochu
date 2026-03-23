/**
 * 食谱生成云函数 - recipe-generate
 * 功能：使用微信云开发原生 AI 能力（cloud.ai）调用混元大模型生成食谱
 *
 * ✅ 无需配置外部 API Key！
 * 通过云开发环境自动关联的 Token 资源包（如 AI小程序成长计划免费包）直接调用。
 * 调用链：cloud.ai.createModel("hunyuan-exp") → 自动使用环境绑定的 Token 额度
 *
 * 版本：2.1.0
 */

'use strict';

// 引入微信云开发 SDK
const cloud = require('wx-server-sdk');

// 初始化云开发（使用当前云函数所在环境，自动匹配资源包）
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

// ==================== 常量配置 ====================

// 混元 provider
const AI_PROVIDER = 'hunyuan-exp';

// 实际调用模型
const HUNYUAN_MODEL = 'hunyuan-turbos-latest';

// 超时时间（毫秒）
const CALL_TIMEOUT = 30000;

// ==================== 错误码定义 ====================

const ERROR_CODES = {
  SUCCESS: 0,
  PARAM_ERROR: 1,
  AI_CALL_FAILED: 2,
  PARSE_FAILED: 3,
  TIMEOUT: 4,
};

// ==================== Prompt 构建 ====================

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
    easy: '简单', medium: '中等', hard: '困难',
    简单: '简单', 中等: '中等', 困难: '困难',
  };
  const difficultyText = difficultyMap[difficulty] || '简单';

  return `我有以下食材：${ingredientsStr}

请帮我生成一道菜的食谱。
- 烹饪时间要求：${cookTime}分钟以内
- 难度要求：${difficultyText}
- 其他要求：${extraRequirements || '无'}

请仅输出一个可被 JSON.parse 直接解析的 JSON 对象，不要输出任何解释、前缀、后缀或 Markdown 代码块。`;
};

// ==================== 参数校验 ====================

const validateParams = (event) => {
  const { ingredients, cookTime, difficulty } = event;

  if (!ingredients || (Array.isArray(ingredients) && ingredients.length === 0)) {
    return { valid: false, errorMsg: '食材列表不能为空' };
  }

  if (Array.isArray(ingredients) && ingredients.length > 20) {
    return { valid: false, errorMsg: '食材数量不能超过20种' };
  }

  if (cookTime !== undefined) {
    const time = Number(cookTime);
    if (isNaN(time) || time <= 0 || time > 300) {
      return { valid: false, errorMsg: '烹饪时间必须在1-300分钟之间' };
    }
  }

  const validDifficulties = ['easy', 'medium', 'hard', '简单', '中等', '困难'];
  if (difficulty && !validDifficulties.includes(difficulty)) {
    return { valid: false, errorMsg: `难度参数无效，支持：${validDifficulties.join(', ')}` };
  }

  return { valid: true, errorMsg: '' };
};

// ==================== JSON 解析（三层兜底）====================

const parseRecipeJSON = (rawText) => {
  try {
    return validateRecipeStructure(JSON.parse(rawText.trim()));
  } catch (e) {
    console.warn('[recipe-generate] 直接JSON解析失败，尝试提取JSON块');
  }

  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return validateRecipeStructure(JSON.parse(jsonMatch[1].trim()));
    } catch (e) {
      console.warn('[recipe-generate] Markdown代码块提取JSON失败');
    }
  }

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

const callCloudAI = async (ingredients, cookTime, difficulty, extraRequirements) => {
  // 如果你的当前 wx-server-sdk 运行时支持 cloud.ai，可继续使用
  // 关键是 provider 应改为 hunyuan-exp
  const model = cloud.ai.createModel(AI_PROVIDER);

  console.log('[recipe-generate] 使用云开发原生AI，食材：', ingredients.join('、'));
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

    // 服务端 SDK 按官方文档直接读 textStream
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

    const recipe = parseRecipeJSON(rawText);

    // 优先使用 SDK 提供的真实 usage
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
      reject(Object.assign(new Error('AI调用超时，请稍后重试'), {
        code: ERROR_CODES.TIMEOUT,
      }));
    }, CALL_TIMEOUT);
  });

  return Promise.race([requestPromise, timeoutPromise]);
};

// ==================== 云函数主入口 ====================

exports.main = async (event, context) => {
  console.log('[recipe-generate] 收到请求：', JSON.stringify(event));

  const validation = validateParams(event);
  if (!validation.valid) {
    console.warn('[recipe-generate] 参数校验失败：', validation.errorMsg);
    return {
      code: ERROR_CODES.PARAM_ERROR,
      message: validation.errorMsg,
      data: null,
    };
  }

  const {
    ingredients,
    cookTime = 30,
    difficulty = 'easy',
    extraRequirements = '',
  } = event;

  try {
    const { recipe, rawText, tokensUsed } = await callCloudAI(
      ingredients,
      Number(cookTime),
      difficulty,
      extraRequirements
    );

    console.log('[recipe-generate] 食谱生成成功：', recipe.name, '，Token：', tokensUsed);

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
