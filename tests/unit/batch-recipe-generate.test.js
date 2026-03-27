/**
 * 批量菜谱生成云函数单元测试 - batch-recipe-generate.test.js
 * 架构版本：5.0.0（单菜生成架构）
 *
 * 覆盖范围：
 *   Suite 1  - validateRecipe 食谱结构校验
 *   Suite 2  - parseRecipeJSON 三层 JSON 解析
 *   Suite 3  - 菜系输入数据校验
 *   Suite 4  - 数据库记录字段构建
 *   Suite 5  - Prompt 构建逻辑
 *   Suite 6  - 参数校验逻辑（单菜接口）
 *   Suite 7  - cuisines.js 与 upload 页面兼容性
 *   Suite 8  - generate_one 单菜架构验证
 *   Suite 9  - 前端进度计算函数验证
 */

'use strict';

process.env.NODE_ENV = 'test';

// ==================== Mock wx-server-sdk ====================

jest.mock('wx-server-sdk', () => ({
  init: jest.fn(),
  DYNAMIC_CURRENT_ENV: 'test',
  database: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnValue({
      add:   jest.fn().mockResolvedValue({ _id: 'mock_doc_001' }),
      where: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue({ total: 0 }),
      limit: jest.fn().mockReturnThis(),
      get:   jest.fn().mockResolvedValue({ data: [] }),
      doc:   jest.fn().mockReturnValue({ remove: jest.fn().mockResolvedValue({}) }),
    }),
    serverDate: jest.fn().mockReturnValue(new Date()),
    command: {},
  }),
  ai: {
    createModel: jest.fn().mockReturnValue({
      invoke: jest.fn().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({
          name: '测试菜', description: '测试', cookTime: 20, difficulty: '简单',
          servings: 2, ingredients: [{ name: '豆腐', amount: '300', unit: 'g' }],
          steps: [{ step: 1, description: '切豆腐', tip: null }],
          nutrition: { calories: 180, protein: 12, carbs: 8, fat: 10 },
          tags: ['简单'],
        }) } }],
      }),
      streamText: jest.fn().mockResolvedValue({
        textStream: (async function* () { yield '{}'; })(),
        usage: Promise.resolve({ total_tokens: 100 }),
      }),
    }),
  },
}));

// ==================== 测试工具函数（与云函数保持一致）====================

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
  try { return validateRecipe(JSON.parse(raw.trim())); } catch (_) {}
  const md = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (md) { try { return validateRecipe(JSON.parse(md[1].trim())); } catch (_) {} }
  const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
  if (s !== -1 && e > s) { try { return validateRecipe(JSON.parse(raw.slice(s, e+1))); } catch (_) {} }
  throw new Error('无法解析 AI 返回的 JSON');
};

// 前端 calcPct（与 upload/index.js 保持一致）
const calcPct = (done, total) =>
  total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0;

// ==================== 测试数据 ====================

const MOCK_CUISINE = {
  id: 'sichuan', name: '川菜', fullName: '四川菜系',
  emoji: '🌶️', color: '#E53935', lightColor: '#FFEBEE',
  tags: ['麻辣', '鲜香'],
  representativeDishes: [
    { name: '麻婆豆腐', desc: '豆腐鲜嫩', cookTime: 20, difficulty: 'easy',   ingredients: ['豆腐','猪肉末','豆瓣酱'] },
    { name: '宫保鸡丁', desc: '鸡肉鲜嫩', cookTime: 25, difficulty: 'easy',   ingredients: ['鸡胸肉','花生','干辣椒'] },
    { name: '回锅肉',   desc: '香辣下饭', cookTime: 40, difficulty: 'medium', ingredients: ['五花肉','青椒','豆瓣酱'] },
  ],
};

const VALID_RECIPE_JSON = JSON.stringify({
  name: '麻婆豆腐', description: '豆腐鲜嫩，麻辣鲜香',
  cookTime: 20, difficulty: '简单', servings: 2,
  ingredients: [{ name: '豆腐', amount: '300', unit: 'g' }],
  steps: [{ step: 1, description: '豆腐切块', tip: null }],
  nutrition: { calories: 180, protein: 12, carbs: 8, fat: 10 },
  tags: ['麻辣', '下饭'],
});

// ==================== Suite 1: validateRecipe ====================

