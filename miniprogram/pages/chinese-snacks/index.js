/**
 * 中国小吃页面 - chinese-snacks/index.js  v1.0.0
 *
 * 功能：
 *   - 展示中国各地著名小吃前100道（来自 utils/cuisines.js CHINESE_SNACKS）
 *   - 支持按省份 / 分类双维度筛选
 *   - 卡片网格布局（非列表），UI参考减脂/孕妇餐版块
 *   - 点击小吃 → 弹窗展示完整菜谱
 *     ① 先查云端 recipes 集合（category = chinese_snack_generated，sourceDishName 匹配）
 *     ② 命中 → 直接展示（0 Token）
 *     ③ 未命中 → 调用 ai-service.js callCloudAIFrontend() 生成
 *     ④ 生成成功 → 写入 recipes 集合，下次优先读取
 *   - 支持重新生成（强制跳过缓存）
 *   - 支持生成海报（复用 utils/poster-generator.js）
 */

'use strict';

const cuisinesUtil    = require('../../utils/cuisines');
const aiService       = require('../../utils/ai-service');
const posterGenerator = require('../../utils/poster-generator');

// ==================== 常量 ====================

const RECIPES_COLLECTION = 'recipes';
const DB_QUERY_TIMEOUT   = 8000;
const SERVICE_VERSION    = '1.0.0';

// 主题色（中国红/橙红系）
const THEME_COLOR        = '#D32F2F';
const THEME_LIGHT_COLOR  = '#FFEBEE';

// 分类筛选选项
const FILTER_CATEGORIES = [
  { id: 'all',         label: '全部' },
  { id: 'noodle',      label: '🍜 面食粉类' },
  { id: 'dumpling',    label: '🥟 饺包点心' },
  { id: 'dim_sum',     label: '🫖 早茶点心' },
  { id: 'street_food', label: '🌯 街头小吃' },
  { id: 'cake',        label: '🥮 糕饼糕团' },
  { id: 'soup',        label: '🍲 汤羹炖品' },
  { id: 'fried',       label: '🍩 油炸煎烙' },
  { id: 'sweet',       label: '🍡 甜品饮品' },
  { id: 'roast',       label: '🍗 烤卤熏制' },
];

