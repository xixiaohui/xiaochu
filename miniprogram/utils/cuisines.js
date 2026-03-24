/**
 * 菜系数据模块 - cuisines.js
 * 功能：定义中国八大菜系及特色菜系数据，提供菜系相关工具函数
 * 版本：2.0.0
 */

'use strict';

// ==================== 菜系定义 ====================

/**
 * 八大菜系 + 特色菜系数据
 * 每个菜系包含：ID、名称、英文名、特色描述、代表菜、口味标签、颜色主题
 */
const CUISINES = [
  {
    id: 'sichuan',
    name: '川菜',
    fullName: '四川菜系',
    emoji: '🌶️',
    color: '#E53935',
    lightColor: '#FFEBEE',
    description: '麻辣鲜香，层次丰富',
    longDesc: '川菜以麻辣著称，善用花椒、辣椒，讲究"一菜一格，百菜百味"，是中国最受欢迎的菜系之一。',
    tags: ['麻辣', '鲜香', '下饭'],
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
    id: 'cantonese',
    name: '粤菜',
    fullName: '广东菜系',
    emoji: '🍤',
    color: '#FF6B35',
    lightColor: '#FFF3E0',
    description: '清淡鲜美，原汁原味',
    longDesc: '粤菜讲究食材新鲜，烹调精细，口味清淡，追求保留食材的天然鲜味，是港式饮食文化的代表。',
    tags: ['清淡', '鲜美', '养生'],
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
    id: 'jiangsu',
    name: '苏菜',
    fullName: '江苏菜系',
    emoji: '🦞',
    color: '#2196F3',
    lightColor: '#E3F2FD',
    description: '精致细腻，咸甜适中',
    longDesc: '苏菜以精细的刀工和严格的火候著称，口味咸中带甜，注重汤汁浓郁，是中国宫廷菜的主要来源之一。',
    tags: ['精致', '咸甜', '清淡'],
    representativeDishes: [
      { name: '狮子头', desc: '肉质鲜嫩，汤汁醇厚', cookTime: 60, difficulty: 'medium', ingredients: ['猪肉', '荸荠', '鸡蛋', '生姜'] },
      { name: '松鼠桂鱼', desc: '造型精美，酸甜可口', cookTime: 45, difficulty: 'hard', ingredients: ['桂鱼', '番茄酱', '醋', '白糖'] },
      { name: '清炖蟹粉狮子头', desc: '鲜美无比，入口即化', cookTime: 90, difficulty: 'hard', ingredients: ['猪肉', '蟹粉', '荸荠', '高汤'] },
      { name: '叫花鸡', desc: '皮酥肉嫩，荷香扑鼻', cookTime: 180, difficulty: 'hard', ingredients: ['整鸡', '荷叶', '五香粉', '黄泥'] },
      { name: '盐水鸭', desc: '皮白肉嫩，咸香鲜美', cookTime: 60, difficulty: 'medium', ingredients: ['鸭肉', '盐', '花椒', '八角'] },
      { name: '文思豆腐', desc: '刀工精细，汤鲜豆嫩', cookTime: 30, difficulty: 'hard', ingredients: ['嫩豆腐', '鸡汤', '火腿', '香菇'] },
    ],
    quickIngredients: ['猪肉', '鱼', '鸭肉', '豆腐', '荸荠', '蟹', '高汤', '姜'],
  },
  {
    id: 'zhejiang',
    name: '浙菜',
    fullName: '浙江菜系',
    emoji: '🦀',
    color: '#00BCD4',
    lightColor: '#E0F7FA',
    description: '鲜嫩软滑，清淡优雅',
    longDesc: '浙菜取材以海鲜河鲜为主，注重鲜嫩软滑，口味清鲜，讲究清而不淡、鲜而不腥、嫩而不生。',
    tags: ['鲜嫩', '清淡', '海鲜'],
    representativeDishes: [
      { name: '西湖醋鱼', desc: '鱼肉鲜嫩，酸甜适口', cookTime: 30, difficulty: 'medium', ingredients: ['草鱼', '醋', '白糖', '生姜'] },
      { name: '东坡肉', desc: '肥而不腻，入口即化', cookTime: 120, difficulty: 'medium', ingredients: ['五花肉', '黄酒', '生抽', '冰糖'] },
      { name: '龙井虾仁', desc: '虾仁清鲜，茶香四溢', cookTime: 20, difficulty: 'medium', ingredients: ['虾仁', '龙井茶', '蛋白', '淀粉'] },
      { name: '干炸响铃', desc: '外酥内嫩，豆皮飘香', cookTime: 25, difficulty: 'medium', ingredients: ['豆腐皮', '猪肉', '淀粉', '食用油'] },
      { name: '宋嫂鱼羹', desc: '汤鲜味美，鱼肉细嫩', cookTime: 35, difficulty: 'medium', ingredients: ['鳜鱼', '鸡汤', '姜丝', '醋'] },
      { name: '荷叶粉蒸肉', desc: '荷香肉嫩，糯米软糯', cookTime: 90, difficulty: 'medium', ingredients: ['五花肉', '荷叶', '糯米粉', '甜面酱'] },
    ],
    quickIngredients: ['草鱼', '虾仁', '五花肉', '豆腐皮', '荷叶', '醋', '黄酒', '冰糖'],
  },
  {
    id: 'hunan',
    name: '湘菜',
    fullName: '湖南菜系',
    emoji: '🥩',
    color: '#FF5722',
    lightColor: '#FBE9E7',
    description: '辣而不燥，香辣浓郁',
    longDesc: '湘菜以辣著称，但不同于川菜的麻辣，湘菜偏重香辣，多用熏腊食材，香味浓郁，下饭极佳。',
    tags: ['香辣', '熏腊', '浓郁'],
    representativeDishes: [
      { name: '剁椒鱼头', desc: '鱼头鲜嫩，剁椒香辣', cookTime: 30, difficulty: 'easy', ingredients: ['鱼头', '剁椒', '姜', '蒜'] },
      { name: '小炒黄牛肉', desc: '牛肉嫩滑，香辣下饭', cookTime: 20, difficulty: 'easy', ingredients: ['牛肉', '小米椒', '大蒜', '香芹'] },
      { name: '毛氏红烧肉', desc: '色泽红亮，肥而不腻', cookTime: 90, difficulty: 'medium', ingredients: ['五花肉', '冰糖', '豆豉', '辣椒'] },
      { name: '东安鸡', desc: '酸辣鲜嫩，风味独特', cookTime: 35, difficulty: 'medium', ingredients: ['嫩鸡', '辣椒', '醋', '花椒'] },
      { name: '湘西腊肉', desc: '腊香浓郁，咸鲜适口', cookTime: 30, difficulty: 'easy', ingredients: ['腊肉', '蒜苗', '辣椒', '豆豉'] },
      { name: '农家小炒肉', desc: '简单家常，香辣入味', cookTime: 15, difficulty: 'easy', ingredients: ['猪肉', '青椒', '豆豉', '蒜'] },
    ],
    quickIngredients: ['猪肉', '牛肉', '剁椒', '小米椒', '腊肉', '蒜', '姜', '香芹'],
  },
  {
    id: 'fujian',
    name: '闽菜',
    fullName: '福建菜系',
    emoji: '🍲',
    color: '#9C27B0',
    lightColor: '#F3E5F5',
    description: '汤汁浓郁，海鲜鲜美',
    longDesc: '闽菜以海鲜为主料，善于制汤，讲究汤的清澈与鲜甜，工艺精细，口味偏淡，略带甜酸。',
    tags: ['海鲜', '汤鲜', '甜酸'],
    representativeDishes: [
      { name: '佛跳墙', desc: '食材丰富，汤汁醇厚', cookTime: 240, difficulty: 'hard', ingredients: ['鱼翅', '海参', '鲍鱼', '猪蹄'] },
      { name: '荔枝肉', desc: '外酥内嫩，荔枝香甜', cookTime: 25, difficulty: 'medium', ingredients: ['猪里脊', '荸荠', '番茄酱', '白醋'] },
      { name: '沙茶面', desc: '汤鲜料足，沙茶香浓', cookTime: 30, difficulty: 'easy', ingredients: ['面条', '沙茶酱', '虾', '猪血'] },
      { name: '醉排骨', desc: '酥香入骨，微甜可口', cookTime: 45, difficulty: 'medium', ingredients: ['排骨', '红糟', '白糖', '生抽'] },
      { name: '炒鸡丁', desc: '鲜嫩多汁，清甜爽口', cookTime: 20, difficulty: 'easy', ingredients: ['鸡肉', '荸荠', '冬笋', '蛋白'] },
      { name: '扁肉', desc: '皮薄馅鲜，汤清味美', cookTime: 30, difficulty: 'medium', ingredients: ['猪肉', '馄饨皮', '地瓜粉', '高汤'] },
    ],
    quickIngredients: ['海参', '鲍鱼', '虾', '猪里脊', '荸荠', '沙茶酱', '高汤', '冬笋'],
  },
  {
    id: 'anhui',
    name: '徽菜',
    fullName: '安徽菜系',
    emoji: '🍖',
    color: '#795548',
    lightColor: '#EFEBE9',
    description: '重油重色，原汁原味',
    longDesc: '徽菜善用山珍野味，重油重色，讲究原汁原味，以烧、炖为主要技法，代表着徽州山区饮食文化。',
    tags: ['浓郁', '重色', '炖烧'],
    representativeDishes: [
      { name: '臭鳜鱼', desc: '臭中有香，鱼肉鲜嫩', cookTime: 40, difficulty: 'medium', ingredients: ['鳜鱼', '盐', '辣椒', '生姜'] },
      { name: '红烧划水', desc: '鱼尾鲜嫩，红烧入味', cookTime: 30, difficulty: 'easy', ingredients: ['草鱼尾', '生抽', '冰糖', '葱'] },
      { name: '火腿炖甲鱼', desc: '滋补养身，汤鲜肉嫩', cookTime: 90, difficulty: 'medium', ingredients: ['甲鱼', '金华火腿', '姜', '黄酒'] },
      { name: '毛豆腐', desc: '外皮微毛，香嫩可口', cookTime: 20, difficulty: 'easy', ingredients: ['毛豆腐', '辣椒酱', '猪油', '盐'] },
      { name: '腌鲜鳜鱼', desc: '风味独特，鲜香美味', cookTime: 50, difficulty: 'medium', ingredients: ['鳜鱼', '盐', '花椒', '生姜'] },
      { name: '蟹黄豆腐', desc: '豆腐嫩滑，蟹味鲜美', cookTime: 25, difficulty: 'easy', ingredients: ['嫩豆腐', '蟹黄', '高汤', '葱'] },
    ],
    quickIngredients: ['鳜鱼', '甲鱼', '豆腐', '火腿', '山药', '笋干', '黄酒', '盐'],
  },
  {
    id: 'shandong',
    name: '鲁菜',
    fullName: '山东菜系',
    emoji: '🐟',
    color: '#607D8B',
    lightColor: '#ECEFF1',
    description: '咸鲜纯正，清香宜人',
    longDesc: '鲁菜是中国最古老的菜系之一，用料广泛，以海鲜和山珍为主，注重原料鲜活，口味咸鲜纯正。',
    tags: ['咸鲜', '纯正', '大气'],
    representativeDishes: [
      { name: '糖醋黄河鲤鱼', desc: '外酥内嫩，酸甜可口', cookTime: 35, difficulty: 'medium', ingredients: ['黄河鲤鱼', '糖', '醋', '番茄酱'] },
      { name: '葱烧海参', desc: '葱香浓郁，海参软糯', cookTime: 45, difficulty: 'hard', ingredients: ['海参', '大葱', '生抽', '高汤'] },
      { name: '油焖大虾', desc: '虾肉鲜嫩，浓油赤酱', cookTime: 25, difficulty: 'easy', ingredients: ['大虾', '番茄酱', '料酒', '葱姜'] },
      { name: '九转大肠', desc: '色泽红亮，酸甜微辣', cookTime: 60, difficulty: 'hard', ingredients: ['猪大肠', '醋', '糖', '砂仁'] },
      { name: '把子肉', desc: '肥而不腻，香糯入味', cookTime: 90, difficulty: 'medium', ingredients: ['五花肉', '生抽', '冰糖', '八角'] },
      { name: '爆炒腰花', desc: '脆嫩爽口，鲜香浓郁', cookTime: 15, difficulty: 'medium', ingredients: ['猪腰', '木耳', '黄瓜', '葱'] },
    ],
    quickIngredients: ['海参', '大虾', '鲤鱼', '猪肉', '大葱', '黄豆芽', '醋', '糖'],
  },
  {
    id: 'northeastern',
    name: '东北菜',
    fullName: '东北菜系',
    emoji: '🥘',
    color: '#FF8F00',
    lightColor: '#FFF8E1',
    description: '量大味重，咸香浓郁',
    longDesc: '东北菜以量大、味重、咸香著称，多炖菜，豪爽粗犷，食材多为猪肉、土豆、白菜等，是北方饮食的代表。',
    tags: ['咸香', '量大', '炖菜'],
    representativeDishes: [
      { name: '猪肉炖粉条', desc: '粉条软糯，肉香浓郁', cookTime: 60, difficulty: 'easy', ingredients: ['猪五花', '粉条', '白菜', '姜'] },
      { name: '小鸡炖蘑菇', desc: '鸡肉鲜嫩，菌香浓郁', cookTime: 60, difficulty: 'easy', ingredients: ['土鸡', '野蘑菇', '粉条', '葱姜'] },
      { name: '锅包肉', desc: '外酥内嫩，酸甜可口', cookTime: 30, difficulty: 'medium', ingredients: ['猪里脊', '淀粉', '醋', '白糖'] },
      { name: '地三鲜', desc: '家常味美，营养丰富', cookTime: 20, difficulty: 'easy', ingredients: ['土豆', '茄子', '青椒', '蒜'] },
      { name: '东北乱炖', desc: '食材丰富，汤汁鲜美', cookTime: 50, difficulty: 'easy', ingredients: ['猪肉', '土豆', '豆角', '茄子'] },
      { name: '杀猪菜', desc: '咸香浓郁，冬日暖胃', cookTime: 70, difficulty: 'medium', ingredients: ['五花肉', '酸菜', '血肠', '大骨'] },
    ],
    quickIngredients: ['猪肉', '土豆', '白菜', '粉条', '蘑菇', '茄子', '豆角', '大葱'],
  },
  {
    id: 'yunnan',
    name: '云南菜',
    fullName: '云南菜系',
    emoji: '🌿',
    color: '#4CAF50',
    lightColor: '#E8F5E9',
    description: '天然野味，酸辣鲜香',
    longDesc: '云南菜取材多样，富有民族特色，善用天然野生食材，口味酸辣，具有浓郁的少数民族饮食风情。',
    tags: ['野味', '酸辣', '特色'],
    representativeDishes: [
      { name: '过桥米线', desc: '汤鲜料足，米线滑嫩', cookTime: 30, difficulty: 'easy', ingredients: ['米线', '鸡汤', '猪肉片', '鹌鹑蛋'] },
      { name: '汽锅鸡', desc: '鸡肉鲜嫩，汤汁清甜', cookTime: 90, difficulty: 'easy', ingredients: ['土鸡', '姜', '盐', '三七'] },
      { name: '云南腌肉', desc: '腌制入味，风味独特', cookTime: 20, difficulty: 'easy', ingredients: ['猪肉', '辣椒', '盐', '香料'] },
      { name: '炒野菜', desc: '清新爽口，天然营养', cookTime: 15, difficulty: 'easy', ingredients: ['野菜', '大蒜', '食用油', '盐'] },
      { name: '黑松露炖鸡', desc: '松露芬芳，鸡肉鲜美', cookTime: 60, difficulty: 'medium', ingredients: ['土鸡', '黑松露', '姜', '盐'] },
      { name: '酸汤鱼', desc: '汤酸鱼嫩，开胃解暑', cookTime: 35, difficulty: 'easy', ingredients: ['鱼', '酸汤', '西红柿', '辣椒'] },
    ],
    quickIngredients: ['土鸡', '米线', '野菜', '猪肉', '黑松露', '西红柿', '辣椒', '三七'],
  },
  {
    id: 'xinjiang',
    name: '新疆菜',
    fullName: '新疆菜系',
    emoji: '🐑',
    color: '#FF6F00',
    lightColor: '#FFF3E0',
    description: '牛羊肉香，风味浓郁',
    longDesc: '新疆菜以牛羊肉为主，搭配西域香料，口味浓郁，烤制工艺独特，展现了西北少数民族的饮食文化。',
    tags: ['牛羊肉', '香料', '烤制'],
    representativeDishes: [
      { name: '新疆大盘鸡', desc: '鸡肉入味，宽面软滑', cookTime: 50, difficulty: 'medium', ingredients: ['鸡肉', '土豆', '皮带面', '辣椒'] },
      { name: '烤全羊', desc: '皮酥肉嫩，香气四溢', cookTime: 180, difficulty: 'hard', ingredients: ['整羊', '孜然', '辣椒粉', '食盐'] },
      { name: '馕坑肉', desc: '肉质鲜嫩，馕香四溢', cookTime: 90, difficulty: 'hard', ingredients: ['羊肉', '洋葱', '孜然', '馕坑'] },
      { name: '手抓饭', desc: '米饭金黄，羊肉飘香', cookTime: 60, difficulty: 'medium', ingredients: ['大米', '羊肉', '胡萝卜', '洋葱'] },
      { name: '羊肉串', desc: '外焦内嫩，孜然飘香', cookTime: 20, difficulty: 'easy', ingredients: ['羊肉', '孜然', '辣椒粉', '食盐'] },
      { name: '拌面', desc: '面条劲道，酱香浓郁', cookTime: 30, difficulty: 'easy', ingredients: ['面条', '羊肉', '洋葱', '西红柿'] },
    ],
    quickIngredients: ['羊肉', '牛肉', '洋葱', '孜然', '辣椒粉', '土豆', '胡萝卜', '大米'],
  },
  {
    id: 'beijing',
    name: '京菜',
    fullName: '北京菜系',
    emoji: '🦆',
    color: '#C62828',
    lightColor: '#FFEBEE',
    description: '宫廷风味，大气端庄',
    longDesc: '京菜融合了满汉饮食文化，以宫廷菜为代表，讲究形色味俱全，咸鲜适口，是中国北方菜的集大成者。',
    tags: ['宫廷', '咸鲜', '大气'],
    representativeDishes: [
      { name: '北京烤鸭', desc: '皮脆肉嫩，色泽红亮', cookTime: 120, difficulty: 'hard', ingredients: ['北京鸭', '甜面酱', '葱丝', '薄饼'] },
      { name: '涮羊肉', desc: '肉质鲜嫩，蘸酱香浓', cookTime: 30, difficulty: 'easy', ingredients: ['羊肉片', '白菜', '豆腐', '麻酱'] },
      { name: '炸酱面', desc: '面条劲道，炸酱醇厚', cookTime: 30, difficulty: 'easy', ingredients: ['手擀面', '猪肉丁', '黄豆酱', '黄瓜'] },
      { name: '爆肚', desc: '脆嫩爽口，蘸酱香鲜', cookTime: 20, difficulty: 'medium', ingredients: ['牛肚', '麻酱', '香菜', '辣椒油'] },
      { name: '老北京卤煮', desc: '卤汤浓郁，食材丰富', cookTime: 90, difficulty: 'medium', ingredients: ['猪肺', '猪肠', '豆腐', '火烧'] },
      { name: '芥末墩', desc: '爽辣清脆，开胃下饭', cookTime: 20, difficulty: 'easy', ingredients: ['白菜', '芥末', '醋', '白糖'] },
    ],
    quickIngredients: ['鸭肉', '羊肉片', '猪肉丁', '黄豆酱', '白菜', '豆腐', '麻酱', '手擀面'],
  },
];

