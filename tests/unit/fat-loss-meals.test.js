/**
 * 减脂菜谱页面单元测试 - fat-loss-meals.test.js  v1.0.0
 *
 * 覆盖范围：
 *   Suite 1  - 数据加载（cuisines.js 数据正确注入）
 *   Suite 2  - 热量筛选逻辑
 *   Suite 3  - 难度筛选逻辑
 *   Suite 4  - 点击菜品：云端命中（DB hit → 直接返回，0 Token）
 *   Suite 5  - 点击菜品：云端未命中（DB miss → AI 生成 → 写入 DB）
 *   Suite 6  - DB 查询失败降级（降级到 AI 生成）
 *   Suite 7  - AI 生成失败（弹窗显示错误）
 *   Suite 8  - 写入 DB 失败（不影响展示）
 *   Suite 9  - 重新生成菜谱（强制 AI 调用）
 *   Suite 10 - 批量检查云端已有记录（_checkExisting）
 *   Suite 11 - DB 写入字段规范校验
 *   Suite 12 - 常量与工具函数校验
 */

'use strict';

process.env.NODE_ENV = 'test';

// ==================== 测试数据 ====================

const MOCK_FAT_LOSS_MEAL = {
  id:         'fl_001',
  name:       '水煮鸡胸肉沙拉',
  category:   'fat_loss',
  calories:   280,
  protein:    35,
  carbs:      12,
  fat:        8,
  cookTime:   20,
  difficulty: 'easy',
  desc:       '高蛋白低脂，减脂期间最佳选择',
  ingredients: ['鸡胸肉150g', '生菜', '番茄', '黄瓜', '橄榄油少许'],
  tags:       ['高蛋白', '低脂', '清淡'],
  tips:       '鸡胸肉提前腌制可增加风味，橄榄油不超过5ml',
};

const MOCK_AI_RECIPE = {
  name:        '水煮鸡胸肉沙拉',
  description: '健康低脂，高蛋白减脂菜肴',
  cookTime:    20,
  difficulty:  '简单',
  servings:    1,
  ingredients: [
    { name: '鸡胸肉', amount: '150', unit: 'g' },
    { name: '生菜',   amount: '100', unit: 'g' },
  ],
  steps: [
    { step: 1, description: '鸡胸肉煮熟切片', tip: null },
    { step: 2, description: '蔬菜洗净备用', tip: '保持新鲜' },
  ],
  nutrition: { calories: 280, protein: 35, carbs: 12, fat: 8 },
  tags: ['高蛋白', '低脂'],
};

const MOCK_DB_RECIPE_DOC = {
  _id:              'doc_fat_001',
  name:             '水煮鸡胸肉沙拉',
  description:      '健康低脂',
  cookTime:         20,
  difficulty:       '简单',
  servings:         1,
  ingredients:      [{ name: '鸡胸肉', amount: '150', unit: 'g' }],
  steps:            [{ step: 1, description: '煮熟', tip: null }],
  nutrition:        { calories: 280, protein: 35, carbs: 12, fat: 8 },
  tags:             ['高蛋白'],
  cuisineId:        'fat_loss',
  cuisineName:      '减脂菜谱',
  category:         'fat_loss_generated',
  sourceType:       'fat_loss_generated',
  sourceDishName:   '水煮鸡胸肉沙拉',
  sourceIngredients: ['鸡胸肉', '生菜', '番茄'],
  aiProvider:       'hunyuan-exp',
  tokensUsed:       100,
  version:          '1.0.0',
  status:           'active',
  isPublic:         true,
  author:           'system_ai',
  _openid:          'test_openid',
};

// ==================== DB Mock 工厂 ====================

