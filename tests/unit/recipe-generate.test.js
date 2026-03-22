/**
 * 食谱生成功能单元测试 - recipe-generate.test.js
 * 测试框架：Jest
 * 覆盖范围：参数校验、JSON解析、食谱结构验证、Prompt构建、错误处理
 *
 * 运行命令：npm run test:unit tests/unit/recipe-generate.test.js
 *
 * v2.0 更新：
 * - 改为测试 ai-service.js（前端直调方案）
 * - 同时保留对云函数 recipe-generate 的集成测试
 * - 去除 API Key 相关测试，改为 wx.cloud.extend.AI 方案测试
 */

'use strict';

// ==================== 测试环境配置 ====================

// 标记为测试环境
process.env.NODE_ENV = 'test';

// Mock wx 全局对象（小程序运行时不存在，需要手动 Mock）
global.wx = {
  cloud: {
    callFunction: jest.fn(),
    extend: {
      AI: {
        model: {
          invoke: jest.fn(),
        },
      },
    },
  },
  showToast: jest.fn(),
  showModal: jest.fn(),
};

// Mock cache 模块（避免依赖 wx.getStorageSync）
jest.mock('../../miniprogram/utils/cache', () => ({
  getRecipeCache: jest.fn().mockReturnValue(null),
  setRecipeCache: jest.fn(),
  buildRecipeCacheKey: jest.fn().mockReturnValue('mock-cache-key'),
  deleteCache: jest.fn().mockReturnValue(true),
  clearAllCache: jest.fn().mockReturnValue(0),
  clearExpiredCache: jest.fn().mockReturnValue(0),
  getCacheStats: jest.fn().mockReturnValue({ total: 0, expired: 0 }),
}));

// 引入被测试模块
const aiService = require('../../miniprogram/utils/ai-service');
const {
  parseRecipeJSON,
  validateRecipeStructure,
  buildSystemPrompt,
  buildUserPrompt,
} = aiService;

// 引入云函数（用于集成测试）
const cloudFunction = require('../../cloudfunctions/recipe-generate/index');
const {
  validateParams,
  ERROR_CODES,
} = cloudFunction._testExports;

// ==================== 测试数据常量 ====================

// 标准有效食谱 JSON（模拟 AI 返回）
const VALID_RECIPE_JSON = {
  name: '西红柿炒鸡蛋',
  description: '经典家常菜，酸甜可口，营养丰富',
  cookTime: 15,
  difficulty: '简单',
  servings: 2,
  ingredients: [
    { name: '鸡蛋', amount: '3', unit: '个' },
    { name: '西红柿', amount: '2', unit: '个' },
    { name: '食用油', amount: '2', unit: '汤匙' },
    { name: '盐', amount: '适量', unit: '' },
  ],
  steps: [
    { step: 1, description: '鸡蛋打散加盐，西红柿切块', tip: '鸡蛋加盐更嫩滑' },
    { step: 2, description: '热油炒鸡蛋至八成熟盛出', tip: '不要炒太老' },
    { step: 3, description: '炒西红柿至出汁，加入鸡蛋翻炒调味', tip: null },
  ],
  nutrition: {
    calories: 220,
    protein: 14,
    carbs: 8,
    fat: 15,
  },
  tags: ['家常菜', '快手菜', '下饭菜'],
};

/**
 * 深拷贝工具，避免测试间数据污染
 */
const cloneDeep = (obj) => JSON.parse(JSON.stringify(obj));

// ==================== 测试套件 1：参数校验 ====================

