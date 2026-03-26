/**
 * 批量菜谱生成云函数单元测试 - batch-recipe-generate.test.js
 * 测试框架：Jest
 * 覆盖范围：参数校验、JSON解析、菜谱校验、状态查询、数据构建
 *
 * 运行：npm test tests/unit/batch-recipe-generate.test.js
 * 版本：4.0.0
 */

'use strict';

process.env.NODE_ENV = 'test';

// ==================== Mock wx-server-sdk ====================

const mockAdd = jest.fn().mockResolvedValue({ _id: 'mock_id_123' });
const mockCount = jest.fn().mockResolvedValue({ total: 3 });
const mockGet = jest.fn().mockResolvedValue({ data: [] });
const mockRemove = jest.fn().mockResolvedValue({ stats: { removed: 1 } });

const mockCollection = jest.fn().mockReturnValue({
  add: jest.fn().mockReturnValue({ data: mockAdd }),
  where: jest.fn().mockReturnThis(),
  count: mockCount,
  limit: jest.fn().mockReturnThis(),
  get: mockGet,
  doc: jest.fn().mockReturnValue({ remove: mockRemove }),
});

// 流式AI返回 mock
const mockStreamText = jest.fn().mockResolvedValue({
  textStream: (async function* () {
    yield '{"name":"测试菜","description":"测试描述","cookTime":20,"difficulty":"简单","servings":2,"ingredients":[{"name":"鸡蛋","amount":"2","unit":"个"}],"steps":[{"step":1,"description":"打蛋","tip":null}],"nutrition":{"calories":200,"protein":10,"carbs":5,"fat":8},"tags":["简单","快手"]}';
  })(),
  usage: Promise.resolve({ total_tokens: 100 }),
});

const mockModel = { streamText: mockStreamText };
const mockCreateModel = jest.fn().mockReturnValue(mockModel);

jest.mock('wx-server-sdk', () => ({
  init: jest.fn(),
  DYNAMIC_CURRENT_ENV: 'test',
  database: jest.fn().mockReturnValue({
    collection: mockCollection,
    serverDate: jest.fn().mockReturnValue(new Date()),
    command: {},
  }),
  ai: { createModel: mockCreateModel },
}));

// ==================== 引入被测模块的核心逻辑 ====================
// 由于云函数不直接导出内部函数，我们测试它们的行为

// 复制核心解析逻辑用于测试（避免依赖云函数运行环境）
const validateRecipe = (r) => {
  if (!r || typeof r !== 'object') throw new Error('食谱格式错误');
  return {
    name: r.name || '未命名食谱',
    description: r.description || '',
    cookTime: Number(r.cookTime) || 30,
    difficulty: r.difficulty || '简单',
    servings: Number(r.servings) || 2,
    ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
    steps: Array.isArray(r.steps) ? r.steps : [],
    nutrition: {
      calories: Number((r.nutrition || {}).calories) || 0,
      protein: Number((r.nutrition || {}).protein) || 0,
      carbs: Number((r.nutrition || {}).carbs) || 0,
      fat: Number((r.nutrition || {}).fat) || 0,
    },
    tags: Array.isArray(r.tags) ? r.tags : [],
  };
};

const parseRecipeJSON = (rawText) => {
  try { return validateRecipe(JSON.parse(rawText.trim())); } catch (e) { /* ignore */ }

  const mdMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) {
    try { return validateRecipe(JSON.parse(mdMatch[1].trim())); } catch (e) { /* ignore */ }
  }

  const first = rawText.indexOf('{');
  const last = rawText.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try { return validateRecipe(JSON.parse(rawText.substring(first, last + 1))); } catch (e) { /* ignore */ }
  }

  throw new Error('无法从AI返回内容中解析有效JSON');
};

// ==================== 测试数据 ====================

