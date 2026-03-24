/**
 * 食谱生成页面逻辑 - recipe.js v2.0
 * 功能：食材输入、参数选择、AI食谱生成、结果展示、海报生成导出分享
 * 依赖：utils/ai-service.js（AI调用），utils/cache.js（缓存），utils/cuisines.js（菜系数据）
 */

'use strict';

const aiService = require('../../utils/ai-service');
const cache = require('../../utils/cache');
const cuisinesUtil = require('../../utils/cuisines');

const COOK_TIME_OPTIONS = [
  { label: '15分钟', value: 15 },
  { label: '30分钟', value: 30 },
  { label: '45分钟', value: 45 },
  { label: '60分钟', value: 60 },
];

const DIFFICULTY_OPTIONS = [
  { label: '😊 简单', value: 'easy' },
  { label: '💪 中等', value: 'medium' },
  { label: '👨‍🍳 困难', value: 'hard' },
];

const QUICK_INGREDIENTS = [
  { name: '鸡蛋', selected: false },
  { name: '西红柿', selected: false },
  { name: '土豆', selected: false },
  { name: '猪肉', selected: false },
  { name: '豆腐', selected: false },
  { name: '青椒', selected: false },
  { name: '洋葱', selected: false },
  { name: '胡萝卜', selected: false },
  { name: '菠菜', selected: false },
  { name: '蒜', selected: false },
  { name: '姜', selected: false },
  { name: '葱', selected: false },
];

