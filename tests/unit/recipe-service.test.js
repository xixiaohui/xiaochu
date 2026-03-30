/**
 * 菜谱服务模块单元测试 - recipe-service.test.js  v1.0.0
 *
 * 覆盖范围：
 *   Suite 1  - 参数校验
 *   Suite 2  - 云端命中路径（DB hit → 直接返回，0 Token）
 *   Suite 3  - 云端未命中路径（DB miss → AI 生成 → 写入 DB）
 *   Suite 4  - 数据库查询失败降级（降级到 AI 生成）
 *   Suite 5  - AI 生成失败
 *   Suite 6  - 写入数据库失败（不影响返回）
 *   Suite 7  - checkExistingRecipes 批量检查
 *   Suite 8  - queryRecipeFromDB 纯查询
 *   Suite 9  - 数据库写入字段规范校验
 *   Suite 10 - SERVICE_VERSION 与 RECIPES_COLLECTION 常量
 */

'use strict';

process.env.NODE_ENV = 'test';

// ==================== Mock wx ====================

const mockRecipeDoc = {
  _id:              'doc_mock_001',
  name:             '白切鸡',
  description:      '皮滑肉嫩，鲜味十足',
  cookTime:         40,
  difficulty:       '简单',
  servings:         3,
  ingredients:      [{ name: '整鸡', amount: '1', unit: '只' }],
  steps:            [{ step: 1, description: '整鸡洗净', tip: null }],
  nutrition:        { calories: 280, protein: 30, carbs: 2, fat: 15 },
  tags:             ['粤菜', '白切'],
  cuisineId:        'cantonese',
  cuisineName:      '粤菜',
  cuisineFullName:  '广东菜系',
  cuisineEmoji:     '🍗',
  cuisineColor:     '#FF8F00',
  category:        '粤菜',
  sourceType:       'batch_generated',
  sourceDishName:   '白切鸡',
  sourceIngredients:['整鸡', '姜', '葱', '盐'],
  aiProvider:       'hunyuan-exp',
  tokensUsed:       120,
  version:          '1.0.0',
  status:           'active',
  isPublic:         true,
  author:           'system_batch',
};

// 模拟数据库 collection 构建器
const _makeDbMock = ({ docs = [], countTotal = 0, addId = 'new_doc_001', shouldFailGet = false, shouldFailAdd = false } = {}) => {
  const chainObj = {
    where:   jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit:   jest.fn().mockReturnThis(),
    field:   jest.fn().mockReturnThis(),
    get:     shouldFailGet
      ? jest.fn().mockRejectedValue(new Error('DB_GET_FAIL'))
      : jest.fn().mockResolvedValue({ data: docs }),
    count: jest.fn().mockResolvedValue({ total: countTotal }),
    add:  shouldFailAdd
      ? jest.fn().mockRejectedValue(new Error('DB_ADD_FAIL'))
      : jest.fn().mockResolvedValue({ _id: addId }),
  };
  return {
    collection: jest.fn().mockReturnValue(chainObj),
    serverDate: jest.fn().mockReturnValue(new Date('2026-01-01')),
    command:    { in: jest.fn(arr => ({ $in: arr })) },
    _chain:     chainObj,
  };
};

// 模拟 AI 生成结果
const MOCK_AI_RECIPE = {
  name:        '白切鸡',
  description: '皮滑肉嫩，鲜味十足',
  cookTime:    40,
  difficulty:  '简单',
  servings:    3,
  ingredients: [{ name: '整鸡', amount: '1', unit: '只' }],
  steps:       [{ step: 1, description: '整鸡洗净', tip: null }],
  nutrition:   { calories: 280, protein: 30, carbs: 2, fat: 15 },
  tags:        ['粤菜'],
};

// Mock ai-service
jest.mock('../../miniprogram/utils/ai-service.js', () => ({
  callCloudAIFrontend: jest.fn().mockResolvedValue({
    recipe:     MOCK_AI_RECIPE,
    rawText:    JSON.stringify(MOCK_AI_RECIPE),
    tokensUsed: 150,
  }),
}));

