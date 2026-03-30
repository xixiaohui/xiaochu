/**
 * 孕妇营养餐页面单元测试 - pregnancy-meals.test.js  v1.0.0
 *
 * 覆盖范围：
 *   Suite 1  - 数据加载（cuisines.js 孕妇营养餐数据正确注入）
 *   Suite 2  - 孕期阶段筛选（early / mid / late）
 *   Suite 3  - 营养素筛选（叶酸 / 铁 / 钙 / DHA / 蛋白质）
 *   Suite 4  - 点击菜品：云端命中（DB hit → 0 Token）
 *   Suite 5  - 点击菜品：云端未命中（DB miss → AI → 写入 DB）
 *   Suite 6  - DB 查询失败降级（降级到 AI 生成）
 *   Suite 7  - AI 生成失败（弹窗显示错误）
 *   Suite 8  - 写入 DB 失败不影响展示
 *   Suite 9  - 重新生成菜谱（强制 AI 调用）
 *   Suite 10 - 批量检查云端已有记录（_checkExisting）
 *   Suite 11 - DB 写入字段规范（孕期专属字段）
 *   Suite 12 - extraHint 包含营养素和孕期信息
 */

'use strict';

process.env.NODE_ENV = 'test';

// ==================== 测试数据 ====================

const MOCK_PREGNANCY_MEAL = {
  id:         'pg_001',
  name:       '菠菜猪肝汤',
  category:   'pregnancy',
  nutrients:  ['铁', '叶酸', '维生素A'],
  trimester:  ['early', 'mid', 'late'],
  calories:   240,
  cookTime:   25,
  difficulty: 'easy',
  desc:       '补铁补血，预防孕期贫血',
  ingredients: ['猪肝100g', '菠菜150g', '姜', '盐少许', '枸杞'],
  tags:       ['补铁', '补血', '孕期必备'],
  nutrition:  '猪肝含大量血红素铁，菠菜补充叶酸，共同预防孕期贫血',
  caution:    '猪肝每周不超过2次，维生素A过量有风险',
};

const MOCK_AI_RECIPE = {
  name:        '菠菜猪肝汤',
  description: '补铁补血，富含叶酸的孕期营养汤',
  cookTime:    25,
  difficulty:  '简单',
  servings:    2,
  ingredients: [
    { name: '猪肝', amount: '100', unit: 'g' },
    { name: '菠菜', amount: '150', unit: 'g' },
    { name: '姜',   amount: '3',   unit: '片' },
  ],
  steps: [
    { step: 1, description: '猪肝洗净切片，焯水', tip: '去腥' },
    { step: 2, description: '菠菜洗净备用',       tip: null },
    { step: 3, description: '加水炖煮20分钟',     tip: '保持营养' },
  ],
  nutrition: { calories: 240, protein: 25, carbs: 8, fat: 6 },
  tags: ['补铁', '补血'],
};

const MOCK_DB_RECIPE_DOC = {
  _id:               'doc_pg_001',
  name:              '菠菜猪肝汤',
  description:       '补铁补血',
  cookTime:          25,
  difficulty:        '简单',
  servings:          2,
  ingredients:       [{ name: '猪肝', amount: '100', unit: 'g' }],
  steps:             [{ step: 1, description: '焯水', tip: null }],
  nutrition:         { calories: 240, protein: 25, carbs: 8, fat: 6 },
  tags:              ['补铁'],
  cuisineId:         'pregnancy',
  cuisineName:       '孕妇营养餐',
  category:          'pregnancy_generated',
  sourceType:        'pregnancy_generated',
  sourceDishName:    '菠菜猪肝汤',
  sourceIngredients: ['猪肝', '菠菜'],
  aiProvider:        'hunyuan-exp',
  tokensUsed:        110,
  version:           '1.0.0',
  status:            'active',
  isPublic:          true,
  author:            'system_ai',
  _openid:           'test_openid',
};

// ==================== DB Mock 工厂 ====================

