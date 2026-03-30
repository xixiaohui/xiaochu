/**
 * 菜谱海报生成工具 - utils/poster-generator.js  v1.0.0
 *
 * 功能：
 *   - 使用 Canvas 2D API 绘制菜谱海报
 *   - 支持三种主题：菜系（自定义色）、减脂（绿色 #4CAF50）、孕妇营养（粉色 #E91E63）
 *   - 海报尺寸：手机屏幕宽高比 × 3（如 750px × 1500px → 2250px × 4500px，但限制最大分辨率）
 *   - 海报内容：标题、描述、食材清单、烹饪步骤、营养信息、小程序二维码预留区
 *   - 提供保存到相册功能
 */

'use strict';

/**
 * 主题配置
 */
const THEMES = {
  cuisine: (color) => ({
    primary:    color || '#FF6B35',
    secondary:  lightenColor(color || '#FF6B35', 0.3),
    bg:         '#FFFFFF',
    headerBg:   color || '#FF6B35',
    headerText: '#FFFFFF',
    accent:     color || '#FF6B35',
    tagBg:      lightenColor(color || '#FF6B35', 0.85),
    tagText:    color || '#FF6B35',
    nutBg:      lightenColor(color || '#FF6B35', 0.9),
    nutText:    color || '#FF6B35',
    stepNumBg:  color || '#FF6B35',
  }),
  fat_loss: () => ({
    primary:    '#4CAF50',
    secondary:  '#66BB6A',
    bg:         '#F1F8E9',
    headerBg:   '#4CAF50',
    headerText: '#FFFFFF',
    accent:     '#2E7D32',
    tagBg:      '#E8F5E9',
    tagText:    '#2E7D32',
    nutBg:      '#E8F5E9',
    nutText:    '#4CAF50',
    stepNumBg:  '#4CAF50',
  }),
  pregnancy: () => ({
    primary:    '#E91E63',
    secondary:  '#F06292',
    bg:         '#FFF0F5',
    headerBg:   '#E91E63',
    headerText: '#FFFFFF',
    accent:     '#880E4F',
    tagBg:      '#FCE4EC',
    tagText:    '#C2185B',
    nutBg:      '#FCE4EC',
    nutText:    '#E91E63',
    stepNumBg:  '#E91E63',
  }),
};

/**
 * 简单颜色变浅（hex → rgba with alpha）
 */
function lightenColor(hex, ratio) {
  // 返回带透明度的 rgba（近似变浅）
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const alpha = 1 - ratio;
  return `rgba(${r},${g},${b},${alpha < 0.1 ? 0.1 : alpha})`;
}

/**
 * 获取主题
 * @param {'cuisine'|'fat_loss'|'pregnancy'} type
 * @param {string} [color] 菜系自定义颜色
 */
function getTheme(type, color) {
  if (type === 'fat_loss') return THEMES.fat_loss();
  if (type === 'pregnancy') return THEMES.pregnancy();
  return THEMES.cuisine(color);
}

/**
 * 计算海报尺寸（手机屏幕宽高比 × 3）
 * 微信限制 Canvas 最大像素，实际用 scale 模拟
 */
function getPosterSize() {
  const sysInfo = wx.getSystemInfoSync();
  const screenW = sysInfo.screenWidth  || 375;
  const screenH = sysInfo.screenHeight || 812;
  // 逻辑像素 × dpr 得到物理像素，再 × 3 倍比例
  // 但 Canvas 过大会 OOM，上限 1500 × 3000
  const ratio = screenH / screenW;
  const W = Math.min(1125, screenW * 3);   // 375 × 3 = 1125
  const H = Math.round(W * ratio);
  return { W, H, ratio };
}

/**
 * 文字换行辅助：将 text 在 maxWidth 内自动换行，返回行数组
 */