// Mock cache（recipe-service 不直接用 cache，但 ai-service 内部可能引用）
jest.mock('../../miniprogram/utils/cache.js', () => ({
  getRecipeCache:    jest.fn().mockReturnValue(null),
  setRecipeCache:    jest.fn(),
  buildRecipeCacheKey: jest.fn().mockReturnValue('mock_key'),
  clearExpiredCache: jest.fn().mockReturnValue(0),
  deleteCache:       jest.fn(),
}));

// ==================== 测试数据 ====================

const MOCK_DISH = {
  name:        '白切鸡',
  ingredients: ['整鸡', '姜', '葱', '盐'],
  cookTime:    40,
  difficulty:  'easy',
  desc:        '皮滑肉嫩，鲜味十足',
};

const MOCK_CUISINE = {
  id:       'cantonese',
  name:     '粤菜',
  fullName: '广东菜系',
  emoji:    '🍗',
  color:    '#FF8F00',
};

// ==================== 辅助：注入 wx global ====================

const setupWx = (dbMock) => {
  global.wx = {
    cloud: {
      database: jest.fn().mockReturnValue(dbMock),
    },
  };
};

// ==================== Suite 1: 参数校验 ====================

describe('Suite 1: getRecipeForDish 参数校验', () => {
  beforeEach(() => {
    setupWx(_makeDbMock());
    jest.resetModules();
  });

  test('TC1.1: dish 为 null 应抛出错误', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await expect(getRecipeForDish(null, MOCK_CUISINE)).rejects.toThrow('dish.name');
  });

  test('TC1.2: dish.name 为空应抛出错误', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await expect(getRecipeForDish({ name: '' }, MOCK_CUISINE)).rejects.toThrow('dish.name');
  });

  test('TC1.3: dish.name 为空格应抛出错误', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await expect(getRecipeForDish({ name: '   ' }, MOCK_CUISINE)).rejects.toThrow('dish.name');
  });

  test('TC1.4: cuisine 为 null 应抛出错误', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await expect(getRecipeForDish(MOCK_DISH, null)).rejects.toThrow('cuisine.id');
  });

  test('TC1.5: cuisine.id 为空应抛出错误', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await expect(getRecipeForDish(MOCK_DISH, { id: '' })).rejects.toThrow('cuisine.id');
  });

  test('TC1.6: 合法参数不应抛出', async () => {
    setupWx(_makeDbMock({ docs: [mockRecipeDoc] }));
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await expect(getRecipeForDish(MOCK_DISH, MOCK_CUISINE)).resolves.toBeDefined();
  });
});

// ==================== Suite 2: 云端命中路径 ====================

describe('Suite 2: 云端命中路径（source=db）', () => {
  beforeEach(() => {
    setupWx(_makeDbMock({ docs: [mockRecipeDoc] }));
    jest.resetModules();
  });

  test('TC2.1: source 应为 "db"', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    const r = await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    expect(r.source).toBe('db');
  });

  test('TC2.2: tokensUsed 应为 0', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    const r = await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    expect(r.tokensUsed).toBe(0);
  });

  test('TC2.3: 应返回正确的菜谱名称', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    const r = await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    expect(r.recipe.name).toBe('白切鸡');
  });

  test('TC2.4: 返回结果应包含 dishName', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    const r = await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    expect(r.dishName).toBe('白切鸡');
  });

  test('TC2.5: 云端命中时不应调用 AI', async () => {
    const aiService = require('../../miniprogram/utils/ai-service.js');
    aiService.callCloudAIFrontend.mockClear();
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    expect(aiService.callCloudAIFrontend).not.toHaveBeenCalled();
  });

  test('TC2.6: elapsed 应 >= 0', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    const r = await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    expect(r.elapsed).toBeGreaterThanOrEqual(0);
  });

  test('TC2.7: 云端命中时 docId 应为 undefined', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    const r = await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    expect(r.docId).toBeUndefined();
  });
});

// ==================== Suite 3: 云端未命中 → AI 生成 ====================

