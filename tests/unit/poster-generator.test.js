/**
 * 海报生成工具单元测试 - poster-generator.test.js  v1.0.0
 *
 * 覆盖范围：
 *   Suite 1  - getTheme：三种主题配置正确
 *   Suite 2  - getPosterSize：尺寸计算正确（保持宽高比，乘以3）
 *   Suite 3  - generatePoster：参数校验（缺少 recipe / mealInfo 时抛出异常）
 *   Suite 4  - generatePoster：正常调用流程（canvas节点存在时完成绘制）
 *   Suite 5  - saveToAlbum：权限拒绝时正确处理
 *   Suite 6  - saveToAlbum：授权成功时正常保存
 *   Suite 7  - generateAndSavePoster：正常流程（调用 generatePoster + showActionSheet）
 *   Suite 8  - generateAndSavePoster：生成失败时显示错误提示
 *   Suite 9  - 模块导出校验
 *   Suite 10 - 主题颜色：菜系自定义颜色正确应用
 */

'use strict';

process.env.NODE_ENV = 'test';

// ==================== Mock 数据 ====================

const MOCK_RECIPE = {
  name:        '红烧肉',
  description: '经典红烧肉，软糯鲜香',
  cookTime:    60,
  difficulty:  '中等',
  servings:    4,
  ingredients: [
    { name: '五花肉', amount: '500', unit: 'g' },
    { name: '生抽',   amount: '30',  unit: 'ml' },
    { name: '老抽',   amount: '10',  unit: 'ml' },
    { name: '冰糖',   amount: '20',  unit: 'g' },
  ],
  steps: [
    { step: 1, description: '五花肉切块焯水', tip: '冷水下锅可去腥' },
    { step: 2, description: '炒糖色，加入肉块翻炒上色' },
    { step: 3, description: '加调料和水，小火炖40分钟' },
    { step: 4, description: '大火收汁，出锅装盘' },
  ],
  nutrition: { calories: 450, protein: 25, carbs: 15, fat: 35 },
  tags: ['经典', '家常', '下饭'],
};

const MOCK_FAT_LOSS_MEAL = {
  id:         'fl_001',
  name:       '水煮鸡胸肉沙拉',
  calories:   280,
  protein:    35,
  carbs:      12,
  fat:        8,
  cookTime:   20,
  difficulty: 'easy',
  desc:       '高蛋白低脂',
  ingredients: ['鸡胸肉150g', '生菜', '番茄'],
  tags:       ['高蛋白', '低脂'],
};

const MOCK_PREGNANCY_MEAL = {
  id:         'pg_001',
  name:       '菠菜猪肝汤',
  calories:   240,
  nutrients:  ['铁', '叶酸', '维生素A'],
  trimester:  ['early', 'mid', 'late'],
  cookTime:   25,
  difficulty: 'easy',
  desc:       '补铁补血',
  ingredients: ['猪肝100g', '菠菜150g', '姜'],
  nutrition:  '猪肝含大量血红素铁，菠菜补充叶酸',
  caution:    '猪肝每周不超过2次',
};

const MOCK_CUISINE_INFO = {
  name:       '川菜',
  fullName:   '四川菜',
  emoji:      '🌶️',
  color:      '#FF5722',
  cuisineName:'川菜',
};

// ==================== Mock wx API ====================

const mockCanvas = {
  width:  0,
  height: 0,
  createImage: jest.fn(() => {
    const img = { onload: null, onerror: null, _src: '' };
    Object.defineProperty(img, 'src', {
      set(val) {
        img._src = val;
        // 自动触发 onload（模拟图片加载成功）
        if (img.onload) setTimeout(() => img.onload(), 0);
      },
      get() { return img._src; },
    });
    return img;
  }),
  getContext: jest.fn(() => ({
    fillStyle:   '',
    strokeStyle: '',
    lineWidth:   1,
    font:        '',
    textAlign:   'left',
    fillRect:    jest.fn(),
    strokeRect:  jest.fn(),
    beginPath:   jest.fn(),
    closePath:   jest.fn(),
    moveTo:      jest.fn(),
    lineTo:      jest.fn(),
    arc:         jest.fn(),
    arcTo:       jest.fn(),
    fill:        jest.fn(),
    stroke:      jest.fn(),
    fillText:    jest.fn(),
    strokeText:  jest.fn(),
    measureText: jest.fn(() => ({ width: 50 })),
    drawImage:   jest.fn(),
    createLinearGradient: jest.fn(() => ({
      addColorStop: jest.fn(),
    })),
  })),
};

