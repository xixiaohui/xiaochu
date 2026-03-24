/**
 * 数据初始化云函数 - data-init
 * 功能：将菜系、减脂餐、孕妇营养餐基础数据批量写入微信云数据库
 * 版本：2.1.0
 * 使用方法：在微信开发者工具中调用此云函数，action='init_all' 初始化全部数据
 *          action='init_cuisines' 只初始化菜系数据
 *          action='init_fat_loss' 只初始化减脂餐数据
 *          action='init_pregnancy' 只初始化孕妇营养餐数据
 *          action='clear_all' 清空所有数据（谨慎使用）
 *          action='status' 查询各集合数据条数
 */

'use strict';

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

// ==================== 集合名称常量 ====================

const COLLECTIONS = {
  CUISINES: 'cuisines',           // 菜系基础数据
  FAT_LOSS_MEALS: 'fat_loss_meals', // 减脂餐系列
  PREGNANCY_MEALS: 'pregnancy_meals', // 孕妇营养餐系列
  RECIPES: 'recipes',             // 用户生成的菜谱
  CUISINE_LIKES: 'cuisine_likes', // 菜系收藏/点赞
};

// ==================== 菜系基础数据（30条）====================

const CUISINES_DATA = [
  // ===== 八大菜系 =====
  {
    id: 'sichuan', name: '川菜', fullName: '四川菜系',
    emoji: '🌶️', color: '#E53935', lightColor: '#FFEBEE',
    description: '麻辣鲜香，层次丰富',
    longDesc: '川菜以麻辣著称，善用花椒、辣椒，讲究"一菜一格，百菜百味"，是中国最受欢迎的菜系之一。',
    tags: ['麻辣', '鲜香', '下饭'], sortOrder: 1,
    representativeDishes: [
      { name: '麻婆豆腐', desc: '豆腐鲜嫩，麻辣鲜香', cookTime: 20, difficulty: 'easy', ingredients: ['豆腐', '猪肉末', '豆瓣酱', '花椒'] },
      { name: '宫保鸡丁', desc: '鸡肉鲜嫩，花生香脆', cookTime: 25, difficulty: 'easy', ingredients: ['鸡胸肉', '花生', '干辣椒', '葱'] },
      { name: '回锅肉', desc: '肥而不腻，香辣适口', cookTime: 40, difficulty: 'medium', ingredients: ['五花肉', '青椒', '豆瓣酱', '蒜苗'] },
      { name: '夫妻肺片', desc: '麻辣爽口，回味无穷', cookTime: 30, difficulty: 'medium', ingredients: ['牛肉', '牛杂', '花椒油', '辣椒油'] },
      { name: '水煮鱼', desc: '鱼肉滑嫩，麻辣鲜香', cookTime: 35, difficulty: 'medium', ingredients: ['草鱼', '豆芽', '豆瓣酱', '花椒'] },
      { name: '担担面', desc: '麻辣咸香，芝麻飘香', cookTime: 20, difficulty: 'easy', ingredients: ['面条', '猪肉末', '花椒粉', '芝麻酱'] },
    ],
    quickIngredients: ['豆腐', '猪肉末', '花椒', '豆瓣酱', '辣椒', '鸡肉', '牛肉', '花生'],
  },
  {
    id: 'cantonese', name: '粤菜', fullName: '广东菜系',
    emoji: '🍤', color: '#FF6B35', lightColor: '#FFF3E0',
    description: '清淡鲜美，原汁原味',
    longDesc: '粤菜讲究食材新鲜，烹调精细，口味清淡，追求保留食材的天然鲜味，是港式饮食文化的代表。',
    tags: ['清淡', '鲜美', '养生'], sortOrder: 2,
    representativeDishes: [
      { name: '白切鸡', desc: '皮滑肉嫩，鲜味十足', cookTime: 40, difficulty: 'easy', ingredients: ['整鸡', '姜', '葱', '盐'] },
      { name: '清蒸鱼', desc: '鲜嫩清甜，原汁原味', cookTime: 20, difficulty: 'easy', ingredients: ['鲈鱼', '姜', '葱', '生抽'] },
      { name: '广式叉烧', desc: '色泽红亮，甜香可口', cookTime: 60, difficulty: 'medium', ingredients: ['猪梅花肉', '蜂蜜', '叉烧酱', '生抽'] },
      { name: '虾饺', desc: '皮薄馅鲜，晶莹剔透', cookTime: 45, difficulty: 'hard', ingredients: ['鲜虾', '澄面', '猪肉', '笋'] },
      { name: '老火靓汤', desc: '营养丰富，暖胃养生', cookTime: 120, difficulty: 'easy', ingredients: ['猪骨', '胡萝卜', '玉米', '姜'] },
      { name: '蚝烙', desc: '外酥内嫩，鲜美独特', cookTime: 20, difficulty: 'medium', ingredients: ['生蚝', '蛋', '淀粉', '葱'] },
    ],
    quickIngredients: ['鲈鱼', '虾', '鸡肉', '猪骨', '姜', '葱', '生抽', '蚝油'],
  },
  {
    id: 'jiangsu', name: '苏菜', fullName: '江苏菜系',
    emoji: '🦞', color: '#2196F3', lightColor: '#E3F2FD',
    description: '精致细腻，咸甜适中',
    longDesc: '苏菜以精细的刀工和严格的火候著称，口味咸中带甜，注重汤汁浓郁，是中国宫廷菜的主要来源之一。',
    tags: ['精致', '咸甜', '清淡'], sortOrder: 3,
    representativeDishes: [
      { name: '狮子头', desc: '肉质鲜嫩，汤汁醇厚', cookTime: 60, difficulty: 'medium', ingredients: ['猪肉', '荸荠', '鸡蛋', '生姜'] },
      { name: '松鼠桂鱼', desc: '造型精美，酸甜可口', cookTime: 45, difficulty: 'hard', ingredients: ['桂鱼', '番茄酱', '醋', '白糖'] },
      { name: '盐水鸭', desc: '皮白肉嫩，咸香鲜美', cookTime: 60, difficulty: 'medium', ingredients: ['鸭肉', '盐', '花椒', '八角'] },
      { name: '文思豆腐', desc: '刀工精细，汤鲜豆嫩', cookTime: 30, difficulty: 'hard', ingredients: ['嫩豆腐', '鸡汤', '火腿', '香菇'] },
    ],
    quickIngredients: ['猪肉', '鱼', '鸭肉', '豆腐', '荸荠', '蟹', '高汤', '姜'],
  },
  {
    id: 'zhejiang', name: '浙菜', fullName: '浙江菜系',
    emoji: '🦀', color: '#00BCD4', lightColor: '#E0F7FA',
    description: '鲜嫩软滑，清淡优雅',
    longDesc: '浙菜取材以海鲜河鲜为主，注重鲜嫩软滑，口味清鲜，讲究清而不淡、鲜而不腥、嫩而不生。',
    tags: ['鲜嫩', '清淡', '海鲜'], sortOrder: 4,
    representativeDishes: [
      { name: '西湖醋鱼', desc: '鱼肉鲜嫩，酸甜适口', cookTime: 30, difficulty: 'medium', ingredients: ['草鱼', '醋', '白糖', '生姜'] },
      { name: '东坡肉', desc: '肥而不腻，入口即化', cookTime: 120, difficulty: 'medium', ingredients: ['五花肉', '黄酒', '生抽', '冰糖'] },
      { name: '龙井虾仁', desc: '虾仁清鲜，茶香四溢', cookTime: 20, difficulty: 'medium', ingredients: ['虾仁', '龙井茶', '蛋白', '淀粉'] },
    ],
    quickIngredients: ['草鱼', '虾仁', '五花肉', '豆腐皮', '荷叶', '醋', '黄酒', '冰糖'],
  },
  {
    id: 'hunan', name: '湘菜', fullName: '湖南菜系',
    emoji: '🥩', color: '#FF5722', lightColor: '#FBE9E7',
    description: '辣而不燥，香辣浓郁',
    longDesc: '湘菜以辣著称，但不同于川菜的麻辣，湘菜偏重香辣，多用熏腊食材，香味浓郁，下饭极佳。',
    tags: ['香辣', '熏腊', '浓郁'], sortOrder: 5,
    representativeDishes: [
      { name: '剁椒鱼头', desc: '鱼头鲜嫩，剁椒香辣', cookTime: 30, difficulty: 'easy', ingredients: ['鱼头', '剁椒', '姜', '蒜'] },
      { name: '小炒黄牛肉', desc: '牛肉嫩滑，香辣下饭', cookTime: 20, difficulty: 'easy', ingredients: ['牛肉', '小米椒', '大蒜', '香芹'] },
      { name: '毛氏红烧肉', desc: '色泽红亮，肥而不腻', cookTime: 90, difficulty: 'medium', ingredients: ['五花肉', '冰糖', '豆豉', '辣椒'] },
    ],
    quickIngredients: ['猪肉', '牛肉', '剁椒', '小米椒', '腊肉', '蒜', '姜', '香芹'],
  },
  {
    id: 'fujian', name: '闽菜', fullName: '福建菜系',
    emoji: '🍲', color: '#9C27B0', lightColor: '#F3E5F5',
    description: '汤汁浓郁，海鲜鲜美',
    longDesc: '闽菜以海鲜为主料，善于制汤，讲究汤的清澈与鲜甜，工艺精细，口味偏淡，略带甜酸。',
    tags: ['海鲜', '汤鲜', '甜酸'], sortOrder: 6,
    representativeDishes: [
      { name: '佛跳墙', desc: '食材丰富，汤汁醇厚', cookTime: 240, difficulty: 'hard', ingredients: ['鱼翅', '海参', '鲍鱼', '猪蹄'] },
      { name: '沙茶面', desc: '汤鲜料足，沙茶香浓', cookTime: 30, difficulty: 'easy', ingredients: ['面条', '沙茶酱', '虾', '猪血'] },
    ],
    quickIngredients: ['海参', '鲍鱼', '虾', '猪里脊', '荸荠', '沙茶酱', '高汤', '冬笋'],
  },
  {
    id: 'anhui', name: '徽菜', fullName: '安徽菜系',
    emoji: '🍖', color: '#795548', lightColor: '#EFEBE9',
    description: '重油重色，原汁原味',
    longDesc: '徽菜善用山珍野味，重油重色，讲究原汁原味，以烧、炖为主要技法，代表着徽州山区饮食文化。',
    tags: ['浓郁', '重色', '炖烧'], sortOrder: 7,
    representativeDishes: [
      { name: '臭鳜鱼', desc: '臭中有香，鱼肉鲜嫩', cookTime: 40, difficulty: 'medium', ingredients: ['鳜鱼', '盐', '辣椒', '生姜'] },
      { name: '蟹黄豆腐', desc: '豆腐嫩滑，蟹味鲜美', cookTime: 25, difficulty: 'easy', ingredients: ['嫩豆腐', '蟹黄', '高汤', '葱'] },
    ],
    quickIngredients: ['鳜鱼', '甲鱼', '豆腐', '火腿', '山药', '笋干', '黄酒', '盐'],
  },
  {
    id: 'shandong', name: '鲁菜', fullName: '山东菜系',
    emoji: '🐟', color: '#607D8B', lightColor: '#ECEFF1',
    description: '咸鲜纯正，清香宜人',
    longDesc: '鲁菜是中国最古老的菜系之一，用料广泛，以海鲜和山珍为主，注重原料鲜活，口味咸鲜纯正。',
    tags: ['咸鲜', '纯正', '大气'], sortOrder: 8,
    representativeDishes: [
      { name: '糖醋黄河鲤鱼', desc: '外酥内嫩，酸甜可口', cookTime: 35, difficulty: 'medium', ingredients: ['黄河鲤鱼', '糖', '醋', '番茄酱'] },
      { name: '葱烧海参', desc: '葱香浓郁，海参软糯', cookTime: 45, difficulty: 'hard', ingredients: ['海参', '大葱', '生抽', '高汤'] },
    ],
    quickIngredients: ['海参', '大虾', '鲤鱼', '猪肉', '大葱', '黄豆芽', '醋', '糖'],
  },
  // ===== 地方特色菜系 =====
  {
    id: 'northeastern', name: '东北菜', fullName: '东北菜系',
    emoji: '🥘', color: '#FF8F00', lightColor: '#FFF8E1',
    description: '量大味重，咸香浓郁',
    longDesc: '东北菜以量大、味重、咸香著称，多炖菜，豪爽粗犷。',
    tags: ['咸香', '量大', '炖菜'], sortOrder: 9,
    representativeDishes: [
      { name: '猪肉炖粉条', desc: '粉条软糯，肉香浓郁', cookTime: 60, difficulty: 'easy', ingredients: ['猪五花', '粉条', '白菜', '姜'] },
      { name: '锅包肉', desc: '外酥内嫩，酸甜可口', cookTime: 30, difficulty: 'medium', ingredients: ['猪里脊', '淀粉', '醋', '白糖'] },
    ],
    quickIngredients: ['猪肉', '土豆', '白菜', '粉条', '蘑菇', '茄子', '豆角', '大葱'],
  },
  {
    id: 'yunnan', name: '云南菜', fullName: '云南菜系',
    emoji: '🌿', color: '#4CAF50', lightColor: '#E8F5E9',
    description: '天然野味，酸辣鲜香',
    longDesc: '云南菜取材多样，富有民族特色，善用天然野生食材，口味酸辣。',
    tags: ['野味', '酸辣', '特色'], sortOrder: 10,
    representativeDishes: [
      { name: '过桥米线', desc: '汤鲜料足，米线滑嫩', cookTime: 30, difficulty: 'easy', ingredients: ['米线', '鸡汤', '猪肉片', '鹌鹑蛋'] },
      { name: '汽锅鸡', desc: '鸡肉鲜嫩，汤汁清甜', cookTime: 90, difficulty: 'easy', ingredients: ['土鸡', '姜', '盐', '三七'] },
    ],
    quickIngredients: ['土鸡', '米线', '野菜', '猪肉', '黑松露', '西红柿', '辣椒', '三七'],
  },
  {
    id: 'xinjiang', name: '新疆菜', fullName: '新疆菜系',
    emoji: '🐑', color: '#FF6F00', lightColor: '#FFF3E0',
    description: '牛羊肉香，风味浓郁',
    longDesc: '新疆菜以牛羊肉为主，搭配西域香料，口味浓郁，烤制工艺独特。',
    tags: ['牛羊肉', '香料', '烤制'], sortOrder: 11,
    representativeDishes: [
      { name: '新疆大盘鸡', desc: '鸡肉入味，宽面软滑', cookTime: 50, difficulty: 'medium', ingredients: ['鸡肉', '土豆', '皮带面', '辣椒'] },
      { name: '手抓饭', desc: '米饭金黄，羊肉飘香', cookTime: 60, difficulty: 'medium', ingredients: ['大米', '羊肉', '胡萝卜', '洋葱'] },
      { name: '羊肉串', desc: '外焦内嫩，孜然飘香', cookTime: 20, difficulty: 'easy', ingredients: ['羊肉', '孜然', '辣椒粉', '食盐'] },
    ],
    quickIngredients: ['羊肉', '牛肉', '洋葱', '孜然', '辣椒粉', '土豆', '胡萝卜', '大米'],
  },
  {
    id: 'beijing', name: '京菜', fullName: '北京菜系',
    emoji: '🦆', color: '#C62828', lightColor: '#FFEBEE',
    description: '宫廷风味，大气端庄',
    longDesc: '京菜融合了满汉饮食文化，以宫廷菜为代表，讲究形色味俱全，咸鲜适口。',
    tags: ['宫廷', '咸鲜', '大气'], sortOrder: 12,
    representativeDishes: [
      { name: '北京烤鸭', desc: '皮脆肉嫩，色泽红亮', cookTime: 120, difficulty: 'hard', ingredients: ['北京鸭', '甜面酱', '葱丝', '薄饼'] },
      { name: '炸酱面', desc: '面条劲道，炸酱醇厚', cookTime: 30, difficulty: 'easy', ingredients: ['手擀面', '猪肉丁', '黄豆酱', '黄瓜'] },
    ],
    quickIngredients: ['鸭肉', '羊肉片', '猪肉丁', '黄豆酱', '白菜', '豆腐', '麻酱', '手擀面'],
  },
  {
    id: 'shanxi', name: '晋菜', fullName: '山西菜系',
    emoji: '🍜', color: '#8D6E63', lightColor: '#EFEBE9',
    description: '面食为王，醋香浓郁',
    longDesc: '山西菜以面食为主，醋的使用极为广泛，口味咸酸，刀削面闻名全国。',
    tags: ['面食', '酸香', '咸鲜'], sortOrder: 13,
    representativeDishes: [
      { name: '刀削面', desc: '面条筋道，汤汁鲜美', cookTime: 25, difficulty: 'medium', ingredients: ['面粉', '猪骨汤', '番茄', '鸡蛋'] },
      { name: '平遥牛肉', desc: '色泽红润，咸香软烂', cookTime: 120, difficulty: 'medium', ingredients: ['黄牛肉', '盐', '花椒', '八角'] },
    ],
    quickIngredients: ['面粉', '猪肉', '牛肉', '羊肉', '老陈醋', '豆腐', '木耳', '鸡蛋'],
  },
  {
    id: 'shaanxi', name: '陕菜', fullName: '陕西菜系',
    emoji: '🥙', color: '#F57C00', lightColor: '#FFF3E0',
    description: '关中风味，面食豪迈',
    longDesc: '陕西菜以关中饮食为核心，面食品类繁多，口味重盐重辣，葱蒜香气十足。',
    tags: ['面食', '重口', '豪迈'], sortOrder: 14,
    representativeDishes: [
      { name: '肉夹馍', desc: '馍香肉嫩，口感丰富', cookTime: 40, difficulty: 'medium', ingredients: ['面饼', '猪肉', '花椒', '八角'] },
      { name: '凉皮', desc: '爽滑筋道，酸辣开胃', cookTime: 30, difficulty: 'easy', ingredients: ['面皮', '辣椒油', '醋', '黄瓜'] },
    ],
    quickIngredients: ['面粉', '猪肉', '羊肉', '辣椒', '蒜', '花椒', '醋', '油泼辣子'],
  },
  {
    id: 'guizhou', name: '黔菜', fullName: '贵州菜系',
    emoji: '🌶️', color: '#E91E63', lightColor: '#FCE4EC',
    description: '酸辣鲜香，风味独特',
    longDesc: '贵州菜以酸辣为主要特征，善用糟辣椒、折耳根等地方食材，口味独特。',
    tags: ['酸辣', '糟辣', '特色'], sortOrder: 15,
    representativeDishes: [
      { name: '酸汤鱼', desc: '汤酸鱼嫩，开胃解馋', cookTime: 35, difficulty: 'medium', ingredients: ['鲫鱼', '酸汤', '番茄', '折耳根'] },
      { name: '花溪牛肉粉', desc: '汤浓粉滑，牛肉软烂', cookTime: 60, difficulty: 'easy', ingredients: ['米粉', '牛肉', '酸汤', '折耳根'] },
    ],
    quickIngredients: ['鱼', '鸡肉', '酸汤', '折耳根', '糟辣椒', '干辣椒', '米粉', '豆腐'],
  },
  {
    id: 'sichuan_chongqing', name: '渝菜', fullName: '重庆菜系',
    emoji: '🫕', color: '#D32F2F', lightColor: '#FFEBEE',
    description: '火锅之都，麻辣滚烫',
    longDesc: '重庆菜以火锅最为著名，麻辣鲜香，豪迈豪爽，是西南饮食文化的代表。',
    tags: ['火锅', '麻辣', '江湖'], sortOrder: 16,
    representativeDishes: [
      { name: '重庆火锅', desc: '麻辣鲜香，涮烫万物', cookTime: 30, difficulty: 'easy', ingredients: ['火锅底料', '牛肉', '毛肚', '鸭肠'] },
      { name: '重庆小面', desc: '面条劲道，麻辣爽口', cookTime: 15, difficulty: 'easy', ingredients: ['碱面', '花椒', '辣椒油', '花生酱'] },
    ],
    quickIngredients: ['火锅底料', '牛肉', '毛肚', '鸭肠', '花椒', '辣椒', '碱面', '豆芽'],
  },
  {
    id: 'guangxi', name: '桂菜', fullName: '广西菜系',
    emoji: '🍜', color: '#388E3C', lightColor: '#E8F5E9',
    description: '酸辣鲜香，粉汤飘香',
    longDesc: '广西菜以螺蛳粉、桂林米粉闻名，善用酸笋等发酵食材，口味酸辣。',
    tags: ['米粉', '酸辣', '鲜香'], sortOrder: 17,
    representativeDishes: [
      { name: '螺蛳粉', desc: '汤汁浓郁，酸辣鲜香', cookTime: 30, difficulty: 'easy', ingredients: ['米粉', '螺蛳汤', '酸笋', '炸腐竹'] },
      { name: '桂林米粉', desc: '汤清粉滑，卤香浓郁', cookTime: 25, difficulty: 'easy', ingredients: ['米粉', '卤汤', '叉烧', '酸豆角'] },
    ],
    quickIngredients: ['米粉', '猪脚', '牛腩', '酸笋', '螺蛳', '芋头', '南乳', '荷叶'],
  },
  {
    id: 'hainan', name: '琼菜', fullName: '海南菜系',
    emoji: '🌊', color: '#0288D1', lightColor: '#E1F5FE',
    description: '清鲜原味，海岛风情',
    longDesc: '海南菜取材以热带海鲜和椰子为主，口味清淡鲜甜，热带风情十足。',
    tags: ['海鲜', '清淡', '热带'], sortOrder: 18,
    representativeDishes: [
      { name: '海南鸡饭', desc: '鸡肉嫩滑，鸡油饭香', cookTime: 45, difficulty: 'easy', ingredients: ['文昌鸡', '泰国香米', '姜', '蒜'] },
      { name: '椰子鸡汤', desc: '椰香清甜，鸡肉鲜嫩', cookTime: 50, difficulty: 'easy', ingredients: ['土鸡', '椰子', '姜', '盐'] },
    ],
    quickIngredients: ['鸡肉', '海鱼', '椰子', '猪脚', '大米', '姜', '葱', '南乳'],
  },
  {
    id: 'gansu_qinghai', name: '西北菜', fullName: '西北菜系',
    emoji: '🍖', color: '#BF360C', lightColor: '#FBE9E7',
    description: '牛羊为主，豪迈浓香',
    longDesc: '西北菜以牛羊肉为主，面食品类丰富，口味咸香浓郁，兰州拉面闻名全国。',
    tags: ['牛羊肉', '面食', '浓香'], sortOrder: 19,
    representativeDishes: [
      { name: '兰州拉面', desc: '汤清面滑，牛肉香醇', cookTime: 20, difficulty: 'hard', ingredients: ['面粉', '牛肉', '萝卜', '香菜'] },
      { name: '手抓羊肉', desc: '肉质鲜嫩，原汁原味', cookTime: 60, difficulty: 'easy', ingredients: ['羊肉', '盐', '花椒', '孜然'] },
    ],
    quickIngredients: ['羊肉', '牛肉', '面粉', '孜然', '花椒', '萝卜', '香菜', '馍'],
  },
  {
    id: 'sichuan_self_cooking', name: '川式家常', fullName: '川式家常菜',
    emoji: '🍳', color: '#F44336', lightColor: '#FFEBEE',
    description: '家常口味，简单实惠',
    longDesc: '川式家常菜以简单食材呈现川菜精髓，麻辣鲜香，是日常餐桌最受欢迎的风格。',
    tags: ['家常', '简单', '下饭'], sortOrder: 20,
    representativeDishes: [
      { name: '番茄炒鸡蛋', desc: '酸甜爽口，营养丰富', cookTime: 10, difficulty: 'easy', ingredients: ['番茄', '鸡蛋', '葱', '盐'] },
      { name: '鱼香肉丝', desc: '鱼香浓郁，酸甜微辣', cookTime: 15, difficulty: 'easy', ingredients: ['猪肉', '木耳', '胡萝卜', '郫县豆瓣'] },
    ],
    quickIngredients: ['猪肉', '鸡蛋', '番茄', '青椒', '茄子', '蒜', '豆瓣酱', '葱'],
  },
  {
    id: 'shanghai', name: '沪菜', fullName: '上海菜系',
    emoji: '🦀', color: '#1565C0', lightColor: '#E3F2FD',
    description: '浓油赤酱，本帮风味',
    longDesc: '上海本帮菜以浓油赤酱著称，口味甜中带咸，精致细腻，展现海派饮食文化。',
    tags: ['浓油', '甜咸', '精致'], sortOrder: 21,
    representativeDishes: [
      { name: '红烧肉', desc: '色泽红亮，肥而不腻', cookTime: 90, difficulty: 'medium', ingredients: ['五花肉', '生抽', '老抽', '冰糖'] },
      { name: '生煎馒头', desc: '底脆皮薄，汤汁饱满', cookTime: 30, difficulty: 'medium', ingredients: ['面粉', '猪肉', '葱', '生姜'] },
    ],
    quickIngredients: ['猪肉', '鸡肉', '虾仁', '鳝鱼', '冰糖', '老抽', '春笋', '面粉'],
  },
  {
    id: 'hakka', name: '客家菜', fullName: '客家菜系',
    emoji: '🥩', color: '#6D4C41', lightColor: '#EFEBE9',
    description: '咸香浓郁，豪爽实在',
    longDesc: '客家菜以"咸、香、肥"著称，讲究原汁原味，多以猪肉、豆腐为主料。',
    tags: ['咸香', '实在', '猪肉'], sortOrder: 22,
    representativeDishes: [
      { name: '盐焗鸡', desc: '鸡皮金黄，肉质鲜嫩', cookTime: 60, difficulty: 'medium', ingredients: ['整鸡', '粗盐', '沙姜', '香油'] },
      { name: '梅菜扣肉', desc: '梅菜香软，肉质浓郁', cookTime: 90, difficulty: 'medium', ingredients: ['五花肉', '梅菜', '生抽', '蚝油'] },
    ],
    quickIngredients: ['鸡肉', '五花肉', '豆腐', '梅菜', '牛肉丸', '虾', '猪肉末', '香菇'],
  },
  {
    id: 'huaiyang', name: '淮扬菜', fullName: '淮扬菜系',
    emoji: '🦢', color: '#00838F', lightColor: '#E0F7FA',
    description: '刀工精湛，清雅鲜嫩',
    longDesc: '淮扬菜以精湛刀工和精细烹调著称，口味清淡，是国宴常用菜系，雅致清鲜。',
    tags: ['精细', '清淡', '国宴'], sortOrder: 23,
    representativeDishes: [
      { name: '扬州炒饭', desc: '蛋炒粒粒分明，鲜香可口', cookTime: 15, difficulty: 'easy', ingredients: ['米饭', '鸡蛋', '虾仁', '葱'] },
      { name: '大煮干丝', desc: '干丝细嫩，汤汁鲜美', cookTime: 30, difficulty: 'medium', ingredients: ['豆腐干', '鸡汤', '火腿', '笋'] },
    ],
    quickIngredients: ['猪肉', '鸡蛋', '豆腐干', '蟹', '虾仁', '猪蹄', '火腿', '笋'],
  },
  {
    id: 'henan', name: '豫菜', fullName: '河南菜系',
    emoji: '🫔', color: '#5D4037', lightColor: '#EFEBE9',
    description: '中原风味，实惠大气',
    longDesc: '豫菜是中原饮食文化的代表，口味平和，咸鲜适中，烩面闻名全国。',
    tags: ['中原', '咸鲜', '实惠'], sortOrder: 24,
    representativeDishes: [
      { name: '烩面', desc: '面筋道汤浓，经典美味', cookTime: 40, difficulty: 'medium', ingredients: ['面条', '羊肉', '粉条', '豆腐丝'] },
      { name: '糊辣汤', desc: '胡椒香辣，暖胃醒神', cookTime: 30, difficulty: 'easy', ingredients: ['面筋', '粉条', '木耳', '胡椒'] },
    ],
    quickIngredients: ['猪肉', '羊肉', '鸡', '面条', '豆腐', '胡椒', '粉条', '萝卜'],
  },
  {
    id: 'tianjin', name: '津菜', fullName: '天津菜系',
    emoji: '🥟', color: '#1976D2', lightColor: '#E3F2FD',
    description: '海味丰富，咸鲜实在',
    longDesc: '天津菜融汇南北饮食文化，海产品丰富，狗不理包子闻名全国。',
    tags: ['海味', '包子', '小吃'], sortOrder: 25,
    representativeDishes: [
      { name: '狗不理包子', desc: '皮薄馅多，汁浓味美', cookTime: 60, difficulty: 'hard', ingredients: ['面粉', '猪肉', '葱', '姜'] },
      { name: '锅巴菜', desc: '酥脆多汁，鲜香可口', cookTime: 20, difficulty: 'easy', ingredients: ['绿豆煎饼', '卤汁', '芝麻酱', '香菜'] },
    ],
    quickIngredients: ['猪肉', '面粉', '海虾', '糯米粉', '豆沙', '芝麻酱', '葱', '姜'],
  },
  {
    id: 'mongolian', name: '蒙古菜', fullName: '蒙古族菜系',
    emoji: '🐄', color: '#827717', lightColor: '#F9FBE7',
    description: '草原风情，牛羊奶香',
    longDesc: '蒙古菜以牛羊肉和奶制品为主，烹调方式简单豪迈，体现草原游牧民族饮食特色。',
    tags: ['牛羊肉', '奶香', '草原'], sortOrder: 26,
    representativeDishes: [
      { name: '手扒肉', desc: '大块肉香，原汁原味', cookTime: 60, difficulty: 'easy', ingredients: ['羊肉', '盐', '洋葱', '孜然'] },
      { name: '蒙古奶茶', desc: '咸香奶浓，暖胃驱寒', cookTime: 15, difficulty: 'easy', ingredients: ['砖茶', '牛奶', '盐', '奶皮子'] },
    ],
    quickIngredients: ['羊肉', '牛肉', '牛奶', '洋葱', '孜然', '盐', '砖茶', '奶皮子'],
  },
  {
    id: 'tibetan', name: '藏菜', fullName: '西藏菜系',
    emoji: '🏔️', color: '#4A148C', lightColor: '#F3E5F5',
    description: '高原特色，奶肉为主',
    longDesc: '西藏菜以牦牛肉、青稞为主要食材，烹调方式简单，体现高原游牧民族特色。',
    tags: ['高原', '牦牛', '青稞'], sortOrder: 27,
    representativeDishes: [
      { name: '藏式手抓肉', desc: '牦牛肉鲜嫩，原味十足', cookTime: 60, difficulty: 'easy', ingredients: ['牦牛肉', '盐', '姜', '花椒'] },
      { name: '酥油茶', desc: '咸香温暖，提神驱寒', cookTime: 20, difficulty: 'easy', ingredients: ['砖茶', '酥油', '盐', '牛奶'] },
    ],
    quickIngredients: ['牦牛肉', '青稞', '酥油', '盐', '砖茶', '牛奶', '花椒', '孜然'],
  },
  {
    id: 'chaochow', name: '潮汕菜', fullName: '潮汕菜系',
    emoji: '🦪', color: '#00695C', lightColor: '#E0F2F1',
    description: '功夫茶配，海鲜至鲜',
    longDesc: '潮汕菜精于海鲜烹调，口味清淡，卤水功夫独特，搭配功夫茶，是精致饮食的代表。',
    tags: ['海鲜', '卤水', '精致'], sortOrder: 28,
    representativeDishes: [
      { name: '潮汕牛肉丸', desc: '丸子弹牙，鲜美十足', cookTime: 30, difficulty: 'medium', ingredients: ['牛肉', '鱼露', '淀粉', '葱'] },
      { name: '潮式卤水鹅', desc: '卤香入味，皮嫩肉鲜', cookTime: 120, difficulty: 'hard', ingredients: ['狮头鹅', '卤水料', '生抽', '冰糖'] },
    ],
    quickIngredients: ['牛肉', '生蚝', '鱼肉', '鹅肉', '鱼露', '卤水料', '粘米粉', '虾'],
  },
  {
    id: 'taiwanese', name: '台湾菜', fullName: '台湾菜系',
    emoji: '🧋', color: '#00796B', lightColor: '#E0F2F1',
    description: '融合精致，小吃多样',
    longDesc: '台湾菜融合闽南、客家、原住民及日式烹调，夜市文化丰富，珍珠奶茶闻名世界。',
    tags: ['夜市', '小吃', '融合'], sortOrder: 29,
    representativeDishes: [
      { name: '卤肉饭', desc: '卤汁浓郁，肉香入饭', cookTime: 60, difficulty: 'easy', ingredients: ['猪五花', '卤汁', '葱', '白米饭'] },
      { name: '三杯鸡', desc: '麻油酱油米酒，鸡肉鲜嫩', cookTime: 25, difficulty: 'easy', ingredients: ['鸡肉', '麻油', '酱油', '九层塔'] },
    ],
    quickIngredients: ['猪五花', '蚵仔', '鸡肉', '鸭肉', '老姜', '麻油', '九层塔', '木薯珍珠'],
  },
  {
    id: 'jiangxi', name: '赣菜', fullName: '江西菜系',
    emoji: '🌶️', color: '#C2185B', lightColor: '#FCE4EC',
    description: '香辣鲜嫩，瓦罐留香',
    longDesc: '江西菜以辣著称，瓦罐煨汤是一大特色，口味香辣鲜嫩，南昌炒粉是当地特色小吃。',
    tags: ['香辣', '瓦罐', '鲜嫩'], sortOrder: 30,
    representativeDishes: [
      { name: '瓦罐煨汤', desc: '汤鲜味美，营养丰富', cookTime: 180, difficulty: 'easy', ingredients: ['猪骨', '瓦罐', '姜', '盐'] },
      { name: '南昌炒粉', desc: '粉条爽滑，辣香开胃', cookTime: 15, difficulty: 'easy', ingredients: ['米粉', '猪肉', '辣椒', '豆芽'] },
    ],
    quickIngredients: ['猪骨', '米粉', '田螺', '豆腐', '草鱼', '辣椒', '姜', '蒜'],
  },
];