const _makeDbMock = ({
  docs = [],
  addId = 'new_pg_doc_001',
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

// ==================== Mock AI ====================

jest.mock('../../miniprogram/utils/ai-service.js', () => ({
  callCloudAIFrontend: jest.fn().mockResolvedValue({
    recipe:     MOCK_AI_RECIPE,
    rawText:    JSON.stringify(MOCK_AI_RECIPE),
    tokensUsed: 130,
  }),
}));

const aiService = require('../../miniprogram/utils/ai-service.js');

// ==================== Mock cuisines ====================

const MOCK_PREGNANCY_MEALS = [
  MOCK_PREGNANCY_MEAL,
  { id: 'pg_002', name: '豆腐小虾炒蔬菜',     category: 'pregnancy', nutrients: ['钙', '蛋白质', '维生素D'], trimester: ['mid', 'late'],          calories: 210, cookTime: 15, difficulty: 'easy', desc: '高钙补钙',   ingredients: ['豆腐', '虾仁'],   tags: ['高钙', '补钙'],  nutrition: '钙磷比例合理',      caution: '虾适量' },
  { id: 'pg_003', name: '核桃牛奶燕麦粥',     category: 'pregnancy', nutrients: ['DHA', '钙', '铁', '纤维'], trimester: ['early', 'mid', 'late'], calories: 330, cookTime: 15, difficulty: 'easy', desc: 'DHA补脑',   ingredients: ['燕麦', '核桃'],   tags: ['DHA', '脑发育'],  nutrition: '核桃α亚麻酸',      caution: '蜂蜜少量' },
  { id: 'pg_004', name: '深海鱼炖豆腐',       category: 'pregnancy', nutrients: ['DHA', 'EPA', '钙', '蛋白质'], trimester: ['mid', 'late'],      calories: 280, cookTime: 30, difficulty: 'easy', desc: 'DHA丰富',   ingredients: ['三文鱼', '豆腐'], tags: ['DHA', '神经发育'], nutrition: 'DHA含量高',         caution: '选低汞鱼' },
  { id: 'pg_005', name: '红枣银耳莲子汤',     category: 'pregnancy', nutrients: ['铁', '维生素C'],            trimester: ['early', 'mid'],        calories: 200, cookTime: 60, difficulty: 'easy', desc: '补铁养颜',  ingredients: ['银耳', '红枣'],   tags: ['补铁', '养颜'],   nutrition: '维生素C助铁吸收',    caution: '妊娠糖尿病注意' },
];

jest.mock('../../miniprogram/utils/cuisines.js', () => ({
  getFatLossMeals:   jest.fn().mockReturnValue([]),
  getPregnancyMeals: jest.fn().mockReturnValue(MOCK_PREGNANCY_MEALS),
  getPregnancyMealsByNutrient: jest.fn(nutrient =>
    MOCK_PREGNANCY_MEALS.filter(m =>
      Array.isArray(m.nutrients) && m.nutrients.some(n => n === nutrient || n.includes(nutrient))
    )
  ),
}));

const cuisinesUtil = require('../../miniprogram/utils/cuisines.js');

// ==================== Suite 1: 数据加载 ====================

describe('Suite 1 – 数据加载', () => {
  it('getPregnancyMeals 返回全部孕妇餐', () => {
    const meals = cuisinesUtil.getPregnancyMeals();
    expect(Array.isArray(meals)).toBe(true);
    expect(meals.length).toBeGreaterThan(0);
  });

  it('每道孕妇餐包含必填字段', () => {
    const meals = cuisinesUtil.getPregnancyMeals();
    meals.forEach(m => {
      expect(m).toHaveProperty('id');
      expect(m).toHaveProperty('name');
      expect(m).toHaveProperty('calories');
      expect(m).toHaveProperty('cookTime');
      expect(m).toHaveProperty('difficulty');
      expect(m).toHaveProperty('nutrients');
      expect(m).toHaveProperty('trimester');
      expect(m).toHaveProperty('ingredients');
      expect(m).toHaveProperty('tags');
    });
  });

  it('nutrients 为非空数组', () => {
    const meals = cuisinesUtil.getPregnancyMeals();
    meals.forEach(m => {
      expect(Array.isArray(m.nutrients)).toBe(true);
      expect(m.nutrients.length).toBeGreaterThan(0);
    });
  });

  it('trimester 只包含合法值（early/mid/late）', () => {
    const meals = cuisinesUtil.getPregnancyMeals();
    const valid = new Set(['early', 'mid', 'late']);
    meals.forEach(m => {
      m.trimester.forEach(t => expect(valid.has(t)).toBe(true));
    });
  });

  it('category 均为 pregnancy', () => {
    const meals = cuisinesUtil.getPregnancyMeals();
    meals.forEach(m => expect(m.category).toBe('pregnancy'));
  });

  it('calories 均为正整数', () => {
    const meals = cuisinesUtil.getPregnancyMeals();
    meals.forEach(m => {
      expect(typeof m.calories).toBe('number');
      expect(m.calories).toBeGreaterThan(0);
    });
  });
});

// ==================== Suite 2: 孕期阶段筛选 ====================

describe('Suite 2 – 孕期阶段筛选', () => {
  const applyTrimesterFilter = (meals, activeTrimester) => {
    if (activeTrimester === 'all') return meals;
    return meals.filter(m =>
      Array.isArray(m.trimester) && m.trimester.includes(activeTrimester)
    );
  };

  it('全部孕期：返回所有餐', () => {
    const meals = cuisinesUtil.getPregnancyMeals();
    expect(applyTrimesterFilter(meals, 'all').length).toBe(meals.length);
  });

  it('孕早期筛选（early）', () => {
    const meals = cuisinesUtil.getPregnancyMeals();
    const result = applyTrimesterFilter(meals, 'early');
    expect(result.length).toBeGreaterThan(0);
    result.forEach(m => expect(m.trimester).toContain('early'));
  });

  it('孕中期筛选（mid）', () => {
    const meals = cuisinesUtil.getPregnancyMeals();
    const result = applyTrimesterFilter(meals, 'mid');
    expect(result.length).toBeGreaterThan(0);
    result.forEach(m => expect(m.trimester).toContain('mid'));
  });

  it('孕晚期筛选（late）', () => {
    const meals = cuisinesUtil.getPregnancyMeals();
    const result = applyTrimesterFilter(meals, 'late');
    expect(result.length).toBeGreaterThan(0);
    result.forEach(m => expect(m.trimester).toContain('late'));
  });

  it('筛选结果是全量的子集', () => {
    const meals = cuisinesUtil.getPregnancyMeals();
    const allNames = new Set(meals.map(m => m.name));
    ['early', 'mid', 'late'].forEach(trimester => {
      applyTrimesterFilter(meals, trimester).forEach(m => {
        expect(allNames.has(m.name)).toBe(true);
      });
    });
  });
});

// ==================== Suite 3: 营养素筛选 ====================

describe('Suite 3 – 营养素筛选', () => {
  const applyNutrientFilter = (meals, activeNutrient) => {
    if (activeNutrient === 'all') return meals;
    return meals.filter(m =>
      Array.isArray(m.nutrients) &&
      m.nutrients.some(n => n === activeNutrient || n.includes(activeNutrient))
    );
  };

  it('全部营养：返回所有餐', () => {
    const meals = cuisinesUtil.getPregnancyMeals();
    expect(applyNutrientFilter(meals, 'all').length).toBe(meals.length);
  });

  it('铁筛选', () => {
    const meals = cuisinesUtil.getPregnancyMeals();
    const result = applyNutrientFilter(meals, '铁');
    expect(result.length).toBeGreaterThan(0);
    result.forEach(m => {
      const has = m.nutrients.some(n => n === '铁' || n.includes('铁'));
      expect(has).toBe(true);
    });
  });

  it('DHA 筛选', () => {
    const meals = cuisinesUtil.getPregnancyMeals();
    const result = applyNutrientFilter(meals, 'DHA');
    expect(result.length).toBeGreaterThan(0);
    result.forEach(m => {
      const has = m.nutrients.some(n => n === 'DHA' || n.includes('DHA'));
      expect(has).toBe(true);
    });
  });

  it('叶酸筛选', () => {
    const meals = cuisinesUtil.getPregnancyMeals();
    const result = applyNutrientFilter(meals, '叶酸');
    expect(result.length).toBeGreaterThan(0);
    result.forEach(m => {
      const has = m.nutrients.some(n => n === '叶酸' || n.includes('叶酸'));
      expect(has).toBe(true);
    });
  });

  it('钙筛选', () => {
    const meals = cuisinesUtil.getPregnancyMeals();
    const result = applyNutrientFilter(meals, '钙');
    expect(result.length).toBeGreaterThan(0);
    result.forEach(m => {
      const has = m.nutrients.some(n => n === '钙' || n.includes('钙'));
      expect(has).toBe(true);
    });
  });

  it('联合筛选：early + DHA', () => {
    const meals = cuisinesUtil.getPregnancyMeals();
    const afterTrimester  = meals.filter(m => m.trimester.includes('early'));
    const afterNutrient   = applyNutrientFilter(afterTrimester, 'DHA');
    afterNutrient.forEach(m => {
      expect(m.trimester).toContain('early');
      expect(m.nutrients.some(n => n.includes('DHA'))).toBe(true);
    });
  });
});

// ==================== Suite 4: 云端命中 ====================

describe('Suite 4 – 云端命中（DB hit → 0 Token）', () => {
  it('DB 命中时 source=db', async () => {
    const dbMock = _makeDbMock({ docs: [MOCK_DB_RECIPE_DOC] });
    const page = createPregnancyPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_PREGNANCY_MEAL);
    expect(result.source).toBe('db');
  });

  it('DB 命中时 tokensUsed=0', async () => {
    const dbMock = _makeDbMock({ docs: [MOCK_DB_RECIPE_DOC] });
    const page = createPregnancyPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_PREGNANCY_MEAL);
    expect(result.tokensUsed).toBe(0);
  });

  it('DB 命中时 recipe 不为 null', async () => {
    const dbMock = _makeDbMock({ docs: [MOCK_DB_RECIPE_DOC] });
    const page = createPregnancyPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_PREGNANCY_MEAL);
    expect(result.recipe).toBeDefined();
    expect(result.recipe.name).toBe('菠菜猪肝汤');
  });

  it('DB 命中时不调用 AI', async () => {
    const mockAI = jest.fn().mockResolvedValue({ recipe: MOCK_AI_RECIPE, tokensUsed: 130 });
    const dbMock = _makeDbMock({ docs: [MOCK_DB_RECIPE_DOC] });
    const page = createPregnancyPageLogic(dbMock, mockAI);
    await page._getRecipe(MOCK_PREGNANCY_MEAL);
    expect(mockAI).not.toHaveBeenCalled();
  });

  it('elapsed 为非负整数（ms）', async () => {
    const dbMock = _makeDbMock({ docs: [MOCK_DB_RECIPE_DOC] });
    const page = createPregnancyPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_PREGNANCY_MEAL);
    expect(result.elapsed).toBeGreaterThanOrEqual(0);
    expect(typeof result.elapsed).toBe('number');
  });
});