global.wx = {
  getSystemInfoSync: jest.fn(() => ({
    screenWidth:  375,
    screenHeight: 812,
  })),
  canvasToTempFilePath: jest.fn(({ success }) => {
    success && success({ tempFilePath: '/tmp/mock_poster.jpg' });
  }),
  getSetting: jest.fn(({ success }) => {
    success && success({ authSetting: {} });
  }),
  saveImageToPhotosAlbum: jest.fn(({ success }) => {
    success && success({});
  }),
  showLoading:    jest.fn(),
  hideLoading:    jest.fn(),
  showToast:      jest.fn(),
  showModal:      jest.fn(),
  showActionSheet:jest.fn(({ success }) => {
    success && success({ tapIndex: 0 });
  }),
  openSetting:    jest.fn(),
  previewImage:   jest.fn(),
  getImageInfo:   jest.fn(({ success }) => {
    success && success({ path: '/images/xiaochu.png' });
  }),
};

// ==================== 加载模块 ====================

const posterGenerator = require('../../miniprogram/utils/poster-generator');

// ==================== 测试套件 ====================

describe('Suite 1 - getTheme：三种主题配置正确', () => {
  test('fat_loss 主题颜色为绿色 #4CAF50', () => {
    const theme = posterGenerator.getTheme('fat_loss');
    expect(theme.primary).toBe('#4CAF50');
    expect(theme.headerText).toBe('#FFFFFF');
    expect(theme.bg).toBe('#F1F8E9');
  });

  test('pregnancy 主题颜色为粉色 #E91E63', () => {
    const theme = posterGenerator.getTheme('pregnancy');
    expect(theme.primary).toBe('#E91E63');
    expect(theme.headerText).toBe('#FFFFFF');
    expect(theme.bg).toBe('#FFF0F5');
  });

  test('cuisine 主题使用自定义颜色', () => {
    const theme = posterGenerator.getTheme('cuisine', '#FF5722');
    expect(theme.primary).toBe('#FF5722');
    expect(theme.headerBg).toBe('#FF5722');
  });

  test('cuisine 主题未传颜色时使用默认橙色', () => {
    const theme = posterGenerator.getTheme('cuisine');
    expect(theme.primary).toBe('#FF6B35');
  });

  test('所有主题都包含必要字段', () => {
    const requiredKeys = [
      'primary', 'secondary', 'bg', 'headerBg', 'headerText',
      'accent', 'tagBg', 'tagText', 'nutBg', 'nutText', 'stepNumBg'
    ];
    ['fat_loss', 'pregnancy', 'cuisine'].forEach(type => {
      const theme = posterGenerator.getTheme(type, '#FF5722');
      requiredKeys.forEach(key => {
        expect(theme).toHaveProperty(key);
      });
    });
  });
});

describe('Suite 2 - getPosterSize：尺寸计算正确', () => {
  test('返回宽度和高度，宽约 375×3=1125', () => {
    const { W, H } = posterGenerator.getPosterSize();
    expect(W).toBe(1125);
    expect(H).toBeGreaterThan(0);
  });

  test('高宽比与屏幕高宽比接近', () => {
    const sysInfo = wx.getSystemInfoSync();
    const screenRatio = sysInfo.screenHeight / sysInfo.screenWidth;
    const { W, H } = posterGenerator.getPosterSize();
    const posterRatio = H / W;
    // 允许 1% 误差（四舍五入）
    expect(Math.abs(posterRatio - screenRatio)).toBeLessThan(0.02);
  });

  test('宽度不超过最大限制 1125', () => {
    const { W } = posterGenerator.getPosterSize();
    expect(W).toBeLessThanOrEqual(1125);
  });

  test('返回 ratio 字段', () => {
    const result = posterGenerator.getPosterSize();
    expect(result).toHaveProperty('ratio');
    expect(result.ratio).toBeGreaterThan(0);
  });
});

describe('Suite 3 - generatePoster：参数校验', () => {
  const mockPageCtx = {
    createSelectorQuery: jest.fn(() => ({
      select: jest.fn(() => ({
        fields: jest.fn(() => ({
          exec: jest.fn(cb => cb([{ node: mockCanvas, size: { width: 375, height: 812 } }])),
        })),
      })),
    })),
  };

  test('缺少 recipe 时抛出异常', async () => {
    await expect(posterGenerator.generatePoster({
      canvasId:  'posterCanvas',
      pageCtx:   mockPageCtx,
      recipe:    null,
      mealInfo:  MOCK_FAT_LOSS_MEAL,
      themeType: 'fat_loss',
    })).rejects.toThrow('缺少食谱或菜品信息');
  });

  test('缺少 mealInfo 时抛出异常', async () => {
    await expect(posterGenerator.generatePoster({
      canvasId:  'posterCanvas',
      pageCtx:   mockPageCtx,
      recipe:    MOCK_RECIPE,
      mealInfo:  null,
      themeType: 'fat_loss',
    })).rejects.toThrow('缺少食谱或菜品信息');
  });

  test('缺少 recipe 和 mealInfo 时抛出异常', async () => {
    await expect(posterGenerator.generatePoster({
      canvasId:  'posterCanvas',
      pageCtx:   mockPageCtx,
      recipe:    undefined,
      mealInfo:  undefined,
      themeType: 'fat_loss',
    })).rejects.toThrow('缺少食谱或菜品信息');
  });
});

