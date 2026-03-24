/**
 * 食谱生成页面逻辑 - recipe.js
 * 功能：食材输入、参数选择、AI食谱生成、结果展示
 * 依赖：utils/ai-service.js（AI调用），utils/cache.js（缓存）
 */

'use strict';

// 引入 AI 服务模块
const aiService = require('../../utils/ai-service');
// 引入缓存模块（用于清理操作）
const cache = require('../../utils/cache');

// ==================== 页面配置数据 ====================

// 烹饪时间选项配置
const COOK_TIME_OPTIONS = [
  { label: '15分钟', value: 15 },
  { label: '30分钟', value: 30 },
  { label: '45分钟', value: 45 },
  { label: '60分钟', value: 60 },
];

// 难度选项配置
const DIFFICULTY_OPTIONS = [
  { label: '😊 简单', value: 'easy' },
  { label: '💪 中等', value: 'medium' },
  { label: '👨‍🍳 困难', value: 'hard' },
];

// 快速添加食材预设（包含常见家庭食材）
const QUICK_INGREDIENTS = [
  { name: '鸡蛋', selected: false },
  { name: '西红柿', selected: false },
  { name: '土豆', selected: false },
  { name: '猪肉', selected: false },
  { name: '豆腐', selected: false },
  { name: '青椒', selected: false },
  { name: '洋葱', selected: false },
  { name: '胡萝卜', selected: false },
  { name: '菠菜', selected: false },
  { name: '蒜', selected: false },
  { name: '姜', selected: false },
  { name: '葱', selected: false },
];

// ==================== Page 定义 ====================