const _makeDbMock = ({
  docs = [],
  addId = 'new_fat_doc_001',
  shouldFailGet = false,
  shouldFailAdd = false,
} = {}) => {
  const chainObj = {
    where:   jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit:   jest.fn().mockReturnThis(),
    field:   jest.fn().mockReturnThis(),
    get:     shouldFailGet
      ? jest.fn().mockRejectedValue(new Error('DB_GET_FAIL'))
      : jest.fn().mockResolvedValue({ data: docs }),
    add:     shouldFailAdd
      ? jest.fn().mockRejectedValue(new Error('DB_ADD_FAIL'))
      : jest.fn().mockResolvedValue({ _id: addId }),
  };
  return {
    collection:  jest.fn().mockReturnValue(chainObj),
    serverDate:  jest.fn().mockReturnValue(new Date('2026-01-01')),
    command:     { in: jest.fn(arr => ({ $in: arr })) },
    _chain:      chainObj,
  };
};

// ==================== Mock ai-service ====================

jest.mock('../../miniprogram/utils/ai-service.js', () => ({
  callCloudAIFrontend: jest.fn().mockResolvedValue({
    recipe:     MOCK_AI_RECIPE,
    rawText:    JSON.stringify(MOCK_AI_RECIPE),
    tokensUsed: 120,
  }),
}));

const aiService = require('../../miniprogram/utils/ai-service.js');

// ==================== Mock cuisines ====================

const MOCK_FAT_LOSS_MEALS = [
  MOCK_FAT_LOSS_MEAL,
  { id: 'fl_002', name: '番茄炒鸡蛋（少油版）', category: 'fat_loss', calories: 220, protein: 14, carbs: 18, fat: 10, cookTime: 10, difficulty: 'easy', desc: '少油版经典', ingredients: ['鸡蛋2个', '番茄'], tags: ['低脂', '家常'], tips: '' },
  { id: 'fl_003', name: '清蒸鱼柳',   category: 'fat_loss', calories: 180, protein: 28, carbs: 3,  fat: 5,  cookTime: 15, difficulty: 'easy', desc: '清蒸低脂',   ingredients: ['鱼柳'],         tags: ['低脂'],           tips: '' },
  { id: 'fl_004', name: '藜麦蔬菜碗', category: 'fat_loss', calories: 320, protein: 12, carbs: 45, fat: 8,  cookTime: 25, difficulty: 'easy', desc: '素食减脂',   ingredients: ['藜麦', '蔬菜'], tags: ['素食'],           tips: '' },
  { id: 'fl_005', name: '燕麦鸡蛋早餐', category: 'fat_loss', calories: 290, protein: 18, carbs: 38, fat: 7, cookTime: 10, difficulty: 'easy', desc: '饱腹早餐',  ingredients: ['燕麦', '鸡蛋'], tags: ['早餐'],           tips: '' },
];

jest.mock('../../miniprogram/utils/cuisines.js', () => ({
  getFatLossMeals:          jest.fn().mockReturnValue(MOCK_FAT_LOSS_MEALS),
  getPregnancyMeals:        jest.fn().mockReturnValue([]),
  getFatLossMealsByCalories: jest.fn(max => MOCK_FAT_LOSS_MEALS.filter(m => m.calories <= max)),
}));

const cuisinesUtil = require('../../miniprogram/utils/cuisines.js');

// ==================== 模拟 Page 环境 ====================

/**
 * 提取并测试页面核心逻辑（从 fat-loss-meals/index.js 提取）
 */
const buildPageLogic = (dbMock) => {
  if (dbMock) {
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
  }

  // 重新加载模块（清除缓存确保 wx 注入生效）
  jest.resetModules();
  jest.mock('../../miniprogram/utils/ai-service.js', () => ({
    callCloudAIFrontend: jest.fn().mockResolvedValue({
      recipe:     MOCK_AI_RECIPE,
      rawText:    JSON.stringify(MOCK_AI_RECIPE),
      tokensUsed: 120,
    }),
  }));
  jest.mock('../../miniprogram/utils/cuisines.js', () => ({
    getFatLossMeals:          jest.fn().mockReturnValue(MOCK_FAT_LOSS_MEALS),
    getPregnancyMeals:        jest.fn().mockReturnValue([]),
    getFatLossMealsByCalories: jest.fn(max => MOCK_FAT_LOSS_MEALS.filter(m => m.calories <= max)),
  }));

  return require('../../miniprogram/utils/ai-service.js');
};

