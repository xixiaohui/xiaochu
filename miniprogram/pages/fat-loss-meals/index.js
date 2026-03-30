/**
 * 减脂菜谱页面 - fat-loss-meals/index.js  v1.0.0
 *
 * 功能：
 *   - 展示所有减脂餐列表（来自 utils/cuisines.js FAT_LOSS_MEALS）
 *   - 支持按热量/难度/标签筛选
 *   - 点击菜品 → 弹窗展示完整菜谱
 *     ① 先查云端 recipes 集合（sourceType=fat_loss_generated / user_generated，sourceDishName 匹配）
 *     ② 命中 → 直接展示（0 Token）
 *     ③ 未命中 → 调用 ai-service.js callCloudAIFrontend() 生成
 *     ④ 生成成功 → 写入 recipes 集合，下次直接读取
 */

'use strict';

const cuisinesUtil  = require('../../utils/cuisines');
const aiService     = require('../../utils/ai-service');

// ==================== 常量 ====================

const RECIPES_COLLECTION = 'recipes';
const DB_QUERY_TIMEOUT   = 8000;
const SERVICE_VERSION    = '1.0.0';

// 筛选选项
const FILTER_CALORIES = [
  { id: 'all',  label: '全部热量' },
  { id: 'low',  label: '≤200卡' },
  { id: 'mid',  label: '200-350卡' },
  { id: 'high', label: '>350卡' },
];

const FILTER_DIFFICULTY = [
  { id: 'all',    label: '全部难度' },
  { id: 'easy',   label: '😊 简单' },
  { id: 'medium', label: '💪 中等' },
];

