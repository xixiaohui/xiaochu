/**
 * 菜系数据模块单元测试 - cuisines.test.js
 * 覆盖：CUISINES(30条)、FAT_LOSS_MEALS(30条)、PREGNANCY_MEALS(30条)
 *       getCuisineById、getCuisineList、findRelatedCuisines、getRandomCuisines、getCuisineDishes
 *       getFatLossMeals、getPregnancyMeals、getPregnancyMealsByNutrient、getFatLossMealsByCalories
 *       getDailyRecommendation
 * 版本：3.0.0
 */

'use strict';

const cuisinesUtil = require('../../miniprogram/utils/cuisines');

// ==================== 测试套件1：CUISINES 基础数据（30条）====================

describe('【测试套件1】CUISINES 基础数据完整性（30条）', () => {
  test('TC1.1 - 应存在恰好30个菜系', () => {
    expect(cuisinesUtil.CUISINES.length).toBe(30);
  });

  test('TC1.2 - 每个菜系应包含必要字段', () => {
    cuisinesUtil.CUISINES.forEach(c => {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('emoji');
      expect(c).toHaveProperty('color');
      expect(c).toHaveProperty('description');
      expect(c).toHaveProperty('tags');
      expect(c).toHaveProperty('representativeDishes');
      expect(c).toHaveProperty('quickIngredients');
    });
  });

  test('TC1.3 - 每个菜系ID应唯一', () => {
    const ids = cuisinesUtil.CUISINES.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('TC1.4 - 每个菜系应有代表菜列表且不为空', () => {
    cuisinesUtil.CUISINES.forEach(c => {
      expect(Array.isArray(c.representativeDishes)).toBe(true);
      expect(c.representativeDishes.length).toBeGreaterThan(0);
    });
  });

  test('TC1.5 - 每道代表菜应包含name、desc、cookTime、difficulty、ingredients', () => {
    cuisinesUtil.CUISINES.forEach(c => {
      c.representativeDishes.forEach(dish => {
        expect(dish).toHaveProperty('name');
        expect(dish).toHaveProperty('desc');
        expect(dish).toHaveProperty('cookTime');
        expect(dish).toHaveProperty('difficulty');
        expect(Array.isArray(dish.ingredients)).toBe(true);
      });
    });
  });

  test('TC1.6 - 难度值应为 easy/medium/hard 之一', () => {
    const validDifficulties = ['easy', 'medium', 'hard'];
    cuisinesUtil.CUISINES.forEach(c => {
      c.representativeDishes.forEach(dish => {
        expect(validDifficulties).toContain(dish.difficulty);
      });
    });
  });

  test('TC1.7 - 应包含川菜和粤菜', () => {
    const ids = cuisinesUtil.CUISINES.map(c => c.id);
    expect(ids).toContain('sichuan');
    expect(ids).toContain('cantonese');
  });

  test('TC1.8 - 应包含八大菜系全部', () => {
    const ids = cuisinesUtil.CUISINES.map(c => c.id);
    const eightCuisines = ['sichuan', 'cantonese', 'jiangsu', 'zhejiang', 'hunan', 'fujian', 'anhui', 'shandong'];
    eightCuisines.forEach(id => {
      expect(ids).toContain(id);
    });
  });

  test('TC1.9 - 应包含地方特色菜系（东北、云南、新疆、北京）', () => {
    const ids = cuisinesUtil.CUISINES.map(c => c.id);
    expect(ids).toContain('northeastern');
    expect(ids).toContain('yunnan');
    expect(ids).toContain('xinjiang');
    expect(ids).toContain('beijing');
  });

  test('TC1.10 - 应包含新增的地方菜系', () => {
    const ids = cuisinesUtil.CUISINES.map(c => c.id);
    expect(ids).toContain('shanxi');
    expect(ids).toContain('shaanxi');
    expect(ids).toContain('guizhou');
    expect(ids).toContain('jiangxi');
  });

  test('TC1.11 - 颜色字段应为有效HEX颜色值', () => {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    cuisinesUtil.CUISINES.forEach(c => {
      expect(c.color).toMatch(hexColorRegex);
    });
  });

  test('TC1.12 - tags字段应为非空数组', () => {
    cuisinesUtil.CUISINES.forEach(c => {
      expect(Array.isArray(c.tags)).toBe(true);
      expect(c.tags.length).toBeGreaterThan(0);
    });
  });
});

// ==================== 测试套件2：getCuisineById ====================

describe('【测试套件2】getCuisineById 函数', () => {
  test('TC2.1 - 有效ID应返回正确菜系对象', () => {
    const result = cuisinesUtil.getCuisineById('sichuan');
    expect(result).not.toBeNull();
    expect(result.id).toBe('sichuan');
    expect(result.name).toBe('川菜');
  });

  test('TC2.2 - 无效ID应返回null', () => {
    const result = cuisinesUtil.getCuisineById('invalid_id');
    expect(result).toBeNull();
  });

  test('TC2.3 - 空字符串ID应返回null', () => {
    const result = cuisinesUtil.getCuisineById('');
    expect(result).toBeNull();
  });

  test('TC2.4 - 所有有效ID应能正常获取', () => {
    cuisinesUtil.CUISINES.forEach(c => {
      const result = cuisinesUtil.getCuisineById(c.id);
      expect(result).not.toBeNull();
      expect(result.id).toBe(c.id);
    });
  });

  test('TC2.5 - 返回对象应包含representativeDishes', () => {
    const result = cuisinesUtil.getCuisineById('cantonese');
    expect(Array.isArray(result.representativeDishes)).toBe(true);
    expect(result.representativeDishes.length).toBeGreaterThan(0);
  });

  test('TC2.6 - 新增菜系可以正常获取', () => {
    const shanxi = cuisinesUtil.getCuisineById('shanxi');
    expect(shanxi).not.toBeNull();
    expect(shanxi.name).toBe('晋菜');
  });
});

// ==================== 测试套件3：getCuisineList ====================

describe('【测试套件3】getCuisineList 函数', () => {
  test('TC3.1 - 应返回数组', () => {
    const result = cuisinesUtil.getCuisineList();
    expect(Array.isArray(result)).toBe(true);
  });

  test('TC3.2 - 返回数量应与CUISINES总数一致（30条）', () => {
    const result = cuisinesUtil.getCuisineList();
    expect(result.length).toBe(30);
  });

  test('TC3.3 - 列表项应包含精简字段', () => {
    const result = cuisinesUtil.getCuisineList();
    result.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('emoji');
      expect(item).toHaveProperty('color');
      expect(item).toHaveProperty('description');
      expect(item).toHaveProperty('dishCount');
    });
  });

  test('TC3.4 - dishCount应为正数', () => {
    const result = cuisinesUtil.getCuisineList();
    result.forEach(item => {
      expect(item.dishCount).toBeGreaterThan(0);
    });
  });

  test('TC3.5 - 列表项不应包含完整的representativeDishes数组', () => {
    const result = cuisinesUtil.getCuisineList();
    result.forEach(item => {
      expect(item).not.toHaveProperty('representativeDishes');
    });
  });
});