describe('【测试套件1】参数校验 - validateParams（云函数）', () => {

  test('TC1.1 - 合法参数：包含食材、时间、难度，应返回 valid=true', () => {
    const event = { ingredients: ['鸡蛋', '西红柿'], cookTime: 30, difficulty: 'easy' };
    const result = validateParams(event);
    expect(result.valid).toBe(true);
    expect(result.errorMsg).toBe('');
  });

  test('TC1.2 - 非法参数：空食材列表，应返回 valid=false 并提示错误', () => {
    const result = validateParams({ ingredients: [], cookTime: 30 });
    expect(result.valid).toBe(false);
    expect(result.errorMsg).toContain('食材列表不能为空');
  });

  test('TC1.3 - 非法参数：缺少 ingredients 字段，应返回 valid=false', () => {
    const result = validateParams({ cookTime: 20, difficulty: 'easy' });
    expect(result.valid).toBe(false);
    expect(result.errorMsg).toBeTruthy();
  });

  test('TC1.4 - 非法参数：食材超过20种，应返回 valid=false', () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => `食材${i + 1}`);
    const result = validateParams({ ingredients: tooMany });
    expect(result.valid).toBe(false);
    expect(result.errorMsg).toContain('20');
  });

  test('TC1.5 - 非法参数：difficulty 为无效值，应返回 valid=false', () => {
    const result = validateParams({ ingredients: ['鸡蛋'], difficulty: 'super-hard' });
    expect(result.valid).toBe(false);
    expect(result.errorMsg).toContain('难度参数无效');
  });

  test('TC1.6 - 合法参数：difficulty 中文"简单"，应通过校验', () => {
    const result = validateParams({ ingredients: ['土豆'], difficulty: '简单' });
    expect(result.valid).toBe(true);
  });

  test('TC1.7 - 非法参数：cookTime 超出1-300范围(400)，应返回 valid=false', () => {
    const result = validateParams({ ingredients: ['鸡蛋'], cookTime: 400 });
    expect(result.valid).toBe(false);
    expect(result.errorMsg).toContain('烹饪时间');
  });

  test('TC1.8 - 边界参数：食材列表只有1种，应通过校验', () => {
    const result = validateParams({ ingredients: ['鸡蛋'] });
    expect(result.valid).toBe(true);
  });

  test('TC1.9 - 非法参数：ingredients 为 null，应返回 valid=false', () => {
    const result = validateParams({ ingredients: null });
    expect(result.valid).toBe(false);
  });
});

// ==================== 测试套件 2：JSON 解析 ====================

describe('【测试套件2】JSON解析 - parseRecipeJSON（ai-service）', () => {

  test('TC2.1 - 纯JSON字符串：应正确解析为食谱对象', () => {
    const result = parseRecipeJSON(JSON.stringify(VALID_RECIPE_JSON));
    expect(result.name).toBe('西红柿炒鸡蛋');
    expect(result.ingredients).toHaveLength(4);
    expect(result.steps).toHaveLength(3);
  });

  test('TC2.2 - Markdown代码块JSON：应从 ```json...``` 中提取并解析', () => {
    const markdownJson = `\`\`\`json\n${JSON.stringify(VALID_RECIPE_JSON)}\n\`\`\``;
    const result = parseRecipeJSON(markdownJson);
    expect(result.name).toBe('西红柿炒鸡蛋');
    expect(result.cookTime).toBe(15);
  });

  test('TC2.3 - 带前后文字的JSON：应从混合文本中提取JSON块', () => {
    const mixedText = `好的，以下是为您生成的食谱：\n\n${JSON.stringify(VALID_RECIPE_JSON)}\n\n希望您喜欢！`;
    const result = parseRecipeJSON(mixedText);
    expect(result.name).toBe('西红柿炒鸡蛋');
  });

  test('TC2.4 - 完全无效文本：应抛出解析错误', () => {
    expect(() => parseRecipeJSON('这是无法解析的纯文字，没有JSON内容')).toThrow();
  });

  test('TC2.5 - 部分字段缺失：应用默认值补全缺失字段', () => {
    const minimalJson = JSON.stringify({
      name: '红烧肉',
      ingredients: [{ name: '猪肉', amount: '500', unit: 'g' }],
      steps: [{ step: 1, description: '焯水备用' }],
    });
    const result = parseRecipeJSON(minimalJson);
    expect(result.name).toBe('红烧肉');
    expect(result.cookTime).toBe(30);       // 默认值
    expect(result.servings).toBe(2);        // 默认值
    expect(result.difficulty).toBe('简单'); // 默认值
    expect(result.nutrition.calories).toBe(0);
    expect(result.tags).toEqual([]);
  });

  test('TC2.6 - 无语言标记的代码块：应从 ```...``` 中提取JSON', () => {
    const blockJson = `\`\`\`\n${JSON.stringify(VALID_RECIPE_JSON)}\n\`\`\``;
    const result = parseRecipeJSON(blockJson);
    expect(result.name).toBe('西红柿炒鸡蛋');
  });
});

