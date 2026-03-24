/**
 * 菜系详情页面逻辑 - cuisine-detail/index.js
 * 功能：展示单个菜系的详细信息、代表菜列表，支持一键生成AI菜谱
 */

'use strict';

const cuisinesUtil = require('../../utils/cuisines');

Page({
  data: {
    // 当前菜系数据
    cuisine: null,

    // 菜系ID
    cuisineId: '',

    // 当前难度筛选
    difficultyFilter: 'all',

    // 难度选项
    difficultyOptions: [
      { id: 'all', label: '全部' },
      { id: 'easy', label: '😊 简单' },
      { id: 'medium', label: '💪 中等' },
      { id: 'hard', label: '👨‍🍳 困难' },
    ],

    // 显示的菜品列表（过滤后）
    displayDishes: [],

    // 当前展开的菜品索引（-1表示无）
    expandedDishIndex: -1,
  },

  onLoad(options) {
    const { id } = options;
    if (!id) {
      wx.showToast({ title: '菜系不存在', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({ cuisineId: id });
    this.loadCuisineData(id);

    // 开启分享
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage'],
    });
  },

  /**
   * 加载菜系详情数据
   */
  loadCuisineData(id) {
    const cuisine = cuisinesUtil.getCuisineById(id);
    if (!cuisine) {
      wx.showToast({ title: '菜系不存在', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    // 设置导航栏标题
    wx.setNavigationBarTitle({ title: cuisine.name });
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: cuisine.color,
    });

    this.setData({
      cuisine,
      displayDishes: cuisine.representativeDishes,
    });
  },

  /**
   * 切换难度筛选
   */
  onDifficultyFilter(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ difficultyFilter: id, expandedDishIndex: -1 });

    const cuisine = this.data.cuisine;
    if (!cuisine) return;

    let dishes = cuisine.representativeDishes;
    if (id !== 'all') {
      dishes = dishes.filter(d => d.difficulty === id);
    }

    this.setData({ displayDishes: dishes });
  },

  /**
   * 展开/收起菜品详情
   */
  toggleDishExpand(e) {
    const { index } = e.currentTarget.dataset;
    const current = this.data.expandedDishIndex;
    this.setData({
      expandedDishIndex: current === index ? -1 : index,
    });
  },

  /**
   * 用该菜品的食材去生成菜谱
   */
  goToRecipeWithDish(e) {
    const { name, ingredients } = e.currentTarget.dataset;
    const app = getApp();
    app.globalData.presetIngredients = ingredients;
    app.globalData.presetDishName = name;
    wx.switchTab({ url: '/pages/recipe/recipe' });
  },

  /**
   * 用该菜系快速食材去生成菜谱
   */
  goToRecipeWithCuisine() {
    const { cuisine } = this.data;
    if (!cuisine) return;
    const app = getApp();
    app.globalData.presetIngredients = cuisine.quickIngredients.slice(0, 4);
    app.globalData.presetCuisine = { id: cuisine.id, name: cuisine.name };
    wx.switchTab({ url: '/pages/recipe/recipe' });
  },

  onShareAppMessage() {
    const { cuisine } = this.data;
    return {
      title: `小厨AI - ${cuisine ? cuisine.name : '菜系探索'}`,
      path: `/pages/cuisine-detail/index?id=${this.data.cuisineId}`,
    };
  },
});