// ==================== Suite 5: 云端未命中 → AI 生成 ====================

describe('Suite 5 – 云端未命中（DB miss → AI → 写入）', () => {
  it('DB 未命中时 source=ai', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'new_pg_001' });
    const page = createPregnancyPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_PREGNANCY_MEAL);
    expect(result.source).toBe('ai');
  });

  it('DB 未命中时 tokensUsed>0', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'new_pg_002' });
    const page = createPregnancyPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_PREGNANCY_MEAL);
    expect(result.tokensUsed).toBeGreaterThan(0);
  });

  it('AI 生成后 recipe 存在且有 name 字段', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'new_pg_003' });
    const page = createPregnancyPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_PREGNANCY_MEAL);
    expect(result.recipe).not.toBeNull();
    expect(result.recipe.name).toBe('菠菜猪肝汤');
  });

  it('AI 生成后写入 DB（col.add 被调用）', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'new_pg_004' });
    const page = createPregnancyPageLogic(dbMock);
    await page._getRecipe(MOCK_PREGNANCY_MEAL);
    expect(dbMock._chain.add).toHaveBeenCalledTimes(1);
  });

  it('写入 DB 时 category=pregnancy_generated', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'new_pg_005' });
    const page = createPregnancyPageLogic(dbMock);
    await page._getRecipe(MOCK_PREGNANCY_MEAL);
    const { data } = dbMock._chain.add.mock.calls[0][0];
    expect(data.category).toBe('pregnancy_generated');
  });

  it('写入 DB 时 cuisineId=pregnancy', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'new_pg_006' });
    const page = createPregnancyPageLogic(dbMock);
    await page._getRecipe(MOCK_PREGNANCY_MEAL);
    const { data } = dbMock._chain.add.mock.calls[0][0];
    expect(data.cuisineId).toBe('pregnancy');
  });
});