Page({

  // ==================== 页面初始数据 ====================
  data: {
    // ---- 食材相关 ----
    ingredients: [],              // 已添加的食材列表
    inputValue: '',               // 当前输入框的值
    quickIngredients: QUICK_INGREDIENTS.map(item => ({ ...item })), // 快速添加食材（深拷贝）

    // ---- 烹饪参数 ----
    cookTimeOptions: COOK_TIME_OPTIONS,    // 时间选项列表
    difficultyOptions: DIFFICULTY_OPTIONS, // 难度选项列表
    cookTime: 30,                          // 当前选中的烹饪时间，默认30分钟
    difficulty: 'easy',                    // 当前选中的难度，默认简单
    extraRequirements: '',                 // 附加要求

    // ---- 生成状态 ----
    isLoading: false,         // 是否正在加载
    errorMsg: '',             // 错误信息

    // ---- 食谱结果 ----
    recipe: null,             // 生成的食谱对象

    // ---- 缓存相关 ----
    showCacheTip: false,      // 是否显示缓存命中提示
    savedTokens: 0,           // 缓存节省的 token 数（估算）

    // ---- Token 统计 ----
    tokenInfo: {
      tokensUsed: 0,          // 本次消耗的 Token 数
    },
  },

  // ==================== 生命周期 ====================

  /**
   * 页面加载时执行
   * 清理过期缓存，初始化页面
   */
  onLoad(options) {
    console.log('[recipe] 页面加载，参数：', options);

    // 开启右上角分享菜单：发送给朋友 + 分享到朋友圈
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    });

    // 清理过期缓存（每次进入页面时执行）
    const clearedCount = cache.clearExpiredCache();
    if (clearedCount > 0) {
      console.log(`[recipe] 已清理 ${clearedCount} 条过期缓存`);
    }

    // 如果从其他页面传入了食材参数（如从首页推荐进入）
    if (options.ingredients) {
      const presetIngredients = options.ingredients.split(',').filter(s => s.trim());
      if (presetIngredients.length > 0) {
        this.setData({ ingredients: presetIngredients });
      }
    }
  },

  /**
   * 页面显示时执行（每次返回页面都会触发）
   */
  onShow() {
    // 如果有未完成的加载状态，重置（防止异常情况）
    if (this.data.isLoading) {
      this.setData({ isLoading: false });
    }
  },

  /**
   * 页面分享配置
   */
  onShareAppMessage() {
    const recipe = this.data.recipe;
    const path = this.data.ingredients.length
      ? `/pages/recipe/recipe?ingredients=${encodeURIComponent(this.data.ingredients.join(','))}`
      : '/pages/recipe/recipe';

    if (recipe) {
      return {
        title: `我用AI生成了一道"${recipe.name}"，快来试试！`,
        path,
      };
    }
    return {
      title: '小厨AI - 用食材生成食谱',
      path: '/pages/recipe/recipe',
    };
  },

  // ==================== 食材管理 ====================

  /**
   * 监听食材输入框内容变化
   * @param {Object} e - 输入事件对象
   */
  onInputChange(e) {
    this.setData({ inputValue: e.detail.value });
  },

  /**
   * 添加食材到列表
   * 触发条件：点击"添加"按钮 或 输入框按回车
   */
  addIngredient() {
    const inputValue = this.data.inputValue.trim();

    // 空值校验
    if (!inputValue) {
      wx.showToast({ title: '请输入食材名称', icon: 'none' });
      return;
    }

    // 最多20种食材限制
    if (this.data.ingredients.length >= 20) {
      wx.showToast({ title: '最多添加20种食材', icon: 'none' });
      return;
    }

    // 重复食材检测（忽略大小写和空格）
    const normalizedInput = inputValue.toLowerCase().trim();
    const isDuplicate = this.data.ingredients.some(
      item => item.toLowerCase().trim() === normalizedInput
    );
    if (isDuplicate) {
      wx.showToast({ title: `"${inputValue}"已在列表中`, icon: 'none' });
      this.setData({ inputValue: '' });
      return;
    }

    // 添加到食材列表，清空输入框
    this.setData({
      ingredients: [...this.data.ingredients, inputValue],
      inputValue: '',
      errorMsg: '',   // 清除之前的错误信息
    });

    console.log(`[recipe] 添加食材：${inputValue}`);
  },

  /**
   * 从列表中移除指定食材
   * @param {Object} e - 点击事件，携带 data-index
   */
  removeIngredient(e) {
    if (this.data.isLoading) return;

    const index = e.currentTarget.dataset.index;
    const ingredients = [...this.data.ingredients];
    const removedItem = ingredients.splice(index, 1)[0];

    // 同步更新快速添加区域的选中状态
    const quickIngredients = this.data.quickIngredients.map(item => ({
      ...item,
      selected: item.name === removedItem ? false : item.selected,
    }));

    this.setData({ ingredients, quickIngredients });
    console.log(`[recipe] 移除食材：${removedItem}`);
  },

  /**
   * 切换快速添加食材的选中状态
   * 选中：添加到食材列表；取消选中：从食材列表移除
   * @param {Object} e - 点击事件，携带 data-index 和 data-name
   */
  toggleQuickIngredient(e) {
    if (this.data.isLoading) return;

    const { index, name } = e.currentTarget.dataset;
    const quickIngredients = [...this.data.quickIngredients];
    const item = quickIngredients[index];

    // 切换选中状态
    item.selected = !item.selected;

    let ingredients = [...this.data.ingredients];

    if (item.selected) {
      // 选中：添加食材（检查不重复、不超限）
      if (ingredients.length >= 20) {
        wx.showToast({ title: '最多添加20种食材', icon: 'none' });
        item.selected = false;
      } else if (!ingredients.includes(name)) {
        ingredients.push(name);
      }
    } else {
      // 取消选中：移除食材
      ingredients = ingredients.filter(ing => ing !== name);
    }

    this.setData({ quickIngredients, ingredients, errorMsg: '' });
  },

  // ==================== 参数选择 ====================

  /**
   * 设置烹饪时间
   * @param {Object} e - 点击事件，携带 data-value
   */
  setCookTime(e) {
    const value = Number(e.currentTarget.dataset.value);
    this.setData({ cookTime: value });
    console.log(`[recipe] 设置烹饪时间：${value}分钟`);
  },

  /**
   * 设置难度等级
   * @param {Object} e - 点击事件，携带 data-value
   */
  setDifficulty(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ difficulty: value });
    console.log(`[recipe] 设置难度：${value}`);
  },

  /**
   * 监听附加要求输入框变化
   * @param {Object} e - 输入事件对象
   */
  onExtraReqChange(e) {
    this.setData({ extraRequirements: e.detail.value });
  },

  // ==================== 核心功能：生成食谱 ====================

  /**
   * 触发 AI 食谱生成
   * 主流程：参数校验 -> 查询缓存 -> 调用AI -> 展示结果
   */
  async generateRecipe() {
    const { ingredients, cookTime, difficulty, extraRequirements, isLoading } = this.data;

    // 防止重复点击
    if (isLoading) return;

    // 前置校验：食材不能为空
    if (!ingredients || ingredients.length === 0) {
      wx.showToast({ title: '请先添加至少一种食材', icon: 'none' });
      return;
    }

    // 开始加载状态
    this.setData({
      isLoading: true,
      errorMsg: '',
      recipe: null,
      showCacheTip: false,
      tokenInfo: { tokensUsed: 0 },
    });

    console.log('[recipe] 开始生成食谱，食材：', ingredients);

    try {
      // 调用 AI 服务生成食谱
      const result = await aiService.quickRecipe({
        ingredients,
        cookTime,
        difficulty,
        extraRequirements,
        useCache: true,   // 启用缓存
      });

      console.log('[recipe] 食谱生成成功：', result.recipe.name);

      // 更新页面数据：展示食谱
      this.setData({
        recipe: result.recipe,
        tokenInfo: { tokensUsed: result.tokensUsed || 0 },
        isLoading: false,
        // 如果来自缓存，显示节省提示（估算约100 tokens）
        showCacheTip: result.fromCache === true,
        savedTokens: result.fromCache ? 100 : 0,
      });

      // 滚动到食谱结果区域
      wx.pageScrollTo({
        selector: '.recipe-result',
        duration: 300,
      });

      // 缓存命中：提示用户
      if (result.fromCache) {
        wx.showToast({
          title: '已使用缓存，快如闪电⚡',
          icon: 'none',
          duration: 2000,
        });
      }

    } catch (err) {
      console.error('[recipe] 食谱生成失败：', err.message);

      // 根据错误关键词精准匹配，给出可操作的提示
      let errorMsg = '生成失败，请稍后重试';
      const msg = (err.message || '').toLowerCase();

      if (msg.includes('wx.cloud.extend.ai 不可用') || msg.includes('基础库')) {
        // 基础库版本过低
        errorMsg = '需要升级基础库：请在微信开发者工具右上角「详情」→「本地设置」中将基础库升级至 3.7.1 或以上版本';
      } else if (msg.includes('ai功能') || msg.includes('ai 功能') || msg.includes('未开启')) {
        // 云开发 AI 功能未开启
        errorMsg = '云开发 AI 功能未开启：请进入云开发控制台 → AI → 开启 AI 功能，并确认资源包已绑定';
      } else if (msg.includes('超时') || msg.includes('timeout')) {
        // 超时
        errorMsg = '请求超时，请检查网络后重试';
      } else if (msg.includes('environment not found') || msg.includes('env') || msg.includes('环境')) {
        // 环境ID错误
        errorMsg = '云开发环境错误：请检查 miniprogram/app.js 中的 env 字段是否填写了正确的环境ID';
      } else if (msg.includes('未部署') || msg.includes('functionname') || msg.includes('function not found')) {
        // 云函数未上传（降级方案时）
        errorMsg = '云函数未部署：请在微信开发者工具右键 cloudfunctions/recipe-generate → 上传并部署';
      } else if (msg.includes('rate limit') || msg.includes('429') || msg.includes('频率') || msg.includes('quota')) {
        // 调用频率或配额限制
        errorMsg = '调用过于频繁或额度不足，请稍后重试';
      } else if (msg.includes('json') || msg.includes('解析')) {
        // JSON 解析失败
        errorMsg = 'AI 返回格式异常，正在重试（若多次失败请联系开发者）';
      } else if (err.message && err.message.length < 120) {
        // 其他有消息的错误，直接显示（短消息）
        errorMsg = err.message;
      }

      this.setData({
        isLoading: false,
        errorMsg,
      });

      wx.showToast({
        title: '生成失败，请重试',
        icon: 'error',
        duration: 2000,
      });
    }
  },

  // ==================== 页面操作 ====================

  /**
   * 重置页面到初始状态（保留食材，清除结果）
   */
  resetPage() {
    this.setData({
      recipe: null,
      errorMsg: '',
      isLoading: false,
      showCacheTip: false,
      tokenInfo: { tokensUsed: 0 },
    });

    // 滚动回顶部
    wx.pageScrollTo({ scrollTop: 0, duration: 300 });
  },

  /**
   * 分享食谱
   * 调用微信原生分享（onShareAppMessage 配置）
   */
  shareRecipe() {
    if (!this.data.recipe) return;

    // 触发系统分享菜单
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    });
    wx.showActionSheet({
      itemList: ['发送给朋友', '分享到朋友圈'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '发送给朋友',
            content: '请点击右上角“...”后，选择“发送给朋友”',
            showCancel: false,
          });
        } else if (res.tapIndex === 1) {
          wx.showModal({
            title: '分享到朋友圈',
            content: '请点击右上角“...”后，选择“分享到朋友圈”',
            showCancel: false,
          });
        }
      },
    });
  },

  /**
   * 显示部署配置帮助弹窗
   * 帮助用户快速定位"服务器异常"的配置问题
   */
  showDeployHelp() {
    wx.showModal({
      title: '⚙️ 配置检查清单',
      content: '请依次检查：\n\n① app.js 中 env 填入云开发环境ID（在开发者工具点击「云开发」获取）\n\n② 基础库版本 ≥ 3.7.1（详情→本地设置）\n\n③ 云开发控制台 → AI → 已开启 AI 功能\n\n④ 确认免费资源包 pkg-3l8hj0zy-ai-inspire-free 已绑定到当前环境\n\n无需配置 API Key，资源包自动提供 Token 额度',
      showCancel: false,
      confirmText: '我知道了',
      confirmColor: '#FF6B35',
    });
  },

  /**
   * 清除所有食材（快捷清空）
   */
  clearAllIngredients() {
    // 重置快速添加标签的选中状态
    const quickIngredients = this.data.quickIngredients.map(item => ({
      ...item,
      selected: false,
    }));

    this.setData({
      ingredients: [],
      inputValue: '',
      quickIngredients,
      errorMsg: '',
    });
  },

  /**
 * 页面分享到朋友圈配置
 */
onShareTimeline() {
  const recipe = this.data.recipe;
  const ingredientsQuery = this.data.ingredients.length
    ? `ingredients=${encodeURIComponent(this.data.ingredients.join(','))}`
    : '';

  if (recipe) {
    return {
      title: `我用AI生成了一道「${recipe.name}」，快来看看！`,
      query: ingredientsQuery,
      // 如果后续 recipe 有封面图，可优先使用
      imageUrl: recipe.imageUrl || '',
    };
  }

  return {
    title: '小厨AI - 用食材生成食谱',
    query: ingredientsQuery,
  };
},


});
