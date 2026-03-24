/**
 * 菜系数据模块单元测试 - cuisines.test.js
 * 覆盖：getCuisineById、getCuisineList、findRelatedCuisines、getRandomCuisines、getCuisineDishes
 */

'use strict';

const cuisinesUtil = require('../../miniprogram/utils/cuisines');

// ==================== 测试套件1：CUISINES 常量 ====================

describe('【测试套件1】CUISINES 基础数据完整性', () => {
  test('TC1.1 - 应存在至少8个菜系', () => {
    expect(cuisinesUtil.CUISINES.length).toBeGreaterThanOrEqual(8);
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
});

// ==================== 测试套件3：getCuisineList ====================

describe('【测试套件3】getCuisineList 函数', () => {
  test('TC3.1 - 应返回数组', () => {
    const result = cuisinesUtil.getCuisineList();
    expect(Array.isArray(result)).toBe(true);
  });

  test('TC3.2 - 返回数量应与CUISINES总数一致', () => {
    const result = cuisinesUtil.getCuisineList();
    expect(result.length).toBe(cuisinesUtil.CUISINES.length);
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
      // 精简列表不应包含完整代表菜数据
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
    // 川菜应该在前两位
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
    // 验证不会报错，返回数组（可能为空）
    const result = cuisinesUtil.getCuisineDishes('sichuan', 'hard');
    expect(Array.isArray(result)).toBe(true);
  });
});