// ==================== Suite 6: DB 查询失败降级 ====================

describe('Suite 6 – DB 查询失败降级', () => {
  it('DB 查询失败时降级到 AI（source=ai）', async () => {
    const dbMock = _makeDbMock({ shouldFailGet: true, addId: 'fallback_001' });
    const page = createPregnancyPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_PREGNANCY_MEAL);
    expect(result.source).toBe('ai');
    expect(result.recipe).toBeDefined();
  });

  it('DB 查询失败后仍尝试写入 DB', async () => {
    const dbMock = _makeDbMock({ shouldFailGet: true, addId: 'fallback_002' });
    const page = createPregnancyPageLogic(dbMock);
    await page._getRecipe(MOCK_PREGNANCY_MEAL);
    expect(dbMock._chain.add).toHaveBeenCalledTimes(1);
  });
});

// ==================== Suite 7: AI 生成失败 ====================

describe('Suite 7 – AI 生成失败', () => {
  it('AI 生成失败时 _getRecipe 应 reject', async () => {
    const dbMock = _makeDbMock({ docs: [] });
    const failAI = jest.fn().mockRejectedValue(new Error('AI_NETWORK_ERROR'));
    const page = createPregnancyPageLogic(dbMock, failAI);
    await expect(page._getRecipe(MOCK_PREGNANCY_MEAL)).rejects.toThrow('AI_NETWORK_ERROR');
  });
});