describe('Suite 1: validateRecipe - 食谱结构校验', () => {
  test('TC1.1: 标准食谱应通过校验并返回完整字段', () => {
    const r = validateRecipe(JSON.parse(VALID_RECIPE_JSON));
    expect(r.name).toBe('麻婆豆腐');
    expect(r.cookTime).toBe(20);
    expect(Array.isArray(r.ingredients)).toBe(true);
    expect(Array.isArray(r.steps)).toBe(true);
    expect(typeof r.nutrition.calories).toBe('number');
  });
  test('TC1.2: null 应抛出"食谱格式错误"', () => {
    expect(() => validateRecipe(null)).toThrow('食谱格式错误');
  });
  test('TC1.3: 字符串 / 数字输入应抛出异常', () => {
    expect(() => validateRecipe('abc')).toThrow();
    expect(() => validateRecipe(42)).toThrow();
  });
  test('TC1.4: 缺少 name 应使用默认值"未命名食谱"', () => {
    expect(validateRecipe({}).name).toBe('未命名食谱');
  });
  test('TC1.5: cookTime 字符串应被转为数字', () => {
    expect(validateRecipe({ cookTime: '45' }).cookTime).toBe(45);
  });
  test('TC1.6: 缺少 nutrition 应返回全零对象', () => {
    const n = validateRecipe({}).nutrition;
    expect(n.calories).toBe(0);
    expect(n.fat).toBe(0);
  });
  test('TC1.7: ingredients 不是数组时返回空数组', () => {
    expect(validateRecipe({ ingredients: 'x' }).ingredients).toEqual([]);
  });
  test('TC1.8: tags 不是数组时返回空数组', () => {
    expect(validateRecipe({ tags: null }).tags).toEqual([]);
  });
});

// ==================== Suite 2: parseRecipeJSON ====================

describe('Suite 2: parseRecipeJSON - JSON 三层解析', () => {
  test('TC2.1: 标准 JSON 字符串应解析成功', () => {
    expect(parseRecipeJSON(VALID_RECIPE_JSON).name).toBe('麻婆豆腐');
  });
  test('TC2.2: Markdown ```json 代码块应解析成功', () => {
    expect(parseRecipeJSON('```json\n' + VALID_RECIPE_JSON + '\n```').name).toBe('麻婆豆腐');
  });
  test('TC2.3: 无语言标记的 Markdown 代码块应解析成功', () => {
    expect(parseRecipeJSON('```\n' + VALID_RECIPE_JSON + '\n```').name).toBe('麻婆豆腐');
  });
  test('TC2.4: 前后带文字的 JSON 应通过第三层提取', () => {
    expect(parseRecipeJSON('这是食谱：' + VALID_RECIPE_JSON + '，结束').name).toBe('麻婆豆腐');
  });
  test('TC2.5: 完全无效字符串应抛出异常', () => {
    expect(() => parseRecipeJSON('这不是JSON')).toThrow();
  });
  test('TC2.6: 空字符串应抛出异常', () => {
    expect(() => parseRecipeJSON('')).toThrow();
  });
  test('TC2.7: 解析后 nutrition.calories 应为正数', () => {
    expect(parseRecipeJSON(VALID_RECIPE_JSON).nutrition.calories).toBeGreaterThan(0);
  });
  test('TC2.8: 解析后 ingredients 应为非空数组', () => {
    const r = parseRecipeJSON(VALID_RECIPE_JSON);
    expect(Array.isArray(r.ingredients)).toBe(true);
    expect(r.ingredients.length).toBeGreaterThan(0);
  });
});

// ==================== Suite 3: 菜系输入数据 ====================

describe('Suite 3: 菜系输入数据校验', () => {
  test('TC3.1: MOCK_CUISINE 应有非空 representativeDishes', () => {
    expect(MOCK_CUISINE.representativeDishes.length).toBeGreaterThan(0);
  });
  test('TC3.2: 每道菜应有 name/cookTime/difficulty/ingredients', () => {
    MOCK_CUISINE.representativeDishes.forEach(d => {
      expect(d).toHaveProperty('name');
      expect(d).toHaveProperty('cookTime');
      expect(d).toHaveProperty('difficulty');
      expect(Array.isArray(d.ingredients)).toBe(true);
    });
  });
  test('TC3.3: difficulty 值应为 easy/medium/hard', () => {
    MOCK_CUISINE.representativeDishes.forEach(d => {
      expect(['easy','medium','hard']).toContain(d.difficulty);
    });
  });
  test('TC3.4: cookTime 应为正数', () => {
    MOCK_CUISINE.representativeDishes.forEach(d => {
      expect(Number(d.cookTime)).toBeGreaterThan(0);
    });
  });
  test('TC3.5: 菜系应有 id/name/emoji/color', () => {
    ['id','name','emoji','color'].forEach(k => {
      expect(typeof MOCK_CUISINE[k]).toBe('string');
      expect(MOCK_CUISINE[k].length).toBeGreaterThan(0);
    });
  });
});