Page({
  data: {
    // ── 列表数据 ──────────────────────────────────────
    allSnacks:     [],   // 全量（原始，最多100条）
    displaySnacks: [],   // 当前显示（筛选后）

    // ── 筛选 ──────────────────────────────────────────
    filterCategories: FILTER_CATEGORIES,
    activeCategory:   'all',

    // 省份筛选（动态生成）
    provinces:       [],   // [{id: 'all', label: '全部省份'}, {id: '北京', label: '北京'}, ...]
    activeProvince:  'all',

    // ── 已有云端记录标记 ──────────────────────────────
    existingMap: {},   // { snackName: true }

    // ── 菜谱弹窗 ──────────────────────────────────────
    showModal:    false,
    modalLoading: false,
    modalSnack:   null,   // 当前点击的小吃对象
    modalRecipe:  null,   // 从DB/AI获取的食谱
    modalSource:  '',     // 'db' | 'ai'
    modalElapsed: 0,
    modalTokens:  0,
    modalError:   '',

    // ── 海报弹窗 ──────────────────────────────────────
    showPosterModal:  false,
    posterTempPath:   '',
    posterGenerating: false,
    posterError:      '',
  },

  // ==================== 生命周期 ====================

  onLoad() {
    const allSnacks = cuisinesUtil.getChineseSnacks(100);

    // 生成省份列表
    const provinceSet = [...new Set(allSnacks.map(s => s.province))];
    const provinces = [
      { id: 'all', label: '全部省份' },
      ...provinceSet.map(p => ({ id: p, label: p })),
    ];

    this.setData({ allSnacks, displaySnacks: allSnacks, provinces });
    wx.setNavigationBarTitle({ title: '🍜 中国小吃' });
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage'] });

    // 异步检查云端已有记录（不阻塞渲染）
    this._checkExisting(allSnacks.map(s => s.name));
  },

  onShow() {
    const { allSnacks } = this.data;
    if (allSnacks.length) this._checkExisting(allSnacks.map(s => s.name));
  },

  // ==================== 批量检查云端记录 ====================

  async _checkExisting(names) {
    try {
      const db  = wx.cloud.database();
      const col = db.collection(RECIPES_COLLECTION);
      const existing = {};
      const BATCH = 10;

      for (let i = 0; i < names.length; i += BATCH) {
        const batch = names.slice(i, i + BATCH);
        const res = await col
          .where({
            sourceDishName: db.command.in(batch),
            category:       db.command.in(['chinese_snack', 'chinese_snack_generated']),
          })
          .field({ sourceDishName: true })
          .limit(batch.length)
          .get();

        (res.data || []).forEach(r => {
          if (r.sourceDishName) existing[r.sourceDishName] = true;
        });
      }

      this.setData({ existingMap: existing });
      console.log(`[snacks] 云端已有 ${Object.keys(existing).length}/${names.length} 道菜谱`);
    } catch (e) {
      console.warn('[snacks] 检查云端记录失败：', e.message);
    }
  },

  // ==================== 筛选 ====================

  onCategoryFilter(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeCategory: id });
    this._applyFilter();
  },

  onProvinceFilter(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeProvince: id });
    this._applyFilter();
  },

  _applyFilter() {
    const { allSnacks, activeCategory, activeProvince } = this.data;
    let result = allSnacks;

    if (activeCategory !== 'all') result = result.filter(s => s.category === activeCategory);
    if (activeProvince  !== 'all') result = result.filter(s => s.province === activeProvince);

    this.setData({ displaySnacks: result });
  },

  // ==================== 点击小吃 → 弹窗 ====================

  async onSnackTap(e) {
    const { snack } = e.currentTarget.dataset;
    if (!snack) return;

    this.setData({
      showModal:    true,
      modalLoading: true,
      modalSnack:   snack,
      modalRecipe:  null,
      modalSource:  '',
      modalElapsed: 0,
      modalTokens:  0,
      modalError:   '',
    });

    try {
      const result = await this._getRecipe(snack);

      if (result.source === 'ai') {
        const existingMap = { ...this.data.existingMap, [snack.name]: true };
        this.setData({ existingMap });
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
      console.error('[snacks] 生成菜谱失败：', err.message);
      this.setData({
        modalLoading: false,
        modalError:   err.message || '生成失败，请稍后重试',
      });
    }
  },

  /**
   * 核心：先查 DB，命中直接返回；未命中 AI 生成并回写
   */
  async _getRecipe(snack) {
    const t0 = Date.now();

    // ── Step 1: 查云端 ────────────────────────────────
    let dbRecipe = null;
    try {
      dbRecipe = await this._queryFromDB(snack.name);
    } catch (e) {
      console.warn('[snacks] DB查询失败，降级AI：', e.message);
    }

    if (dbRecipe) {
      return { recipe: dbRecipe, source: 'db', tokensUsed: 0, elapsed: Date.now() - t0 };
    }

    // ── Step 2: AI 生成 ───────────────────────────────
    const cleanIngredients = (snack.ingredients || []).map(ing =>
      ing.replace(/\d+[g|ml|个|只|根|片|朵|颗|块|串]/g, '').trim()
    ).filter(i => i.length > 0);

    const extraHint = [
      `小吃名称：${snack.name}`,
      `产地：${snack.province}${snack.city ? ' ' + snack.city : ''}`,
      snack.desc ? `特点：${snack.desc}` : '',
      `热量约：${snack.calories}kcal`,
    ].filter(Boolean).join('；');

    const aiResult = await aiService.callCloudAIFrontend(
      cleanIngredients.length > 0 ? cleanIngredients : [snack.name],
      snack.cookTime   || 30,
      snack.difficulty || 'medium',
      extraHint
    );

    const recipe = aiResult.recipe;

    // ── Step 3: 写入云端 ──────────────────────────────
    try {
      await this._saveToDB(recipe, snack, aiResult.tokensUsed || 0);
    } catch (e) {
      console.warn('[snacks] 写入DB失败（不影响展示）：', e.message);
    }

    return {
      recipe,
      source:     'ai',
      tokensUsed: aiResult.tokensUsed || 0,
      elapsed:    Date.now() - t0,
    };
  },

  /** 查询云端单条记录 */
  _queryFromDB(dishName) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('查询超时')), DB_QUERY_TIMEOUT);
      const db = wx.cloud.database();
      db.collection(RECIPES_COLLECTION)
        .where({
          sourceDishName: dishName,
          category: db.command.in(['chinese_snack', 'chinese_snack_generated']),
          status: 'active',
        })
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()
        .then(res => {
          clearTimeout(timer);
          const record = (res.data || [])[0];
          if (!record) { resolve(null); return; }
          const { _id, _openid, cuisineId, cuisineName, category, sourceType,
                  sourceDishName, sourceIngredients, aiProvider, tokensUsed,
                  version, status, isPublic, author, createdAt, updatedAt,
                  snackProvince, snackCity, snackCategory,
                  ...recipeFields } = record;
          resolve({ ...recipeFields, _id, _sourceType: sourceType });
        })
        .catch(e => { clearTimeout(timer); reject(e); });
    });
  },

  /** 写入云端 recipes 集合 */
  async _saveToDB(recipe, snack, tokensUsed) {
    const db  = wx.cloud.database();
    const col = db.collection(RECIPES_COLLECTION);
    const record = {
      ...recipe,
      // 菜系/来源元数据
      cuisineId:         'chinese_snacks',
      cuisineName:       '中国小吃',
      cuisineFullName:   '中国各地著名小吃',
      cuisineEmoji:      snack.emoji || '🍜',
      cuisineColor:      THEME_COLOR,
      category:          'chinese_snack_generated',
      sourceType:        'chinese_snack_generated',
      sourceDishName:    snack.name,
      sourceIngredients: Array.isArray(snack.ingredients) ? snack.ingredients : [],
      // 小吃特有字段
      snackProvince:     snack.province || '',
      snackCity:         snack.city || '',
      snackCategory:     snack.category || '',
      snackCalories:     snack.calories || 0,
      snackTags:         snack.tags || [],
      // AI 信息
      aiProvider:        'hunyuan-exp',
      tokensUsed:        tokensUsed,
      // 管理字段
      version:           SERVICE_VERSION,
      status:            'active',
      isPublic:          true,
      author:            'system_ai',
      createdAt:         db.serverDate(),
      updatedAt:         db.serverDate(),
    };
    const res = await col.add({ data: record });
    console.log(`[snacks] 写入DB成功：${snack.name}，docId=${res._id}`);
    return res._id;
  },

  // ==================== 弹窗操作 ====================

  onCloseModal() {
    this.setData({ showModal: false, modalRecipe: null, modalSnack: null });
  },

  /** 重新生成——强制跳过缓存直接调 AI */
  async onRegenerateRecipe() {
    const { modalSnack } = this.data;
    if (!modalSnack) return;

    this.setData({ modalLoading: true, modalRecipe: null, modalError: '' });

    try {
      const cleanIngredients = (modalSnack.ingredients || []).map(ing =>
        ing.replace(/\d+[g|ml|个|只|根|片|朵|颗|块|串]/g, '').trim()
      ).filter(i => i.length > 0);

      const extraHint = `小吃名称：${modalSnack.name}，产地：${modalSnack.province}${modalSnack.city ? ' ' + modalSnack.city : ''}，${modalSnack.desc || ''}`;

      const aiResult = await aiService.callCloudAIFrontend(
        cleanIngredients.length > 0 ? cleanIngredients : [modalSnack.name],
        modalSnack.cookTime   || 30,
        modalSnack.difficulty || 'medium',
        extraHint
      );

      // 异步回写，不等待
      this._saveToDB(aiResult.recipe, modalSnack, aiResult.tokensUsed || 0)
          .catch(e => console.warn('[snacks] 重新生成回写失败：', e.message));

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

  onRetry() {
    const { modalSnack } = this.data;
    if (modalSnack) this.onSnackTap({ currentTarget: { dataset: { snack: modalSnack } } });
  },

  noop() {},

  // ==================== 海报生成 ====================

  async onGeneratePoster() {
    const { modalRecipe, modalSnack } = this.data;
    if (!modalRecipe || !modalSnack) {
      wx.showToast({ title: '请先生成菜谱', icon: 'none' });
      return;
    }

    this.setData({
      showPosterModal:  true,
      posterGenerating: true,
      posterTempPath:   '',
      posterError:      '',
    });

    try {
      const tempPath = await posterGenerator.generatePoster({
        canvasId:  'posterCanvas',
        pageCtx:   this,
        recipe:    modalRecipe,
        mealInfo:  modalSnack,
        themeType: 'cuisine',
        color:     THEME_COLOR,
        onProgress(msg) {
          wx.showLoading({ title: msg, mask: false });
        },
      });
      wx.hideLoading();
      this.setData({ posterGenerating: false, posterTempPath: tempPath });
    } catch (err) {
      wx.hideLoading();
      console.error('[snacks] 海报生成失败：', err.message);
      this.setData({ posterGenerating: false, posterError: err.message || '海报生成失败，请重试' });
    }
  },

  onClosePosterModal() {
    this.setData({ showPosterModal: false, posterTempPath: '', posterError: '' });
  },

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

  onPreviewPoster() {
    const { posterTempPath } = this.data;
    if (posterTempPath) wx.previewImage({ current: posterTempPath, urls: [posterTempPath] });
  },

  // ==================== 分享配置 ====================

  onShareAppMessage() {
    return {
      title: '小厨AI - 中国小吃，舌尖上的中国',
      path:  '/pages/chinese-snacks/index',
    };
  },

  onShareTimeline() {
    return {
      title: '小厨AI - 中国小吃，舌尖上的中国',
    };
  },
});