Page({

  data: {
    ingredients: [],
    inputValue: '',
    quickIngredients: QUICK_INGREDIENTS.map(item => ({ ...item })),
    cuisineList: [],
    selectedCuisine: null,
    cookTimeOptions: COOK_TIME_OPTIONS,
    difficultyOptions: DIFFICULTY_OPTIONS,
    cookTime: 30,
    difficulty: 'easy',
    extraRequirements: '',
    isLoading: false,
    errorMsg: '',
    recipe: null,
    showCacheTip: false,
    savedTokens: 0,
    tokenInfo: { tokensUsed: 0 },
    showPosterModal: false,
    posterImagePath: '',
    posterGenerating: false,
    posterReady: false,
  },

  onLoad(options) {
    console.log('[recipe] 页面加载，参数：', options);
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    });
    const clearedCount = cache.clearExpiredCache();
    if (clearedCount > 0) {
      console.log(`[recipe] 已清理 ${clearedCount} 条过期缓存`);
    }
    const cuisineList = cuisinesUtil.getCuisineList().slice(0, 8);
    this.setData({ cuisineList });
    if (options.ingredients) {
      const presetIngredients = options.ingredients.split(',').filter(s => s.trim());
      if (presetIngredients.length > 0) {
        this.setData({ ingredients: presetIngredients });
      }
    }
  },

  onShow() {
    const app = getApp();
    if (app.globalData.presetIngredients && app.globalData.presetIngredients.length > 0) {
      const presets = app.globalData.presetIngredients;
      const quickIngredients = this.data.quickIngredients.map(item => ({
        ...item,
        selected: presets.includes(item.name),
      }));
      this.setData({
        ingredients: [...new Set([...this.data.ingredients, ...presets])].slice(0, 20),
        quickIngredients,
      });
      app.globalData.presetIngredients = null;
    }
    if (app.globalData.presetCuisine) {
      const cuisine = app.globalData.presetCuisine;
      const cuisineData = cuisinesUtil.getCuisineById(cuisine.id);
      this.setData({ selectedCuisine: cuisineData || null });
      app.globalData.presetCuisine = null;
    }
    if (this.data.isLoading) {
      this.setData({ isLoading: false });
    }
  },

  onShareAppMessage() {
    const recipe = this.data.recipe;
    const path = this.data.ingredients.length
      ? `/pages/recipe/recipe?ingredients=${encodeURIComponent(this.data.ingredients.join(','))}`
      : '/pages/recipe/recipe';
    if (recipe) {
      return { title: `我用AI生成了一道"${recipe.name}"，快来试试！`, path };
    }
    return { title: '小厨AI - 用食材生成食谱', path: '/pages/recipe/recipe' };
  },

  onShareTimeline() {
    const recipe = this.data.recipe;
    const ingredientsQuery = this.data.ingredients.length
      ? `ingredients=${encodeURIComponent(this.data.ingredients.join(','))}`
      : '';
    if (recipe) {
      return { title: `我用AI生成了一道「${recipe.name}」，快来看看！`, query: ingredientsQuery };
    }
    return { title: '小厨AI - 用食材生成食谱', query: ingredientsQuery };
  },

  selectCuisine(e) {
    const { id } = e.currentTarget.dataset;
    const current = this.data.selectedCuisine;
    if (id === '__none__' || (current && current.id === id)) {
      this.setData({ selectedCuisine: null });
    } else {
      const cuisineData = cuisinesUtil.getCuisineById(id);
      this.setData({ selectedCuisine: cuisineData || null });
    }
  },

  onInputChange(e) {
    this.setData({ inputValue: e.detail.value });
  },

  addIngredient() {
    const inputValue = this.data.inputValue.trim();
    if (!inputValue) { wx.showToast({ title: '请输入食材名称', icon: 'none' }); return; }
    if (this.data.ingredients.length >= 20) { wx.showToast({ title: '最多添加20种食材', icon: 'none' }); return; }
    const normalizedInput = inputValue.toLowerCase().trim();
    const isDuplicate = this.data.ingredients.some(item => item.toLowerCase().trim() === normalizedInput);
    if (isDuplicate) { wx.showToast({ title: `"${inputValue}"已在列表中`, icon: 'none' }); this.setData({ inputValue: '' }); return; }
    this.setData({ ingredients: [...this.data.ingredients, inputValue], inputValue: '', errorMsg: '' });
  },

  removeIngredient(e) {
    if (this.data.isLoading) return;
    const index = e.currentTarget.dataset.index;
    const ingredients = [...this.data.ingredients];
    const removedItem = ingredients.splice(index, 1)[0];
    const quickIngredients = this.data.quickIngredients.map(item => ({
      ...item, selected: item.name === removedItem ? false : item.selected,
    }));
    this.setData({ ingredients, quickIngredients });
  },

  toggleQuickIngredient(e) {
    if (this.data.isLoading) return;
    const { index, name } = e.currentTarget.dataset;
    const quickIngredients = [...this.data.quickIngredients];
    const item = quickIngredients[index];
    item.selected = !item.selected;
    let ingredients = [...this.data.ingredients];
    if (item.selected) {
      if (ingredients.length >= 20) { wx.showToast({ title: '最多添加20种食材', icon: 'none' }); item.selected = false; }
      else if (!ingredients.includes(name)) { ingredients.push(name); }
    } else {
      ingredients = ingredients.filter(ing => ing !== name);
    }
    this.setData({ quickIngredients, ingredients, errorMsg: '' });
  },

  setCookTime(e) { this.setData({ cookTime: Number(e.currentTarget.dataset.value) }); },
  setDifficulty(e) { this.setData({ difficulty: e.currentTarget.dataset.value }); },
  onExtraReqChange(e) { this.setData({ extraRequirements: e.detail.value }); },

  async generateRecipe() {
    const { ingredients, cookTime, difficulty, extraRequirements, isLoading, selectedCuisine } = this.data;
    if (isLoading) return;
    if (!ingredients || ingredients.length === 0) {
      wx.showToast({ title: '请先添加至少一种食材', icon: 'none' }); return;
    }
    this.setData({ isLoading: true, errorMsg: '', recipe: null, showCacheTip: false, tokenInfo: { tokensUsed: 0 }, posterImagePath: '', posterReady: false });
    let finalExtraReq = extraRequirements;
    if (selectedCuisine) {
      const cuisineNote = `请以${selectedCuisine.name}的风格来制作，${selectedCuisine.description}`;
      finalExtraReq = extraRequirements ? `${extraRequirements}；${cuisineNote}` : cuisineNote;
    }
    try {
      const result = await aiService.quickRecipe({ ingredients, cookTime, difficulty, extraRequirements: finalExtraReq, useCache: true });
      this.setData({
        recipe: result.recipe,
        tokenInfo: { tokensUsed: result.tokensUsed || 0 },
        isLoading: false,
        showCacheTip: result.fromCache === true,
        savedTokens: result.fromCache ? 100 : 0,
      });
      wx.pageScrollTo({ selector: '.recipe-result', duration: 300 });
      if (result.fromCache) { wx.showToast({ title: '已使用缓存，快如闪电⚡', icon: 'none', duration: 2000 }); }
    } catch (err) {
      console.error('[recipe] 食谱生成失败：', err.message);
      let errorMsg = '生成失败，请稍后重试';
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('wx.cloud.extend.ai 不可用') || msg.includes('基础库')) {
        errorMsg = '需要升级基础库：请在微信开发者工具右上角「详情」→「本地设置」中将基础库升级至 3.7.1 或以上版本';
      } else if (msg.includes('超时') || msg.includes('timeout')) {
        errorMsg = '请求超时，请检查网络后重试';
      } else if (msg.includes('rate limit') || msg.includes('429') || msg.includes('频率')) {
        errorMsg = '调用过于频繁或额度不足，请稍后重试';
      } else if (err.message && err.message.length < 120) {
        errorMsg = err.message;
      }
      this.setData({ isLoading: false, errorMsg });
      wx.showToast({ title: '生成失败，请重试', icon: 'error', duration: 2000 });
    }
  },

  async generatePoster() {
    const { recipe } = this.data;
    if (!recipe) return;
    this.setData({ posterGenerating: true, showPosterModal: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const query = wx.createSelectorQuery().in(this);
      const canvas = await new Promise((resolve, reject) => {
        query.select('#posterCanvas').fields({ node: true, size: true }).exec((res) => {
          if (res[0] && res[0].node) { resolve(res[0]); }
          else { reject(new Error('Canvas节点获取失败')); }
        });
      });
      const canvasNode = canvas.node;
      const ctx = canvasNode.getContext('2d');
      const dpr = wx.getWindowInfo ? (wx.getWindowInfo().pixelRatio || 2) : 2;
      const W = 750;
      const H = 1200;
      canvasNode.width = W * dpr;
      canvasNode.height = H * dpr;
      ctx.scale(dpr, dpr);

      const gradBg = ctx.createLinearGradient(0, 0, 0, H);
      gradBg.addColorStop(0, '#FFF8F5');
      gradBg.addColorStop(1, '#FFE4D0');
      ctx.fillStyle = gradBg;
      ctx.fillRect(0, 0, W, H);

      const gradHeader = ctx.createLinearGradient(0, 0, W, 260);
      gradHeader.addColorStop(0, '#FF6B35');
      gradHeader.addColorStop(1, '#FF8C42');
      ctx.fillStyle = gradHeader;
      ctx.fillRect(0, 0, W, 260);

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.arc(650, -20, 160, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-30, 200, 130, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      this._roundRect(ctx, 32, 32, 100, 44, 12); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px PingFang SC, sans-serif';
      ctx.fillText('小厨AI', 48, 62);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 52px PingFang SC, sans-serif';
      this._wrapText(ctx, recipe.name || '美食食谱', 40, 130, W - 80, 60, 1);

      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.font = '26px PingFang SC, sans-serif';
      this._wrapText(ctx, recipe.description || '', 40, 196, W - 80, 36, 2);

      const badges = [
        { icon: '⏱', text: `${recipe.cookTime || 30}分钟` },
        { icon: '📊', text: recipe.difficulty || '简单' },
        { icon: '👥', text: `${recipe.servings || 2}人份` },
        { icon: '🔥', text: `${(recipe.nutrition || {}).calories || 0}千卡` },
      ];
      let badgeX = 32;
      badges.forEach(b => {
        const bw = 150;
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        this._roundRect(ctx, badgeX, 292, bw, 56, 28); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '22px PingFang SC, sans-serif';
        ctx.fillText(`${b.icon} ${b.text}`, badgeX + 16, 326);
        badgeX += bw + 16;
      });

      let y = 380;
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 32px PingFang SC, sans-serif';
      ctx.fillText('🛒 食材清单', 40, y);
      y += 48;

      const ingredients = recipe.ingredients || [];
      let colX = 40; let colY = y;
      ingredients.slice(0, 10).forEach((ing, i) => {
        if (i > 0 && i % 2 === 0) { colY += 56; colX = 40; }
        ctx.fillStyle = '#FFF0E8';
        this._roundRect(ctx, colX, colY - 32, 320, 44, 12); ctx.fill();
        ctx.fillStyle = '#FF6B35'; ctx.font = '24px PingFang SC, sans-serif';
        ctx.fillText(ing.name, colX + 16, colY);
        ctx.fillStyle = '#888888';
        ctx.fillText(`${ing.amount}${ing.unit}`, colX + 220, colY);
        colX += 340;
      });
      y = colY + 72;

      ctx.fillStyle = '#333333';
      ctx.font = 'bold 32px PingFang SC, sans-serif';
      ctx.fillText('👨‍🍳 烹饪步骤', 40, y);
      y += 52;

      const steps = recipe.steps || [];
      steps.slice(0, 4).forEach((step, i) => {
        const gradStep = ctx.createLinearGradient(40, y - 20, 80, y + 20);
        gradStep.addColorStop(0, '#FF6B35'); gradStep.addColorStop(1, '#FF8C42');
        ctx.fillStyle = gradStep;
        ctx.beginPath(); ctx.arc(60, y - 4, 24, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 24px PingFang SC, sans-serif';
        ctx.textAlign = 'center'; ctx.fillText(String(step.step || i + 1), 60, y + 4); ctx.textAlign = 'left';
        ctx.fillStyle = '#333333'; ctx.font = '24px PingFang SC, sans-serif';
        this._wrapText(ctx, step.description || '', 96, y, W - 140, 30, 2);
        y += 72;
      });

      if (steps.length > 4) {
        ctx.fillStyle = '#AAAAAA'; ctx.font = '22px PingFang SC, sans-serif';
        ctx.fillText(`... 共${steps.length}步，更多步骤请查看小程序`, 40, y); y += 40;
      }

      if (y < H - 200) {
        y += 16;
        ctx.fillStyle = '#FFF0E8';
        this._roundRect(ctx, 32, y, W - 64, 100, 20); ctx.fill();
        const nutrition = recipe.nutrition || {};
        const nutItems = [
          { label: '热量', value: `${nutrition.calories || 0}千卡` },
          { label: '蛋白质', value: `${nutrition.protein || 0}g` },
          { label: '碳水', value: `${nutrition.carbs || 0}g` },
          { label: '脂肪', value: `${nutrition.fat || 0}g` },
        ];
        let nx = 32 + 20;
        nutItems.forEach(nut => {
          const nw = Math.floor((W - 64 - 40) / 4);
          ctx.fillStyle = '#FF6B35'; ctx.font = 'bold 26px PingFang SC, sans-serif';
          ctx.textAlign = 'center'; ctx.fillText(nut.value, nx + nw / 2, y + 46);
          ctx.fillStyle = '#888888'; ctx.font = '22px PingFang SC, sans-serif';
          ctx.fillText(nut.label, nx + nw / 2, y + 80); ctx.textAlign = 'left';
          nx += nw;
        });
        y += 120;
      }

      ctx.fillStyle = '#FF6B35'; ctx.font = '22px PingFang SC, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('由小厨AI生成 · 微信搜索"小厨AI"', W / 2, H - 32);
      ctx.textAlign = 'left';

      await new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvas: canvasNode, x: 0, y: 0,
          width: W * dpr, height: H * dpr, destWidth: W * 2, destHeight: H * 2,
          fileType: 'png', quality: 1,
          success: (res) => { this.setData({ posterImagePath: res.tempFilePath, posterGenerating: false, posterReady: true }); resolve(); },
          fail: (err) => { reject(new Error(err.errMsg || '导出图片失败')); },
        });
      });
    } catch (err) {
      console.error('[recipe] 海报生成失败：', err);
      this.setData({ posterGenerating: false });
      wx.showToast({ title: '海报生成失败，请重试', icon: 'none' });
    }
  },

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },

  _wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    if (!text) return;
    const chars = text.split('');
    let line = ''; let lineCount = 0; let currentY = y;
    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line.length > 0) {
        if (maxLines && lineCount >= maxLines - 1) { ctx.fillText(line + '...', x, currentY); return; }
        ctx.fillText(line, x, currentY);
        line = chars[i]; currentY += lineHeight; lineCount++;
      } else { line = testLine; }
    }
    ctx.fillText(line, x, currentY);
  },

  savePoster() {
    const { posterImagePath } = this.data;
    if (!posterImagePath) return;
    wx.saveImageToPhotosAlbum({
      filePath: posterImagePath,
      success: () => { wx.showToast({ title: '海报已保存到相册 🎉', icon: 'success', duration: 2000 }); },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({ title: '需要相册权限', content: '保存海报需要访问相册权限，请在设置中开启', confirmText: '去设置', success: (res) => { if (res.confirm) wx.openSetting(); } });
        } else { wx.showToast({ title: '保存失败，请重试', icon: 'none' }); }
      },
    });
  },

  sharePoster() {
    const { posterImagePath } = this.data;
    if (!posterImagePath) return;
    wx.showShareImageMenu({
      path: posterImagePath,
      fail: () => { wx.showModal({ title: '分享海报', content: '可长按图片保存到相册后分享', showCancel: false }); },
    });
  },

  closePosterModal() {
    this.setData({ showPosterModal: false, posterImagePath: '', posterReady: false });
  },

  resetPage() {
    this.setData({ recipe: null, errorMsg: '', isLoading: false, showCacheTip: false, tokenInfo: { tokensUsed: 0 }, posterImagePath: '', posterReady: false });
    wx.pageScrollTo({ scrollTop: 0, duration: 300 });
  },

  shareRecipe() {
    if (!this.data.recipe) return;
    wx.showActionSheet({
      itemList: ['📸 生成海报分享', '💬 发送给朋友', '📣 分享到朋友圈'],
      success: (res) => {
        if (res.tapIndex === 0) { this.generatePoster(); }
        else if (res.tapIndex === 1) { wx.showModal({ title: '发送给朋友', content: '请点击右上角"..."后，选择"发送给朋友"', showCancel: false }); }
        else if (res.tapIndex === 2) { wx.showModal({ title: '分享到朋友圈', content: '请点击右上角"..."后，选择"分享到朋友圈"', showCancel: false }); }
      },
    });
  },

  showDeployHelp() {
    wx.showModal({
      title: '⚙️ 配置检查清单',
      content: '请依次检查：\n\n① app.js 中 env 填入云开发环境ID\n\n② 基础库版本 ≥ 3.7.1\n\n③ 云开发控制台 → AI → 已开启 AI 功能\n\n④ 确认免费资源包已绑定到当前环境',
      showCancel: false, confirmText: '我知道了', confirmColor: '#FF6B35',
    });
  },

  clearAllIngredients() {
    const quickIngredients = this.data.quickIngredients.map(item => ({ ...item, selected: false }));
    this.setData({ ingredients: [], inputValue: '', quickIngredients, errorMsg: '' });
  },
});
