/**
 * 菜系详情页面逻辑 - cuisine-detail/index.js  v2.0.0
 *
 * 变更（v2.0.0）：
 *   - "AI生成完整食谱" 按钮接入 utils/recipe-service.js
 *   - 优先读取云端 recipes 集合中已有记录（0 Token / 秒开）
 *   - 数据库无记录时调用 AI 生成，成功后回写数据库
 *   - 新增 recipeModal 弹窗在当前页展示菜谱详情（无需跳转）
 *   - 保留原有的跳转方式 goToRecipeWithDish / goToRecipeWithCuisine
 */

'use strict';

const cuisinesUtil    = require('../../utils/cuisines');
const recipeService   = require('../../utils/recipe-service');
const posterGenerator = require('../../utils/poster-generator');

Page({
  data: {
    // ── 菜系数据 ──────────────────────────────────────────
    cuisine:           null,
    cuisineId:         '',
    difficultyFilter:  'all',
    difficultyOptions: [
      { id: 'all',    label: '全部'      },
      { id: 'easy',   label: '😊 简单'   },
      { id: 'medium', label: '💪 中等'   },
      { id: 'hard',   label: '👨‍🍳 困难'  },
    ],
    displayDishes:     [],
    expandedDishIndex: -1,

    // ── 已有云端记录的菜名集合（用于 UI 标记"已生成"）──────
    // Set 不能放 data，改用 Object 做映射：{ dishName: true }
    existingDishMap:   {},

    // ── 菜谱弹窗 ──────────────────────────────────────────
    showRecipeModal:   false,
    modalLoading:      false,
    modalRecipe:       null,   // 当前弹窗展示的食谱对象
    modalDishName:     '',
    modalSource:       '',     // 'db' | 'ai'
    modalElapsed:      0,
    modalTokens:       0,
    modalError:        '',

    // ── 海报弹窗 ──────────────────────────────────────────
    showPosterModal:   false,
    posterTempPath:    '',     // 生成的海报临时文件路径
    posterGenerating:  false,
    posterError:       '',
  },

  // ==================== 生命周期 ====================

  onLoad(options) {
    const { id } = options;
    if (!id) {
      wx.showToast({ title: '菜系不存在', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.setData({ cuisineId: id });
    this.loadCuisineData(id);
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage'] });
  },

  // ==================== 数据加载 ====================

  loadCuisineData(id) {
    const cuisine = cuisinesUtil.getCuisineById(id);
    if (!cuisine) {
      wx.showToast({ title: '菜系不存在', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    wx.setNavigationBarTitle({ title: cuisine.name });
    wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: cuisine.color });

    this.setData({ cuisine, displayDishes: cuisine.representativeDishes });

    // 异步检查哪些菜已有云端记录（不阻塞渲染）
    this._checkExistingRecipes(id, cuisine.representativeDishes);

    
  },

  /** 批量检查云端已有的菜，更新 existingDishMap */
  async _checkExistingRecipes(cuisineId, dishes) {
    try {
      const names = (dishes || []).map(d => d.name).filter(Boolean);
      if (!names.length) return;

      const existingSet = await recipeService.checkExistingRecipes(cuisineId, names);

      // 转成 { dishName: true } 结构存入 data
      const existingDishMap = {};
      existingSet.forEach(name => { existingDishMap[name] = true; });
      this.setData({ existingDishMap });

      console.log(`[cuisine-detail] 云端已有 ${existingSet.size}/${names.length} 道菜谱`);
    } catch (err) {
      // 检查失败静默处理，不影响正常功能
      console.warn('[cuisine-detail] 检查云端记录失败：', err.message);
    }
  },

  // ==================== 筛选 / 展开 ====================

  onDifficultyFilter(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ difficultyFilter: id, expandedDishIndex: -1 });
    const cuisine = this.data.cuisine;
    if (!cuisine) return;
    const dishes = id === 'all'
      ? cuisine.representativeDishes
      : cuisine.representativeDishes.filter(d => d.difficulty === id);
    this.setData({ displayDishes: dishes });
  },

  toggleDishExpand(e) {
    const { index } = e.currentTarget.dataset;
    const current = this.data.expandedDishIndex;
    this.setData({ expandedDishIndex: current === index ? -1 : index });
  },

  // ==================== 核心：AI生成完整食谱 ====================

  /**
   * 点击"✨ AI生成完整食谱"触发
   * 1. 打开弹窗，显示 loading
   * 2. 调用 recipeService.getRecipeForDish()（云端命中直接返回，否则 AI 生成并回写）
   * 3. 在弹窗内展示结果
   */
  async onGenerateFullRecipe(e) {
    const { dish } = e.currentTarget.dataset;
    const { cuisine } = this.data;
    if (!dish || !cuisine) return;

    // 打开弹窗，进入 loading 状态
    this.setData({
      showRecipeModal: true,
      modalLoading:    true,
      modalRecipe:     null,
      modalDishName:   dish.name,
      modalSource:     '',
      modalElapsed:    0,
      modalTokens:     0,
      modalError:      '',
    });

    try {
      const result = await recipeService.getRecipeForDish(dish, cuisine);

      // 更新"已有"标记
      if (result.source === 'ai') {
        const existingDishMap = { ...this.data.existingDishMap, [dish.name]: true };
        this.setData({ existingDishMap });
      }

      this.setData({
        modalLoading: false,
        modalRecipe:  result.recipe,
        modalSource:  result.source,
        modalElapsed: result.elapsed,
        modalTokens:  result.tokensUsed,
        modalError:   '',
      });
    } catch (err) {
      console.error('[cuisine-detail] 生成食谱失败：', err.message);
      this.setData({
        modalLoading: false,
        modalError:   err.message || '生成失败，请稍后重试',
      });
    }
  },

  /** 关闭菜谱弹窗 */
  onCloseRecipeModal() {
    this.setData({ showRecipeModal: false, modalRecipe: null });
  },

  /** 弹窗内"重新生成"（强制跳过缓存，直接 AI 生成） */
  async onRegenerateRecipe() {
    const { modalDishName, cuisine } = this.data;
    if (!modalDishName || !cuisine) return;

    const dish = (cuisine.representativeDishes || []).find(d => d.name === modalDishName);
    if (!dish) return;

    this.setData({ modalLoading: true, modalRecipe: null, modalError: '' });

    try {
      // 直接调 AI，不走数据库查询
      const aiResult = await require('../../utils/ai-service').callCloudAIFrontend(
        Array.isArray(dish.ingredients) && dish.ingredients.length > 0
          ? dish.ingredients
          : [dish.name],
        dish.cookTime   || 30,
        dish.difficulty || 'easy',
        `菜名：${dish.name}，菜系：${cuisine.name}（${cuisine.fullName || cuisine.name}）`
      );

      // 回写数据库（不等待，后台完成）
      recipeService.getRecipeForDish(
        { ...dish, _forceAI: true },  // 传一个标记，但 service 内幂等写入
        cuisine
      ).catch(e => console.warn('[cuisine-detail] 重新生成回写失败：', e.message));

      this.setData({
        modalLoading: false,
        modalRecipe:  aiResult.recipe,
        modalSource:  'ai',
        modalElapsed: 0,
        modalTokens:  aiResult.tokensUsed || 0,
        modalError:   '',
      });
    } catch (err) {
      this.setData({ modalLoading: false, modalError: err.message || '重新生成失败' });
    }
  },

  // ==================== 海报生成 ====================

  /**
   * 点击"⬇️ 菜谱海报"触发
   * 打开海报预览弹窗，使用 Canvas 绘制海报
   */
  async onGeneratePoster() {
    const { modalRecipe, modalDishName, cuisine } = this.data;
    if (!modalRecipe || !cuisine) {
      wx.showToast({ title: '请先生成菜谱', icon: 'none' });
      return;
    }

    // 找到当前菜品原始信息
    const dish = (cuisine.representativeDishes || []).find(d => d.name === modalDishName) || {
      name: modalDishName,
    };

    this.setData({
      showPosterModal:  true,
      posterGenerating: true,
      posterTempPath:   '',
      posterError:      '',
    });

    try {
      const tempPath = await posterGenerator.generatePoster({
        canvasId:   'posterCanvas',
        pageCtx:    this,
        recipe:     modalRecipe,
        mealInfo:   {
          ...dish,
          cuisineName: cuisine.name,
          emoji:       cuisine.emoji,
        },
        themeType:  'cuisine',
        themeColor: cuisine.color,
        onProgress(msg) {
          wx.showLoading({ title: msg, mask: false });
        },
      });
      wx.hideLoading();

      this.setData({
        posterGenerating: false,
        posterTempPath:   tempPath,
      });
    } catch (err) {
      wx.hideLoading();
      console.error('[cuisine-detail] 海报生成失败：', err.message);
      this.setData({
        posterGenerating: false,
        posterError:      err.message || '海报生成失败，请重试',
      });
    }
  },

  /** 关闭海报弹窗 */
  onClosePosterModal() {
    this.setData({ showPosterModal: false, posterTempPath: '', posterError: '' });
  },

  /** 保存海报到相册 */
  async onSavePoster() {
    const { posterTempPath } = this.data;
    if (!posterTempPath) return;
    try {
      await posterGenerator.saveToAlbum(posterTempPath);
      wx.showToast({ title: '已保存到相册 🎉', icon: 'success', duration: 2000 });
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'error' });
    }
  },

  /** 预览海报 */
  onPreviewPoster() {
    const { posterTempPath } = this.data;
    if (posterTempPath) {
      wx.previewImage({ current: posterTempPath, urls: [posterTempPath] });
    }
  },

  // ==================== 原有跳转方式（保留兼容）====================

  /** 用该菜品食材跳转到 recipe 页（自由生成） */
  goToRecipeWithDish(e) {
    const { name, ingredients } = e.currentTarget.dataset;
    const app = getApp();
    app.globalData.presetIngredients = ingredients;
    app.globalData.presetDishName    = name;
    wx.switchTab({ url: '/pages/recipe/recipe' });
  },

  /** 用菜系快速食材跳转到 recipe 页 */
  goToRecipeWithCuisine() {
    const { cuisine } = this.data;
    if (!cuisine) return;
    const app = getApp();
    app.globalData.presetIngredients = cuisine.quickIngredients.slice(0, 4);
    app.globalData.presetCuisine     = { id: cuisine.id, name: cuisine.name };
    wx.switchTab({ url: '/pages/recipe/recipe' });
  },

  // ==================== 分享 ====================

  onShareAppMessage() {
    const { cuisine } = this.data;
    return {
      title: `小厨AI - ${cuisine ? cuisine.name : '菜系探索'}`,
      path:  `/pages/cuisine-detail/index?id=${this.data.cuisineId}`,
    };
  },
  onShareTimeline() {
    const { cuisine } = this.data;
    return {
      title: `小厨AI - ${cuisine ? cuisine.name : '菜系探索'}`,
      path:  `/pages/cuisine-detail/index?id=${this.data.cuisineId}`,
    };
  },
});
