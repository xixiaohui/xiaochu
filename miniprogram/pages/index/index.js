/**
 * 小厨AI - 首页逻辑 v2.0
 * 功能：菜系导航入口 + AI生成菜谱快速入口 + 精选推荐
 */

'use strict';

// 引入菜系数据
const cuisinesUtil = require('../../utils/cuisines');

Page({
  // ==================== 页面初始数据 ====================
  data: {
    // 菜系列表（用于宫格导航）
    cuisineList: [],

    // 首页轮播图数据
    bannerList: [
      {
        id: 1,
        title: '智能生成专属菜谱',
        subtitle: '输入食材，AI为你烹饪灵感',
        emoji: '✨',
        bgColor: '#FF6B35',
        action: 'recipe',
      },
      {
        id: 2,
        title: '探索八大菜系',
        subtitle: '川粤苏浙，百味中华',
        emoji: '🍜',
        bgColor: '#9C27B0',
        action: 'cuisine',
      },
      {
        id: 3,
        title: '海报一键分享',
        subtitle: '生成精美菜谱海报',
        emoji: '📸',
        bgColor: '#2196F3',
        action: 'recipe',
      },
    ],

    // 当前轮播索引
    currentBanner: 0,

    // 今日推荐菜系（随机4个）
    featuredCuisines: [],

    // 热门食材快速入口
    hotIngredients: [
      { name: '鸡蛋', emoji: '🥚', ingredients: ['鸡蛋'] },
      { name: '猪肉', emoji: '🥩', ingredients: ['猪肉'] },
      { name: '西红柿', emoji: '🍅', ingredients: ['西红柿', '鸡蛋'] },
      { name: '土豆', emoji: '🥔', ingredients: ['土豆'] },
      { name: '豆腐', emoji: '⬜', ingredients: ['豆腐'] },
      { name: '鱼', emoji: '🐟', ingredients: ['鱼'] },
      { name: '羊肉', emoji: '🐑', ingredients: ['羊肉'] },
      { name: '虾', emoji: '🍤', ingredients: ['虾'] },
    ],

    // 版本信息
    version: '2.0.0',
  },

  // ==================== 生命周期 ====================

  onLoad() {
    // 加载菜系数据
    this.loadCuisineData();
    // 开启分享菜单
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    });
  },

  onShow() {
    // 每次显示时刷新推荐菜系
    this.refreshFeaturedCuisines();
  },

  // ==================== 数据加载 ====================

  /**
   * 加载菜系数据
   */
  loadCuisineData() {
    const cuisineList = cuisinesUtil.getCuisineList();
    this.setData({ cuisineList });
    this.refreshFeaturedCuisines();
  },

  /**
   * 刷新推荐菜系（每次进入首页随机更新）
   */
  refreshFeaturedCuisines() {
    const featuredCuisines = cuisinesUtil.getRandomCuisines(4);
    this.setData({ featuredCuisines });
  },

  // ==================== 导航跳转 ====================

  /**
   * 轮播图点击跳转
   */
  onBannerTap(e) {
    const { action } = e.currentTarget.dataset;
    if (action === 'recipe') {
      wx.switchTab({ url: '/pages/recipe/recipe' });
    } else if (action === 'cuisine') {
      wx.switchTab({ url: '/pages/cuisine/index' });
    }
  },

  /**
   * 轮播图切换
   */
  onBannerChange(e) {
    this.setData({ currentBanner: e.detail.current });
  },

  /**
   * 跳转到 AI 生成菜谱页（传入食材）
   */
  goToRecipe(e) {
    const { ingredients } = e.currentTarget.dataset;
    if (ingredients && ingredients.length > 0) {
      const app = getApp();
      app.globalData.presetIngredients = ingredients;
    }
    wx.switchTab({ url: '/pages/recipe/recipe' });
  },

  /**
   * 跳转到菜系列表页
   */
  goToCuisineList() {
    wx.switchTab({ url: '/pages/cuisine/index' });
  },

  /**
   * 跳转到菜系详情页
   */
  goToCuisineDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/cuisine-detail/index?id=${id}`,
    });
  },

  /**
   * 快速食材入口 - 跳转菜谱生成并预置食材
   */
  onHotIngredientTap(e) {
    const { ingredients } = e.currentTarget.dataset;
    const app = getApp();
    app.globalData.presetIngredients = ingredients;
    wx.switchTab({ url: '/pages/recipe/recipe' });
  },

  // ==================== 分享配置 ====================

  onShareAppMessage() {
    return {
      title: '小厨AI - 输入食材，AI帮你变好菜！',
      path: '/pages/index/index',
    };
  },

  onShareTimeline() {
    return {
      title: '小厨AI 2.0 - 多菜系智能烹饪助手',
    };
  },
});
