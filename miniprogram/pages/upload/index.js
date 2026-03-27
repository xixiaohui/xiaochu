// pages/upload/index.js  v6.0.0
// 菜谱批量生成管理页（管理员工具）
//
// ✅ 架构：前端直调 AI（wx.cloud.extend.AI） + 前端写入云数据库
//   1. 前端循环，每道菜调用 ai-service.js 的 callCloudAIFrontend()
//   2. 生成成功后直接用 wx.cloud.database().collection('recipes').add() 写入数据库
//   3. 跳过检查：先查 DB 是否已存在，再决定是否调 AI
//   4. 查询数据库状态：直接前端 DB 查询（无需云函数）
//   5. 去除对 batch-recipe-generate 的 generate_one 依赖
//   保留：status 查询、data-init 初始化仍可用云函数

'use strict';

const { CUISINES } = require('../../utils/cuisines.js');
const aiService = require('../../utils/ai-service.js');

// 30 个正式菜系（去掉减脂/孕妇餐等特殊条目）
const CUISINE_LIST = CUISINES.filter(c =>
  !c.id.startsWith('fl_') && !c.id.startsWith('pg_')
);

// 每道菜生成后等待时间（ms）—— 防止 AI 接口限流
const DISH_INTERVAL_MS = 2000;

// 数据库集合名
const RECIPES_COLLECTION = 'recipes';

// 架构版本
const VERSION = '6.0.0';

// ==================== 工具函数 ====================

const sleep = ms => new Promise(r => setTimeout(r, ms));

// 计算百分比（整数，0-100），WXML 不支持除法表达式
const calcPct = (done, total) =>
  total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0;

// ==================== Page ====================