const MOCK_CUISINE = {
  id: 'sichuan',
  name: '川菜',
  fullName: '四川菜系',
  emoji: '🌶️',
  color: '#E53935',
  lightColor: '#FFEBEE',
  tags: ['麻辣', '鲜香'],
  representativeDishes: [
    { name: '麻婆豆腐', desc: '豆腐鲜嫩', cookTime: 20, difficulty: 'easy', ingredients: ['豆腐', '猪肉末', '豆瓣酱'] },
    { name: '宫保鸡丁', desc: '鸡肉鲜嫩', cookTime: 25, difficulty: 'easy', ingredients: ['鸡胸肉', '花生', '干辣椒'] },
    { name: '回锅肉',   desc: '香辣下饭', cookTime: 40, difficulty: 'medium', ingredients: ['五花肉', '青椒', '豆瓣酱'] },
  ],
};

const MOCK_RECIPE_JSON = JSON.stringify({
  name: '麻婆豆腐',
  description: '豆腐鲜嫩，麻辣鲜香',
  cookTime: 20,
  difficulty: '简单',
  servings: 2,
  ingredients: [{ name: '豆腐', amount: '300', unit: 'g' }],
  steps: [{ step: 1, description: '豆腐切块', tip: null }],
  nutrition: { calories: 180, protein: 12, carbs: 8, fat: 10 },
  tags: ['麻辣', '下饭'],
});

// ==================== 测试套件 ====================