describe('Suite 4 - generatePoster：正常流程', () => {
  const mockPageCtx = {
    createSelectorQuery: jest.fn(() => ({
      select: jest.fn(() => ({
        fields: jest.fn(() => ({
          exec: jest.fn(cb => cb([{ node: mockCanvas, size: { width: 375, height: 812 } }])),
        })),
      })),
    })),
  };

  test('减脂主题：成功生成返回临时文件路径', async () => {
    const result = await posterGenerator.generatePoster({
      canvasId:  'posterCanvas',
      pageCtx:   mockPageCtx,
      recipe:    MOCK_RECIPE,
      mealInfo:  MOCK_FAT_LOSS_MEAL,
      themeType: 'fat_loss',
    });
    expect(result).toBe('/tmp/mock_poster.jpg');
  });

  test('孕妇主题：成功生成返回临时文件路径', async () => {
    const result = await posterGenerator.generatePoster({
      canvasId:  'posterCanvas',
      pageCtx:   mockPageCtx,
      recipe:    MOCK_RECIPE,
      mealInfo:  MOCK_PREGNANCY_MEAL,
      themeType: 'pregnancy',
    });
    expect(result).toBe('/tmp/mock_poster.jpg');
  });

  test('菜系主题：成功生成返回临时文件路径', async () => {
    const result = await posterGenerator.generatePoster({
      canvasId:    'posterCanvas',
      pageCtx:     mockPageCtx,
      recipe:      MOCK_RECIPE,
      mealInfo:    MOCK_CUISINE_INFO,
      themeType:   'cuisine',
      themeColor:  '#FF5722',
    });
    expect(result).toBe('/tmp/mock_poster.jpg');
  });

  test('调用了 onProgress 回调', async () => {
    const onProgress = jest.fn();
    await posterGenerator.generatePoster({
      canvasId:   'posterCanvas',
      pageCtx:    mockPageCtx,
      recipe:     MOCK_RECIPE,
      mealInfo:   MOCK_FAT_LOSS_MEAL,
      themeType:  'fat_loss',
      onProgress,
    });
    expect(onProgress).toHaveBeenCalled();
  });

  test('canvas 节点不存在时抛出异常', async () => {
    const badCtx = {
      createSelectorQuery: jest.fn(() => ({
        select: jest.fn(() => ({
          fields: jest.fn(() => ({
            exec: jest.fn(cb => cb([null])),
          })),
        })),
      })),
    };
    await expect(posterGenerator.generatePoster({
      canvasId:  'posterCanvas',
      pageCtx:   badCtx,
      recipe:    MOCK_RECIPE,
      mealInfo:  MOCK_FAT_LOSS_MEAL,
      themeType: 'fat_loss',
    })).rejects.toThrow('找不到 canvas 节点');
  });
});

describe('Suite 5 - saveToAlbum：权限拒绝处理', () => {
  test('authSetting 为 false 时拒绝保存', async () => {
    wx.getSetting.mockImplementationOnce(({ success }) => {
      success({ authSetting: { 'scope.writePhotosAlbum': false } });
    });
    wx.showModal.mockImplementationOnce(({ success }) => {
      success && success({ confirm: false });
    });
    await expect(posterGenerator.saveToAlbum('/tmp/test.jpg')).rejects.toThrow('无相册权限');
  });
});

describe('Suite 6 - saveToAlbum：正常保存', () => {
  test('有权限时成功保存图片', async () => {
    wx.getSetting.mockImplementationOnce(({ success }) => {
      success({ authSetting: {} }); // 未设置 = 未拒绝
    });
    wx.saveImageToPhotosAlbum.mockImplementationOnce(({ success }) => {
      success({});
    });
    await expect(posterGenerator.saveToAlbum('/tmp/test.jpg')).resolves.toBeUndefined();
    expect(wx.saveImageToPhotosAlbum).toHaveBeenCalled();
  });

  test('saveToAlbum 传入正确的 filePath', async () => {
    wx.getSetting.mockImplementationOnce(({ success }) => {
      success({ authSetting: {} });
    });
    wx.saveImageToPhotosAlbum.mockImplementationOnce(({ success, filePath }) => {
      expect(filePath).toBe('/tmp/poster_test.jpg');
      success({});
    });
    await posterGenerator.saveToAlbum('/tmp/poster_test.jpg');
  });
});