describe('Suite 3: 云端未命中路径（source=ai）', () => {
  beforeEach(() => {
    // DB get 返回空，add 成功
    setupWx(_makeDbMock({ docs: [], addId: 'new_doc_abc' }));
    jest.resetModules();
  });

  test('TC3.1: source 应为 "ai"', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    const r = await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    expect(r.source).toBe('ai');
  });

  test('TC3.2: tokensUsed 应 > 0', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    const r = await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    expect(r.tokensUsed).toBeGreaterThan(0);
  });

  test('TC3.3: 应返回 AI 生成的菜谱', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    const r = await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    expect(r.recipe).toBeDefined();
    expect(typeof r.recipe.name).toBe('string');
  });

  test('TC3.4: docId 应为写入后的文档 ID', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    const r = await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    expect(r.docId).toBe('new_doc_abc');
  });

  test('TC3.5: 应调用一次 callCloudAIFrontend', async () => {
    const aiService = require('../../miniprogram/utils/ai-service.js');
    aiService.callCloudAIFrontend.mockClear();
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    expect(aiService.callCloudAIFrontend).toHaveBeenCalledTimes(1);
  });

  test('TC3.6: AI 调用参数应包含 dish.ingredients', async () => {
    const aiService = require('../../miniprogram/utils/ai-service.js');
    aiService.callCloudAIFrontend.mockClear();
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    const [ingredients] = aiService.callCloudAIFrontend.mock.calls[0];
    expect(ingredients).toEqual(MOCK_DISH.ingredients);
  });

  test('TC3.7: AI 调用附加提示应含菜名和菜系名', async () => {
    const aiService = require('../../miniprogram/utils/ai-service.js');
    aiService.callCloudAIFrontend.mockClear();
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    const extraHint = aiService.callCloudAIFrontend.mock.calls[0][3];
    expect(extraHint).toContain('白切鸡');
    expect(extraHint).toContain('粤菜');
  });
});

// ==================== Suite 4: 数据库查询失败降级 ====================

describe('Suite 4: 数据库查询失败时降级到 AI 生成', () => {
  beforeEach(() => {
    setupWx(_makeDbMock({ shouldFailGet: true, addId: 'fallback_doc' }));
    jest.resetModules();
  });

  test('TC4.1: DB 查询失败时应仍然返回结果', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    const r = await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    expect(r).toBeDefined();
    expect(r.recipe).toBeDefined();
  });

  test('TC4.2: DB 查询失败时 source 应为 "ai"', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    const r = await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    expect(r.source).toBe('ai');
  });

  test('TC4.3: DB 查询失败不应抛出错误', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await expect(getRecipeForDish(MOCK_DISH, MOCK_CUISINE)).resolves.toBeDefined();
  });
});

// ==================== Suite 5: AI 生成失败 ====================

describe('Suite 5: AI 生成失败时应抛出错误', () => {
  beforeEach(() => {
    setupWx(_makeDbMock({ docs: [] }));
    jest.resetModules();
    const aiService = require('../../miniprogram/utils/ai-service.js');
    aiService.callCloudAIFrontend.mockRejectedValueOnce(new Error('AI调用失败：网络超时'));
  });

  test('TC5.1: AI 失败时应 reject', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await expect(getRecipeForDish(MOCK_DISH, MOCK_CUISINE)).rejects.toThrow('AI 生成失败');
  });

  test('TC5.2: 错误信息应包含原始错误', async () => {
    const aiService = require('../../miniprogram/utils/ai-service.js');
    aiService.callCloudAIFrontend.mockRejectedValueOnce(new Error('网络超时'));
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await expect(getRecipeForDish(MOCK_DISH, MOCK_CUISINE)).rejects.toThrow('网络超时');
  });
});

// ==================== Suite 6: 数据库写入失败不影响返回 ====================

describe('Suite 6: 写入数据库失败时不影响返回菜谱', () => {
  beforeEach(() => {
    setupWx(_makeDbMock({ docs: [], shouldFailAdd: true }));
    jest.resetModules();
  });

  test('TC6.1: 写入失败时仍应 resolve', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await expect(getRecipeForDish(MOCK_DISH, MOCK_CUISINE)).resolves.toBeDefined();
  });

  test('TC6.2: 写入失败时 source 应为 "ai"', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    const r = await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    expect(r.source).toBe('ai');
  });

  test('TC6.3: 写入失败时 docId 应为 undefined', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    const r = await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    expect(r.docId).toBeUndefined();
  });

  test('TC6.4: 写入失败时仍应返回 AI 生成的菜谱', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    const r = await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    expect(r.recipe.name).toBe(MOCK_AI_RECIPE.name);
  });
});

