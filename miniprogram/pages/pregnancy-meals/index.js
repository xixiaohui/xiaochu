/**
 * 孕妇营养餐页面 - pregnancy-meals/index.js  v1.0.0
 *
 * 功能：
 *   - 展示所有孕妇营养餐列表（来自 utils/cuisines.js PREGNANCY_MEALS）
 *   - 支持按孕期阶段 / 营养素 / 热量筛选
 *   - 点击菜品 → 弹窗展示完整菜谱
 *     ① 先查云端 recipes 集合（category=pregnancy_generated，sourceDishName 匹配）
 *     ② 命中 → 直接展示（0 Token）
 *     ③ 未命中 → 调用 ai-service.js callCloudAIFrontend() 生成
 *     ④ 生成成功 → 写入 recipes 集合，下次直接读取
 */

'use strict';

const cuisinesUtil = require('../../utils/cuisines');
const aiService    = require('../../utils/ai-service');

// ==================== 常量 ====================

const RECIPES_COLLECTION = 'recipes';
const DB_QUERY_TIMEOUT   = 8000;
const SERVICE_VERSION    = '1.0.0';

// 孕期阶段筛选
const FILTER_TRIMESTER = [
  { id: 'all',   label: '全部孕期' },
  { id: 'early', label: '🌱 孕早期' },
  { id: 'mid',   label: '🌼 孕中期' },
  { id: 'late',  label: '🌸 孕晚期' },
];

// 热门营养素筛选
const FILTER_NUTRIENT = [
  { id: 'all', label: '全部营养' },
  { id: '叶酸', label: '🟢 叶酸' },
  { id: '铁',   label: '🔴 铁' },
  { id: '钙',   label: '⚪ 钙' },
  { id: 'DHA',  label: '🔵 DHA' },
  { id: '蛋白质',label: '💛 蛋白质' },
];