Page({
  data: {
    // 菜系列表
    cuisineList: [],

    // 全局状态
    isQuerying:   false,
    isRunning:    false,   // 正在跑
    isPaused:     false,   // 已暂停（前端可随时暂停）
    isStopped:    false,   // 用户主动停止

    // 当前进度（实时）
    currentCuisineName: '',
    currentDishName:    '',
    progressText:       '',

    // 总进度（预计算，WXML 直接用）
    totalDone:      0,   // 成功 + 跳过
    totalSuccess:   0,
    totalSkipped:   0,
    totalFailed:    0,
    totalDishes:    0,   // 全部待处理菜数
    overallPct:     0,   // 整体百分比（0-100）

    // 数据库总览
    dbSummary:     null,

    // 日志（最新50条）
    logs:      [],
    showLogs:  false,
  },

  // ==================== 生命周期 ====================

  onLoad() {
    this._buildCuisineList();
    this._queryStatus();
  },

  onShow() {
    if (!this.data.isRunning) this._queryStatus();
  },

  onPullDownRefresh() {
    if (!this.data.isRunning) this._queryStatus();
    wx.stopPullDownRefresh();
  },

  // ==================== 初始化菜系列表 ====================

  _buildCuisineList() {
    const cuisineList = CUISINE_LIST.map(c => ({
      id:          c.id,
      name:        c.name,
      emoji:       c.emoji       || '🍽️',
      color:       c.color       || '#333',
      lightColor:  c.lightColor  || '#f5f5f5',
      description: c.description || '',
      tags:        (c.tags || []).slice(0, 2),
      dishCount:   (c.representativeDishes || []).length,
      recipeCount: 0,
      recipePercent: 0,
      status:      'idle',   // idle|pending|running|done|partial|error
      successCount: 0,
      skippedCount: 0,
      failedCount:  0,
    }));
    const totalDishes = cuisineList.reduce((s, c) => s + c.dishCount, 0);
    this.setData({ cuisineList, totalDishes });
  },

  // ==================== 查询数据库状态（前端直接查询）====================

  async _queryStatus() {
    if (this.data.isQuerying || this.data.isRunning) return;
    this.setData({ isQuerying: true });
    this._log('查询数据库状态（前端直查）...');

    try {
      const db = wx.cloud.database();
      const col = db.collection(RECIPES_COLLECTION);

      // 逐菜系查询数量
      const statusList = await Promise.all(
        CUISINE_LIST.map(async c => {
          try {
            const r = await col
              .where({ cuisineId: c.id })
              .count();
            return { id: c.id, recipesInDB: r.total || 0 };
          } catch (_) {
            return { id: c.id, recipesInDB: 0 };
          }
        })
      );

      // 汇总
      const totalInDB = statusList.reduce((s, x) => s + x.recipesInDB, 0);
      const totalDishes = CUISINE_LIST.reduce((s, c) => s + (c.representativeDishes || []).length, 0);
      const pendingCount = totalDishes - totalInDB;
      const summary = {
        totalCuisines: CUISINE_LIST.length,
        totalInDB,
        totalDishes,
        pendingCount,
      };

      const cuisineList = this.data.cuisineList.map(c => {
        const info = statusList.find(s => s.id === c.id) || {};
        const recipeCount   = info.recipesInDB || 0;
        const recipePercent = calcPct(recipeCount, c.dishCount);
        const status = recipeCount >= c.dishCount ? 'done'
                     : recipeCount > 0            ? 'partial'
                     :                              'idle';
        return { ...c, recipeCount, recipePercent, status };
      });

      const overallPct     = calcPct(totalInDB, totalDishes);
      const overallPctText = totalDishes > 0
        ? (totalInDB / totalDishes * 100).toFixed(1)
        : '0.0';
      const dbSummary = { ...summary, overallPct, overallPctText };

      this.setData({ cuisineList, dbSummary, isQuerying: false });
      this._log(`已生成 ${totalInDB}/${totalDishes} 道菜谱`);
    } catch (err) {
      this.setData({ isQuerying: false });
      this._log(`❌ 状态查询失败：${err.message || err.errMsg}`);
      wx.showToast({ title: '查询失败', icon: 'none' });
    }
  },

  onRefreshStatus() { this._queryStatus(); },

  // ==================== 批量生成（全部 / 指定菜系） ====================

  async onGenerateAll() {
    if (this.data.isRunning) { wx.showToast({ title: '生成中，请稍候', icon: 'none' }); return; }

    // 找出还有未完成菜谱的菜系
    const targets = CUISINE_LIST.filter(c => {
      const info = this.data.cuisineList.find(ci => ci.id === c.id);
      return !info || info.recipeCount < (c.representativeDishes || []).length;
    });
    if (!targets.length) { wx.showToast({ title: '所有菜谱已生成', icon: 'success' }); return; }

    const totalPending = targets.reduce((s, c) => s + c.representativeDishes.length, 0);
    const ok = await this._confirm(
      `将为 ${targets.length} 个菜系批量生成 AI 菜谱（已有自动跳过）\n\n共约 ${totalPending} 道，每道约 5~10s\n⚠️ 请保持页面开启，可随时暂停`,
      '开始'
    );
    if (!ok) return;

    this._runQueue(targets, true);
  },

  async onGenerateSingle(e) {
    if (this.data.isRunning) { wx.showToast({ title: '生成中，请稍候', icon: 'none' }); return; }
    const { cuisineId } = e.currentTarget.dataset;
    const cuisine = CUISINE_LIST.find(c => c.id === cuisineId);
    if (!cuisine) return;

    const info    = this.data.cuisineList.find(c => c.id === cuisineId);
    const pending = (cuisine.representativeDishes || []).length - (info ? info.recipeCount : 0);
    if (pending <= 0) { wx.showToast({ title: `${cuisine.name} 已全部生成`, icon: 'success' }); return; }

    const ok = await this._confirm(
      `为【${cuisine.name}】生成 ${pending} 道 AI 菜谱（已有自动跳过）`,
      '开始'
    );
    if (!ok) return;
    this._runQueue([cuisine], true);
  },

  async onRegenerateSingle(e) {
    if (this.data.isRunning) return;
    const { cuisineId } = e.currentTarget.dataset;
    const cuisine = CUISINE_LIST.find(c => c.id === cuisineId);
    if (!cuisine) return;
    const ok = await this._confirm(
      `⚠️ 强制重新生成【${cuisine.name}】所有 ${(cuisine.representativeDishes || []).length} 道菜谱\n（不跳过已有，会产生重复记录）`,
      '确认重新生成'
    );
    if (!ok) return;
    this._runQueue([cuisine], false);
  },

  // ==================== 核心：前端任务队列 ====================

  async _runQueue(cuisines, skipExisting) {
    // ---- 初始化运行状态 ----
    this._runningFlag = true;
    this._pauseFlag   = false;

    this.setData({
      isRunning:    true,
      isPaused:     false,
      isStopped:    false,
      totalSuccess: 0,
      totalSkipped: 0,
      totalFailed:  0,
      totalDone:    0,
      overallPct:   0,
      progressText: '准备中...',
      currentCuisineName: '',
      currentDishName:    '',
      logs: [],
    });

    // 标记目标菜系为 pending
    const targetIds = new Set(cuisines.map(c => c.id));
    this._setCuisinesBulkStatus(targetIds, 'pending');

    // 统计本次总菜数
    const totalThisBatch = cuisines.reduce((s, c) => s + (c.representativeDishes || []).length, 0);
    let doneSoFar = 0;
    let success = 0, skipped = 0, failed = 0;

    this._log(`开始生成，${cuisines.length} 个菜系，共 ${totalThisBatch} 道（前端直调AI）`);

    // ---- 外层：菜系循环 ----
    for (const cuisine of cuisines) {
      if (!this._runningFlag) break;

      const dishes = cuisine.representativeDishes || [];
      this._updateCuisineField(cuisine.id, { status: 'running' });
      this._log(`→ ${cuisine.emoji} ${cuisine.name}（${dishes.length}道）`);

      let cSuccess = 0, cSkipped = 0, cFailed = 0;

      // ---- 内层：菜品循环 ----
      for (let i = 0; i < dishes.length; i++) {
        // 暂停检查
        while (this._pauseFlag && this._runningFlag) {
          await sleep(500);
        }
        if (!this._runningFlag) break;

        const dish = dishes[i];
        this.setData({
          currentCuisineName: cuisine.name,
          currentDishName:    dish.name,
          progressText: `${cuisine.name} · ${dish.name} (${i + 1}/${dishes.length})`,
        });

        // 前端直接生成并写入数据库
        const result = await this._generateOneLocal(dish, cuisine, skipExisting);

        // 统计
        doneSoFar++;
        if (result.skipped)      { skipped++;  cSkipped++; }
        else if (result.success) { success++;  cSuccess++; }
        else                     { failed++;   cFailed++;  }

        const overallPct = calcPct(doneSoFar, totalThisBatch);
        this.setData({
          totalSuccess: success,
          totalSkipped: skipped,
          totalFailed:  failed,
          totalDone:    doneSoFar,
          overallPct,
        });

        // 更新该菜系的 recipeCount
        const curInfo = this.data.cuisineList.find(c => c.id === cuisine.id);
        if (curInfo) {
          const newCount = curInfo.recipeCount + (result.success ? 1 : 0);
          this._updateCuisineField(cuisine.id, {
            recipeCount:   newCount,
            recipePercent: calcPct(newCount, curInfo.dishCount),
            successCount:  cSuccess,
            skippedCount:  cSkipped,
            failedCount:   cFailed,
          });
        }

        // 每道菜之间等待（仅在还有下一道菜时）
        if (i < dishes.length - 1 && this._runningFlag && !this._pauseFlag) {
          await sleep(DISH_INTERVAL_MS);
        }
      }

      // 菜系完成
      const cuisineStatus = cFailed > 0         ? 'partial'
                          : cSuccess + cSkipped > 0 ? 'done'
                          : 'error';
      this._updateCuisineField(cuisine.id, {
        status:       cuisineStatus,
        successCount: cSuccess,
        skippedCount: cSkipped,
        failedCount:  cFailed,
      });
      this._log(`✓ ${cuisine.name}：+${cSuccess} ⏭${cSkipped} ✗${cFailed}`);
    }

    // ---- 收尾 ----
    const stopped = !this._runningFlag;
    this.setData({
      isRunning:    false,
      isPaused:     false,
      progressText: stopped
        ? `已停止：成功${success} 跳过${skipped} 失败${failed}`
        : `完成！成功${success} 跳过${skipped} 失败${failed}`,
      currentCuisineName: '',
      currentDishName:    '',
      overallPct: stopped ? this.data.overallPct : 100,
    });

    this._log('========== 生成结束 ==========');
    this._log(`成功 ${success} / 跳过 ${skipped} / 失败 ${failed}`);

    if (!stopped) {
      wx.showModal({
        title: '批量生成完成',
        content: `✅ 成功：${success}\n⏭️ 跳过：${skipped}\n❌ 失败：${failed}`,
        showCancel: false,
      });
    }

    setTimeout(() => this._queryStatus(), 800);
  },

  // ==================== 单菜：前端直调 AI + 写入数据库 ====================

  /**
   * 前端直接生成一道菜并存入云数据库
   * @param {Object} dish - 菜品信息 { name, description, cookTime, difficulty, ingredients }
   * @param {Object} cuisine - 菜系信息 { id, name, fullName, emoji, color, ... }
   * @param {boolean} skipExisting - 是否跳过已有
   * @returns {{ success: boolean, skipped: boolean }}
   */
  async _generateOneLocal(dish, cuisine, skipExisting) {
    try {
      const db  = wx.cloud.database();
      const col = db.collection(RECIPES_COLLECTION);

      // 1. 幂等检查：已存在则跳过
      if (skipExisting) {
        try {
          const checkRes = await col
            .where({ cuisineId: cuisine.id, sourceDishName: dish.name })
            .count();
          if (checkRes.total > 0) {
            this._log(`  ⏭ 跳过（已存在）：${dish.name}`);
            return { success: false, skipped: true };
          }
        } catch (checkErr) {
          // 查询失败不阻止生成
          this._log(`  ⚠️ 幂等检查失败，继续生成：${dish.name}`);
        }
      }

      // 2. 前端直调 AI（使用 ai-service.js 的 callCloudAIFrontend）
      const ingredients = Array.isArray(dish.ingredients)
        ? dish.ingredients
        : [dish.name];

      const aiResult = await aiService.callCloudAIFrontend(
        ingredients,
        dish.cookTime  || 30,
        dish.difficulty || 'easy',
        `菜名：${dish.name}，菜系：${cuisine.name}（${cuisine.fullName || cuisine.name}）`
      );

      const recipe = aiResult.recipe;

      // 3. 构建数据库记录（与原云函数保持一致）
      const record = {
        ...recipe,
        cuisineId:         cuisine.id,
        cuisineName:       cuisine.name,
        cuisineFullName:   cuisine.fullName   || cuisine.name,
        cuisineEmoji:      cuisine.emoji      || '',
        cuisineColor:      cuisine.color      || '',
        category:          cuisine.name,
        sourceType:        'batch_generated',
        sourceDishName:    dish.name,
        sourceIngredients: dish.ingredients   || [],
        aiProvider:        'hunyuan-exp',
        tokensUsed:        aiResult.tokensUsed || 0,
        version:           VERSION,
        status:            'active',
        isPublic:          true,
        author:            'system_batch',
        createdAt:         db.serverDate(),
        updatedAt:         db.serverDate(),
      };

      // 4. 写入数据库
      const addRes = await col.add({ data: record });
      this._log(`  ✅ ${dish.name} → docId=${addRes._id}`);
      return { success: true, skipped: false };

    } catch (err) {
      const msg = err.message || err.errMsg || '未知错误';
      this._log(`  ❌ ${dish.name}：${msg}`);
      return { success: false, skipped: false };
    }
  },

  // ==================== 暂停 / 继续 / 停止 ====================

  onPause() {
    if (!this.data.isRunning) return;
    this._pauseFlag = true;
    this.setData({ isPaused: true, progressText: '已暂停，点击继续...' });
    this._log('⏸ 已暂停');
  },

  onResume() {
    if (!this.data.isRunning || !this.data.isPaused) return;
    this._pauseFlag = false;
    this.setData({ isPaused: false, progressText: '继续中...' });
    this._log('▶ 继续');
  },

  onStop() {
    if (!this.data.isRunning) return;
    this._runningFlag = false;
    this._pauseFlag   = false;
    this.setData({ isStopped: true });
    this._log('⏹ 用户停止');
  },

  // ==================== 其他操作 ====================

  onInitCuisinesData() {
    wx.showLoading({ title: '初始化菜系...' });
    wx.cloud.callFunction({
      name: 'data-init', data: { action: 'init_cuisines' },
      success: () => {
        wx.hideLoading();
        wx.showToast({ title: '菜系数据完成', icon: 'success' });
        this._log('菜系数据初始化完成');
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '失败', icon: 'error' });
        this._log(`菜系初始化失败: ${err.errMsg}`);
      },
    });
  },

  onInitSpecialData() {
    wx.showLoading({ title: '初始化中...' });
    wx.cloud.callFunction({
      name: 'data-init', data: { action: 'init_all' },
      success: () => {
        wx.hideLoading();
        wx.showToast({ title: '特色餐数据完成', icon: 'success' });
        this._log('特色餐数据初始化完成');
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '失败', icon: 'error' });
        this._log(`特色餐初始化失败: ${err.errMsg}`);
      },
    });
  },

  onToggleLogs() { this.setData({ showLogs: !this.data.showLogs }); },
  onClearLogs()  { this.setData({ logs: [] }); },

  // ==================== 诊断：测试前端AI直调 ====================

  async onDiagnose() {
    if (this.data.isRunning) return;

    const testCuisine = CUISINE_LIST.find(c => c.id === 'cantonese') || CUISINE_LIST[0];
    const testDish    = (testCuisine && testCuisine.representativeDishes || [])[0];
    if (!testDish) { this._log('❌ 诊断失败：无测试菜品'); return; }

    this._log(`🔍 诊断开始：前端直调 AI（${testCuisine.name} · ${testDish.name}）`);
    this.setData({ showLogs: true });
    wx.showLoading({ title: '诊断中...', mask: true });

    const t0 = Date.now();
    try {
      // 检查 wx.cloud.extend.AI 是否可用
      if (
        typeof wx === 'undefined' ||
        !wx.cloud ||
        !wx.cloud.extend ||
        !wx.cloud.extend.AI ||
        !wx.cloud.extend.AI.createModel
      ) {
        throw new Error('wx.cloud.extend.AI 不可用，请确认：①基础库≥3.7.1 ②已在云开发控制台开启AI功能');
      }

      const ingredients = Array.isArray(testDish.ingredients)
        ? testDish.ingredients
        : [testDish.name];

      const aiResult = await aiService.callCloudAIFrontend(
        ingredients,
        testDish.cookTime   || 30,
        testDish.difficulty || 'easy',
        `菜名：${testDish.name}，菜系：${testCuisine.name}`
      );

      wx.hideLoading();
      const elapsed = Date.now() - t0;
      this._log(`✅ 前端AI直调成功！耗时=${elapsed}ms`);
      this._log(`   菜谱名：${aiResult.recipe.name}，Token=${aiResult.tokensUsed}`);
      wx.showToast({ title: 'AI直调正常 ✅', icon: 'success' });

    } catch (err) {
      wx.hideLoading();
      const elapsed = Date.now() - t0;
      this._log(`❌ 前端AI调用失败（${elapsed}ms）：${err.message}`);
      wx.showModal({
        title: 'AI直调失败',
        content: `错误：${err.message}\n\n可能原因：\n1. 基础库版本 <3.7.1\n2. 云开发控制台未开启AI功能\n3. 未绑定AI资源包（Token用尽）`,
        showCancel: false,
      });
    }
  },

  // ==================== 辅助 ====================

  _log(msg) {
    const t = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logs = [`[${t}] ${msg}`, ...this.data.logs].slice(0, 50);
    this.setData({ logs });
  },

  _updateCuisineField(cuisineId, fields) {
    const cuisineList = this.data.cuisineList.map(c =>
      c.id === cuisineId ? { ...c, ...fields } : c
    );
    this.setData({ cuisineList });
  },

  _setCuisinesBulkStatus(idSet, status) {
    const cuisineList = this.data.cuisineList.map(c =>
      idSet.has(c.id)
        ? { ...c, status, successCount: 0, skippedCount: 0, failedCount: 0 }
        : c
    );
    this.setData({ cuisineList });
  },

  _confirm(content, confirmText = '确认') {
    return new Promise(resolve => {
      wx.showModal({
        title: '确认操作', content, confirmText, cancelText: '取消',
        success: r => resolve(r.confirm),
        fail:    () => resolve(false),
      });
    });
  },

  // 生命周期（空实现）
  onReady() {}, onHide() {}, onUnload() {}, onReachBottom() {},
  onShareAppMessage() {
    return { title: '小厨AI · 菜谱管理', path: '/pages/upload/index' };
  },
});