// ==================== Suite 7: checkExistingRecipes ====================

describe('Suite 7: checkExistingRecipes 批量检查', () => {
  beforeEach(() => jest.resetModules());

  test('TC7.1: 空数组应返回空 Set', async () => {
    setupWx(_makeDbMock());
    const { checkExistingRecipes } = require('../../miniprogram/utils/recipe-service.js');
    const result = await checkExistingRecipes('cantonese', []);
    expect(result instanceof Set).toBe(true);
    expect(result.size).toBe(0);
  });

  test('TC7.2: DB 返回匹配记录应包含对应菜名', async () => {
    const db = _makeDbMock();
    db._chain.get.mockResolvedValue({
      data: [
        { sourceDishName: '白切鸡' },
        { sourceDishName: '虾饺' },
      ],
    });
    setupWx(db);
    const { checkExistingRecipes } = require('../../miniprogram/utils/recipe-service.js');
    const result = await checkExistingRecipes('cantonese', ['白切鸡', '虾饺', '清蒸鱼']);
    expect(result.has('白切鸡')).toBe(true);
    expect(result.has('虾饺')).toBe(true);
    expect(result.has('清蒸鱼')).toBe(false);
  });

  test('TC7.3: DB 查询失败时应返回空 Set（不抛出）', async () => {
    setupWx(_makeDbMock({ shouldFailGet: true }));
    const { checkExistingRecipes } = require('../../miniprogram/utils/recipe-service.js');
    await expect(checkExistingRecipes('cantonese', ['白切鸡'])).resolves.toBeInstanceOf(Set);
  });

  test('TC7.4: 返回结果应为 Set 实例', async () => {
    setupWx(_makeDbMock({ docs: [] }));
    const { checkExistingRecipes } = require('../../miniprogram/utils/recipe-service.js');
    const r = await checkExistingRecipes('cantonese', ['白切鸡']);
    expect(r).toBeInstanceOf(Set);
  });
});

// ==================== Suite 8: queryRecipeFromDB ====================

describe('Suite 8: queryRecipeFromDB 纯数据库查询', () => {
  beforeEach(() => jest.resetModules());

  test('TC8.1: 有记录时应返回食谱对象', async () => {
    setupWx(_makeDbMock({ docs: [mockRecipeDoc] }));
    const { queryRecipeFromDB } = require('../../miniprogram/utils/recipe-service.js');
    const r = await queryRecipeFromDB('cantonese', '白切鸡');
    expect(r).not.toBeNull();
    expect(r.name).toBe('白切鸡');
  });

  test('TC8.2: 无记录时应返回 null', async () => {
    setupWx(_makeDbMock({ docs: [] }));
    const { queryRecipeFromDB } = require('../../miniprogram/utils/recipe-service.js');
    const r = await queryRecipeFromDB('cantonese', '不存在的菜');
    expect(r).toBeNull();
  });

  test('TC8.3: DB 查询失败应 reject', async () => {
    setupWx(_makeDbMock({ shouldFailGet: true }));
    const { queryRecipeFromDB } = require('../../miniprogram/utils/recipe-service.js');
    await expect(queryRecipeFromDB('cantonese', '白切鸡')).rejects.toThrow('DB_GET_FAIL');
  });

  test('TC8.4: 返回的食谱不应含 _openid 字段', async () => {
    setupWx(_makeDbMock({ docs: [{ ...mockRecipeDoc, _openid: 'secret_openid' }] }));
    const { queryRecipeFromDB } = require('../../miniprogram/utils/recipe-service.js');
    const r = await queryRecipeFromDB('cantonese', '白切鸡');
    expect(r).not.toHaveProperty('_openid');
  });
});

// ==================== Suite 9: 写入字段规范 ====================