// ==================== 测试套件 3：食谱结构验证 ====================

describe('【测试套件3】食谱结构验证 - validateRecipeStructure', () => {

  test('TC3.1 - 完整合法食谱：所有字段应保持原值', () => {
    const result = validateRecipeStructure(cloneDeep(VALID_RECIPE_JSON));
    expect(result.name).toBe('西红柿炒鸡蛋');
    expect(result.cookTime).toBe(15);
    expect(result.difficulty).toBe('简单');
    expect(result.servings).toBe(2);
    expect(result.ingredients).toHaveLength(4);
    expect(result.steps).toHaveLength(3);
    expect(result.nutrition.calories).toBe(220);
    expect(result.tags).toContain('家常菜');
  });

  test('TC3.2 - 缺少name字段：应使用默认值"未命名食谱"', () => {
    const recipe = cloneDeep(VALID_RECIPE_JSON);
    delete recipe.name;
    const result = validateRecipeStructure(recipe);
    expect(result.name).toBe('未命名食谱');
  });

  test('TC3.3 - nutrition字段为字符串数字：应正确转换为number类型', () => {
    const recipe = cloneDeep(VALID_RECIPE_JSON);
    recipe.nutrition.calories = '350';
    recipe.nutrition.protein = '12.5';
    const result = validateRecipeStructure(recipe);
    expect(typeof result.nutrition.calories).toBe('number');
    expect(result.nutrition.calories).toBe(350);
    expect(result.nutrition.protein).toBe(12.5);
  });

  test('TC3.4 - ingredients不是数组：应返回空数组', () => {
    const recipe = cloneDeep(VALID_RECIPE_JSON);
    recipe.ingredients = '鸡蛋,西红柿';
    const result = validateRecipeStructure(recipe);
    expect(Array.isArray(result.ingredients)).toBe(true);
    expect(result.ingredients).toHaveLength(0);
  });

  test('TC3.5 - 传入null：应抛出"食谱数据格式错误"', () => {
    expect(() => validateRecipeStructure(null)).toThrow('食谱数据格式错误');
  });

  test('TC3.6 - cookTime为字符串"20"：应转换为数字20', () => {
    const recipe = cloneDeep(VALID_RECIPE_JSON);
    recipe.cookTime = '20';
    const result = validateRecipeStructure(recipe);
    expect(typeof result.cookTime).toBe('number');
    expect(result.cookTime).toBe(20);
  });
});

// ==================== 测试套件 4：Prompt 构建 ====================

describe('【测试套件4】Prompt构建（ai-service）', () => {

  test('TC4.1 - buildSystemPrompt：应包含JSON格式要求和字段说明', () => {
    const systemPrompt = buildSystemPrompt();
    expect(typeof systemPrompt).toBe('string');
    expect(systemPrompt.length).toBeGreaterThan(100);
    expect(systemPrompt).toContain('小厨AI');
    expect(systemPrompt).toContain('JSON');
    expect(systemPrompt).toContain('ingredients');
    expect(systemPrompt).toContain('steps');
    expect(systemPrompt).toContain('nutrition');
  });

  test('TC4.2 - buildUserPrompt：食材列表应被正确嵌入提示词', () => {
    const userPrompt = buildUserPrompt(['鸡蛋', '西红柿', '葱'], 20, 'easy', '');
    expect(userPrompt).toContain('鸡蛋');
    expect(userPrompt).toContain('西红柿');
    expect(userPrompt).toContain('葱');
    expect(userPrompt).toContain('20分钟');
    expect(userPrompt).toContain('简单');
  });

  test('TC4.3 - buildUserPrompt：难度英文应映射为中文', () => {
    expect(buildUserPrompt(['鸡蛋'], 30, 'easy', '')).toContain('简单');
    expect(buildUserPrompt(['鸡蛋'], 30, 'medium', '')).toContain('中等');
    expect(buildUserPrompt(['鸡蛋'], 30, 'hard', '')).toContain('困难');
  });

  test('TC4.4 - buildUserPrompt：附加要求应出现在提示词中', () => {
    const userPrompt = buildUserPrompt(['猪肉'], 45, 'medium', '不放辣椒，口味清淡');
    expect(userPrompt).toContain('不放辣椒');
    expect(userPrompt).toContain('口味清淡');
  });

  test('TC4.5 - buildUserPrompt：多个食材应以"、"连接', () => {
    const userPrompt = buildUserPrompt(['豆腐', '青椒', '肉末'], 30, 'easy', '');
    expect(userPrompt).toContain('豆腐、青椒、肉末');
  });
});