function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  const chars = text.split('');
  const lines = [];
  let line = '';

  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line.length > 0) {
      lines.push(line);
      line = chars[i];
    } else {
      line = testLine;
    }
    // 处理换行符
    if (chars[i] === '\n') {
      lines.push(line.replace('\n', ''));
      line = '';
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * 圆角矩形路径
 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * 核心绘制函数
 * @param {Object} ctx         Canvas 2D context
 * @param {Object} recipe      食谱对象（AI 生成）
 * @param {Object} mealInfo    原始菜品信息（来自 cuisines.js 的 meal/dish 对象）
 * @param {string} themeType   'cuisine' | 'fat_loss' | 'pregnancy'
 * @param {string} [themeColor] 菜系主色（仅 themeType=cuisine 时生效）
 * @param {number} W           画布宽度
 * @param {number} H           画布高度
 */
function drawPoster(ctx, recipe, mealInfo, themeType, themeColor, W, H) {
  const theme = getTheme(themeType, themeColor);
  const PAD   = W * 0.06;   // 边距
  const INNER = W - PAD * 2;

  // ── 背景 ───────────────────────────────────────────────
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);

  // ── 顶部渐变 Header ────────────────────────────────────
  const HEADER_H = H * 0.2;
  const grad = ctx.createLinearGradient(0, 0, W, HEADER_H);
  grad.addColorStop(0, theme.primary);
  grad.addColorStop(1, theme.secondary);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, HEADER_H);

  // 装饰圆
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(W - W * 0.12, H * 0.05, W * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W * 0.05, H * 0.01, W * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Emoji 图标
  const dishEmoji = mealInfo.emoji || (themeType === 'fat_loss' ? '🥗' : themeType === 'pregnancy' ? '🤰' : '🍽️');
  ctx.font      = `${W * 0.12}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillText(dishEmoji, W - W * 0.2, HEADER_H * 0.65);

  // 标签（菜系/减脂/孕妇）
  const typeLabel = themeType === 'fat_loss' ? '减脂菜谱'
    : themeType === 'pregnancy' ? '孕妇营养餐'
    : (mealInfo.cuisineName || '菜系菜谱');
  ctx.font      = `${W * 0.035}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(typeLabel, PAD, HEADER_H * 0.28);

  // 菜名（大字）
  const dishName = mealInfo.name || recipe.name || '';
  ctx.font      = `bold ${W * 0.075}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  const nameLines = wrapText(ctx, dishName, INNER * 0.78);
  nameLines.forEach((line, i) => {
    ctx.fillText(line, PAD, HEADER_H * 0.52 + i * W * 0.085);
  });

  // 卡路里徽章
  const calText = mealInfo.calories
    ? `🔥 ${mealInfo.calories} 卡`
    : recipe.nutrition ? `🔥 ${recipe.nutrition.calories} 千卡` : '';
  if (calText) {
    ctx.font      = `bold ${W * 0.035}px sans-serif`;
    const calW    = ctx.measureText(calText).width + W * 0.06;
    const calX    = PAD;
    const calY    = HEADER_H * 0.76;
    roundRect(ctx, calX, calY - W * 0.035, calW, W * 0.055, W * 0.025);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(calText, calX + W * 0.03, calY - W * 0.002);
  }

  // 难度 + 时间
  const metaText = [
    recipe.difficulty ? `📊 ${recipe.difficulty}` : '',
    recipe.cookTime   ? `⏱ ${recipe.cookTime}分钟` : '',
    recipe.servings   ? `👥 ${recipe.servings}人份` : '',
  ].filter(Boolean).join('   ');
  ctx.font      = `${W * 0.032}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(metaText, PAD, HEADER_H * 0.94);

  // ── 内容区 ───────────────────────────────────────────
  let curY = HEADER_H + H * 0.025;

  // 描述
  if (recipe.description) {
    ctx.font      = `${W * 0.038}px sans-serif`;
    ctx.fillStyle = '#555555';
    const descLines = wrapText(ctx, recipe.description, INNER);
    const maxDescLines = 3;
    descLines.slice(0, maxDescLines).forEach(line => {
      ctx.fillText(line, PAD, curY + W * 0.042);
      curY += W * 0.048;
    });
    curY += W * 0.02;
  }

  // 分隔线
  function drawDivider(y) {
    ctx.strokeStyle = '#EEEEEE';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
  }

  // ── 营养数据行（来自原始 mealInfo）──────────────────
  const nutItems = [];
  if (recipe.nutrition) {
    if (recipe.nutrition.calories) nutItems.push({ val: recipe.nutrition.calories, label: '千卡' });
    if (recipe.nutrition.protein)  nutItems.push({ val: `${recipe.nutrition.protein}g`, label: '蛋白质' });
    if (recipe.nutrition.carbs)    nutItems.push({ val: `${recipe.nutrition.carbs}g`, label: '碳水' });
    if (recipe.nutrition.fat)      nutItems.push({ val: `${recipe.nutrition.fat}g`, label: '脂肪' });
  }
  // 减脂餐补充原始数据
  if (themeType === 'fat_loss' && mealInfo.protein && nutItems.length === 0) {
    if (mealInfo.calories) nutItems.push({ val: mealInfo.calories, label: '卡路里' });
    if (mealInfo.protein)  nutItems.push({ val: `${mealInfo.protein}g`, label: '蛋白质' });
    if (mealInfo.carbs)    nutItems.push({ val: `${mealInfo.carbs}g`, label: '碳水' });
    if (mealInfo.fat)      nutItems.push({ val: `${mealInfo.fat}g`, label: '脂肪' });
  }

  if (nutItems.length > 0) {
    const NUT_H    = H * 0.1;
    const NUT_Y    = curY;
    const NUT_W    = INNER;
    roundRect(ctx, PAD, NUT_Y, NUT_W, NUT_H, W * 0.025);
    ctx.fillStyle = theme.nutBg;
    ctx.fill();

    const itemW = NUT_W / nutItems.length;
    nutItems.forEach((item, i) => {
      const cx = PAD + itemW * i + itemW / 2;
      ctx.textAlign = 'center';
      ctx.font      = `bold ${W * 0.05}px sans-serif`;
      ctx.fillStyle = theme.nutText;
      ctx.fillText(String(item.val), cx, NUT_Y + NUT_H * 0.5);
      ctx.font      = `${W * 0.03}px sans-serif`;
      ctx.fillStyle = '#AAAAAA';
      ctx.fillText(item.label, cx, NUT_Y + NUT_H * 0.82);
    });
    ctx.textAlign = 'left';
    curY += NUT_H + H * 0.02;
  }

  // ── 孕期特殊信息 ────────────────────────────────────
  if (themeType === 'pregnancy' && mealInfo.nutrients && mealInfo.nutrients.length > 0) {
    ctx.font      = `bold ${W * 0.038}px sans-serif`;
    ctx.fillStyle = theme.accent;
    ctx.fillText('🤰 关键营养素', PAD, curY + W * 0.04);
    curY += W * 0.055;

    const nutStr = mealInfo.nutrients.join(' · ');
    ctx.font      = `${W * 0.034}px sans-serif`;
    ctx.fillStyle = '#666666';
    ctx.fillText(nutStr, PAD, curY + W * 0.035);
    curY += W * 0.055;
  }

  drawDivider(curY);
  curY += H * 0.018;

  // ── 食材清单 ─────────────────────────────────────────
  const SECTION_FONT_SIZE = W * 0.042;
  ctx.font      = `bold ${SECTION_FONT_SIZE}px sans-serif`;
  ctx.fillStyle = '#2D2D2D';
  ctx.fillText('🛒 食材清单', PAD, curY + SECTION_FONT_SIZE);
  curY += SECTION_FONT_SIZE * 1.6;

  const ingredients = recipe.ingredients || [];
  const ING_COLS = 2;
  const ING_ROW_H = H * 0.042;
  const colW = INNER / ING_COLS;

  // 最多显示 10 个食材
  const maxIng = Math.min(ingredients.length, 10);
  const rows   = Math.ceil(maxIng / ING_COLS);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < ING_COLS; col++) {
      const idx = row * ING_COLS + col;
      if (idx >= maxIng) break;
      const ing = ingredients[idx];
      const x   = PAD + col * colW;
      const y   = curY + row * ING_ROW_H;

      // 圆点
      ctx.fillStyle = theme.primary;
      ctx.beginPath();
      ctx.arc(x + W * 0.018, y - W * 0.012, W * 0.01, 0, Math.PI * 2);
      ctx.fill();

      ctx.font      = `${W * 0.033}px sans-serif`;
      ctx.fillStyle = '#444444';
      const ingText = `${ing.name || ing}`;
      const ingAmount = ing.amount ? ` ${ing.amount}${ing.unit || ''}` : '';
      ctx.fillText(ingText, x + W * 0.035, y);
      ctx.fillStyle = '#AAAAAA';
      ctx.font      = `${W * 0.028}px sans-serif`;
      ctx.fillText(ingAmount, x + W * 0.035 + ctx.measureText(ingText).width + 4, y);
    }
  }
  curY += rows * ING_ROW_H + H * 0.015;
  drawDivider(curY);
  curY += H * 0.018;

  // ── 烹饪步骤 ─────────────────────────────────────────
  ctx.font      = `bold ${SECTION_FONT_SIZE}px sans-serif`;
  ctx.fillStyle = '#2D2D2D';
  ctx.fillText('👨‍🍳 烹饪步骤', PAD, curY + SECTION_FONT_SIZE);
  curY += SECTION_FONT_SIZE * 1.6;

  const steps      = recipe.steps || [];
  const STEP_FONT  = W * 0.033;
  const STEP_NUM_R = W * 0.032;
  const STEP_X     = PAD + STEP_NUM_R * 2 + W * 0.025;
  const STEP_W     = INNER - STEP_NUM_R * 2 - W * 0.025;

  // 最多显示 6 步
  const maxSteps = Math.min(steps.length, 6);
  for (let i = 0; i < maxSteps; i++) {
    const step     = steps[i];
    const stepDesc = step.description || step;
    ctx.font       = `${STEP_FONT}px sans-serif`;
    const stepLines = wrapText(ctx, stepDesc, STEP_W);
    const maxSL     = Math.min(stepLines.length, 2);
    const stepH     = maxSL * STEP_FONT * 1.5 + STEP_FONT * 0.5;

    // 步骤圆圈
    ctx.fillStyle = theme.stepNumBg;
    ctx.beginPath();
    ctx.arc(PAD + STEP_NUM_R, curY + STEP_NUM_R, STEP_NUM_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.font      = `bold ${W * 0.028}px sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(String(step.step || i + 1), PAD + STEP_NUM_R, curY + STEP_NUM_R + W * 0.01);
    ctx.textAlign = 'left';

    // 步骤文字
    ctx.font      = `${STEP_FONT}px sans-serif`;
    ctx.fillStyle = '#333333';
    stepLines.slice(0, maxSL).forEach((line, li) => {
      ctx.fillText(line, STEP_X, curY + STEP_FONT + li * STEP_FONT * 1.5);
    });

    curY += stepH + H * 0.01;

    // 超出空间时停止
    if (curY > H * 0.8) break;
  }

  // ── 小程序二维码区域 ────────────────────────────────
  const QR_SIZE   = W * 0.18;
  const QR_X      = W - PAD - QR_SIZE;
  const QR_BOTTOM = H - H * 0.015;
  const QR_Y      = QR_BOTTOM - QR_SIZE;

  // 底部背景条
  const FOOTER_H  = H * 0.1;
  const FOOTER_Y  = H - FOOTER_H;
  ctx.fillStyle   = theme.primary;
  ctx.fillRect(0, FOOTER_Y, W, FOOTER_H);

  // 品牌文字
  ctx.font      = `bold ${W * 0.045}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('小厨 AI', PAD, FOOTER_Y + FOOTER_H * 0.45);
  ctx.font      = `${W * 0.028}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('扫码进入小程序获取更多菜谱', PAD, FOOTER_Y + FOOTER_H * 0.75);

  // 二维码白色背景
  const QR_CARD_PAD = W * 0.01;
  roundRect(ctx, QR_X - QR_CARD_PAD, FOOTER_Y + (FOOTER_H - QR_SIZE) / 2 - QR_CARD_PAD,
    QR_SIZE + QR_CARD_PAD * 2, QR_SIZE + QR_CARD_PAD * 2, W * 0.012);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  return { QR_X, QR_Y: FOOTER_Y + (FOOTER_H - QR_SIZE) / 2, QR_SIZE };
}

/**
 * 绘制二维码图片到画布
 * @param {Object} ctx
 * @param {string} qrPath 二维码本地路径
 * @param {number} x
 * @param {number} y
 * @param {number} size
 */
function drawQRCode(ctx, qrPath, x, y, size) {
  return new Promise((resolve) => {
    const img = ctx.canvas.createImage ? ctx.canvas.createImage() : new Image();
    img.onload = () => {
      ctx.drawImage(img, x, y, size, size);
      resolve();
    };
    img.onerror = () => {
      // 如果二维码图片加载失败，绘制占位框
      ctx.strokeStyle = '#DDDDDD';
      ctx.lineWidth   = 2;
      ctx.strokeRect(x, y, size, size);
      ctx.font      = `${size * 0.12}px sans-serif`;
      ctx.fillStyle = '#AAAAAA';
      ctx.textAlign = 'center';
      ctx.fillText('小程序码', x + size / 2, y + size / 2);
      ctx.textAlign = 'left';
      resolve();
    };
    img.src = qrPath;
  });
}

/**
 * 生成并保存海报
 *
 * @param {Object} options
 * @param {string}  options.canvasId   canvas 组件的 id（页面中需定义 <canvas> 元素）
 * @param {Object}  options.pageCtx    Page 实例（this）
 * @param {Object}  options.recipe     AI 生成的食谱
 * @param {Object}  options.mealInfo   原始菜品信息
 * @param {string}  options.themeType  'cuisine' | 'fat_loss' | 'pregnancy'
 * @param {string}  [options.themeColor] 菜系主色（hex）
 * @param {Function} [options.onProgress] 进度回调
 * @returns {Promise<string>} 临时文件路径
 */
async function generatePoster(options) {
  const { canvasId, pageCtx, recipe, mealInfo, themeType, themeColor, onProgress } = options;

  if (!recipe || !mealInfo) {
    throw new Error('缺少食谱或菜品信息');
  }

  // 计算画布尺寸
  const { W, H } = getPosterSize();

  onProgress && onProgress('正在初始化画布...');

  // 获取 Canvas 节点（Canvas 2D API）
  const canvas = await new Promise((resolve, reject) => {
    const query = pageCtx.createSelectorQuery();
    query.select(`#${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res && res[0] && res[0].node) {
          resolve(res[0].node);
        } else {
          reject(new Error('找不到 canvas 节点'));
        }
      });
  });

  canvas.width  = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');

  onProgress && onProgress('正在绘制海报...');

  // 绘制海报主体，获取二维码位置
  const qrPos = drawPoster(ctx, recipe, mealInfo, themeType, themeColor, W, H);

  // 加载并绘制小程序二维码
  onProgress && onProgress('正在加载二维码...');
  try {
    // 尝试加载本地图片
    await new Promise((resolve) => {
      wx.getImageInfo({
        src: '/images/xiaochu.png',
        success(imgInfo) {
          try {
            const img = canvas.createImage();
            img.onload = () => {
              ctx.drawImage(img, qrPos.QR_X, qrPos.QR_Y, qrPos.QR_SIZE, qrPos.QR_SIZE);
              resolve();
            };
            img.onerror = () => resolve(); // 失败静默
            img.src = imgInfo.path;
          } catch (e) {
            resolve();
          }
        },
        fail() {
          // 画占位框
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth   = 2;
          ctx.strokeRect(qrPos.QR_X, qrPos.QR_Y, qrPos.QR_SIZE, qrPos.QR_SIZE);
          ctx.font      = `${qrPos.QR_SIZE * 0.12}px sans-serif`;
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.textAlign = 'center';
          ctx.fillText('扫码进入', qrPos.QR_X + qrPos.QR_SIZE / 2, qrPos.QR_Y + qrPos.QR_SIZE * 0.45);
          ctx.fillText('小程序', qrPos.QR_X + qrPos.QR_SIZE / 2, qrPos.QR_Y + qrPos.QR_SIZE * 0.65);
          ctx.textAlign = 'left';
          resolve();
        },
      });
    });
  } catch (e) {
    console.warn('[poster] 二维码加载失败，继续生成海报');
  }

  onProgress && onProgress('正在生成图片...');

  // 导出为临时文件
  const tempPath = await new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas,
      fileType:  'jpg',
      quality:   0.92,
      success: (res) => resolve(res.tempFilePath),
      fail:    (err) => reject(new Error(err.errMsg || '导出图片失败')),
    });
  });

  return tempPath;
}