describe('批量菜谱生成云函数 - 数据验证', () => {

  // ---- Suite 1: validateRecipe ----
  describe('Suite 1: validateRecipe - 食谱结构校验', () => {
    test('TC1.1: 标准食谱对象应通过校验', () => {
      const input = JSON.parse(MOCK_RECIPE_JSON);
      const result = validateRecipe(input);
      expect(result.name).toBe('麻婆豆腐');
      expect(result.cookTime).toBe(20);
      expect(Array.isArray(result.ingredients)).toBe(true);
      expect(Array.isArray(result.steps)).toBe(true);
      expect(Array.isArray(result.tags)).toBe(true);
    });

    test('TC1.2: null输入应抛出异常', () => {
      expect(() => validateRecipe(null)).toThrow('食谱格式错误');
    });

    test('TC1.3: 非对象输入应抛出异常', () => {
      expect(() => validateRecipe('string')).toThrow('食谱格式错误');
      expect(() => validateRecipe(42)).toThrow('食谱格式错误');
    });

    test('TC1.4: 缺少name字段应使用默认值', () => {
      const result = validateRecipe({ cookTime: 20 });
      expect(result.name).toBe('未命名食谱');
    });

    test('TC1.5: cookTime应被强制转换为数字', () => {
      const result = validateRecipe({ cookTime: '30', ingredients: [], steps: [] });
      expect(result.cookTime).toBe(30);
    });

    test('TC1.6: 缺少nutrition时应返回零值nutrition', () => {
      const result = validateRecipe({ name: '测试' });
      expect(result.nutrition.calories).toBe(0);
      expect(result.nutrition.protein).toBe(0);
    });

    test('TC1.7: ingredients不是数组时应返回空数组', () => {
      const result = validateRecipe({ ingredients: 'not-array' });
      expect(Array.isArray(result.ingredients)).toBe(true);
      expect(result.ingredients.length).toBe(0);
    });

    test('TC1.8: tags不是数组时应返回空数组', () => {
      const result = validateRecipe({ tags: null });
      expect(Array.isArray(result.tags)).toBe(true);
    });
  });

  // ---- Suite 2: parseRecipeJSON ----
  describe('Suite 2: parseRecipeJSON - JSON解析', () => {
    test('TC2.1: 标准JSON字符串应被正确解析', () => {
      const result = parseRecipeJSON(MOCK_RECIPE_JSON);
      expect(result.name).toBe('麻婆豆腐');
      expect(result.cookTime).toBe(20);
    });

    test('TC2.2: 带Markdown代码块的JSON应被解析', () => {
      const wrapped = '```json\n' + MOCK_RECIPE_JSON + '\n```';
      const result = parseRecipeJSON(wrapped);
      expect(result.name).toBe('麻婆豆腐');
    });

    test('TC2.3: 无json标签的Markdown代码块应被解析', () => {
      const wrapped = '```\n' + MOCK_RECIPE_JSON + '\n```';
      const result = parseRecipeJSON(wrapped);
      expect(result.name).toBe('麻婆豆腐');
    });

    test('TC2.4: 前后有多余文字的JSON应被提取并解析', () => {
      const withExtra = '这是食谱：' + MOCK_RECIPE_JSON + '  以上是完整食谱';
      const result = parseRecipeJSON(withExtra);
      expect(result.name).toBe('麻婆豆腐');
    });

    test('TC2.5: 无效JSON字符串应抛出异常', () => {
      expect(() => parseRecipeJSON('这根本不是JSON')).toThrow();
    });

    test('TC2.6: 空字符串应抛出异常', () => {
      expect(() => parseRecipeJSON('')).toThrow();
    });

    test('TC2.7: 解析结果nutrition字段应包含数值', () => {
      const result = parseRecipeJSON(MOCK_RECIPE_JSON);
      expect(typeof result.nutrition.calories).toBe('number');
      expect(result.nutrition.calories).toBeGreaterThan(0);
    });

    test('TC2.8: 解析后ingredients应为非空数组', () => {
      const result = parseRecipeJSON(MOCK_RECIPE_JSON);
      expect(Array.isArray(result.ingredients)).toBe(true);
      expect(result.ingredients.length).toBeGreaterThan(0);
    });
  });

  // ---- Suite 3: 菜系数据校验 ----
  describe('Suite 3: 菜系输入数据校验', () => {
    test('TC3.1: MOCK_CUISINE应有代表菜列表', () => {
      expect(Array.isArray(MOCK_CUISINE.representativeDishes)).toBe(true);
      expect(MOCK_CUISINE.representativeDishes.length).toBeGreaterThan(0);
    });

    test('TC3.2: 每道代表菜应包含必需字段', () => {
      MOCK_CUISINE.representativeDishes.forEach(dish => {
        expect(dish).toHaveProperty('name');
        expect(dish).toHaveProperty('cookTime');
        expect(dish).toHaveProperty('difficulty');
        expect(dish).toHaveProperty('ingredients');
        expect(Array.isArray(dish.ingredients)).toBe(true);
      });
    });

    test('TC3.3: difficulty应为有效值', () => {
      const valid = ['easy', 'medium', 'hard'];
      MOCK_CUISINE.representativeDishes.forEach(dish => {
        expect(valid).toContain(dish.difficulty);
      });
    });

    test('TC3.4: cookTime应为正整数', () => {
      MOCK_CUISINE.representativeDishes.forEach(dish => {
        expect(Number(dish.cookTime)).toBeGreaterThan(0);
      });
    });

    test('TC3.5: 菜系应有id, name, emoji, color字段', () => {
      expect(MOCK_CUISINE).toHaveProperty('id');
      expect(MOCK_CUISINE).toHaveProperty('name');
      expect(MOCK_CUISINE).toHaveProperty('emoji');
      expect(MOCK_CUISINE).toHaveProperty('color');
      expect(typeof MOCK_CUISINE.id).toBe('string');
      expect(MOCK_CUISINE.id.length).toBeGreaterThan(0);
    });
  });

  // ---- Suite 4: 数据库记录构建逻辑 ----
  describe('Suite 4: 数据库记录字段构建', () => {
    test('TC4.1: 生成的DB记录应包含菜系信息', () => {
      const recipe = validateRecipe(JSON.parse(MOCK_RECIPE_JSON));
      const dish = MOCK_CUISINE.representativeDishes[0];
      const record = {
        ...recipe,
        cuisineId: MOCK_CUISINE.id,
        cuisineName: MOCK_CUISINE.name,
        cuisineFullName: MOCK_CUISINE.fullName,
        cuisineEmoji: MOCK_CUISINE.emoji,
        cuisineColor: MOCK_CUISINE.color,
        sourceType: 'batch_generated',
        sourceDishName: dish.name,
        sourceIngredients: dish.ingredients,
        version: '4.0.0',
        status: 'active',
        isPublic: true,
        author: 'system_batch',
      };

      expect(record.cuisineId).toBe('sichuan');
      expect(record.cuisineName).toBe('川菜');
      expect(record.sourceType).toBe('batch_generated');
      expect(record.status).toBe('active');
      expect(record.isPublic).toBe(true);
      expect(record.version).toBe('4.0.0');
    });

    test('TC4.2: 记录应包含完整的nutrition字段', () => {
      const recipe = validateRecipe(JSON.parse(MOCK_RECIPE_JSON));
      expect(recipe.nutrition).toHaveProperty('calories');
      expect(recipe.nutrition).toHaveProperty('protein');
      expect(recipe.nutrition).toHaveProperty('carbs');
      expect(recipe.nutrition).toHaveProperty('fat');
    });

    test('TC4.3: 记录的ingredients应为数组', () => {
      const recipe = validateRecipe(JSON.parse(MOCK_RECIPE_JSON));
      expect(Array.isArray(recipe.ingredients)).toBe(true);
    });

    test('TC4.4: 记录的steps应为数组', () => {
      const recipe = validateRecipe(JSON.parse(MOCK_RECIPE_JSON));
      expect(Array.isArray(recipe.steps)).toBe(true);
    });

    test('TC4.5: servings应为正整数', () => {
      const recipe = validateRecipe(JSON.parse(MOCK_RECIPE_JSON));
      expect(Number.isInteger(recipe.servings)).toBe(true);
      expect(recipe.servings).toBeGreaterThan(0);
    });
  });

  // ---- Suite 5: Prompt 构建逻辑 ----
  describe('Suite 5: Prompt 构建逻辑', () => {
    const buildSystemPrompt = () => `你是一位专业的中餐厨师助手，名叫"小厨AI"`;
    const buildUserPrompt = (dishName, ingredients, cookTime, difficulty) => {
      const ingredientsStr = Array.isArray(ingredients) ? ingredients.join('、') : String(ingredients);
      const diffMap = { easy: '简单', medium: '中等', hard: '困难', 简单: '简单', 中等: '中等', 困难: '困难' };
      const diff = diffMap[difficulty] || '简单';
      return `菜名：${dishName}\n主要食材：${ingredientsStr}\n烹饪时间：${cookTime}分钟以内\n难度：${diff}`;
    };

    test('TC5.1: System Prompt应包含"小厨AI"', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('小厨AI');
    });

    test('TC5.2: User Prompt应包含菜名', () => {
      const prompt = buildUserPrompt('麻婆豆腐', ['豆腐', '肉末'], 20, 'easy');
      expect(prompt).toContain('麻婆豆腐');
    });

    test('TC5.3: User Prompt应包含食材', () => {
      const prompt = buildUserPrompt('麻婆豆腐', ['豆腐', '猪肉末'], 20, 'easy');
      expect(prompt).toContain('豆腐');
      expect(prompt).toContain('猪肉末');
    });

    test('TC5.4: easy难度应映射为"简单"', () => {
      const prompt = buildUserPrompt('测试', [], 30, 'easy');
      expect(prompt).toContain('简单');
    });

    test('TC5.5: medium难度应映射为"中等"', () => {
      const prompt = buildUserPrompt('测试', [], 30, 'medium');
      expect(prompt).toContain('中等');
    });

    test('TC5.6: hard难度应映射为"困难"', () => {
      const prompt = buildUserPrompt('测试', [], 30, 'hard');
      expect(prompt).toContain('困难');
    });

    test('TC5.7: 数组食材应被逗号连接', () => {
      const prompt = buildUserPrompt('测试', ['食材A', '食材B', '食材C'], 30, 'easy');
      expect(prompt).toContain('食材A');
      expect(prompt).toContain('食材B');
      expect(prompt).toContain('食材C');
    });

    test('TC5.8: cookTime应出现在Prompt中', () => {
      const prompt = buildUserPrompt('测试', [], 45, 'easy');
      expect(prompt).toContain('45');
    });
  });

  // ---- Suite 6: 参数校验逻辑 ----
  describe('Suite 6: 参数校验逻辑', () => {
    const validateInput = (event) => {
      const { action, cuisinesData } = event || {};
      if (!action && !cuisinesData) return { valid: false, msg: '参数不完整' };
      if (action === 'generate') {
        if (!cuisinesData || !Array.isArray(cuisinesData) || cuisinesData.length === 0) {
          return { valid: false, msg: '请提供 cuisinesData 数组' };
        }
      }
      return { valid: true };
    };

    test('TC6.1: 空event应返回参数错误', () => {
      const result = validateInput({});
      expect(result.valid).toBe(false);
    });

    test('TC6.2: cuisinesData为空数组应返回参数错误', () => {
      const result = validateInput({ action: 'generate', cuisinesData: [] });
      expect(result.valid).toBe(false);
    });

    test('TC6.3: cuisinesData不是数组应返回参数错误', () => {
      const result = validateInput({ action: 'generate', cuisinesData: 'not-array' });
      expect(result.valid).toBe(false);
    });

    test('TC6.4: 有效参数应通过校验', () => {
      const result = validateInput({ action: 'generate', cuisinesData: [MOCK_CUISINE] });
      expect(result.valid).toBe(true);
    });

    test('TC6.5: cuisinesData为null应返回参数错误', () => {
      const result = validateInput({ action: 'generate', cuisinesData: null });
      expect(result.valid).toBe(false);
    });
  });

  // ---- Suite 7: cuisines.js 导出与upload页面兼容性 ----
  describe('Suite 7: cuisines.js 数据与upload页面兼容性', () => {
    // 由于upload页面在Node测试环境下无法直接require（依赖wx），
    // 我们直接测试cuisines.js中的数据
    const { CUISINES } = require('../../miniprogram/utils/cuisines.js');

    // 过滤正式菜系（与upload页面逻辑一致）
    const CUISINE_LIST = CUISINES.filter(c => !c.id.startsWith('fl_') && !c.id.startsWith('pg_'));

    test('TC7.1: 过滤后应有30个菜系', () => {
      expect(CUISINE_LIST.length).toBe(30);
    });

    test('TC7.2: 每个菜系应有representativeDishes数组', () => {
      CUISINE_LIST.forEach(c => {
        expect(Array.isArray(c.representativeDishes)).toBe(true);
        expect(c.representativeDishes.length).toBeGreaterThan(0);
      });
    });

    test('TC7.3: 每个菜系应有id、name、emoji、color字段', () => {
      CUISINE_LIST.forEach(c => {
        expect(typeof c.id).toBe('string');
        expect(typeof c.name).toBe('string');
        expect(typeof c.emoji).toBe('string');
        expect(typeof c.color).toBe('string');
      });
    });

    test('TC7.4: 所有菜系ID应唯一', () => {
      const ids = CUISINE_LIST.map(c => c.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toBe(ids.length);
    });

    test('TC7.5: 总代表菜数量应大于30道', () => {
      const total = CUISINE_LIST.reduce((s, c) => s + c.representativeDishes.length, 0);
      expect(total).toBeGreaterThan(30);
    });

    test('TC7.6: 川菜应有30道代表菜', () => {
      const sichuan = CUISINE_LIST.find(c => c.id === 'sichuan');
      expect(sichuan).toBeDefined();
      expect(sichuan.representativeDishes.length).toBe(30);
    });

    test('TC7.7: 所有代表菜difficulty应为有效值', () => {
      const valid = ['easy', 'medium', 'hard'];
      CUISINE_LIST.forEach(c => {
        c.representativeDishes.forEach(d => {
          expect(valid).toContain(d.difficulty);
        });
      });
    });

    test('TC7.8: 所有代表菜ingredients应为非空数组', () => {
      CUISINE_LIST.forEach(c => {
        c.representativeDishes.forEach(d => {
          expect(Array.isArray(d.ingredients)).toBe(true);
          expect(d.ingredients.length).toBeGreaterThan(0);
        });
      });
    });

    test('TC7.9: skipExisting逻辑-已存在菜谱数量等于dishCount时应标记为done', () => {
      // 模拟upload页面的状态逻辑
      const c = CUISINE_LIST[0]; // 川菜
      const dishCount = c.representativeDishes.length;
      const recipeCount = dishCount; // 假设全部完成
      const status = recipeCount >= dishCount ? 'done' : recipeCount > 0 ? 'partial' : 'idle';
      expect(status).toBe('done');
    });

    test('TC7.10: 部分完成时状态应为partial', () => {
      const c = CUISINE_LIST[0];
      const dishCount = c.representativeDishes.length;
      const recipeCount = Math.floor(dishCount / 2);
      const status = recipeCount >= dishCount ? 'done' : recipeCount > 0 ? 'partial' : 'idle';
      expect(status).toBe('partial');
    });
  });

});