// ==================== 测试套件 5：错误码常量 ====================

describe('【测试套件5】错误码定义 - ERROR_CODES（云函数）', () => {

  test('TC5.1 - ERROR_CODES：应包含成功码0和所有错误类型', () => {
    expect(ERROR_CODES.SUCCESS).toBe(0);
    expect(ERROR_CODES.PARAM_ERROR).toBeDefined();
    expect(ERROR_CODES.AI_CALL_FAILED).toBeDefined();
    expect(ERROR_CODES.PARSE_FAILED).toBeDefined();
    // v2.0：云函数不再依赖 API Key，但保留向后兼容的错误码检查
    expect(typeof ERROR_CODES.TIMEOUT !== 'undefined' || typeof ERROR_CODES.AI_CALL_FAILED !== 'undefined').toBe(true);
  });

  test('TC5.2 - ERROR_CODES：所有错误码值应为数字类型', () => {
    Object.values(ERROR_CODES).forEach(code => {
      expect(typeof code).toBe('number');
    });
  });

  test('TC5.3 - ERROR_CODES：所有错误码值应唯一不重复', () => {
    const values = Object.values(ERROR_CODES);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});

// ==================== 测试套件 6：云函数集成测试 ====================

describe('【测试套件6】云函数主函数 - exports.main (Mock)', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC6.1 - 主函数：空食材列表应返回 code=1 参数错误', async () => {
    const result = await cloudFunction.main({ ingredients: [], cookTime: 30 }, {});
    expect(result.code).toBe(ERROR_CODES.PARAM_ERROR);
    expect(result.data).toBeNull();
    expect(result.message).toBeTruthy();
  });

  test('TC6.2 - 主函数：缺少 ingredients 参数应返回 code=1', async () => {
    const result = await cloudFunction.main({ cookTime: 20 }, {});
    expect(result.code).toBe(ERROR_CODES.PARAM_ERROR);
    expect(result.message).toContain('食材列表不能为空');
  });

  test('TC6.3 - 主函数：cloud.ai 不可用时应返回 AI_CALL_FAILED 或相关错误码', async () => {
    // 云函数使用 cloud.ai.createModel，测试环境中不可用
    const result = await cloudFunction.main(
      { ingredients: ['鸡蛋', '西红柿'] },
      {}
    );
    // 不是参数错误（code=1），应该是AI调用失败（code=2）或其他错误
    expect(result.code).not.toBe(ERROR_CODES.PARAM_ERROR);
    expect(result).toHaveProperty('code');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('data');
  });

  test('TC6.4 - 主函数：所有返回值应包含 code、message、data 字段', async () => {
    const result = await cloudFunction.main({ ingredients: null }, {});
    expect(result).toHaveProperty('code');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('data');
  });

  test('TC6.5 - 主函数：食材超过20种应返回 code=1 参数错误', async () => {
    const tooMany = Array.from({ length: 25 }, (_, i) => `食材${i + 1}`);
    const result = await cloudFunction.main({ ingredients: tooMany, cookTime: 30 }, {});
    expect(result.code).toBe(ERROR_CODES.PARAM_ERROR);
  });
});

// ==================== 测试套件 7：ai-service quickRecipe ====================

