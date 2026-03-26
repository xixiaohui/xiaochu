// pages/upload/index.js
// 菜谱批量生成管理页面（管理员工具页）
// 功能：展示所有30个菜系，批量调用AI生成菜谱并存入云数据库

const { CUISINES } = require('../../utils/cuisines.js');

// 取 cuisines.js 中的 30 个正式菜系（过滤掉非菜系条目）
const CUISINE_LIST = CUISINES.filter(c =>
  !c.id.startsWith('fl_') && !c.id.startsWith('pg_')
);

Page({
  data: {
    // 菜系列表及状态
    cuisineList: [],       // { ...cuisine, dishCount, recipeCount, status:'idle'|'running'|'done'|'error' }
    
    // 全局状态
    globalStatus: 'idle',  // 'idle' | 'querying' | 'running' | 'done'
    isGenerating: false,
    isQuerying: false,

    // 当前进度
    currentCuisineName: '',
    currentDishName: '',
    progressText: '',
    progressPercent: 0,

    // 统计
    totalSuccess: 0,
    totalFailed: 0,
    totalSkipped: 0,
    totalProcessed: 0,
    totalDishes: 0,

    // 日志（最近20条）
    logs: [],
    showLogs: false,

    // 数据库总览
    dbSummary: null,
  },

  onLoad() {
    this._initCuisineList();
    this._queryDBStatus();
  },

  onShow() {
    // 每次显示页面时刷新DB状态
    if (!this.data.isGenerating) {
      this._queryDBStatus();
    }
  },

  // ==================== 初始化菜系列表 ====================

  _initCuisineList() {
    const cuisineList = CUISINE_LIST.map(c => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji || '🍽️',
      color: c.color || '#333',
      lightColor: c.lightColor || '#f5f5f5',
      description: c.description || '',
      tags: (c.tags || []).slice(0, 2),
      dishCount: (c.representativeDishes || []).length,
      recipeCount: 0,          // 数据库中已有数量（查询后更新）
      recipePercent: 0,        // 进度百分比（预计算，WXML不支持除法运算）
      status: 'idle',          // idle / running / done / error / skip
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
    }));

    const totalDishes = cuisineList.reduce((s, c) => s + c.dishCount, 0);
    this.setData({ cuisineList, totalDishes });
  },

  // ==================== 查询DB状态 ====================

  async _queryDBStatus() {
    if (this.data.isQuerying || this.data.isGenerating) return;
    this.setData({ isQuerying: true, globalStatus: 'querying' });
    this._addLog('正在查询数据库状态...');

    try {
      const res = await wx.cloud.callFunction({
        name: 'batch-recipe-generate',
        data: {
          action: 'status',
          cuisinesData: CUISINE_LIST,
        },
      });

      if (res.result && res.result.code === 0) {
        const { statusList, summary } = res.result.data;
        // 更新每个菜系的已有菜谱数量，并预计算百分比（WXML不支持运算方法）
        const cuisineList = this.data.cuisineList.map(c => {
          const info = statusList.find(s => s.id === c.id);
          const recipeCount = info ? info.recipesInDB : 0;
          const status = recipeCount >= c.dishCount ? 'done' :
                         recipeCount > 0 ? 'partial' : 'idle';
          const recipePercent = c.dishCount > 0
            ? Math.min(100, Math.round(recipeCount / c.dishCount * 100))
            : 0;
          return { ...c, recipeCount, status, recipePercent };
        });
        // 预计算总进度（WXML不支持 toFixed 等方法调用）
        const overallPercent = summary.totalDishes > 0
          ? Math.min(100, Math.round(summary.totalInDB / summary.totalDishes * 100))
          : 0;
        const overallPctText = summary.totalDishes > 0
          ? (summary.totalInDB / summary.totalDishes * 100).toFixed(1)
          : '0.0';
        const dbSummary = { ...summary, overallPercent, overallPctText };
        this.setData({
          cuisineList,
          dbSummary,
          isQuerying: false,
          globalStatus: 'idle',
        });
        this._addLog(`数据库状态：已生成 ${summary.totalInDB}/${summary.totalDishes} 道菜谱`);
      } else {
        throw new Error((res.result && res.result.message) || '查询失败');
      }
    } catch (err) {
      console.error('[queryDBStatus]', err);
      this._addLog(`查询失败：${err.message}`);
      this.setData({ isQuerying: false, globalStatus: 'idle' });
      wx.showToast({ title: '状态查询失败', icon: 'none' });
    }
  },

  // 用户手动触发刷新
  onRefreshStatus() {
    this._queryDBStatus();
  },

  // ==================== 批量生成（全部菜系） ====================

  async onGenerateAll() {
    if (this.data.isGenerating) {
      wx.showToast({ title: '正在生成中，请稍候', icon: 'none' });
      return;
    }

    const pendingCuisines = CUISINE_LIST.filter(c => {
      const info = this.data.cuisineList.find(ci => ci.id === c.id);
      return !info || info.recipeCount < info.dishCount;
    });

    if (pendingCuisines.length === 0) {
      wx.showToast({ title: '所有菜谱已生成完毕', icon: 'success' });
      return;
    }

    const confirm = await this._confirm(
      `将为 ${pendingCuisines.length} 个菜系批量生成 AI 菜谱\n（已有菜谱自动跳过）\n\n⚠️ 此操作会调用 AI 接口，耗时较长，请保持页面开启`,
      '开始生成'
    );
    if (!confirm) return;

    this._startGenerate(CUISINE_LIST, true);
  },

  // ==================== 生成单个菜系 ====================

  async onGenerateSingle(e) {
    if (this.data.isGenerating) {
      wx.showToast({ title: '正在生成中，请稍候', icon: 'none' });
      return;
    }

    const { cuisineId } = e.currentTarget.dataset;
    const cuisine = CUISINE_LIST.find(c => c.id === cuisineId);
    if (!cuisine) return;

    const info = this.data.cuisineList.find(c => c.id === cuisineId);
    const pending = cuisine.representativeDishes.length - (info ? info.recipeCount : 0);

    if (pending <= 0) {
      wx.showToast({ title: `${cuisine.name}菜谱已全部生成`, icon: 'success' });
      return;
    }

    const confirm = await this._confirm(
      `将为【${cuisine.name}】生成 ${pending} 道 AI 菜谱\n（已有菜谱自动跳过）`,
      '开始生成'
    );
    if (!confirm) return;

    this._startGenerate([cuisine], true);
  },

  // ==================== 强制重新生成单个菜系 ====================

  async onRegenerateSingle(e) {
    if (this.data.isGenerating) return;

    const { cuisineId } = e.currentTarget.dataset;
    const cuisine = CUISINE_LIST.find(c => c.id === cuisineId);
    if (!cuisine) return;

    const confirm = await this._confirm(
      `⚠️ 将强制重新生成【${cuisine.name}】的所有 ${cuisine.representativeDishes.length} 道菜谱\n（不跳过已有菜谱，会产生重复记录）`,
      '确认重新生成'
    );
    if (!confirm) return;

    this._startGenerate([cuisine], false); // skipExisting = false
  },

  // ==================== 核心：调用云函数批量生成 ====================

  async _startGenerate(cuisines, skipExisting = true) {
    this.setData({
      isGenerating: true,
      globalStatus: 'running',
      totalSuccess: 0,
      totalFailed: 0,
      totalSkipped: 0,
      totalProcessed: 0,
      progressPercent: 0,
      currentCuisineName: '',
      currentDishName: '',
      progressText: '准备中...',
      logs: [],
    });

    // 更新所有目标菜系为 pending 状态
    const cuisineList = this.data.cuisineList.map(c => {
      const isTarget = cuisines.some(t => t.id === c.id);
      return isTarget ? { ...c, status: 'pending', successCount: 0, failedCount: 0, skippedCount: 0 } : c;
    });
    this.setData({ cuisineList });

    this._addLog(`开始生成，共 ${cuisines.length} 个菜系`);

    // 逐个菜系处理（避免云函数超时，每次只处理一个菜系）
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (let i = 0; i < cuisines.length; i++) {
      const cuisine = cuisines[i];
      const dishCount = (cuisine.representativeDishes || []).length;

      this.setData({
        currentCuisineName: cuisine.name,
        currentDishName: '',
        progressText: `[${i + 1}/${cuisines.length}] 正在处理 ${cuisine.name}...`,
      });

      // 更新该菜系为运行中
      this._updateCuisineStatus(cuisine.id, 'running');
      this._addLog(`→ 开始处理 ${cuisine.emoji} ${cuisine.name}（${dishCount}道）`);

      try {
        const res = await wx.cloud.callFunction({
          name: 'batch-recipe-generate',
          data: {
            action: 'generate',
            cuisinesData: [cuisine],  // 每次只传一个菜系
            skipExisting,
          },
        });

        if (res.result && res.result.code === 0) {
          const stats = res.result.data.statistics;
          totalSuccess += stats.successCount;
          totalFailed += stats.failedCount;
          totalSkipped += stats.skippedCount;

          const percent = Math.round(((i + 1) / cuisines.length) * 100);
          this.setData({
            totalSuccess,
            totalFailed,
            totalSkipped,
            totalProcessed: totalSuccess + totalFailed + totalSkipped,
            progressPercent: percent,
          });

          // 更新该菜系状态
          const hasFail = stats.failedCount > 0;
          this._updateCuisineStatus(cuisine.id, hasFail ? 'partial' : 'done', {
            successCount: stats.successCount,
            failedCount: stats.failedCount,
            skippedCount: stats.skippedCount,
            recipeCount: (this._getCuisineData(cuisine.id).recipeCount || 0) + stats.successCount,
          });

          this._addLog(
            `✓ ${cuisine.name}：成功${stats.successCount} 跳过${stats.skippedCount} 失败${stats.failedCount}`
          );
        } else {
          const errMsg = (res.result && res.result.message) || '未知错误';
          this._updateCuisineStatus(cuisine.id, 'error');
          this._addLog(`✗ ${cuisine.name} 失败：${errMsg}`);
          totalFailed += dishCount;
          this.setData({ totalFailed, totalProcessed: totalSuccess + totalFailed + totalSkipped });
        }
      } catch (err) {
        console.error(`[generate] ${cuisine.name} 异常：`, err);
        this._updateCuisineStatus(cuisine.id, 'error');
        this._addLog(`✗ ${cuisine.name} 异常：${err.message}`);
        totalFailed += dishCount;
        this.setData({ totalFailed, totalProcessed: totalSuccess + totalFailed + totalSkipped });
      }

      // 菜系间稍作停顿，让UI有时间更新
      if (i < cuisines.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // 完成
    this.setData({
      isGenerating: false,
      globalStatus: 'done',
      progressPercent: 100,
      progressText: `全部完成！成功 ${totalSuccess}，跳过 ${totalSkipped}，失败 ${totalFailed}`,
      currentCuisineName: '',
      currentDishName: '',
    });

    this._addLog('============ 生成完毕 ============');
    this._addLog(`成功 ${totalSuccess} / 跳过 ${totalSkipped} / 失败 ${totalFailed}`);

    wx.showModal({
      title: '批量生成完成',
      content: `✅ 成功生成：${totalSuccess} 道\n⏭️ 已跳过：${totalSkipped} 道\n❌ 失败：${totalFailed} 道`,
      showCancel: false,
    });

    // 刷新状态
    setTimeout(() => this._queryDBStatus(), 1000);
  },

  // ==================== 辅助方法 ====================

  _updateCuisineStatus(cuisineId, status, extraData = {}) {
    const cuisineList = this.data.cuisineList.map(c => {
      if (c.id !== cuisineId) return c;
      const updated = { ...c, status, ...extraData };
      // 重新计算百分比（WXML 不支持小数运算）
      updated.recipePercent = updated.dishCount > 0
        ? Math.min(100, Math.round(updated.recipeCount / updated.dishCount * 100))
        : 0;
      return updated;
    });
    this.setData({ cuisineList });
  },

  _getCuisineData(cuisineId) {
    return this.data.cuisineList.find(c => c.id === cuisineId) || {};
  },

  _addLog(msg) {
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logs = [`[${time}] ${msg}`, ...this.data.logs].slice(0, 50);
    this.setData({ logs });
  },

  _confirm(content, confirmText = '确认') {
    return new Promise((resolve) => {
      wx.showModal({
        title: '确认操作',
        content,
        confirmText,
        cancelText: '取消',
        success: (res) => resolve(res.confirm),
        fail: () => resolve(false),
      });
    });
  },

  // ==================== 其他操作 ====================

  onToggleLogs() {
    this.setData({ showLogs: !this.data.showLogs });
  },

  onClearLogs() {
    this.setData({ logs: [] });
  },

  // 初始化菜系数据（调用 data-init）
  onInitCuisinesData() {
    wx.showLoading({ title: '初始化中...' });
    wx.cloud.callFunction({
      name: 'data-init',
      data: { action: 'init_cuisines' },
      success: (res) => {
        wx.hideLoading();
        wx.showToast({ title: '菜系数据初始化完成', icon: 'success' });
        this._addLog('菜系数据初始化完成');
        console.log('[initCuisines]', res);
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '初始化失败', icon: 'error' });
        this._addLog(`菜系数据初始化失败：${err.errMsg}`);
      },
    });
  },

  // 初始化减脂/孕妇餐数据
  onInitSpecialData() {
    wx.showLoading({ title: '初始化中...' });
    wx.cloud.callFunction({
      name: 'data-init',
      data: { action: 'init_all' },
      success: (res) => {
        wx.hideLoading();
        wx.showToast({ title: '数据初始化完成', icon: 'success' });
        this._addLog('全部数据初始化完成');
        console.log('[initAll]', res);
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '初始化失败', icon: 'error' });
        this._addLog(`数据初始化失败：${err.errMsg}`);
      },
    });
  },

  // 查看数据库总状态
  onCheckDBStatus() {
    this._queryDBStatus();
  },

  // 生命周期
  onReady() {},
  onHide() {},
  onUnload() {},
  onPullDownRefresh() {
    if (!this.data.isGenerating) {
      this._queryDBStatus();
    }
    wx.stopPullDownRefresh();
  },
  onReachBottom() {},
  onShareAppMessage() {
    return { title: '小厨AI - 菜谱管理', path: '/pages/upload/index' };
  },
});
