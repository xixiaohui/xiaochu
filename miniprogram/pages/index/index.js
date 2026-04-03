/**
 * 小厨AI - 首页逻辑 v3.0
 * 功能：菜系导航入口 + AI生成菜谱快速入口 + 减脂菜谱板块 + 孕妇营养餐板块 + 今日推荐
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
        title: '探索八大菜系',
        subtitle: '川粤苏浙，百味中华',
        emoji: '🍜',
        bgColor: '#9C27B0',
        action: 'cuisine',
      },
      {
        id: 2,
        title: '减脂健康餐',
        subtitle: '低卡美味，科学减重',
        emoji: '🥗',
        bgColor: '#4CAF50',
        action: 'fatLoss',
      },
      {
        id: 3,
        title: '孕妇营养餐',
        subtitle: '专业营养，呵护母婴',
        emoji: '🤰',
        bgColor: '#E91E63',
        action: 'pregnancy',
      },
      {
        id: 4,
        title: '中国小吃',
        subtitle: '舌尖上的中国·300道名吃',
        emoji: '🀄',
        bgColor: '#D32F2F',
        action: 'chinese-snacks',
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

    // 减脂餐列表（展示前6道）
    fatLossMeals: [],

    // 孕妇营养餐列表（展示前6道）
    pregnancyMeals: [],

    // 今日推荐（今天吃什么）
    dailyRecommendation: null,

    // 版本信息
    version: '3.0.0',
  },

  // ==================== 生命周期 ====================

  onLoad() {
    // 加载菜系数据
    this.loadCuisineData();
    // 加载减脂餐数据
    this.loadFatLossMeals();
    // 加载孕妇营养餐数据
    this.loadPregnancyMeals();
    // 加载今日推荐
    this.loadDailyRecommendation();
    // 开启分享菜单
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    });
  },

  onShow() {
    // 每次显示时刷新推荐菜系
    this.refreshFeaturedCuisines();
    // 刷新今日推荐（时间段变化时更新）
    this.loadDailyRecommendation();
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

  /**
   * 加载减脂餐数据（展示前6道）
   */
  loadFatLossMeals() {
    const fatLossMeals = cuisinesUtil.getFatLossMeals(2);

    console.log(fatLossMeals)
    this.setData({ fatLossMeals });
  },

  /**
   * 加载孕妇营养餐数据（展示前6道）
   */
  loadPregnancyMeals() {
    const pregnancyMeals = cuisinesUtil.getPregnancyMeals(null, 2);
    this.setData({ pregnancyMeals });
  },

  /**
   * 加载今日推荐（根据当前时间确定性推荐）
   */
  loadDailyRecommendation() {
    const dailyRecommendation = cuisinesUtil.getDailyRecommendation();
    this.setData({ dailyRecommendation });
  },

  // ==================== 导航跳转 ====================

  /**
   * 轮播图点击跳转
   */
  onBannerTap(e) {
    const { action } = e.currentTarget.dataset;
    if (action === 'cuisine') {
      wx.switchTab({ url: '/pages/cuisine/index' });
    } else if (action === 'fatLoss') {
      // 跳转减脂餐列表页（暂时导航到菜系页）
      wx.switchTab({ url: '/pages/fat-loss-meals/index' });
    } else if (action === 'pregnancy') {
      // 跳转孕妇营养餐列表页（暂时导航到菜系页）
      wx.switchTab({ url: '/pages/pregnancy-meals/index' });
    } else if(action === 'chinese-snacks'){
      // 跳转到中国小吃
      wx.switchTab({ url: '/pages/chinese-snacks/index' });
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
   * 跳转到中国小吃列表页
   */
  goToChineseSnacksList() {
    wx.switchTab({ url: '/pages/chinese-snacks/index' });
  },

  /**
   * 跳转到减脂列表
   */
  goToFatLossMeals() {
    wx.switchTab({ url: '/pages/fat-loss-meals/index' });
  },

  /**
   * 跳转到孕妇营养列表
   */
  goToPregnancyMeals() {
    console.log("goToPregnancyMeals")
    wx.switchTab({ url: '/pages/pregnancy-meals/index' });
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

  /**
   * 点击减脂餐项目 → 跳转到减脂餐菜系详情页
   * 传入 cuisineId 时直接跳详情页，否则兜底到 AI 生成
   */
  onFatLossMealTap(e) {
    const { name, ingredients, cuisineid } = e.currentTarget.dataset;
    console.log(cuisineid)

    if (cuisineid) {
      wx.switchTab({ url: `/pages/fat-loss-meals/index?id=${cuisineid}` });
      return;
    }
    // 兜底：用食材跳 AI 生成
    const app = getApp();
    const cleanIngredients = (ingredients || []).map(ing =>
      ing.replace(/\d+[g|ml|个|只|根|片|朵|颗|块]/g, '').trim()
    ).filter(i => i.length > 0).slice(0, 5);
    app.globalData.presetIngredients = cleanIngredients.length > 0 ? cleanIngredients : [name];
    app.globalData.presetMode = 'fat_loss';
    wx.switchTab({ url: '/pages/recipe/recipe' });
  },

  /**
   * 点击孕妇营养餐项目 → 跳转到对应菜系详情页
   * 传入 cuisineId 时直接跳详情页，否则兜底到 AI 生成
   */
  onPregnancyMealTap(e) {
    const { name, ingredients, cuisineid } = e.currentTarget.dataset;

    console.log(cuisineid)
    if (cuisineid) {
      console.log("跳转到页面")
      wx.switchTab({ url: `/pages/pregnancy-meals/index` });
      return;
    }
    // 兜底：用食材跳 AI 生成
    const app = getApp();
    const cleanIngredients = (ingredients || []).map(ing =>
      ing.replace(/\d+[g|ml|个|只|根|片|朵|颗|块]/g, '').trim()
    ).filter(i => i.length > 0).slice(0, 5);
    app.globalData.presetIngredients = cleanIngredients.length > 0 ? cleanIngredients : [name];
    app.globalData.presetMode = 'pregnancy';
    wx.switchTab({ url: '/pages/recipe/recipe' });
  },

  /**
   * 点击今日推荐，跳转对应菜系详情页
   * - sourceType === 'cuisine'  → 跳转该菜系详情页（goToCuisineDetail）
   * - sourceType === 'fat_loss' / 'pregnancy' → 跳转对应特色菜系详情页，
   *   若无 cuisineId 则用食材跳 recipe 页作为兜底
   */
  onDailyRecommendationTap(e) {
    const { dailyRecommendation } = this.data;
    if (!dailyRecommendation) return;

    // 优先从 dataset 取（WXML 已通过 data-cuisine-id 传入）
    const sourceType = (e && e.currentTarget && e.currentTarget.dataset.sourceType) || dailyRecommendation.sourceType;
    const cuisineId  = (e && e.currentTarget && e.currentTarget.dataset.cuisineId)  || dailyRecommendation.cuisineId;
    const { name, ingredients } = dailyRecommendation;

    if (sourceType === 'cuisine' && cuisineId) {
      // 跳转到对应菜系详情页
      console.log("cuisineId is",cuisineId)
      wx.navigateTo({ url: `/pages/cuisine-detail/index?id=${cuisineId}` });
      return;
    }

    // 减脂餐 / 孕妇营养餐：用食材跳转 AI 生成菜谱页
    const app = getApp();
    const cleanIngredients = (ingredients || []).map(ing =>
      ing.replace(/\d+[g|ml|个|只|根|片|朵|颗|块]/g, '').trim()
    ).filter(i => i.length > 0).slice(0, 5);
    app.globalData.presetIngredients = cleanIngredients.length > 0 ? cleanIngredients : [name];
    if (sourceType === 'fat_loss') app.globalData.presetMode = 'fat_loss';
    if (sourceType === 'pregnancy') app.globalData.presetMode = 'pregnancy';
    wx.switchTab({ url: '/pages/recipe/recipe' });
  },

  /**
   * 换一道今日推荐
   */
  refreshDailyRecommendation() {
    // 从全部菜肴中随机选一道（不同于当前推荐）
    const allDishes = [];
    const cuisinesUtil2 = require('../../utils/cuisines');
    cuisinesUtil2.CUISINES.forEach(cuisine => {
      cuisine.representativeDishes.forEach(dish => {
        allDishes.push({
          ...dish,
          sourceType: 'cuisine',
          sourceName: cuisine.name,
          cuisineId: cuisine.id,       // 用于跳转菜系详情页
          emoji: cuisine.emoji,
          color: cuisine.color,
          tags: dish.ingredients ? dish.ingredients.slice(0, 3) : [],
        });
      });
    });
    cuisinesUtil2.FAT_LOSS_MEALS.forEach(meal => {
      allDishes.push({
        name: meal.name,
        desc: meal.desc,
        cookTime: meal.cookTime,
        difficulty: meal.difficulty,
        ingredients: meal.ingredients,
        sourceType: 'fat_loss',
        sourceName: '减脂餐',
        emoji: '🥗',
        color: '#4CAF50',
        tags: meal.tags || [],
        calories: meal.calories,
      });
    });
    cuisinesUtil2.PREGNANCY_MEALS.forEach(meal => {
      allDishes.push({
        name: meal.name,
        desc: meal.desc,
        cookTime: meal.cookTime,
        difficulty: meal.difficulty,
        ingredients: meal.ingredients,
        sourceType: 'pregnancy',
        sourceName: '孕妇营养餐',
        emoji: '🤰',
        color: '#E91E63',
        tags: meal.tags || [],
        calories: meal.calories,
      });
    });
    const randomIndex = Math.floor(Math.random() * allDishes.length);
    this.setData({ dailyRecommendation: allDishes[randomIndex] });
  },

  // ==================== 分享配置 ====================

  onShareAppMessage() {
    return {
      title: '小厨AI - 减脂餐·孕妇营养餐·每日推荐',
      path: '/pages/index/index',
    };
  },

  onShareTimeline() {
    return {
      title: '小厨AI - 减脂餐·孕妇营养餐·每日推荐',
      path: '/pages/index/index',
    };
  },
});