describe('【测试套件7】ai-service.quickRecipe 接口', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // 重置缓存 mock 为未命中
    const cache = require('../../miniprogram/utils/cache');
    cache.getRecipeCache.mockReturnValue(null);
  });

  test('TC7.1 - quickRecipe：空食材列表应抛出错误', async () => {
    await expect(aiService.quickRecipe({ ingredients: [] }))
      .rejects.toThrow('食材列表不能为空');
  });

  test('TC7.2 - quickRecipe：null食材应抛出错误', async () => {
    await expect(aiService.quickRecipe({ ingredients: null }))
      .rejects.toThrow('食材列表不能为空');
  });

  test('TC7.3 - quickRecipe：缓存命中时应返回缓存数据且 fromCache=true', async () => {
    const cache = require('../../miniprogram/utils/cache');
    const mockCachedData = {
      recipe: VALID_RECIPE_JSON,
      tokensUsed: 0,
      fromCache: false,
    };
    // 模拟缓存命中
    cache.getRecipeCache.mockReturnValue(mockCachedData);

    const result = await aiService.quickRecipe({
      ingredients: ['鸡蛋', '西红柿'],
      useCache: true,
    });

    expect(result.fromCache).toBe(true);
    expect(result.recipe).toBeDefined();
    // 缓存命中不应调用 wx.cloud
    expect(wx.cloud.callFunction).not.toHaveBeenCalled();
    expect(wx.cloud.extend.AI.model.invoke).not.toHaveBeenCalled();
  });

  test('TC7.4 - quickRecipe：全为空格的食材应抛出错误', async () => {
    await expect(aiService.quickRecipe({ ingredients: ['  ', '\t', ''] }))
      .rejects.toThrow('食材列表不能全为空值');
  });

  test('TC7.5 - quickRecipe：关闭缓存时不应调用 getRecipeCache', async () => {
    const cache = require('../../miniprogram/utils/cache');

    // 禁用 wx.cloud.extend.AI，让其快速失败（避免30s超时）
    const originalAI = wx.cloud.extend.AI;
    delete wx.cloud.extend.AI;

    // 模拟云函数快速返回成功数据（降级方案）
    wx.cloud.callFunction.mockImplementation(({ success }) => {
      success({
        result: {
          code: 0,
          message: 'success',
          data: {
            recipe: VALID_RECIPE_JSON,
            rawText: JSON.stringify(VALID_RECIPE_JSON),
            tokensUsed: 100,
          },
        },
      });
    });

    try {
      await aiService.quickRecipe({
        ingredients: ['鸡蛋'],
        useCache: false,
      });
    } catch (e) {
      // 允许失败（测试环境无法真实调用AI）
    } finally {
      // 恢复 AI mock
      wx.cloud.extend.AI = originalAI;
    }

    // 即使失败，不应查询缓存（useCache=false）
    expect(cache.getRecipeCache).not.toHaveBeenCalled();
  }, 10000); // 10s 超时
});

// ==================== 测试套件 8：边界情况 ====================

describe('【测试套件8】边界情况与异常处理', () => {

  test('TC8.1 - 边界：cookTime=0 应校验失败', () => {
    expect(validateParams({ ingredients: ['鸡蛋'], cookTime: 0 }).valid).toBe(false);
  });

  test('TC8.2 - 边界：cookTime=300 应通过校验（最大值）', () => {
    expect(validateParams({ ingredients: ['鸡蛋'], cookTime: 300 }).valid).toBe(true);
  });

  test('TC8.3 - 结构：nutrition 为 null 应返回全零默认营养数据', () => {
    const recipe = cloneDeep(VALID_RECIPE_JSON);
    recipe.nutrition = null;
    const result = validateRecipeStructure(recipe);
    expect(result.nutrition.calories).toBe(0);
    expect(result.nutrition.protein).toBe(0);
    expect(result.nutrition.carbs).toBe(0);
    expect(result.nutrition.fat).toBe(0);
  });

  test('TC8.4 - 参数：ingredients 为字符串而非数组，校验应有定义的结果', () => {
    const result = validateParams({ ingredients: '鸡蛋,西红柿' });
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errorMsg');
  });

  test('TC8.5 - 结构：步骤中 tip 为 null 应保持不变', () => {
    const recipe = cloneDeep(VALID_RECIPE_JSON);
    const result = validateRecipeStructure(recipe);
    const nullTipStep = result.steps.find(s => s.tip === null);
    expect(nullTipStep).toBeDefined();
    expect(nullTipStep.tip).toBeNull();
  });
});