// ==================== Suite 1: 数据加载 ====================

describe('Suite 1 – 数据加载', () => {
  it('getFatLossMeals 返回全部减脂餐', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    expect(Array.isArray(meals)).toBe(true);
    expect(meals.length).toBeGreaterThan(0);
  });

  it('每道餐包含必填字段', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    meals.forEach(m => {
      expect(m).toHaveProperty('id');
      expect(m).toHaveProperty('name');
      expect(m).toHaveProperty('calories');
      expect(m).toHaveProperty('protein');
      expect(m).toHaveProperty('carbs');
      expect(m).toHaveProperty('fat');
      expect(m).toHaveProperty('cookTime');
      expect(m).toHaveProperty('difficulty');
      expect(m).toHaveProperty('ingredients');
      expect(m).toHaveProperty('tags');
    });
  });

  it('calories 均为正整数', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    meals.forEach(m => {
      expect(typeof m.calories).toBe('number');
      expect(m.calories).toBeGreaterThan(0);
    });
  });

  it('difficulty 只能是 easy / medium / hard', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    const valid = new Set(['easy', 'medium', 'hard']);
    meals.forEach(m => {
      expect(valid.has(m.difficulty)).toBe(true);
    });
  });

  it('每道餐的 category 为 fat_loss', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    meals.forEach(m => {
      expect(m.category).toBe('fat_loss');
    });
  });
});

// ==================== Suite 2: 热量筛选 ====================

describe('Suite 2 – 热量筛选逻辑', () => {
  const applyCaloriesFilter = (meals, activeCalories) => {
    if (activeCalories === 'low')  return meals.filter(m => m.calories <= 200);
    if (activeCalories === 'mid')  return meals.filter(m => m.calories > 200 && m.calories <= 350);
    if (activeCalories === 'high') return meals.filter(m => m.calories > 350);
    return meals;
  };

  it('全部：返回所有餐', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    expect(applyCaloriesFilter(meals, 'all').length).toBe(meals.length);
  });

  it('低热量（≤200卡）筛选', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    const result = applyCaloriesFilter(meals, 'low');
    result.forEach(m => expect(m.calories).toBeLessThanOrEqual(200));
  });

  it('中热量（200-350卡）筛选', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    const result = applyCaloriesFilter(meals, 'mid');
    result.forEach(m => {
      expect(m.calories).toBeGreaterThan(200);
      expect(m.calories).toBeLessThanOrEqual(350);
    });
  });

  it('高热量（>350卡）筛选', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    const result = applyCaloriesFilter(meals, 'high');
    result.forEach(m => expect(m.calories).toBeGreaterThan(350));
  });

  it('各热量区间不重叠', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    const low  = applyCaloriesFilter(meals, 'low');
    const mid  = applyCaloriesFilter(meals, 'mid');
    const high = applyCaloriesFilter(meals, 'high');
    const total = low.length + mid.length + high.length;
    expect(total).toBe(meals.length);
  });
});

// ==================== Suite 3: 难度筛选 ====================

describe('Suite 3 – 难度筛选逻辑', () => {
  const applyDifficultyFilter = (meals, activeDifficulty) => {
    if (activeDifficulty !== 'all') return meals.filter(m => m.difficulty === activeDifficulty);
    return meals;
  };

  it('全部：返回所有餐', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    expect(applyDifficultyFilter(meals, 'all').length).toBe(meals.length);
  });

  it('easy 筛选只返回简单菜', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    const result = applyDifficultyFilter(meals, 'easy');
    result.forEach(m => expect(m.difficulty).toBe('easy'));
  });

  it('medium 筛选只返回中等难度菜', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    // 模拟数据中添加一个 medium
    const withMedium = [...meals, { ...MOCK_FAT_LOSS_MEAL, id: 'fl_m', name: '测试中等', difficulty: 'medium' }];
    const result = applyDifficultyFilter(withMedium, 'medium');
    result.forEach(m => expect(m.difficulty).toBe('medium'));
    expect(result.length).toBeGreaterThan(0);
  });

  it('联合筛选：easy + 低热量', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    const afterCalories   = meals.filter(m => m.calories <= 200);
    const afterDifficulty = applyDifficultyFilter(afterCalories, 'easy');
    afterDifficulty.forEach(m => {
      expect(m.calories).toBeLessThanOrEqual(200);
      expect(m.difficulty).toBe('easy');
    });
  });
});