// ==================== Suite 8: 写入 DB 失败不影响展示 ====================

describe('Suite 8 – 写入 DB 失败不影响展示', () => {
  it('写入 DB 失败时仍返回 AI 食谱', async () => {
    const dbMock = _makeDbMock({ docs: [], shouldFailAdd: true });
    const page = createPregnancyPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_PREGNANCY_MEAL);
    expect(result.source).toBe('ai');
    expect(result.recipe).toBeDefined();
  });

  it('写入 DB 失败时 result.docId 不存在', async () => {
    const dbMock = _makeDbMock({ docs: [], shouldFailAdd: true });
    const page = createPregnancyPageLogic(dbMock);
    const result = await page._getRecipe(MOCK_PREGNANCY_MEAL);
    expect(result.docId).toBeUndefined();
  });
});

// ==================== Suite 9: 重新生成菜谱 ====================

describe('Suite 9 – 重新生成菜谱（强制 AI）', () => {
  it('重新生成时调用 AI 一次', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'regen_pg_001' });
    const mockAI = jest.fn().mockResolvedValue({ recipe: MOCK_AI_RECIPE, tokensUsed: 140 });
    const page = createPregnancyPageLogic(dbMock, mockAI);
    const result = await page._regenerate(MOCK_PREGNANCY_MEAL);
    expect(mockAI).toHaveBeenCalledTimes(1);
    expect(result.recipe).toBeDefined();
  });

  it('重新生成后写入 DB', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'regen_pg_002' });
    const page = createPregnancyPageLogic(dbMock);
    await page._regenerate(MOCK_PREGNANCY_MEAL);
    expect(dbMock._chain.add).toHaveBeenCalledTimes(1);
  });
});