Page({
  data: {
    // ── 列表数据 ──────────────────────────────────────
    allMeals:      [],
    displayMeals:  [],

    // ── 筛选 ──────────────────────────────────────────
    filterTrimester:   FILTER_TRIMESTER,
    filterNutrient:    FILTER_NUTRIENT,
    activeTrimester:   'all',
    activeNutrient:    'all',

    // ── 云端已有标记 ──────────────────────────────────
    existingMap: {},

    // ── 菜谱弹窗 ──────────────────────────────────────
    showModal:    false,
    modalLoading: false,
    modalMeal:    null,
    modalRecipe:  null,
    modalSource:  '',
    modalElapsed: 0,
    modalTokens:  0,
    modalError:   '',
  },

  // ==================== 生命周期 ====================

  onLoad() {
    console.log("load 孕妇营养餐")
    const allMeals = cuisinesUtil.getPregnancyMeals();
    this.setData({ allMeals, displayMeals: allMeals });
    wx.setNavigationBarTitle({ title: '🤰 孕妇营养餐' });
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage'] });
    this._checkExisting(allMeals.map(m => m.name));
  },

  onShow() {
    const { allMeals } = this.data;
    if (allMeals.length) this._checkExisting(allMeals.map(m => m.name));
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
            category: db.command.in(['pregnancy', 'pregnancy_generated']),
          })
          .field({ sourceDishName: true })
          .limit(batch.length)
          .get();

        (res.data || []).forEach(r => {
          if (r.sourceDishName) existing[r.sourceDishName] = true;
        });
      }

      this.setData({ existingMap: existing });
      console.log(`[pregnancy] 云端已有 ${Object.keys(existing).length}/${names.length} 道菜谱`);
    } catch (e) {
      console.warn('[pregnancy] 检查云端记录失败：', e.message);
    }
  },

  // ==================== 筛选 ====================

  onTrimesterFilter(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeTrimester: id });
    this._applyFilter();
  },

  onNutrientFilter(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeNutrient: id });
    this._applyFilter();
  },

  _applyFilter() {
    const { allMeals, activeTrimester, activeNutrient } = this.data;
    let result = allMeals;

    if (activeTrimester !== 'all') {
      result = result.filter(m =>
        Array.isArray(m.trimester) && m.trimester.includes(activeTrimester)
      );
    }

    if (activeNutrient !== 'all') {
      result = result.filter(m =>
        Array.isArray(m.nutrients) &&
        m.nutrients.some(n => n === activeNutrient || n.includes(activeNutrient))
      );
    }

    this.setData({ displayMeals: result });
  },

  // ==================== 点击菜品 → 弹窗 ====================

  async onMealTap(e) {
    const { meal } = e.currentTarget.dataset;
    if (!meal) return;

    this.setData({
      showModal:    true,
      modalLoading: true,
      modalMeal:    meal,
      modalRecipe:  null,
      modalSource:  '',
      modalElapsed: 0,
      modalTokens:  0,
      modalError:   '',
    });

    try {
      const result = await this._getRecipe(meal);

      if (result.source === 'ai') {
        const existingMap = { ...this.data.existingMap, [meal.name]: true };
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
      console.error('[pregnancy] 生成菜谱失败：', err.message);
      this.setData({
        modalLoading: false,
        modalError:   err.message || '生成失败，请稍后重试',
      });
    }
  },

  /**
   * 核心：先查 DB，命中直接返回，未命中 AI 生成并回写
   */
  async _getRecipe(meal) {
    const t0 = Date.now();

    // ── Step 1: 查云端 ────────────────────────────────
    let dbRecipe = null;
    try {
      dbRecipe = await this._queryFromDB(meal.name);
    } catch (e) {
      console.warn('[pregnancy] DB查询失败，降级AI：', e.message);
    }

    if (dbRecipe) {
      return { recipe: dbRecipe, source: 'db', tokensUsed: 0, elapsed: Date.now() - t0 };
    }

    // ── Step 2: AI 生成 ───────────────────────────────
    const cleanIngredients = (meal.ingredients || []).map(ing =>
      ing.replace(/\d+[g|ml|个|只|根|片|朵|颗|块]/g, '').trim()
    ).filter(i => i.length > 0);

    const nutrientStr = Array.isArray(meal.nutrients) ? meal.nutrients.join('、') : '';
    const trimesterMap = { early: '孕早期', mid: '孕中期', late: '孕晚期' };
    const trimesterStr = Array.isArray(meal.trimester)
      ? meal.trimester.map(t => trimesterMap[t] || t).join('、')
      : '';

    const extraHint = [
      `菜名：${meal.name}`,
      `类型：孕妇营养餐（${meal.calories}卡）`,
      nutrientStr  ? `关键营养素：${nutrientStr}` : '',
      trimesterStr ? `适合孕期：${trimesterStr}` : '',
      meal.desc    ? `特点：${meal.desc}` : '',
      meal.nutrition ? `营养说明：${meal.nutrition}` : '',
      meal.caution   ? `注意事项：${meal.caution}` : '',
    ].filter(Boolean).join('；');

    const aiResult = await aiService.callCloudAIFrontend(
      cleanIngredients.length > 0 ? cleanIngredients : [meal.name],
      meal.cookTime   || 25,
      meal.difficulty || 'easy',
      extraHint
    );

    const recipe = aiResult.recipe;

    // ── Step 3: 写入云端 ──────────────────────────────
    try {
      await this._saveToDB(recipe, meal, aiResult.tokensUsed || 0);
    } catch (e) {
      console.warn('[pregnancy] 写入DB失败（不影响展示）：', e.message);
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
          category: db.command.in(['pregnancy', 'pregnancy_generated']),
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
                  ...recipeFields } = record;
          resolve({ ...recipeFields, _id, _sourceType: sourceType });
        })
        .catch(e => { clearTimeout(timer); reject(e); });
    });
  },

  /** 写入云端 recipes 集合 */
  async _saveToDB(recipe, meal, tokensUsed) {
    const db  = wx.cloud.database();
    const col = db.collection(RECIPES_COLLECTION);
    const record = {
      ...recipe,
      cuisineId:         'pregnancy',
      cuisineName:       '孕妇营养餐',
      cuisineFullName:   '孕妇专属营养餐',
      cuisineEmoji:      '🤰',
      cuisineColor:      '#E91E63',
      category:          'pregnancy_generated',
      sourceType:        'pregnancy_generated',
      sourceDishName:    meal.name,
      sourceIngredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
      // 孕期专属字段
      pregnancyNutrients: Array.isArray(meal.nutrients) ? meal.nutrients : [],
      pregnancyTrimester: Array.isArray(meal.trimester) ? meal.trimester : [],
      pregnancyCalories:  meal.calories,
      pregnancyNutrition: meal.nutrition  || '',
      pregnancyCaution:   meal.caution    || '',
      // AI 信息
      aiProvider:         'hunyuan-exp',
      tokensUsed:         tokensUsed,
      // 管理字段
      version:            SERVICE_VERSION,
      status:             'active',
      isPublic:           true,
      author:             'system_ai',
      createdAt:          db.serverDate(),
      updatedAt:          db.serverDate(),
    };
    const res = await col.add({ data: record });
    console.log(`[pregnancy] 写入DB成功：${meal.name}，docId=${res._id}`);
    return res._id;
  },

  // ==================== 弹窗操作 ====================

  onCloseModal() {
    this.setData({ showModal: false, modalRecipe: null, modalMeal: null });
  },

  async onRegenerateRecipe() {
    const { modalMeal } = this.data;
    if (!modalMeal) return;

    this.setData({ modalLoading: true, modalRecipe: null, modalError: '' });

    try {
      const cleanIngredients = (modalMeal.ingredients || []).map(ing =>
        ing.replace(/\d+[g|ml|个|只|根|片|朵|颗|块]/g, '').trim()
      ).filter(i => i.length > 0);

      const nutrientStr = Array.isArray(modalMeal.nutrients) ? modalMeal.nutrients.join('、') : '';
      const extraHint = `菜名：${modalMeal.name}，类型：孕妇营养餐（${modalMeal.calories}卡），关键营养素：${nutrientStr}，${modalMeal.desc || ''}`;

      const aiResult = await aiService.callCloudAIFrontend(
        cleanIngredients.length > 0 ? cleanIngredients : [modalMeal.name],
        modalMeal.cookTime   || 25,
        modalMeal.difficulty || 'easy',
        extraHint
      );

      this._saveToDB(aiResult.recipe, modalMeal, aiResult.tokensUsed || 0)
          .catch(e => console.warn('[pregnancy] 重新生成回写失败：', e.message));

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
    const { modalMeal } = this.data;
    if (modalMeal) this.onMealTap({ currentTarget: { dataset: { meal: modalMeal } } });
  },

  // ==================== 分享 ====================

  onShareAppMessage() {
    return {
      title: '小厨AI - 孕妇营养餐，专业呵护母婴',
      path:  '/pages/pregnancy-meals/index',
    };
  },

  onShareTimeline() {
   
    return {
      title: '小厨AI - 孕妇营养餐，专业呵护母婴',
      path:  '/pages/pregnancy-meals/index',
    };
  },
});