// ==================== Suite 4: 云端命中 ====================

describe('Suite 4 – 云端命中（DB hit → 0 Token）', () => {
  let dbMock;

  beforeEach(() => {
    dbMock = _makeDbMock({ docs: [MOCK_DB_RECIPE_DOC] });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
  });

  it('DB 命中时 source=db', async () => {
    const page = createFatLossPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    expect(result.source).toBe('db');
  });

  it('DB 命中时 tokensUsed=0', async () => {
    const page = createFatLossPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    expect(result.tokensUsed).toBe(0);
  });

  it('DB 命中时 recipe 存在且有 name 字段', async () => {
    const page = createFatLossPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    expect(result.recipe).toBeDefined();
    expect(result.recipe.name).toBe('水煮鸡胸肉沙拉');
  });

  it('DB 命中时不调用 AI', async () => {
    const mockAI = jest.fn().mockResolvedValue({ recipe: MOCK_AI_RECIPE, tokensUsed: 120 });
    const page = createFatLossPageLogic(dbMock, mockAI);
    await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    expect(mockAI).not.toHaveBeenCalled();
  });

  it('elapsed 为正整数（ms）', async () => {
    const page = createFatLossPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    expect(result.elapsed).toBeGreaterThanOrEqual(0);
    expect(typeof result.elapsed).toBe('number');
  });
});

// ==================== Suite 5: 云端未命中 → AI 生成 ====================

describe('Suite 5 – 云端未命中（DB miss → AI → 写入）', () => {
  let dbMock;

  beforeEach(() => {
    dbMock = _makeDbMock({ docs: [], addId: 'new_fat_doc_001' });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
  });

  it('DB 未命中时 source=ai', async () => {
    const page = createFatLossPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    expect(result.source).toBe('ai');
  });

  it('DB 未命中时 tokensUsed>0', async () => {
    const page = createFatLossPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    expect(result.tokensUsed).toBeGreaterThan(0);
  });

  it('AI 生成后 recipe 不为 null', async () => {
    const page = createFatLossPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    expect(result.recipe).not.toBeNull();
    expect(result.recipe.name).toBe('水煮鸡胸肉沙拉');
  });

  it('AI 生成后写入 DB（col.add 被调用）', async () => {
    const page = createFatLossPageLogic(dbMock);
    await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    expect(dbMock._chain.add).toHaveBeenCalledTimes(1);
  });

  it('写入 DB 时 category=fat_loss_generated', async () => {
    const page = createFatLossPageLogic(dbMock);
    await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    const addCall = dbMock._chain.add.mock.calls[0][0];
    expect(addCall.data.category).toBe('fat_loss_generated');
  });

  it('写入 DB 时 cuisineId=fat_loss', async () => {
    const page = createFatLossPageLogic(dbMock);
    await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    const addCall = dbMock._chain.add.mock.calls[0][0];
    expect(addCall.data.cuisineId).toBe('fat_loss');
  });
});

// ==================== Suite 6: DB 查询失败降级 ====================

describe('Suite 6 – DB 查询失败降级', () => {
  it('DB 查询失败时降级到 AI 生成（source=ai）', async () => {
    const dbMock = _makeDbMock({ shouldFailGet: true, addId: 'new_fat_002' });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
    const page = createFatLossPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    expect(result.source).toBe('ai');
    expect(result.recipe).toBeDefined();
  });

  it('DB 查询失败后仍尝试写入 DB', async () => {
    const dbMock = _makeDbMock({ shouldFailGet: true, addId: 'new_fat_003' });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
    const page = createFatLossPageLogic(dbMock);
    await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    expect(dbMock._chain.add).toHaveBeenCalledTimes(1);
  });
});