Page({
  data: {
    // ── 列表数据 ──────────────────────────────────────
    allMeals:      [],     // 全量（原始数据）
    displayMeals:  [],     // 当前显示（筛选后）

    // ── 筛选 ──────────────────────────────────────────
    filterCalories:    FILTER_CALORIES,
    filterDifficulty:  FILTER_DIFFICULTY,
    activeCalories:    'all',
    activeDifficulty:  'all',

    // ── 已有云端记录标记 ──────────────────────────────
    // { dishName: true }
    existingMap: {},

    // ── 菜谱弹窗 ──────────────────────────────────────
    showModal:    false,
    modalLoading: false,
    modalMeal:    null,   // 当前点击的 meal 对象（原始）
    modalRecipe:  null,   // 获取到的食谱对象
    modalSource:  '',     // 'db' | 'ai'
    modalElapsed: 0,
    modalTokens:  0,
    modalError:   '',
  },

  // ==================== 生命周期 ====================

  onLoad() {
    const allMeals = cuisinesUtil.getFatLossMeals();
    this.setData({ allMeals, displayMeals: allMeals });
    wx.setNavigationBarTitle({ title: '🥗 减脂菜谱' });
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage'] });
    // 异步检查云端已有记录（不阻塞渲染）
    this._checkExisting(allMeals.map(m => m.name));
  },

  onShow() {
    // 每次进入刷新云端状态
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
            category:       db.command.in(['fat_loss', 'fat_loss_generated']),
          })
          .field({ sourceDishName: true })
          .limit(batch.length)
          .get();

        (res.data || []).forEach(r => {
          if (r.sourceDishName) existing[r.sourceDishName] = true;
        });
      }

      this.setData({ existingMap: existing });
      console.log(`[fat-loss] 云端已有 ${Object.keys(existing).length}/${names.length} 道菜谱`);
    } catch (e) {
      console.warn('[fat-loss] 检查云端记录失败：', e.message);
    }
  },

  // ==================== 筛选 ====================

  onCaloriesFilter(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeCalories: id });
    this._applyFilter();
  },

  onDifficultyFilter(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeDifficulty: id });
    this._applyFilter();
  },

  _applyFilter() {
    const { allMeals, activeCalories, activeDifficulty } = this.data;
    let result = allMeals;

    if (activeCalories === 'low')  result = result.filter(m => m.calories <= 200);
    if (activeCalories === 'mid')  result = result.filter(m => m.calories > 200 && m.calories <= 350);
    if (activeCalories === 'high') result = result.filter(m => m.calories > 350);
    if (activeDifficulty !== 'all') result = result.filter(m => m.difficulty === activeDifficulty);

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

      // 更新已有标记
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
      console.error('[fat-loss] 生成菜谱失败：', err.message);
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
      console.warn('[fat-loss] DB查询失败，降级AI：', e.message);
    }

    if (dbRecipe) {
      return { recipe: dbRecipe, source: 'db', tokensUsed: 0, elapsed: Date.now() - t0 };
    }

    // ── Step 2: AI 生成 ───────────────────────────────
    const cleanIngredients = (meal.ingredients || []).map(ing =>
      ing.replace(/\d+[g|ml|个|只|根|片|朵|颗|块]/g, '').trim()
    ).filter(i => i.length > 0);

    const extraHint = [
      `菜名：${meal.name}`,
      `类型：减脂餐（${meal.calories}卡，蛋白${meal.protein}g，碳水${meal.carbs}g，脂肪${meal.fat}g）`,
      meal.desc ? `特点：${meal.desc}` : '',
      meal.tips ? `小贴士：${meal.tips}` : '',
    ].filter(Boolean).join('；');

    const aiResult = await aiService.callCloudAIFrontend(
      cleanIngredients.length > 0 ? cleanIngredients : [meal.name],
      meal.cookTime   || 20,
      meal.difficulty || 'easy',
      extraHint
    );

    const recipe = aiResult.recipe;

    // ── Step 3: 写入云端 ──────────────────────────────
    try {
      await this._saveToDB(recipe, meal, aiResult.tokensUsed || 0);
    } catch (e) {
      console.warn('[fat-loss] 写入DB失败（不影响展示）：', e.message);
    }

    return {
      recipe,
      source:     'ai',
      tokensUsed: aiResult.tokensUsed || 0,
      elapsed:    Date.now() - t0,
    };
  },

  /** 查询云端单条记录（按 sourceDishName + category） */
  _queryFromDB(dishName) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('查询超时')), DB_QUERY_TIMEOUT);
      const db = wx.cloud.database();
      db.collection(RECIPES_COLLECTION)
        .where({
          sourceDishName: dishName,
          category: db.command.in(['fat_loss', 'fat_loss_generated']),
          status: 'active',
        })
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()
        .then(res => {
          clearTimeout(timer);
          const record = (res.data || [])[0];
          if (!record) { resolve(null); return; }
          // 剔除元字段，只返回食谱本体
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
      // 菜系/来源元数据
      cuisineId:         'fat_loss',
      cuisineName:       '减脂菜谱',
      cuisineFullName:   '健康减脂菜谱',
      cuisineEmoji:      '🥗',
      cuisineColor:      '#4CAF50',
      category:          'fat_loss_generated',
      sourceType:        'fat_loss_generated',
      sourceDishName:    meal.name,
      sourceIngredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
      // 原始营养信息
      fatLossCalories:   meal.calories,
      fatLossProtein:    meal.protein,
      fatLossCarbs:      meal.carbs,
      fatLossFat:        meal.fat,
      fatLossTips:       meal.tips || '',
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
    console.log(`[fat-loss] 写入DB成功：${meal.name}，docId=${res._id}`);
    return res._id;
  },

  // ==================== 弹窗操作 ====================

  onCloseModal() {
    this.setData({ showModal: false, modalRecipe: null, modalMeal: null });
  },

  /** 弹窗内"重新生成"——强制跳过缓存直接调 AI */
  async onRegenerateRecipe() {
    const { modalMeal } = this.data;
    if (!modalMeal) return;

    this.setData({ modalLoading: true, modalRecipe: null, modalError: '' });

    try {
      const cleanIngredients = (modalMeal.ingredients || []).map(ing =>
        ing.replace(/\d+[g|ml|个|只|根|片|朵|颗|块]/g, '').trim()
      ).filter(i => i.length > 0);

      const extraHint = `菜名：${modalMeal.name}，类型：减脂餐（${modalMeal.calories}卡），${modalMeal.desc || ''}`;

      const aiResult = await aiService.callCloudAIFrontend(
        cleanIngredients.length > 0 ? cleanIngredients : [modalMeal.name],
        modalMeal.cookTime   || 20,
        modalMeal.difficulty || 'easy',
        extraHint
      );

      // 异步回写，不等待
      this._saveToDB(aiResult.recipe, modalMeal, aiResult.tokensUsed || 0)
          .catch(e => console.warn('[fat-loss] 重新生成回写失败：', e.message));

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

  onRetry(e) {
    const { modalMeal } = this.data;
    if (modalMeal) this.onMealTap({ currentTarget: { dataset: { meal: modalMeal } } });
  },

  // ==================== 分享 ====================

  onShareAppMessage() {
    return {
      title: '小厨AI - 减脂菜谱，健康生活每一天',
      path:  '/pages/fat-loss-meals/index',
    };
  },
});