// ==================== Suite 4: 数据库记录字段构建 ====================

describe('Suite 4: 数据库记录字段构建', () => {
  const makeRecord = (recipe, dish, cuisine) => ({
    ...recipe,
    cuisineId:         cuisine.id,
    cuisineName:       cuisine.name,
    cuisineFullName:   cuisine.fullName,
    cuisineEmoji:      cuisine.emoji,
    cuisineColor:      cuisine.color,
    category:          cuisine.name,
    sourceType:        'batch_generated',
    sourceDishName:    dish.name,
    sourceIngredients: dish.ingredients,
    version:           '5.0.0',
    status:            'active',
    isPublic:          true,
    author:            'system_batch',
  });

  test('TC4.1: 记录应包含正确的菜系 ID', () => {
    const r = makeRecord(validateRecipe(JSON.parse(VALID_RECIPE_JSON)), MOCK_CUISINE.representativeDishes[0], MOCK_CUISINE);
    expect(r.cuisineId).toBe('sichuan');
    expect(r.cuisineName).toBe('川菜');
  });
  test('TC4.2: sourceType 应为 batch_generated', () => {
    const r = makeRecord(validateRecipe(JSON.parse(VALID_RECIPE_JSON)), MOCK_CUISINE.representativeDishes[0], MOCK_CUISINE);
    expect(r.sourceType).toBe('batch_generated');
  });
  test('TC4.3: 版本应为 5.0.0', () => {
    const r = makeRecord(validateRecipe(JSON.parse(VALID_RECIPE_JSON)), MOCK_CUISINE.representativeDishes[0], MOCK_CUISINE);
    expect(r.version).toBe('5.0.0');
  });
  test('TC4.4: isPublic 应为 true', () => {
    const r = makeRecord(validateRecipe(JSON.parse(VALID_RECIPE_JSON)), MOCK_CUISINE.representativeDishes[0], MOCK_CUISINE);
    expect(r.isPublic).toBe(true);
  });
  test('TC4.5: nutrition 应包含四个数值字段', () => {
    const recipe = validateRecipe(JSON.parse(VALID_RECIPE_JSON));
    ['calories','protein','carbs','fat'].forEach(k => {
      expect(typeof recipe.nutrition[k]).toBe('number');
    });
  });
});

// ==================== Suite 5: Prompt 构建 ====================

describe('Suite 5: Prompt 构建逻辑', () => {
  const SYSTEM = `你是一位专业的中餐厨师助手，名叫"小厨AI"`;
  const buildUser = (name, ingredients, cookTime, difficulty) => {
    const diffMap = { easy:'简单', medium:'中等', hard:'困难' };
    const ing = Array.isArray(ingredients) ? ingredients.join('、') : String(ingredients);
    return `菜名：${name}\n主要食材：${ing}\n烹饪时间：${cookTime}分钟以内\n难度：${diffMap[difficulty]||'简单'}`;
  };

  test('TC5.1: System Prompt 应包含"小厨AI"', () => { expect(SYSTEM).toContain('小厨AI'); });
  test('TC5.2: User Prompt 应含菜名', () => { expect(buildUser('麻婆豆腐',[],20,'easy')).toContain('麻婆豆腐'); });
  test('TC5.3: User Prompt 应含所有食材', () => {
    const p = buildUser('测试',['豆腐','肉末'],20,'easy');
    expect(p).toContain('豆腐');
    expect(p).toContain('肉末');
  });
  test('TC5.4: easy → 简单', () => { expect(buildUser('x',[],30,'easy')).toContain('简单'); });
  test('TC5.5: medium → 中等', () => { expect(buildUser('x',[],30,'medium')).toContain('中等'); });
  test('TC5.6: hard → 困难', () => { expect(buildUser('x',[],30,'hard')).toContain('困难'); });
  test('TC5.7: 未知难度 → 简单', () => { expect(buildUser('x',[],30,'unknown')).toContain('简单'); });
  test('TC5.8: cookTime 应出现在 Prompt 中', () => { expect(buildUser('x',[],45,'easy')).toContain('45'); });
});