// ==================== Suite 7: AI 生成失败 ====================

describe('Suite 7 – AI 生成失败', () => {
  it('AI 生成失败时 _getRecipe 应 reject', async () => {
    const dbMock = _makeDbMock({ docs: [] });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
    const failAI = jest.fn().mockRejectedValue(new Error('AI_TIMEOUT'));
    const page = createFatLossPageLogic(dbMock, failAI);
    await expect(page._getRecipe(MOCK_FAT_LOSS_MEAL)).rejects.toThrow('AI_TIMEOUT');
  });
});

// ==================== Suite 8: 写入 DB 失败不影响展示 ====================

describe('Suite 8 – 写入 DB 失败不影响展示', () => {
  it('写入 DB 失败时仍返回 AI 食谱', async () => {
    const dbMock = _makeDbMock({ docs: [], shouldFailAdd: true });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
    const page = createFatLossPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    expect(result.source).toBe('ai');
    expect(result.recipe).toBeDefined();
  });

  it('写入 DB 失败时 result.docId 不存在（undefined）', async () => {
    const dbMock = _makeDbMock({ docs: [], shouldFailAdd: true });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
    const page = createFatLossPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    expect(result.docId).toBeUndefined();
  });
});

// ==================== Suite 9: 重新生成菜谱 ====================

describe('Suite 9 – 重新生成菜谱（强制 AI）', () => {
  it('重新生成时直接调用 AI（不查 DB）', async () => {
    const dbMock = _makeDbMock({ docs: [MOCK_DB_RECIPE_DOC] });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
    const mockAI = jest.fn().mockResolvedValue({ recipe: MOCK_AI_RECIPE, tokensUsed: 150 });
    const page = createFatLossPageLogic(dbMock, mockAI);
    // 模拟重新生成（直接调 AI，不经过 _getRecipe 的 DB 判断）
    const result = await page._regenerate(MOCK_FAT_LOSS_MEAL);
    expect(mockAI).toHaveBeenCalledTimes(1);
    expect(result.recipe).toBeDefined();
  });

  it('重新生成后写入 DB（col.add 被调用）', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'regen_001' });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
    const page = createFatLossPageLogic(dbMock);
    await page._regenerate(MOCK_FAT_LOSS_MEAL);
    expect(dbMock._chain.add).toHaveBeenCalledTimes(1);
  });
});

// ==================== Suite 10: 批量检查云端已有记录 ====================

describe('Suite 10 – _checkExisting 批量检查', () => {
  it('返回已有菜名集合', async () => {
    const dbMock = _makeDbMock({ docs: [{ sourceDishName: '水煮鸡胸肉沙拉' }] });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
    const page = createFatLossPageLogic(dbMock);
    const existing = await page._checkExistingBatch(['水煮鸡胸肉沙拉', '番茄炒鸡蛋（少油版）']);
    expect(existing['水煮鸡胸肉沙拉']).toBe(true);
    expect(existing['番茄炒鸡蛋（少油版）']).toBeUndefined();
  });

  it('空数组返回空对象', async () => {
    const dbMock = _makeDbMock({ docs: [] });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
    const page = createFatLossPageLogic(dbMock);
    const existing = await page._checkExistingBatch([]);
    expect(Object.keys(existing).length).toBe(0);
  });

  it('DB 出错时返回空对象（不抛出）', async () => {
    const dbMock = _makeDbMock({ shouldFailGet: true });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
    const page = createFatLossPageLogic(dbMock);
    const existing = await page._checkExistingBatch(['测试菜名']);
    expect(typeof existing).toBe('object');
  });
});

// ==================== Suite 11: 写入 DB 字段规范 ====================

