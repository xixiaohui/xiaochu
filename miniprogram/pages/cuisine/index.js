/**
 * 菜系列表页面逻辑 - cuisine/index.js
 * 功能：展示所有菜系，支持筛选和搜索，点击进入菜系详情
 */

'use strict';

const cuisinesUtil = require('../../utils/cuisines');

Page({
  data: {
    // 全部菜系列表
    cuisineList: [],

    // 当前筛选标签
    filterTag: 'all',

    // 筛选标签选项
    filterTags: [
      { id: 'all', label: '全部' },
      { id: '麻辣', label: '🌶️ 麻辣' },
      { id: '清淡', label: '🥗 清淡' },
      { id: '海鲜', label: '🦞 海鲜' },
      { id: '炖烧', label: '🍲 炖烧' },
      { id: '烤制', label: '🔥 烤制' },
    ],

    // 显示的菜系（过滤后）
    displayList: [],

    // 搜索关键词
    searchKeyword: '',
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    // 开启分享
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage'],
    });
  },

  /**
   * 加载菜系数据
   */
  loadData() {
    const cuisineList = cuisinesUtil.getCuisineList();
    this.setData({
      cuisineList,
      displayList: cuisineList,
    });
  },

  /**
   * 切换筛选标签
   */
  onFilterTap(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ filterTag: id, searchKeyword: '' });
    this.applyFilter(id, '');
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    this.applyFilter(this.data.filterTag, keyword);
  },

  /**
   * 清空搜索
   */
  clearSearch() {
    this.setData({ searchKeyword: '' });
    this.applyFilter(this.data.filterTag, '');
  },

  /**
   * 应用筛选和搜索
   */
  applyFilter(tag, keyword) {
    let list = this.data.cuisineList;

    // 按标签筛选
    if (tag && tag !== 'all') {
      list = list.filter(c => c.tags && c.tags.includes(tag));
    }

    // 按关键词搜索
    if (keyword && keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(kw) ||
        c.description.toLowerCase().includes(kw) ||
        (c.tags && c.tags.some(t => t.includes(kw)))
      );
    }

    this.setData({ displayList: list });
  },

  /**
   * 跳转到菜系详情
   */
  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/cuisine-detail/index?id=${id}`,
    });
  },

  /**
   * 跳转到生成菜谱（带菜系预设）
   */
  goToRecipeWithCuisine(e) {
    const { id, name } = e.currentTarget.dataset;
    const app = getApp();
    app.globalData.presetCuisine = { id, name };
    wx.switchTab({ url: '/pages/recipe/recipe' });
  },

  onShareAppMessage() {
    return {
      title: '小厨AI - 探索中国八大菜系',
      path: '/pages/cuisine/index',
    };
  },
});