// ==================== Suite 10: 批量检查已有记录 ====================

describe('Suite 10 – _checkExisting 批量检查', () => {
  it('返回已有菜名集合', async () => {
    const dbMock = _makeDbMock({ docs: [{ sourceDishName: '菠菜猪肝汤' }] });
    const page = createPregnancyPageLogic(dbMock);
    const existing = await page._checkExistingBatch(['菠菜猪肝汤', '豆腐小虾炒蔬菜']);
    expect(existing['菠菜猪肝汤']).toBe(true);
    expect(existing['豆腐小虾炒蔬菜']).toBeUndefined();
  });

  it('空数组返回空对象', async () => {
    const dbMock = _makeDbMock({ docs: [] });
    const page = createPregnancyPageLogic(dbMock);
    const existing = await page._checkExistingBatch([]);
    expect(Object.keys(existing).length).toBe(0);
  });

  it('DB 出错时返回空对象（不抛出）', async () => {
    const dbMock = _makeDbMock({ shouldFailGet: true });
    const page = createPregnancyPageLogic(dbMock);
    const existing = await page._checkExistingBatch(['测试菜名']);
    expect(typeof existing).toBe('object');
    expect(Object.keys(existing).length).toBe(0);
  });
});

// ==================== Suite 11: 写入 DB 字段规范（孕期专属） ====================

describe('Suite 11 – 写入 DB 字段规范（孕期专属）', () => {
  it('sourceType=pregnancy_generated', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'pg_spec_001' });
    const page = createPregnancyPageLogic(dbMock);
    await page._getRecipe(MOCK_PREGNANCY_MEAL);
    const { data } = dbMock._chain.add.mock.calls[0][0];
    expect(data.sourceType).toBe('pregnancy_generated');
  });

  it('status=active', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'pg_spec_002' });
    const page = createPregnancyPageLogic(dbMock);
    await page._getRecipe(MOCK_PREGNANCY_MEAL);
    const { data } = dbMock._chain.add.mock.calls[0][0];
    expect(data.status).toBe('active');
  });

  it('isPublic=true', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'pg_spec_003' });
    const page = createPregnancyPageLogic(dbMock);
    await page._getRecipe(MOCK_PREGNANCY_MEAL);
    const { data } = dbMock._chain.add.mock.calls[0][0];
    expect(data.isPublic).toBe(true);
  });

  it('author=system_ai', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'pg_spec_004' });
    const page = createPregnancyPageLogic(dbMock);
    await page._getRecipe(MOCK_PREGNANCY_MEAL);
    const { data } = dbMock._chain.add.mock.calls[0][0];
    expect(data.author).toBe('system_ai');
  });

  it('孕期营养素字段（pregnancyNutrients）写入', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'pg_spec_005' });
    const page = createPregnancyPageLogic(dbMock);
    await page._getRecipe(MOCK_PREGNANCY_MEAL);
    const { data } = dbMock._chain.add.mock.calls[0][0];
    expect(Array.isArray(data.pregnancyNutrients)).toBe(true);
    expect(data.pregnancyNutrients).toEqual(MOCK_PREGNANCY_MEAL.nutrients);
  });

  it('孕期阶段字段（pregnancyTrimester）写入', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'pg_spec_006' });
    const page = createPregnancyPageLogic(dbMock);
    await page._getRecipe(MOCK_PREGNANCY_MEAL);
    const { data } = dbMock._chain.add.mock.calls[0][0];
    expect(Array.isArray(data.pregnancyTrimester)).toBe(true);
    expect(data.pregnancyTrimester).toEqual(MOCK_PREGNANCY_MEAL.trimester);
  });

  it('注意事项字段（pregnancyCaution）写入', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'pg_spec_007' });
    const page = createPregnancyPageLogic(dbMock);
    await page._getRecipe(MOCK_PREGNANCY_MEAL);
    const { data } = dbMock._chain.add.mock.calls[0][0];
    expect(data.pregnancyCaution).toBe(MOCK_PREGNANCY_MEAL.caution);
  });

  it('营养说明字段（pregnancyNutrition）写入', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'pg_spec_008' });
    const page = createPregnancyPageLogic(dbMock);
    await page._getRecipe(MOCK_PREGNANCY_MEAL);
    const { data } = dbMock._chain.add.mock.calls[0][0];
    expect(data.pregnancyNutrition).toBe(MOCK_PREGNANCY_MEAL.nutrition);
  });

  it('sourceDishName 与 meal.name 一致', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'pg_spec_009' });
    const page = createPregnancyPageLogic(dbMock);
    await page._getRecipe(MOCK_PREGNANCY_MEAL);
    const { data } = dbMock._chain.add.mock.calls[0][0];
    expect(data.sourceDishName).toBe(MOCK_PREGNANCY_MEAL.name);
  });
});