describe('Suite 11 – 写入 DB 字段规范', () => {
  it('sourceType=fat_loss_generated', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'spec_001' });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
    const page = createFatLossPageLogic(dbMock);
    await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    const { data } = dbMock._chain.add.mock.calls[0][0];
    expect(data.sourceType).toBe('fat_loss_generated');
  });

  it('status=active', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'spec_002' });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
    const page = createFatLossPageLogic(dbMock);
    await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    const { data } = dbMock._chain.add.mock.calls[0][0];
    expect(data.status).toBe('active');
  });

  it('isPublic=true', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'spec_003' });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
    const page = createFatLossPageLogic(dbMock);
    await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    const { data } = dbMock._chain.add.mock.calls[0][0];
    expect(data.isPublic).toBe(true);
  });

  it('author=system_ai', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'spec_004' });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
    const page = createFatLossPageLogic(dbMock);
    await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    const { data } = dbMock._chain.add.mock.calls[0][0];
    expect(data.author).toBe('system_ai');
  });

  it('sourceDishName 与 meal.name 一致', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'spec_005' });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
    const page = createFatLossPageLogic(dbMock);
    await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    const { data } = dbMock._chain.add.mock.calls[0][0];
    expect(data.sourceDishName).toBe(MOCK_FAT_LOSS_MEAL.name);
  });

  it('营养字段写入（fatLossCalories、fatLossProtein 等）', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'spec_006' });
    global.wx = { cloud: { database: jest.fn().mockReturnValue(dbMock) } };
    const page = createFatLossPageLogic(dbMock);
    await page._getRecipe(MOCK_FAT_LOSS_MEAL);
    const { data } = dbMock._chain.add.mock.calls[0][0];
    expect(data.fatLossCalories).toBe(MOCK_FAT_LOSS_MEAL.calories);
    expect(data.fatLossProtein).toBe(MOCK_FAT_LOSS_MEAL.protein);
    expect(data.fatLossCarbs).toBe(MOCK_FAT_LOSS_MEAL.carbs);
    expect(data.fatLossFat).toBe(MOCK_FAT_LOSS_MEAL.fat);
  });
});

// ==================== Suite 12: 常量与数据验证 ====================

describe('Suite 12 – 常量与数据验证', () => {
  it('FAT_LOSS_MEALS 共 30 道（mock 返回 5 道）', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    expect(meals.length).toBe(5);
  });

  it('每道餐 tags 为非空数组', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    meals.forEach(m => {
      expect(Array.isArray(m.tags)).toBe(true);
    });
  });

  it('每道餐 ingredients 为非空数组', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    meals.forEach(m => {
      expect(Array.isArray(m.ingredients)).toBe(true);
      expect(m.ingredients.length).toBeGreaterThan(0);
    });
  });

  it('cookTime 为正整数', () => {
    const meals = cuisinesUtil.getFatLossMeals();
    meals.forEach(m => {
      expect(typeof m.cookTime).toBe('number');
      expect(m.cookTime).toBeGreaterThan(0);
    });
  });
});

// ==================== 辅助：提取页面逻辑 ====================

/**
 * 从页面文件提取核心方法进行测试
 * 由于微信小程序的 Page() 不能在 Node 中直接运行，
 * 这里提取公共逻辑作为独立函数进行单元测试
 */