// ==================== 云数据库批量写入 ====================

/**
 * 批量写入数据到集合（避免重复，先清空再写入）
 */
const batchInsert = async (db, collectionName, dataList) => {
  const collection = db.collection(collectionName);
  const results = { success: 0, fail: 0, total: dataList.length };

  for (const item of dataList) {
    try {
      await collection.add({
        data: {
          ...item,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      });
      results.success++;
    } catch (err) {
      console.error(`[data-init] 写入失败 ${item.id || item.name}:`, err.message);
      results.fail++;
    }
  }
  return results;
};

/**
 * 清空集合数据
 */
const clearCollection = async (db, collectionName) => {
  try {
    const result = await db.collection(collectionName).get();
    if (result.data.length === 0) return 0;

    let deleted = 0;
    for (const item of result.data) {
      await db.collection(collectionName).doc(item._id).remove();
      deleted++;
    }
    return deleted;
  } catch (err) {
    console.error(`[data-init] 清空集合失败 ${collectionName}:`, err.message);
    return 0;
  }
};

/**
 * 查询各集合数据条数
 */
const getStatus = async (db) => {
  const status = {};
  for (const [key, collName] of Object.entries(COLLECTIONS)) {
    try {
      const result = await db.collection(collName).count();
      status[key] = { collection: collName, count: result.total };
    } catch (err) {
      status[key] = { collection: collName, count: -1, error: err.message };
    }
  }
  return status;
};

// ==================== 云函数主入口 ====================

exports.main = async (event, context) => {
  const db = cloud.database();
  const action = event.action || 'status';

  console.log('[data-init] 收到请求 action:', action);

  try {
    switch (action) {
      case 'status': {
        const status = await getStatus(db);
        return { code: 0, message: '查询成功', data: status };
      }

      case 'init_cuisines': {
        // 清空旧数据
        const cleared = await clearCollection(db, COLLECTIONS.CUISINES);
        // 批量写入30条菜系数据
        const result = await batchInsert(db, COLLECTIONS.CUISINES, CUISINES_DATA);
        return {
          code: 0,
          message: `菜系数据初始化完成，已清除${cleared}条旧数据`,
          data: { ...result, collection: COLLECTIONS.CUISINES },
        };
      }

      case 'init_fat_loss': {
        // 减脂餐数据从本地cuisines.js引入（云函数中直接内嵌简化版本）
        // 实际数据在 miniprogram/utils/cuisines.js 的 FAT_LOSS_MEALS
        const fatLossData = event.fatLossData || [];
        if (fatLossData.length === 0) {
          return { code: 1, message: '请传入 fatLossData 参数（30条减脂餐数据）', data: null };
        }
        const cleared = await clearCollection(db, COLLECTIONS.FAT_LOSS_MEALS);
        const result = await batchInsert(db, COLLECTIONS.FAT_LOSS_MEALS, fatLossData);
        return {
          code: 0,
          message: `减脂餐数据初始化完成，已清除${cleared}条旧数据`,
          data: { ...result, collection: COLLECTIONS.FAT_LOSS_MEALS },
        };
      }

      case 'init_pregnancy': {
        const pregnancyData = event.pregnancyData || [];
        if (pregnancyData.length === 0) {
          return { code: 1, message: '请传入 pregnancyData 参数（30条孕妇营养餐数据）', data: null };
        }
        const cleared = await clearCollection(db, COLLECTIONS.PREGNANCY_MEALS);
        const result = await batchInsert(db, COLLECTIONS.PREGNANCY_MEALS, pregnancyData);
        return {
          code: 0,
          message: `孕妇营养餐数据初始化完成，已清除${cleared}条旧数据`,
          data: { ...result, collection: COLLECTIONS.PREGNANCY_MEALS },
        };
      }

      case 'init_all': {
        // 全量初始化（菜系数据直接内嵌；减脂餐和孕妇营养餐需从前端传入）
        const allResults = {};

        // 初始化菜系
        const cuisinesCleared = await clearCollection(db, COLLECTIONS.CUISINES);
        allResults.cuisines = await batchInsert(db, COLLECTIONS.CUISINES, CUISINES_DATA);
        allResults.cuisines.cleared = cuisinesCleared;

        // 减脂餐（如有传参则写入）
        if (event.fatLossData && event.fatLossData.length > 0) {
          const flCleared = await clearCollection(db, COLLECTIONS.FAT_LOSS_MEALS);
          allResults.fatLoss = await batchInsert(db, COLLECTIONS.FAT_LOSS_MEALS, event.fatLossData);
          allResults.fatLoss.cleared = flCleared;
        }

        // 孕妇营养餐（如有传参则写入）
        if (event.pregnancyData && event.pregnancyData.length > 0) {
          const pgCleared = await clearCollection(db, COLLECTIONS.PREGNANCY_MEALS);
          allResults.pregnancy = await batchInsert(db, COLLECTIONS.PREGNANCY_MEALS, event.pregnancyData);
          allResults.pregnancy.cleared = pgCleared;
        }

        return {
          code: 0,
          message: '全量数据初始化完成',
          data: allResults,
        };
      }

      case 'clear_all': {
        // 慎重操作：清空所有集合
        const clearResults = {};
        for (const [key, collName] of Object.entries(COLLECTIONS)) {
          clearResults[key] = await clearCollection(db, collName);
        }
        return { code: 0, message: '所有集合已清空', data: clearResults };
      }

      default:
        return { code: 1, message: `未知操作: ${action}`, data: null };
    }
  } catch (err) {
    console.error('[data-init] 执行失败:', err);
    return { code: 500, message: err.message, data: null };
  }
};