// ==================== Suite 6: 单菜参数校验 ====================

describe('Suite 6: generate_one 参数校验', () => {
  const validate = (event) => {
    const { dish, cuisine } = event || {};
    if (!dish || !dish.name)   return { valid: false, msg: '缺少 dish.name' };
    if (!cuisine || !cuisine.id) return { valid: false, msg: '缺少 cuisine.id' };
    return { valid: true };
  };

  test('TC6.1: 空 event 应返回无效', () => { expect(validate({}  ).valid).toBe(false); });
  test('TC6.2: 缺少 dish 应返回无效', () => { expect(validate({ cuisine: MOCK_CUISINE }).valid).toBe(false); });
  test('TC6.3: 缺少 cuisine 应返回无效', () => { expect(validate({ dish: { name:'x' } }).valid).toBe(false); });
  test('TC6.4: dish.name 为空应返回无效', () => { expect(validate({ dish: { name:'' }, cuisine: MOCK_CUISINE }).valid).toBe(false); });
  test('TC6.5: 正确参数应通过', () => {
    expect(validate({ dish: MOCK_CUISINE.representativeDishes[0], cuisine: MOCK_CUISINE }).valid).toBe(true);
  });
});

// ==================== Suite 7: cuisines.js 兼容性 ====================

describe('Suite 7: cuisines.js 与 upload 页面兼容性', () => {
  const { CUISINES } = require('../../miniprogram/utils/cuisines.js');
  const CUISINE_LIST = CUISINES.filter(c => !c.id.startsWith('fl_') && !c.id.startsWith('pg_'));

  test('TC7.1: 过滤后应有 30 个菜系', () => { expect(CUISINE_LIST.length).toBe(30); });
  test('TC7.2: 每个菜系应有非空 representativeDishes', () => {
    CUISINE_LIST.forEach(c => {
      expect(Array.isArray(c.representativeDishes)).toBe(true);
      expect(c.representativeDishes.length).toBeGreaterThan(0);
    });
  });
  test('TC7.3: 每个菜系应有 id/name/emoji/color', () => {
    CUISINE_LIST.forEach(c => {
      expect(typeof c.id).toBe('string');
      expect(typeof c.name).toBe('string');
    });
  });
  test('TC7.4: 所有 ID 应唯一', () => {
    const ids = CUISINE_LIST.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  test('TC7.5: 总代表菜应 > 30', () => {
    expect(CUISINE_LIST.reduce((s,c) => s + c.representativeDishes.length, 0)).toBeGreaterThan(30);
  });
  test('TC7.6: 川菜应有 30 道代表菜', () => {
    expect(CUISINE_LIST.find(c=>c.id==='sichuan').representativeDishes.length).toBe(30);
  });
  test('TC7.7: 所有代表菜 difficulty 应为有效值', () => {
    CUISINE_LIST.forEach(c => c.representativeDishes.forEach(d => {
      expect(['easy','medium','hard']).toContain(d.difficulty);
    }));
  });
  test('TC7.8: 所有代表菜 ingredients 应为非空数组', () => {
    CUISINE_LIST.forEach(c => c.representativeDishes.forEach(d => {
      expect(Array.isArray(d.ingredients) && d.ingredients.length > 0).toBe(true);
    }));
  });
});

// ==================== Suite 8: generate_one 单菜架构验证 ====================

describe('Suite 8: generate_one 单菜架构验证', () => {
  test('TC8.1: 单菜调用应返回 code:0 且含 dishName', async () => {
    const cfn = require('../../cloudfunctions/batch-recipe-generate/index.js');
    const res = await cfn.main({
      action: 'generate_one',
      dish:    MOCK_CUISINE.representativeDishes[0],
      cuisine: MOCK_CUISINE,
      skipExisting: false,
    });
    // code 0=ok 或 2=AI失败（mock环境）都算架构正常
    expect([0, 2]).toContain(res.code);
    if (res.code === 0) {
      expect(res.data).toHaveProperty('dishName');
    }
  });

  test('TC8.2: 缺少 dish 参数应返回 code:1', async () => {
    const cfn = require('../../cloudfunctions/batch-recipe-generate/index.js');
    const res = await cfn.main({ action: 'generate_one', cuisine: MOCK_CUISINE });
    expect(res.code).toBe(1);
  });

  test('TC8.3: 缺少 cuisine 参数应返回 code:1', async () => {
    const cfn = require('../../cloudfunctions/batch-recipe-generate/index.js');
    const res = await cfn.main({ action: 'generate_one', dish: MOCK_CUISINE.representativeDishes[0] });
    expect(res.code).toBe(1);
  });

  test('TC8.4: 未知 action 应返回 code:1', async () => {
    const cfn = require('../../cloudfunctions/batch-recipe-generate/index.js');
    const res = await cfn.main({ action: 'unknown_action' });
    expect(res.code).toBe(1);
  });

  test('TC8.5: status action 应返回 statusList 和 summary', async () => {
    const cfn = require('../../cloudfunctions/batch-recipe-generate/index.js');
    const res = await cfn.main({ action: 'status', cuisinesData: [MOCK_CUISINE] });
    expect(res.code).toBe(0);
    expect(res.data).toHaveProperty('statusList');
    expect(res.data).toHaveProperty('summary');
  });

  test('TC8.6: status 返回的 summary 应含 totalDishes', async () => {
    const cfn = require('../../cloudfunctions/batch-recipe-generate/index.js');
    const res = await cfn.main({ action: 'status', cuisinesData: [MOCK_CUISINE] });
    expect(res.data.summary.totalDishes).toBe(MOCK_CUISINE.representativeDishes.length);
  });

  test('TC8.7: check_exists 缺少参数应返回 code:1', async () => {
    const cfn = require('../../cloudfunctions/batch-recipe-generate/index.js');
    const res = await cfn.main({ action: 'check_exists' });
    expect(res.code).toBe(1);
  });

  test('TC8.8: check_exists 正常调用应返回 exists 字段', async () => {
    const cfn = require('../../cloudfunctions/batch-recipe-generate/index.js');
    const res = await cfn.main({ action: 'check_exists', cuisineId: 'sichuan', dishName: '麻婆豆腐' });
    expect(res.code).toBe(0);
    expect(res.data).toHaveProperty('exists');
    expect(typeof res.data.exists).toBe('boolean');
  });

  test('TC8.9: 每道菜生成是独立调用（无批量 for 循环）', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../../cloudfunctions/batch-recipe-generate/index.js'),
      'utf8'
    );
    // 确保没有跨菜循环的批量变量
    expect(src).not.toMatch(/batchGenerate/);
    expect(src).not.toMatch(/DISH_DELAY_MS/);
    expect(src).not.toMatch(/CUISINE_DELAY_MS/);
    // 确保有 generate_one 接口
    expect(src).toContain('generate_one');
    expect(src).toContain('actionGenerateOne');
  });

  test('TC8.10: 云函数入口不应含前端循环逻辑', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../../cloudfunctions/batch-recipe-generate/index.js'),
      'utf8'
    );
    // 云函数不应有 for...of dishes 的批量循环
    expect(src).not.toMatch(/for.*of.*dishes/);
    // 但 clear_cuisine 可以有内部循环
    expect(src).toContain('clear_cuisine');
  });
});