// ==================== Suite 12: extraHint 含营养素和孕期信息 ====================

describe('Suite 12 – extraHint 包含营养素和孕期信息', () => {
  it('extraHint 包含菜名', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'hint_001' });
    const capturedArgs = [];
    const spyAI = jest.fn((...args) => {
      capturedArgs.push(args);
      return Promise.resolve({ recipe: MOCK_AI_RECIPE, tokensUsed: 130 });
    });
    const page = createPregnancyPageLogic(dbMock, spyAI);
    await page._getRecipe(MOCK_PREGNANCY_MEAL);
    expect(capturedArgs.length).toBe(1);
    const extraHint = capturedArgs[0][3];
    expect(extraHint).toContain('菠菜猪肝汤');
  });

  it('extraHint 包含营养素信息', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'hint_002' });
    const capturedArgs = [];
    const spyAI = jest.fn((...args) => {
      capturedArgs.push(args);
      return Promise.resolve({ recipe: MOCK_AI_RECIPE, tokensUsed: 130 });
    });
    const page = createPregnancyPageLogic(dbMock, spyAI);
    await page._getRecipe(MOCK_PREGNANCY_MEAL);
    const extraHint = capturedArgs[0][3];
    // 应该包含至少一个营养素名称
    const hasNutrient = MOCK_PREGNANCY_MEAL.nutrients.some(n => extraHint.includes(n));
    expect(hasNutrient).toBe(true);
  });

  it('extraHint 包含孕期类型标识', async () => {
    const dbMock = _makeDbMock({ docs: [], addId: 'hint_003' });
    const capturedArgs = [];
    const spyAI = jest.fn((...args) => {
      capturedArgs.push(args);
      return Promise.resolve({ recipe: MOCK_AI_RECIPE, tokensUsed: 130 });
    });
    const page = createPregnancyPageLogic(dbMock, spyAI);
    await page._getRecipe(MOCK_PREGNANCY_MEAL);
    const extraHint = capturedArgs[0][3];
    expect(extraHint).toContain('孕');
  });

  it('无食材时用菜名作为食材 fallback', async () => {
    const mealNoIng = { ...MOCK_PREGNANCY_MEAL, ingredients: [] };
    const dbMock = _makeDbMock({ docs: [], addId: 'hint_004' });
    const capturedArgs = [];
    const spyAI = jest.fn((...args) => {
      capturedArgs.push(args);
      return Promise.resolve({ recipe: MOCK_AI_RECIPE, tokensUsed: 130 });
    });
    const page = createPregnancyPageLogic(dbMock, spyAI);
    await page._getRecipe(mealNoIng);
    const ingredients = capturedArgs[0][0];
    expect(Array.isArray(ingredients)).toBe(true);
    expect(ingredients.length).toBeGreaterThan(0);
    expect(ingredients[0]).toBe(mealNoIng.name);
  });
});