describe('Suite 7 - generateAndSavePoster：正常流程', () => {
  const mockPageCtx = {
    createSelectorQuery: jest.fn(() => ({
      select: jest.fn(() => ({
        fields: jest.fn(() => ({
          exec: jest.fn(cb => cb([{ node: mockCanvas, size: { width: 375, height: 812 } }])),
        })),
      })),
    })),
  };

  test('保存操作（tapIndex=0）调用 saveToAlbum', async () => {
    wx.showActionSheet.mockImplementationOnce(({ success }) => {
      success({ tapIndex: 0 });
    });
    wx.getSetting.mockImplementationOnce(({ success }) => {
      success({ authSetting: {} });
    });
    wx.saveImageToPhotosAlbum.mockImplementationOnce(({ success }) => {
      success({});
    });

    const result = await posterGenerator.generateAndSavePoster({
      canvasId:  'posterCanvas',
      pageCtx:   mockPageCtx,
      recipe:    MOCK_RECIPE,
      mealInfo:  MOCK_FAT_LOSS_MEAL,
      themeType: 'fat_loss',
    });
    expect(result).toBe('/tmp/mock_poster.jpg');
  });

  test('预览操作（tapIndex=1）调用 previewImage', async () => {
    wx.showActionSheet.mockImplementationOnce(({ success }) => {
      success({ tapIndex: 1 });
    });

    await posterGenerator.generateAndSavePoster({
      canvasId:  'posterCanvas',
      pageCtx:   mockPageCtx,
      recipe:    MOCK_RECIPE,
      mealInfo:  MOCK_FAT_LOSS_MEAL,
      themeType: 'fat_loss',
    });
    expect(wx.previewImage).toHaveBeenCalled();
  });
});

describe('Suite 8 - generateAndSavePoster：失败处理', () => {
  test('canvas 节点不存在时显示错误提示', async () => {
    const badCtx = {
      createSelectorQuery: jest.fn(() => ({
        select: jest.fn(() => ({
          fields: jest.fn(() => ({
            exec: jest.fn(cb => cb([null])),
          })),
        })),
      })),
    };

    await expect(posterGenerator.generateAndSavePoster({
      canvasId:  'posterCanvas',
      pageCtx:   badCtx,
      recipe:    MOCK_RECIPE,
      mealInfo:  MOCK_FAT_LOSS_MEAL,
      themeType: 'fat_loss',
    })).rejects.toThrow();

    expect(wx.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ icon: 'error' })
    );
  });
});

describe('Suite 9 - 模块导出校验', () => {
  test('导出 generatePoster 函数', () => {
    expect(typeof posterGenerator.generatePoster).toBe('function');
  });

  test('导出 generateAndSavePoster 函数', () => {
    expect(typeof posterGenerator.generateAndSavePoster).toBe('function');
  });

  test('导出 saveToAlbum 函数', () => {
    expect(typeof posterGenerator.saveToAlbum).toBe('function');
  });

  test('导出 getPosterSize 函数', () => {
    expect(typeof posterGenerator.getPosterSize).toBe('function');
  });

  test('导出 getTheme 函数', () => {
    expect(typeof posterGenerator.getTheme).toBe('function');
  });
});

describe('Suite 10 - 主题颜色：菜系自定义颜色', () => {
  test('川菜红色主题颜色正确', () => {
    const theme = posterGenerator.getTheme('cuisine', '#FF5722');
    expect(theme.primary).toBe('#FF5722');
    expect(theme.headerBg).toBe('#FF5722');
    expect(theme.stepNumBg).toBe('#FF5722');
  });

  test('粤菜蓝色主题颜色正确', () => {
    const theme = posterGenerator.getTheme('cuisine', '#1565C0');
    expect(theme.primary).toBe('#1565C0');
    expect(theme.accent).toBe('#1565C0');
  });

  test('未知 themeType 回退到 cuisine 默认', () => {
    const theme = posterGenerator.getTheme('unknown_type', '#333333');
    expect(theme.primary).toBe('#333333');
  });

  test('getTheme 不修改输入颜色格式', () => {
    const colorInput = '#4A90E2';
    const theme = posterGenerator.getTheme('cuisine', colorInput);
    expect(theme.primary).toBe(colorInput);
  });
});