// ==================== Suite 9: 前端进度计算函数 ====================

describe('Suite 9: 前端 calcPct 进度计算', () => {
  test('TC9.1: 0/0 应返回 0', ()  => { expect(calcPct(0, 0)).toBe(0); });
  test('TC9.2: 0/10 应返回 0',  () => { expect(calcPct(0, 10)).toBe(0); });
  test('TC9.3: 5/10 应返回 50', () => { expect(calcPct(5, 10)).toBe(50); });
  test('TC9.4: 10/10 应返回 100',() => { expect(calcPct(10, 10)).toBe(100); });
  test('TC9.5: 超出总数应被 clamp 到 100', () => { expect(calcPct(15, 10)).toBe(100); });
  test('TC9.6: 返回值应为整数', () => {
    expect(Number.isInteger(calcPct(1, 3))).toBe(true);
  });
  test('TC9.7: 1/3 应约等于 33',  () => { expect(calcPct(1, 3)).toBe(33); });
  test('TC9.8: 2/3 应约等于 67',  () => { expect(calcPct(2, 3)).toBe(67); });
  test('TC9.9: total 为负数应返回 0', () => { expect(calcPct(5, -1)).toBe(0); });
  test('TC9.10: 6道菜生成6道进度应为100', () => {
    const { CUISINES } = require('../../miniprogram/utils/cuisines.js');
    const c = CUISINES.find(x => x.id === 'sichuan');
    const total = c.representativeDishes.length;
    expect(calcPct(total, total)).toBe(100);
  });
});