/**
 * 保存图片到相册
 * @param {string} tempFilePath 临时文件路径
 * @returns {Promise<void>}
 */
async function saveToAlbum(tempFilePath) {
  // 先检查权限
  await new Promise((resolve, reject) => {
    wx.getSetting({
      success(res) {
        if (res.authSetting['scope.writePhotosAlbum'] === false) {
          // 已被拒绝，引导去设置
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中开启"保存到相册"权限',
            confirmText: '去设置',
            success(modal) {
              if (modal.confirm) wx.openSetting();
            },
          });
          reject(new Error('无相册权限'));
        } else {
          resolve();
        }
      },
      fail: reject,
    });
  });

  // 保存图片
  await new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath: tempFilePath,
      success:  resolve,
      fail(err) {
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要相册权限',
            content: '请授权"保存到相册"权限后再试',
            confirmText: '去设置',
            success(modal) {
              if (modal.confirm) wx.openSetting();
            },
          });
          reject(new Error('用户拒绝授权'));
        } else {
          reject(new Error(err.errMsg || '保存失败'));
        }
      },
    });
  });
}

/**
 * 一键生成并保存海报（含 UI 提示）
 * @param {Object} options 同 generatePoster
 */
async function generateAndSavePoster(options) {
  const { pageCtx } = options;

  wx.showLoading({ title: '海报生成中...', mask: true });

  try {
    const tempPath = await generatePoster({
      ...options,
      onProgress(msg) {
        wx.showLoading({ title: msg, mask: true });
      },
    });

    wx.hideLoading();

    // 弹出预览 + 下载
    wx.showActionSheet({
      itemList: ['📥 保存到手机相册', '👀 预览海报'],
      success(res) {
        if (res.tapIndex === 0) {
          wx.showLoading({ title: '保存中...', mask: true });
          saveToAlbum(tempPath)
            .then(() => {
              wx.hideLoading();
              wx.showToast({ title: '已保存到相册 🎉', icon: 'success', duration: 2000 });
            })
            .catch(err => {
              wx.hideLoading();
              wx.showToast({ title: err.message || '保存失败', icon: 'error' });
            });
        } else if (res.tapIndex === 1) {
          wx.previewImage({ current: tempPath, urls: [tempPath] });
        }
      },
    });

    return tempPath;
  } catch (err) {
    wx.hideLoading();
    wx.showToast({ title: err.message || '海报生成失败', icon: 'error', duration: 2500 });
    throw err;
  }
}

module.exports = {
  generatePoster,
  generateAndSavePoster,
  saveToAlbum,
  getPosterSize,
  getTheme,
};