describe('Suite 9: 数据库写入字段规范', () => {
  let addMock;

  beforeEach(() => {
    jest.resetModules();
    const db = _makeDbMock({ docs: [], addId: 'field_test_doc' });
    addMock = db._chain.add;
    setupWx(db);
  });

  test('TC9.1: 写入记录应含 sourceType=user_generated', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    const written = addMock.mock.calls[0][0].data;
    expect(written.sourceType).toBe('user_generated');
  });

  test('TC9.2: 写入记录应含正确的 cuisineId', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    const written = addMock.mock.calls[0][0].data;
    expect(written.cuisineId).toBe('cantonese');
  });

  test('TC9.3: 写入记录应含 sourceDishName', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    const written = addMock.mock.calls[0][0].data;
    expect(written.sourceDishName).toBe('白切鸡');
  });

  test('TC9.4: 写入记录应含 status=active', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    const written = addMock.mock.calls[0][0].data;
    expect(written.status).toBe('active');
  });

  test('TC9.5: 写入记录应含 isPublic=true', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    const written = addMock.mock.calls[0][0].data;
    expect(written.isPublic).toBe(true);
  });

  test('TC9.6: 写入记录应含 author=system_ai', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    const written = addMock.mock.calls[0][0].data;
    expect(written.author).toBe('system_ai');
  });

  test('TC9.7: 写入记录应含 aiProvider', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    const written = addMock.mock.calls[0][0].data;
    expect(written.aiProvider).toBe('hunyuan-exp');
  });

  test('TC9.8: 写入记录应含 createdAt 和 updatedAt', async () => {
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await getRecipeForDish(MOCK_DISH, MOCK_CUISINE);
    const written = addMock.mock.calls[0][0].data;
    expect(written.createdAt).toBeDefined();
    expect(written.updatedAt).toBeDefined();
  });
});

// ==================== Suite 10: 常量验证 ====================

describe('Suite 10: 模块常量验证', () => {
  beforeEach(() => {
    setupWx(_makeDbMock());
    jest.resetModules();
  });

  test('TC10.1: RECIPES_COLLECTION 应为 "recipes"', () => {
    const { RECIPES_COLLECTION } = require('../../miniprogram/utils/recipe-service.js');
    expect(RECIPES_COLLECTION).toBe('recipes');
  });

  test('TC10.2: SERVICE_VERSION 应为有效的版本字符串', () => {
    const { SERVICE_VERSION } = require('../../miniprogram/utils/recipe-service.js');
    expect(typeof SERVICE_VERSION).toBe('string');
    expect(SERVICE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('TC10.3: 模块应导出 getRecipeForDish 函数', () => {
    const svc = require('../../miniprogram/utils/recipe-service.js');
    expect(typeof svc.getRecipeForDish).toBe('function');
  });

  test('TC10.4: 模块应导出 checkExistingRecipes 函数', () => {
    const svc = require('../../miniprogram/utils/recipe-service.js');
    expect(typeof svc.checkExistingRecipes).toBe('function');
  });

  test('TC10.5: 模块应导出 queryRecipeFromDB 函数', () => {
    const svc = require('../../miniprogram/utils/recipe-service.js');
    expect(typeof svc.queryRecipeFromDB).toBe('function');
  });

  test('TC10.6: dish 无 ingredients 时应以菜名作为兜底食材', async () => {
    setupWx(_makeDbMock({ docs: [] }));
    const aiService = require('../../miniprogram/utils/ai-service.js');
    aiService.callCloudAIFrontend.mockClear();
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await getRecipeForDish({ name: '麻婆豆腐' }, MOCK_CUISINE);
    const [ingredients] = aiService.callCloudAIFrontend.mock.calls[0];
    expect(ingredients).toEqual(['麻婆豆腐']);
  });

  test('TC10.7: dish.ingredients 为空数组时应以菜名作为兜底', async () => {
    setupWx(_makeDbMock({ docs: [] }));
    const aiService = require('../../miniprogram/utils/ai-service.js');
    aiService.callCloudAIFrontend.mockClear();
    const { getRecipeForDish } = require('../../miniprogram/utils/recipe-service.js');
    await getRecipeForDish({ name: '回锅肉', ingredients: [] }, MOCK_CUISINE);
    const [ingredients] = aiService.callCloudAIFrontend.mock.calls[0];
    expect(ingredients).toEqual(['回锅肉']);
  });
});