// ==================== 测试套件4：findRelatedCuisines ====================

describe('【测试套件4】findRelatedCuisines 函数', () => {
  test('TC4.1 - 传入豆腐应找到相关菜系', () => {
    const result = cuisinesUtil.findRelatedCuisines(['豆腐']);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('TC4.2 - 传入空数组应返回默认4个菜系', () => {
    const result = cuisinesUtil.findRelatedCuisines([]);
    expect(result.length).toBe(4);
  });

  test('TC4.3 - 传入null应返回4个菜系', () => {
    const result = cuisinesUtil.findRelatedCuisines(null);
    expect(result.length).toBe(4);
  });

  test('TC4.4 - 返回结果最多4个', () => {
    const result = cuisinesUtil.findRelatedCuisines(['猪肉', '辣椒', '花椒', '豆瓣酱']);
    expect(result.length).toBeLessThanOrEqual(4);
  });

  test('TC4.5 - 川菜相关食材应使川菜排名靠前', () => {
    const result = cuisinesUtil.findRelatedCuisines(['花椒', '豆瓣酱', '辣椒']);
    const ids = result.map(c => c.id);
    expect(ids.slice(0, 2)).toContain('sichuan');
  });
});

// ==================== 测试套件5：getRandomCuisines ====================

describe('【测试套件5】getRandomCuisines 函数', () => {
  test('TC5.1 - 默认应返回4个', () => {
    const result = cuisinesUtil.getRandomCuisines();
    expect(result.length).toBe(4);
  });

  test('TC5.2 - 指定数量应返回对应数量', () => {
    const result = cuisinesUtil.getRandomCuisines(6);
    expect(result.length).toBe(6);
  });

  test('TC5.3 - 返回数量不超过菜系总数', () => {
    const result = cuisinesUtil.getRandomCuisines(100);
    expect(result.length).toBeLessThanOrEqual(cuisinesUtil.CUISINES.length);
  });

  test('TC5.4 - 返回结果中无重复菜系ID', () => {
    const result = cuisinesUtil.getRandomCuisines(8);
    const ids = result.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('TC5.5 - 30个菜系时可请求到最多30个', () => {
    const result = cuisinesUtil.getRandomCuisines(30);
    expect(result.length).toBe(30);
  });
});

// ==================== 测试套件6：getCuisineDishes ====================

describe('【测试套件6】getCuisineDishes 函数', () => {
  test('TC6.1 - 有效ID不筛选应返回全部菜品', () => {
    const result = cuisinesUtil.getCuisineDishes('sichuan');
    const cuisine = cuisinesUtil.getCuisineById('sichuan');
    expect(result.length).toBe(cuisine.representativeDishes.length);
  });

  test('TC6.2 - 无效ID应返回空数组', () => {
    const result = cuisinesUtil.getCuisineDishes('invalid_id');
    expect(result).toEqual([]);
  });

  test('TC6.3 - 按easy筛选应只返回简单菜品', () => {
    const result = cuisinesUtil.getCuisineDishes('sichuan', 'easy');
    result.forEach(dish => {
      expect(dish.difficulty).toBe('easy');
    });
  });

  test('TC6.4 - 按medium筛选应只返回中等菜品', () => {
    const result = cuisinesUtil.getCuisineDishes('cantonese', 'medium');
    result.forEach(dish => {
      expect(dish.difficulty).toBe('medium');
    });
  });

  test('TC6.5 - 没有该难度菜品时应返回空数组', () => {
    const result = cuisinesUtil.getCuisineDishes('sichuan', 'hard');
    expect(Array.isArray(result)).toBe(true);
  });
});

// ==================== 测试套件7：FAT_LOSS_MEALS 减脂餐数据 ====================

describe('【测试套件7】FAT_LOSS_MEALS 减脂餐数据完整性（30条）', () => {
  test('TC7.1 - 应存在恰好30条减脂餐', () => {
    expect(cuisinesUtil.FAT_LOSS_MEALS.length).toBe(30);
  });

  test('TC7.2 - 每条减脂餐应包含必要字段', () => {
    cuisinesUtil.FAT_LOSS_MEALS.forEach(meal => {
      expect(meal).toHaveProperty('id');
      expect(meal).toHaveProperty('name');
      expect(meal).toHaveProperty('category');
      expect(meal).toHaveProperty('calories');
      expect(meal).toHaveProperty('protein');
      expect(meal).toHaveProperty('carbs');
      expect(meal).toHaveProperty('fat');
      expect(meal).toHaveProperty('cookTime');
      expect(meal).toHaveProperty('difficulty');
      expect(meal).toHaveProperty('desc');
      expect(meal).toHaveProperty('ingredients');
      expect(meal).toHaveProperty('tags');
    });
  });

  test('TC7.3 - 每条减脂餐的category应为fat_loss', () => {
    cuisinesUtil.FAT_LOSS_MEALS.forEach(meal => {
      expect(meal.category).toBe('fat_loss');
    });
  });

  test('TC7.4 - 每条减脂餐的ID应唯一', () => {
    const ids = cuisinesUtil.FAT_LOSS_MEALS.map(m => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('TC7.5 - 热量值应为正数', () => {
    cuisinesUtil.FAT_LOSS_MEALS.forEach(meal => {
      expect(meal.calories).toBeGreaterThan(0);
    });
  });

  test('TC7.6 - 蛋白质、碳水、脂肪应为非负数', () => {
    cuisinesUtil.FAT_LOSS_MEALS.forEach(meal => {
      expect(meal.protein).toBeGreaterThanOrEqual(0);
      expect(meal.carbs).toBeGreaterThanOrEqual(0);
      expect(meal.fat).toBeGreaterThanOrEqual(0);
    });
  });

  test('TC7.7 - 烹饪时间应为正数', () => {
    cuisinesUtil.FAT_LOSS_MEALS.forEach(meal => {
      expect(meal.cookTime).toBeGreaterThan(0);
    });
  });

  test('TC7.8 - 减脂餐应包含tips字段', () => {
    cuisinesUtil.FAT_LOSS_MEALS.forEach(meal => {
      expect(meal).toHaveProperty('tips');
      expect(typeof meal.tips).toBe('string');
      expect(meal.tips.length).toBeGreaterThan(0);
    });
  });

  test('TC7.9 - 难度值应合法', () => {
    const validDifficulties = ['easy', 'medium', 'hard'];
    cuisinesUtil.FAT_LOSS_MEALS.forEach(meal => {
      expect(validDifficulties).toContain(meal.difficulty);
    });
  });

  test('TC7.10 - ingredients应为非空数组', () => {
    cuisinesUtil.FAT_LOSS_MEALS.forEach(meal => {
      expect(Array.isArray(meal.ingredients)).toBe(true);
      expect(meal.ingredients.length).toBeGreaterThan(0);
    });
  });
});

// ==================== 测试套件8：PREGNANCY_MEALS 孕妇营养餐数据 ====================

describe('【测试套件8】PREGNANCY_MEALS 孕妇营养餐数据完整性（30条）', () => {
  test('TC8.1 - 应存在恰好30条孕妇营养餐', () => {
    expect(cuisinesUtil.PREGNANCY_MEALS.length).toBe(30);
  });

  test('TC8.2 - 每条孕妇营养餐应包含必要字段', () => {
    cuisinesUtil.PREGNANCY_MEALS.forEach(meal => {
      expect(meal).toHaveProperty('id');
      expect(meal).toHaveProperty('name');
      expect(meal).toHaveProperty('category');
      expect(meal).toHaveProperty('nutrients');
      expect(meal).toHaveProperty('trimester');
      expect(meal).toHaveProperty('calories');
      expect(meal).toHaveProperty('cookTime');
      expect(meal).toHaveProperty('difficulty');
      expect(meal).toHaveProperty('desc');
      expect(meal).toHaveProperty('ingredients');
      expect(meal).toHaveProperty('tags');
      expect(meal).toHaveProperty('nutrition');
      expect(meal).toHaveProperty('caution');
    });
  });

  test('TC8.3 - 每条孕妇营养餐的category应为pregnancy', () => {
    cuisinesUtil.PREGNANCY_MEALS.forEach(meal => {
      expect(meal.category).toBe('pregnancy');
    });
  });

  test('TC8.4 - 每条孕妇营养餐的ID应唯一', () => {
    const ids = cuisinesUtil.PREGNANCY_MEALS.map(m => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('TC8.5 - trimester应为数组且值合法', () => {
    const validTrimesters = ['early', 'mid', 'late'];
    cuisinesUtil.PREGNANCY_MEALS.forEach(meal => {
      expect(Array.isArray(meal.trimester)).toBe(true);
      expect(meal.trimester.length).toBeGreaterThan(0);
      meal.trimester.forEach(t => {
        expect(validTrimesters).toContain(t);
      });
    });
  });

  test('TC8.6 - nutrients应为非空数组', () => {
    cuisinesUtil.PREGNANCY_MEALS.forEach(meal => {
      expect(Array.isArray(meal.nutrients)).toBe(true);
      expect(meal.nutrients.length).toBeGreaterThan(0);
    });
  });

  test('TC8.7 - caution字段应为非空字符串', () => {
    cuisinesUtil.PREGNANCY_MEALS.forEach(meal => {
      expect(typeof meal.caution).toBe('string');
      expect(meal.caution.length).toBeGreaterThan(0);
    });
  });

  test('TC8.8 - nutrition字段应为非空字符串', () => {
    cuisinesUtil.PREGNANCY_MEALS.forEach(meal => {
      expect(typeof meal.nutrition).toBe('string');
      expect(meal.nutrition.length).toBeGreaterThan(0);
    });
  });

  test('TC8.9 - 孕早期（early）应至少有5条可用餐食', () => {
    const earlyMeals = cuisinesUtil.PREGNANCY_MEALS.filter(m => m.trimester.includes('early'));
    expect(earlyMeals.length).toBeGreaterThanOrEqual(5);
  });

  test('TC8.10 - 孕晚期（late）应至少有5条可用餐食', () => {
    const lateMeals = cuisinesUtil.PREGNANCY_MEALS.filter(m => m.trimester.includes('late'));
    expect(lateMeals.length).toBeGreaterThanOrEqual(5);
  });
});

// ==================== 测试套件9：getFatLossMeals 函数 ====================

describe('【测试套件9】getFatLossMeals 函数', () => {
  test('TC9.1 - 不传参数应返回全部30条', () => {
    const result = cuisinesUtil.getFatLossMeals();
    expect(result.length).toBe(30);
  });

  test('TC9.2 - 传入限制数量应返回对应数量', () => {
    const result = cuisinesUtil.getFatLossMeals(10);
    expect(result.length).toBe(10);
  });

  test('TC9.3 - 传入limit大于总数应返回全部', () => {
    const result = cuisinesUtil.getFatLossMeals(100);
    expect(result.length).toBe(30);
  });

  test('TC9.4 - 返回结果应包含减脂餐必要字段', () => {
    const result = cuisinesUtil.getFatLossMeals(5);
    result.forEach(meal => {
      expect(meal).toHaveProperty('calories');
      expect(meal).toHaveProperty('protein');
      expect(meal.category).toBe('fat_loss');
    });
  });
});

// ==================== 测试套件10：getPregnancyMeals 函数 ====================

describe('【测试套件10】getPregnancyMeals 函数', () => {
  test('TC10.1 - 不传参数应返回全部30条', () => {
    const result = cuisinesUtil.getPregnancyMeals();
    expect(result.length).toBe(30);
  });

  test('TC10.2 - 按early筛选应只返回孕早期餐食', () => {
    const result = cuisinesUtil.getPregnancyMeals('early');
    result.forEach(meal => {
      expect(meal.trimester).toContain('early');
    });
  });

  test('TC10.3 - 按mid筛选应只返回孕中期餐食', () => {
    const result = cuisinesUtil.getPregnancyMeals('mid');
    result.forEach(meal => {
      expect(meal.trimester).toContain('mid');
    });
  });

  test('TC10.4 - 按late筛选应只返回孕晚期餐食', () => {
    const result = cuisinesUtil.getPregnancyMeals('late');
    result.forEach(meal => {
      expect(meal.trimester).toContain('late');
    });
  });

  test('TC10.5 - 传入limit应限制数量', () => {
    const result = cuisinesUtil.getPregnancyMeals(null, 5);
    expect(result.length).toBe(5);
  });

  test('TC10.6 - 组合孕期阶段和数量限制', () => {
    const result = cuisinesUtil.getPregnancyMeals('early', 3);
    expect(result.length).toBeLessThanOrEqual(3);
    result.forEach(meal => {
      expect(meal.trimester).toContain('early');
    });
  });
});

// ==================== 测试套件11：getPregnancyMealsByNutrient 函数 ====================

describe('【测试套件11】getPregnancyMealsByNutrient 函数', () => {
  test('TC11.1 - 查询铁应返回含铁营养素的餐食', () => {
    const result = cuisinesUtil.getPregnancyMealsByNutrient('铁');
    expect(result.length).toBeGreaterThan(0);
    result.forEach(meal => {
      const hasNutrient = meal.nutrients.some(n => n.includes('铁') || '铁'.includes(n));
      expect(hasNutrient).toBe(true);
    });
  });

  test('TC11.2 - 查询叶酸应返回含叶酸的餐食', () => {
    const result = cuisinesUtil.getPregnancyMealsByNutrient('叶酸');
    expect(result.length).toBeGreaterThan(0);
  });

  test('TC11.3 - 查询DHA应返回含DHA的餐食', () => {
    const result = cuisinesUtil.getPregnancyMealsByNutrient('DHA');
    expect(result.length).toBeGreaterThan(0);
  });

  test('TC11.4 - 传入null或空应返回全部孕妇餐', () => {
    const result = cuisinesUtil.getPregnancyMealsByNutrient(null);
    expect(result.length).toBe(30);

    const result2 = cuisinesUtil.getPregnancyMealsByNutrient('');
    expect(result2.length).toBe(30);
  });

  test('TC11.5 - 查询不存在的营养素应返回空数组', () => {
    const result = cuisinesUtil.getPregnancyMealsByNutrient('不存在的营养素XYZ');
    expect(result.length).toBe(0);
  });
});

// ==================== 测试套件12：getFatLossMealsByCalories 函数 ====================

describe('【测试套件12】getFatLossMealsByCalories 函数', () => {
  test('TC12.1 - 默认300卡以下应有数据', () => {
    const result = cuisinesUtil.getFatLossMealsByCalories(300);
    expect(result.length).toBeGreaterThan(0);
  });

  test('TC12.2 - 返回结果热量不超过上限', () => {
    const maxCal = 200;
    const result = cuisinesUtil.getFatLossMealsByCalories(maxCal);
    result.forEach(meal => {
      expect(meal.calories).toBeLessThanOrEqual(maxCal);
    });
  });

  test('TC12.3 - 超低热量限制（50卡）应有有限数据', () => {
    const result = cuisinesUtil.getFatLossMealsByCalories(50);
    result.forEach(meal => {
      expect(meal.calories).toBeLessThanOrEqual(50);
    });
  });

  test('TC12.4 - 超高热量限制应返回全部减脂餐', () => {
    const result = cuisinesUtil.getFatLossMealsByCalories(9999);
    expect(result.length).toBe(30);
  });

  test('TC12.5 - 返回的每条数据应包含calories字段', () => {
    const result = cuisinesUtil.getFatLossMealsByCalories(400);
    result.forEach(meal => {
      expect(meal).toHaveProperty('calories');
      expect(typeof meal.calories).toBe('number');
    });
  });
});

// ==================== 测试套件13：getDailyRecommendation 每日推荐 ====================

describe('【测试套件13】getDailyRecommendation 每日推荐函数', () => {
  test('TC13.1 - 应返回非null对象', () => {
    const result = cuisinesUtil.getDailyRecommendation();
    expect(result).not.toBeNull();
    expect(typeof result).toBe('object');
  });

  test('TC13.2 - 返回结果应包含必要字段', () => {
    const result = cuisinesUtil.getDailyRecommendation();
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('desc');
    expect(result).toHaveProperty('cookTime');
    expect(result).toHaveProperty('difficulty');
    expect(result).toHaveProperty('ingredients');
    expect(result).toHaveProperty('sourceType');
    expect(result).toHaveProperty('sourceName');
    expect(result).toHaveProperty('emoji');
    expect(result).toHaveProperty('color');
    expect(result).toHaveProperty('tags');
  });

  test('TC13.3 - sourceType 应为合法值', () => {
    const result = cuisinesUtil.getDailyRecommendation();
    const validTypes = ['cuisine', 'fat_loss', 'pregnancy'];
    expect(validTypes).toContain(result.sourceType);
  });

  test('TC13.4 - 多次调用同一天内返回相同结果（确定性）', () => {
    const result1 = cuisinesUtil.getDailyRecommendation();
    const result2 = cuisinesUtil.getDailyRecommendation();
    expect(result1.name).toBe(result2.name);
    expect(result1.sourceType).toBe(result2.sourceType);
  });

  test('TC13.5 - ingredients 应为数组', () => {
    const result = cuisinesUtil.getDailyRecommendation();
    expect(Array.isArray(result.ingredients)).toBe(true);
  });

  test('TC13.6 - cookTime 应为正数', () => {
    const result = cuisinesUtil.getDailyRecommendation();
    expect(result.cookTime).toBeGreaterThan(0);
  });

  test('TC13.7 - 难度应为合法值', () => {
    const result = cuisinesUtil.getDailyRecommendation();
    const validDifficulties = ['easy', 'medium', 'hard'];
    expect(validDifficulties).toContain(result.difficulty);
  });

  test('TC13.8 - emoji字段应为非空字符串', () => {
    const result = cuisinesUtil.getDailyRecommendation();
    expect(typeof result.emoji).toBe('string');
    expect(result.emoji.length).toBeGreaterThan(0);
  });

  test('TC13.9 - color字段应为有效颜色值', () => {
    const result = cuisinesUtil.getDailyRecommendation();
    expect(typeof result.color).toBe('string');
    expect(result.color.startsWith('#')).toBe(true);
  });

  test('TC13.10 - tags字段应为数组', () => {
    const result = cuisinesUtil.getDailyRecommendation();
    expect(Array.isArray(result.tags)).toBe(true);
  });
});