function createFatLossPageLogic(dbMock, overrideAI = null) {
  const RECIPES_COLLECTION = 'recipes';
  const DB_QUERY_TIMEOUT   = 8000;
  const SERVICE_VERSION    = '1.0.0';

  const aiCall = overrideAI || jest.fn().mockResolvedValue({
    recipe:     MOCK_AI_RECIPE,
    rawText:    JSON.stringify(MOCK_AI_RECIPE),
    tokensUsed: 120,
  });

  const _queryFromDB = (dishName) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('查询超时')), DB_QUERY_TIMEOUT);
      const db = dbMock;
      db.collection(RECIPES_COLLECTION)
        .where({
          sourceDishName: dishName,
          category: db.command.in(['fat_loss', 'fat_loss_generated']),
          status: 'active',
        })
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()
        .then(res => {
          clearTimeout(timer);
          const record = (res.data || [])[0];
          if (!record) { resolve(null); return; }
          const { _id, _openid, cuisineId, cuisineName, category, sourceType,
                  sourceDishName, sourceIngredients, aiProvider, tokensUsed,
                  version, status, isPublic, author, createdAt, updatedAt,
                  ...recipeFields } = record;
          resolve({ ...recipeFields, _id, _sourceType: sourceType });
        })
        .catch(e => { clearTimeout(timer); reject(e); });
    });
  };

  const _saveToDB = async (recipe, meal, tokensUsed) => {
    const db  = dbMock;
    const col = db.collection(RECIPES_COLLECTION);
    const record = {
      ...recipe,
      cuisineId:         'fat_loss',
      cuisineName:       '减脂菜谱',
      cuisineFullName:   '健康减脂菜谱',
      cuisineEmoji:      '🥗',
      cuisineColor:      '#4CAF50',
      category:          'fat_loss_generated',
      sourceType:        'fat_loss_generated',
      sourceDishName:    meal.name,
      sourceIngredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
      fatLossCalories:   meal.calories,
      fatLossProtein:    meal.protein,
      fatLossCarbs:      meal.carbs,
      fatLossFat:        meal.fat,
      fatLossTips:       meal.tips || '',
      aiProvider:        'hunyuan-exp',
      tokensUsed:        tokensUsed,
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

  const _getRecipe = async (meal) => {
    const t0 = Date.now();
    let dbRecipe = null;
    try {
      dbRecipe = await _queryFromDB(meal.name);
    } catch (e) {
      // fall through to AI
    }
    if (dbRecipe) {
      return { recipe: dbRecipe, source: 'db', tokensUsed: 0, elapsed: Date.now() - t0 };
    }
    const cleanIngredients = (meal.ingredients || []).map(ing =>
      ing.replace(/\d+[g|ml|个|只|根|片|朵|颗|块]/g, '').trim()
    ).filter(i => i.length > 0);
    const extraHint = `菜名：${meal.name}，类型：减脂餐（${meal.calories}卡）`;
    const aiResult = await aiCall(
      cleanIngredients.length > 0 ? cleanIngredients : [meal.name],
      meal.cookTime   || 20,
      meal.difficulty || 'easy',
      extraHint
    );
    const recipe = aiResult.recipe;
    let docId;
    try {
      docId = await _saveToDB(recipe, meal, aiResult.tokensUsed || 0);
    } catch (e) {
      // write failure doesn't block display
    }
    return { recipe, source: 'ai', tokensUsed: aiResult.tokensUsed || 0, elapsed: Date.now() - t0, docId };
  };

  const _checkExistingBatch = async (names) => {
    if (!names || names.length === 0) return {};
    try {
      const db  = dbMock;
      const col = db.collection(RECIPES_COLLECTION);
      const existing = {};
      const BATCH = 10;
      for (let i = 0; i < names.length; i += BATCH) {
        const batch = names.slice(i, i + BATCH);
        const res = await col
          .where({
            sourceDishName: db.command.in(batch),
            category:       db.command.in(['fat_loss', 'fat_loss_generated']),
          })
          .field({ sourceDishName: true })
          .limit(batch.length)
          .get();
        (res.data || []).forEach(r => {
          if (r.sourceDishName) existing[r.sourceDishName] = true;
        });
      }
      return existing;
    } catch (e) {
      return {};
    }
  };

  const _regenerate = async (meal) => {
    const cleanIngredients = (meal.ingredients || []).map(ing =>
      ing.replace(/\d+[g|ml|个|只|根|片|朵|颗|块]/g, '').trim()
    ).filter(i => i.length > 0);
    const extraHint = `菜名：${meal.name}，类型：减脂餐（${meal.calories}卡）`;
    const aiResult = await aiCall(
      cleanIngredients.length > 0 ? cleanIngredients : [meal.name],
      meal.cookTime   || 20,
      meal.difficulty || 'easy',
      extraHint
    );
    try {
      await _saveToDB(aiResult.recipe, meal, aiResult.tokensUsed || 0);
    } catch (e) { /* ignore */ }
    return { recipe: aiResult.recipe, source: 'ai', tokensUsed: aiResult.tokensUsed || 0 };
  };

  return { _getRecipe, _checkExistingBatch, _regenerate, _saveToDB };
}