// ==================== 工具函数 ====================

/**
 * 根据 ID 获取菜系信息
 * @param {string} cuisineId - 菜系 ID
 * @returns {Object|null} 菜系信息
 */
const getCuisineById = (cuisineId) => {
  return CUISINES.find(c => c.id === cuisineId) || null;
};

/**
 * 获取所有菜系列表（精简版，用于导航展示）
 * @returns {Array} 菜系列表
 */
const getCuisineList = () => {
  return CUISINES.map(c => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    color: c.color,
    lightColor: c.lightColor,
    description: c.description,
    tags: c.tags,
    dishCount: c.representativeDishes.length,
  }));
};

/**
 * 根据食材关键词查找相关菜系
 * @param {string[]} ingredients - 食材列表
 * @returns {Array} 相关菜系列表（按匹配度排序）
 */
const findRelatedCuisines = (ingredients) => {
  if (!ingredients || ingredients.length === 0) return CUISINES.slice(0, 4);

  const scored = CUISINES.map(cuisine => {
    let score = 0;
    ingredients.forEach(ing => {
      if (cuisine.quickIngredients.some(qi => qi.includes(ing) || ing.includes(qi))) {
        score += 2;
      }
      if (cuisine.representativeDishes.some(dish =>
        dish.ingredients.some(di => di.includes(ing) || ing.includes(di))
      )) {
        score += 1;
      }
    });
    return { ...cuisine, matchScore: score };
  });

  return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 4);
};

/**
 * 随机获取指定数量的菜系
 * @param {number} count - 数量
 * @returns {Array} 随机菜系列表
 */
const getRandomCuisines = (count = 4) => {
  const shuffled = [...CUISINES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

/**
 * 获取菜系的代表菜（支持按难度筛选）
 * @param {string} cuisineId - 菜系 ID
 * @param {string} difficulty - 难度筛选（可选）
 * @returns {Array} 代表菜列表
 */
const getCuisineDishes = (cuisineId, difficulty = null) => {
  const cuisine = getCuisineById(cuisineId);
  if (!cuisine) return [];

  if (!difficulty) return cuisine.representativeDishes;

  const diffMap = { easy: '简单', medium: '中等', hard: '困难' };
  return cuisine.representativeDishes.filter(d => d.difficulty === difficulty);
};

// ==================== 模块导出 ====================

module.exports = {
  CUISINES,
  getCuisineById,
  getCuisineList,
  findRelatedCuisines,
  getRandomCuisines,
  getCuisineDishes,
};