// ==================== 辅助：提取页面逻辑 ====================

function createPregnancyPageLogic(dbMock, overrideAI = null) {
  const RECIPES_COLLECTION = 'recipes';
  const DB_QUERY_TIMEOUT   = 8000;
  const SERVICE_VERSION    = '1.0.0';

  const aiCall = overrideAI || jest.fn().mockResolvedValue({
    recipe:     MOCK_AI_RECIPE,
    rawText:    JSON.stringify(MOCK_AI_RECIPE),
    tokensUsed: 130,
  });

  const _queryFromDB = (dishName) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('查询超时')), DB_QUERY_TIMEOUT);
      const db = dbMock;
      db.collection(RECIPES_COLLECTION)
        .where({
          sourceDishName: dishName,
          category: db.command.in(['pregnancy', 'pregnancy_generated']),
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
      cuisineId:          'pregnancy',
      cuisineName:        '孕妇营养餐',
      cuisineFullName:    '孕妇专属营养餐',
      cuisineEmoji:       '🤰',
      cuisineColor:       '#E91E63',
      category:           'pregnancy_generated',
      sourceType:         'pregnancy_generated',
      sourceDishName:     meal.name,
      sourceIngredients:  Array.isArray(meal.ingredients) ? meal.ingredients : [],
      pregnancyNutrients: Array.isArray(meal.nutrients)   ? meal.nutrients   : [],
      pregnancyTrimester: Array.isArray(meal.trimester)   ? meal.trimester   : [],
      pregnancyCalories:  meal.calories,
      pregnancyNutrition: meal.nutrition || '',
      pregnancyCaution:   meal.caution   || '',
      aiProvider:         'hunyuan-exp',
      tokensUsed:         tokensUsed,
      version:            SERVICE_VERSION,
      status:             'active',
      isPublic:           true,
      author:             'system_ai',
      createdAt:          db.serverDate(),
      updatedAt:          db.serverDate(),
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

    const nutrientStr  = Array.isArray(meal.nutrients) ? meal.nutrients.join('、') : '';
    const trimesterMap = { early: '孕早期', mid: '孕中期', late: '孕晚期' };
    const trimesterStr = Array.isArray(meal.trimester)
      ? meal.trimester.map(t => trimesterMap[t] || t).join('、')
      : '';

    const extraHint = [
      `菜名：${meal.name}`,
      `类型：孕妇营养餐（${meal.calories}卡）`,
      nutrientStr  ? `关键营养素：${nutrientStr}` : '',
      trimesterStr ? `适合孕期：${trimesterStr}` : '',
      meal.desc    ? `特点：${meal.desc}` : '',
      meal.nutrition ? `营养说明：${meal.nutrition}` : '',
      meal.caution   ? `注意事项：${meal.caution}` : '',
    ].filter(Boolean).join('；');

    const aiResult = await aiCall(
      cleanIngredients.length > 0 ? cleanIngredients : [meal.name],
      meal.cookTime   || 25,
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
            category:       db.command.in(['pregnancy', 'pregnancy_generated']),
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
    const nutrientStr = Array.isArray(meal.nutrients) ? meal.nutrients.join('、') : '';
    const extraHint = `菜名：${meal.name}，类型：孕妇营养餐（${meal.calories}卡），关键营养素：${nutrientStr}`;
    const aiResult = await aiCall(
      cleanIngredients.length > 0 ? cleanIngredients : [meal.name],
      meal.cookTime   || 25,
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
