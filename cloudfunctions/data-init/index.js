/**
 * 数据初始化云函数 - data-init
 * 版本：3.0.0
 * 功能：将菜系（每系30道代表菜）、减脂餐（30条）、孕妇营养餐（30条）批量写入微信云数据库
 * actions:
 *   status         — 查询各集合数据条数
 *   init_cuisines  — 初始化30条菜系数据（每系30道代表菜）
 *   init_fat_loss  — 初始化30条减脂餐数据
 *   init_pregnancy — 初始化30条孕妇营养餐数据
 *   init_all       — 全量初始化（cuisines + fat_loss + pregnancy）
 *   clear_all      — 清空所有集合（慎用）
 */

'use strict';

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// ==================== 集合名称 ====================
const COLLECTIONS = {
  CUISINES: 'cuisines',
  FAT_LOSS_MEALS: 'fat_loss_meals',
  PREGNANCY_MEALS: 'pregnancy_meals',
  RECIPES: 'recipes',
  CUISINE_LIKES: 'cuisine_likes',
};

// ==================== 菜系代表菜（每系30道）====================
const CUISINES_DATA = [
  {
    id: 'sichuan', name: '川菜', fullName: '四川菜系',
    emoji: '🌶️', color: '#E53935', lightColor: '#FFEBEE',
    description: '麻辣鲜香，层次丰富',
    longDesc: '川菜以麻辣著称，善用花椒、辣椒，讲究"一菜一格，百菜百味"。',
    tags: ['麻辣', '鲜香', '下饭'], sortOrder: 1,
    quickIngredients: ['豆腐', '猪肉末', '花椒', '豆瓣酱', '辣椒', '鸡肉', '牛肉', '花生'],
    representativeDishes: [
      { name: '麻婆豆腐', desc: '豆腐鲜嫩，麻辣鲜香', cookTime: 20, difficulty: 'easy', ingredients: ['豆腐', '猪肉末', '豆瓣酱', '花椒'] },
      { name: '宫保鸡丁', desc: '鸡肉鲜嫩，花生香脆', cookTime: 25, difficulty: 'easy', ingredients: ['鸡胸肉', '花生', '干辣椒', '葱'] },
      { name: '回锅肉', desc: '肥而不腻，香辣适口', cookTime: 40, difficulty: 'medium', ingredients: ['五花肉', '青椒', '豆瓣酱', '蒜苗'] },
      { name: '夫妻肺片', desc: '麻辣爽口，回味无穷', cookTime: 30, difficulty: 'medium', ingredients: ['牛肉', '牛杂', '花椒油', '辣椒油'] },
      { name: '水煮鱼', desc: '鱼肉滑嫩，麻辣鲜香', cookTime: 35, difficulty: 'medium', ingredients: ['草鱼', '豆芽', '豆瓣酱', '花椒'] },
      { name: '担担面', desc: '麻辣咸香，芝麻飘香', cookTime: 20, difficulty: 'easy', ingredients: ['面条', '猪肉末', '花椒粉', '芝麻酱'] },
      { name: '鱼香肉丝', desc: '酸甜微辣，鱼香浓郁', cookTime: 15, difficulty: 'easy', ingredients: ['猪里脊', '木耳', '胡萝卜', '郫县豆瓣'] },
      { name: '口水鸡', desc: '嫩滑爽口，红油飘香', cookTime: 40, difficulty: 'easy', ingredients: ['整鸡', '花椒油', '辣椒油', '芝麻酱'] },
      { name: '红油抄手', desc: '皮薄馅鲜，红油鲜香', cookTime: 25, difficulty: 'medium', ingredients: ['馄饨皮', '猪肉', '红油', '花椒粉'] },
      { name: '干煸四季豆', desc: '焦香酥脆，咸香下饭', cookTime: 15, difficulty: 'easy', ingredients: ['四季豆', '猪肉末', '干辣椒', '蒜'] },
      { name: '酸菜鱼', desc: '酸爽鲜辣，鱼肉嫩滑', cookTime: 30, difficulty: 'medium', ingredients: ['草鱼', '酸菜', '花椒', '辣椒'] },
      { name: '毛血旺', desc: '麻辣鲜烫，食材丰富', cookTime: 35, difficulty: 'medium', ingredients: ['毛肚', '鸭血', '豆皮', '花椒'] },
      { name: '水煮牛肉', desc: '牛肉嫩滑，麻辣浓香', cookTime: 30, difficulty: 'medium', ingredients: ['牛里脊', '豆芽', '花椒', '辣椒油'] },
      { name: '蚂蚁上树', desc: '粉条筋道，肉末鲜香', cookTime: 20, difficulty: 'easy', ingredients: ['粉条', '猪肉末', '豆瓣酱', '葱'] },
      { name: '辣子鸡', desc: '鸡丁酥香，辣椒翻炒', cookTime: 30, difficulty: 'medium', ingredients: ['鸡肉', '干辣椒', '花椒', '蒜'] },
      { name: '夹沙肉', desc: '甜糯软烂，咸甜交融', cookTime: 90, difficulty: 'hard', ingredients: ['五花肉', '豆沙', '白糖', '鸡蛋'] },
      { name: '棒棒鸡', desc: '麻辣鲜香，鸡肉嫩滑', cookTime: 40, difficulty: 'easy', ingredients: ['鸡腿', '芝麻酱', '辣椒油', '花椒油'] },
      { name: '川式红烧肉', desc: '色泽红亮，麻辣浓香', cookTime: 80, difficulty: 'medium', ingredients: ['五花肉', '豆瓣酱', '冰糖', '花椒'] },
      { name: '豆花鱼', desc: '豆花嫩滑，鱼肉鲜嫩', cookTime: 35, difficulty: 'medium', ingredients: ['草鱼', '内酯豆腐', '豆瓣酱', '花椒'] },
      { name: '烧白', desc: '肥而不腻，梅干菜香', cookTime: 90, difficulty: 'hard', ingredients: ['五花肉', '芽菜', '豆瓣酱', '冰糖'] },
      { name: '川北凉粉', desc: '滑嫩爽口，麻辣鲜香', cookTime: 15, difficulty: 'easy', ingredients: ['豌豆凉粉', '红油', '花椒粉', '蒜'] },
      { name: '泡椒凤爪', desc: '酸辣爽脆，开胃解馋', cookTime: 60, difficulty: 'medium', ingredients: ['鸡爪', '泡椒', '泡姜', '醋'] },
      { name: '锅巴肉片', desc: '外酥内嫩，酸甜可口', cookTime: 30, difficulty: 'medium', ingredients: ['猪里脊', '锅巴', '番茄酱', '醋'] },
      { name: '夫妻豆腐', desc: '豆腐嫩滑，麻辣鲜香', cookTime: 20, difficulty: 'easy', ingredients: ['豆腐', '辣椒油', '花椒油', '葱'] },
      { name: '川味香肠', desc: '麻辣鲜香，咸鲜适口', cookTime: 25, difficulty: 'easy', ingredients: ['猪肉', '花椒', '辣椒粉', '盐'] },
      { name: '干锅土豆片', desc: '焦香软糯，麻辣下饭', cookTime: 20, difficulty: 'easy', ingredients: ['土豆', '干辣椒', '花椒', '蒜'] },
      { name: '钟水饺', desc: '皮薄馅嫩，红油鲜香', cookTime: 30, difficulty: 'medium', ingredients: ['饺子皮', '猪肉', '红油', '花椒粉'] },
      { name: '豆瓣鱼', desc: '鱼肉鲜嫩，豆瓣浓香', cookTime: 25, difficulty: 'easy', ingredients: ['鲫鱼', '豆瓣酱', '姜', '葱'] },
      { name: '肥肠粉', desc: '粉条滑嫩，肥肠香醇', cookTime: 40, difficulty: 'medium', ingredients: ['红薯粉', '肥肠', '豆瓣酱', '花椒'] },
      { name: '糖醋里脊', desc: '外酥内嫩，酸甜可口', cookTime: 25, difficulty: 'medium', ingredients: ['猪里脊', '淀粉', '番茄酱', '白醋'] },
    ],
  },
  {
    id: 'cantonese', name: '粤菜', fullName: '广东菜系',
    emoji: '🍤', color: '#FF6B35', lightColor: '#FFF3E0',
    description: '清淡鲜美，原汁原味',
    longDesc: '粤菜讲究食材新鲜，烹调精细，口味清淡，追求保留食材的天然鲜味。',
    tags: ['清淡', '鲜美', '养生'], sortOrder: 2,
    quickIngredients: ['鲈鱼', '虾', '鸡肉', '猪骨', '姜', '葱', '生抽', '蚝油'],
    representativeDishes: [
      { name: '白切鸡', desc: '皮滑肉嫩，鲜味十足', cookTime: 40, difficulty: 'easy', ingredients: ['整鸡', '姜', '葱', '盐'] },
      { name: '清蒸鱼', desc: '鲜嫩清甜，原汁原味', cookTime: 20, difficulty: 'easy', ingredients: ['鲈鱼', '姜', '葱', '生抽'] },
      { name: '广式叉烧', desc: '色泽红亮，甜香可口', cookTime: 60, difficulty: 'medium', ingredients: ['猪梅花肉', '蜂蜜', '叉烧酱', '生抽'] },
      { name: '虾饺', desc: '皮薄馅鲜，晶莹剔透', cookTime: 45, difficulty: 'hard', ingredients: ['鲜虾', '澄面', '猪肉', '笋'] },
      { name: '老火靓汤', desc: '营养丰富，暖胃养生', cookTime: 120, difficulty: 'easy', ingredients: ['猪骨', '胡萝卜', '玉米', '姜'] },
      { name: '蚝烙', desc: '外酥内嫩，鲜美独特', cookTime: 20, difficulty: 'medium', ingredients: ['生蚝', '蛋', '淀粉', '葱'] },
      { name: '广式烧鹅', desc: '皮脆肉嫩，色泽金黄', cookTime: 90, difficulty: 'hard', ingredients: ['鹅', '五香粉', '生抽', '蜂蜜'] },
      { name: '蒸排骨', desc: '鲜嫩多汁，豉香浓郁', cookTime: 25, difficulty: 'easy', ingredients: ['猪排骨', '豆豉', '蒜', '生粉'] },
      { name: '鱼蓉粥', desc: '绵滑香浓，鱼肉鲜嫩', cookTime: 40, difficulty: 'easy', ingredients: ['大米', '草鱼', '姜丝', '葱'] },
      { name: '炒河粉', desc: '镬气十足，鲜香滑嫩', cookTime: 15, difficulty: 'medium', ingredients: ['河粉', '牛肉', '豆芽', '生抽'] },
      { name: '凤爪', desc: '软糯入味，豉香扑鼻', cookTime: 60, difficulty: 'medium', ingredients: ['鸡爪', '豆豉', '蒜', '辣椒'] },
      { name: '萝卜糕', desc: '软糯咸香，煎制金黄', cookTime: 60, difficulty: 'medium', ingredients: ['白萝卜', '粘米粉', '腊肠', '虾米'] },
      { name: '炖猪手', desc: '胶质丰富，软烂入味', cookTime: 90, difficulty: 'medium', ingredients: ['猪手', '花生', '冰糖', '生抽'] },
      { name: '姜葱炒蟹', desc: '蟹肉鲜美，姜葱提香', cookTime: 20, difficulty: 'medium', ingredients: ['花蟹', '姜', '葱', '料酒'] },
      { name: '盐焗鸡', desc: '皮金肉嫩，盐香浓郁', cookTime: 60, difficulty: 'medium', ingredients: ['整鸡', '粗盐', '沙姜', '香油'] },
      { name: '白灼虾', desc: '原汁原味，虾肉鲜甜', cookTime: 10, difficulty: 'easy', ingredients: ['鲜虾', '姜', '葱', '蘸酱'] },
      { name: '肠粉', desc: '皮薄馅鲜，晶莹剔透', cookTime: 15, difficulty: 'medium', ingredients: ['粘米粉', '虾', '蛋', '生菜'] },
      { name: '云吞面', desc: '面条弹牙，云吞鲜嫩', cookTime: 20, difficulty: 'medium', ingredients: ['云吞皮', '鲜虾', '猪肉', '鸡蛋面'] },
      { name: '蒸水蛋', desc: '嫩滑如布丁，鲜香可口', cookTime: 15, difficulty: 'easy', ingredients: ['鸡蛋', '温水', '生抽', '葱'] },
      { name: '咕噜肉', desc: '外酥内嫩，酸甜可口', cookTime: 25, difficulty: 'medium', ingredients: ['猪里脊', '菠萝', '青椒', '番茄酱'] },
      { name: '广式腊肠炒饭', desc: '米香腊味，颗粒分明', cookTime: 15, difficulty: 'easy', ingredients: ['米饭', '腊肠', '鸡蛋', '葱'] },
      { name: '豉汁蒸排骨', desc: '豉香浓郁，排骨嫩滑', cookTime: 25, difficulty: 'easy', ingredients: ['排骨', '豆豉', '蒜', '红椒'] },
      { name: '蜜汁叉烧包', desc: '皮软馅甜，蜜香扑鼻', cookTime: 45, difficulty: 'hard', ingredients: ['面粉', '叉烧', '蜂蜜', '糖'] },
      { name: '干炒牛河', desc: '镬气浓香，牛肉嫩滑', cookTime: 15, difficulty: 'hard', ingredients: ['河粉', '牛肉', '豆芽', '韭黄'] },
      { name: '清蒸扇贝', desc: '贝肉鲜嫩，蒜香四溢', cookTime: 12, difficulty: 'easy', ingredients: ['扇贝', '蒜末', '粉丝', '生抽'] },
      { name: '冬菇蒸鸡', desc: '菌香浓郁，鸡肉鲜嫩', cookTime: 30, difficulty: 'easy', ingredients: ['鸡肉', '冬菇', '姜', '生抽'] },
      { name: '广式月饼', desc: '皮薄馅厚，莲香浓郁', cookTime: 60, difficulty: 'hard', ingredients: ['低筋面粉', '莲蓉', '咸蛋黄', '转化糖浆'] },
      { name: '鱼腐', desc: '外酥内软，鱼香四溢', cookTime: 30, difficulty: 'medium', ingredients: ['鱼肉', '豆腐', '蛋', '淀粉'] },
      { name: '九层塔炒蛤蜊', desc: '鲜嫩多汁，九层塔香', cookTime: 10, difficulty: 'easy', ingredients: ['蛤蜊', '九层塔', '蒜', '辣椒'] },
      { name: '冬瓜薏米水', desc: '清热利湿，消暑清爽', cookTime: 40, difficulty: 'easy', ingredients: ['冬瓜', '薏米', '陈皮', '冰糖'] },
    ],
  },
  {
    id: 'jiangsu', name: '苏菜', fullName: '江苏菜系',
    emoji: '🦞', color: '#2196F3', lightColor: '#E3F2FD',
    description: '精致细腻，咸甜适中',
    longDesc: '苏菜以精细的刀工和严格的火候著称，口味咸中带甜，注重汤汁浓郁。',
    tags: ['精致', '咸甜', '清淡'], sortOrder: 3,
    quickIngredients: ['猪肉', '鱼', '鸭肉', '豆腐', '荸荠', '蟹', '高汤', '姜'],
    representativeDishes: [
      { name: '狮子头', desc: '肉质鲜嫩，汤汁醇厚', cookTime: 60, difficulty: 'medium', ingredients: ['猪肉', '荸荠', '鸡蛋', '生姜'] },
      { name: '松鼠桂鱼', desc: '造型精美，酸甜可口', cookTime: 45, difficulty: 'hard', ingredients: ['桂鱼', '番茄酱', '醋', '白糖'] },
      { name: '盐水鸭', desc: '皮白肉嫩，咸香鲜美', cookTime: 60, difficulty: 'medium', ingredients: ['鸭肉', '盐', '花椒', '八角'] },
      { name: '文思豆腐', desc: '刀工精细，汤鲜豆嫩', cookTime: 30, difficulty: 'hard', ingredients: ['嫩豆腐', '鸡汤', '火腿', '香菇'] },
      { name: '清炖蟹粉狮子头', desc: '鲜美无比，入口即化', cookTime: 90, difficulty: 'hard', ingredients: ['猪肉', '蟹粉', '荸荠', '高汤'] },
      { name: '叫花鸡', desc: '皮酥肉嫩，荷香扑鼻', cookTime: 180, difficulty: 'hard', ingredients: ['整鸡', '荷叶', '五香粉', '黄泥'] },
      { name: '软兜长鱼', desc: '鳝鱼嫩滑，酱香浓郁', cookTime: 20, difficulty: 'medium', ingredients: ['鳝鱼', '生抽', '老抽', '蒜'] },
      { name: '扬州炒饭', desc: '粒粒分明，鲜香可口', cookTime: 15, difficulty: 'easy', ingredients: ['米饭', '鸡蛋', '虾仁', '葱'] },
      { name: '大煮干丝', desc: '干丝细嫩，汤汁鲜美', cookTime: 30, difficulty: 'medium', ingredients: ['豆腐干', '鸡汤', '火腿', '笋'] },
      { name: '水晶肴蹄', desc: '皮冻透明，筋道爽口', cookTime: 120, difficulty: 'hard', ingredients: ['猪蹄', '盐', '花椒', '八角'] },
      { name: '拆烩鲢鱼头', desc: '鱼头鲜嫩，汤汁浓白', cookTime: 50, difficulty: 'medium', ingredients: ['鲢鱼头', '豆腐', '笋', '香菇'] },
      { name: '三套鸭', desc: '滋味复合，层层鲜美', cookTime: 150, difficulty: 'hard', ingredients: ['家鸭', '野鸭', '乳鸽', '高汤'] },
      { name: '金陵烤鸭', desc: '皮脆肉嫩，酱香浓郁', cookTime: 90, difficulty: 'hard', ingredients: ['整鸭', '蜂蜜', '生抽', '五香粉'] },
      { name: '南京板鸭', desc: '腊香浓郁，咸鲜适口', cookTime: 30, difficulty: 'easy', ingredients: ['鸭肉', '盐', '花椒', '八角'] },
      { name: '镇江肴肉', desc: '皮冻晶莹，咸香鲜嫩', cookTime: 120, difficulty: 'hard', ingredients: ['猪肉', '猪皮', '盐', '花椒'] },
      { name: '红烧蹄髈', desc: '皮糯肉烂，色泽红亮', cookTime: 120, difficulty: 'medium', ingredients: ['猪肘子', '冰糖', '生抽', '八角'] },
      { name: '苏式汤包', desc: '皮薄汤多，蟹味鲜美', cookTime: 60, difficulty: 'hard', ingredients: ['面粉', '蟹粉', '猪肉', '猪皮冻'] },
      { name: '无锡酱排骨', desc: '甜咸浓郁，骨肉酥烂', cookTime: 90, difficulty: 'medium', ingredients: ['猪排骨', '冰糖', '生抽', '八角'] },
      { name: '太湖白虾', desc: '虾肉鲜嫩，清甜爽口', cookTime: 10, difficulty: 'easy', ingredients: ['太湖虾', '盐', '姜', '葱'] },
      { name: '蟹粉小笼', desc: '皮薄汤多，蟹味鲜美', cookTime: 60, difficulty: 'hard', ingredients: ['面粉', '蟹粉', '猪肉', '猪皮冻'] },
      { name: '樱桃肉', desc: '颜色红亮，甜糯软烂', cookTime: 90, difficulty: 'medium', ingredients: ['五花肉', '冰糖', '生抽', '绍兴酒'] },
      { name: '炝虎尾', desc: '鳝鱼爽脆，咸鲜开胃', cookTime: 20, difficulty: 'medium', ingredients: ['鳝鱼尾', '醋', '蒜', '葱'] },
      { name: '苏式月饼', desc: '酥皮层叠，馅料香甜', cookTime: 50, difficulty: 'hard', ingredients: ['面粉', '猪油', '豆沙', '白糖'] },
      { name: '蜜汁火方', desc: '金黄油亮，甜咸适口', cookTime: 120, difficulty: 'hard', ingredients: ['金华火腿', '冰糖', '蜂蜜', '高汤'] },
      { name: '太仓肉松', desc: '松软鲜香，回味悠长', cookTime: 90, difficulty: 'medium', ingredients: ['猪后腿肉', '生抽', '白糖', '料酒'] },
      { name: '清炒虾仁', desc: '虾仁鲜嫩，清淡爽口', cookTime: 10, difficulty: 'easy', ingredients: ['虾仁', '蛋白', '盐', '料酒'] },
      { name: '鸡汤煮干丝', desc: '干丝细软，汤鲜味美', cookTime: 25, difficulty: 'easy', ingredients: ['豆腐干', '鸡汤', '姜', '盐'] },
      { name: '响油鳝糊', desc: '鳝鱼鲜嫩，酱香浓郁', cookTime: 20, difficulty: 'medium', ingredients: ['鳝鱼', '蒜', '生抽', '老抽'] },
      { name: '东台鱼汤面', desc: '汤白如乳，面条爽滑', cookTime: 40, difficulty: 'medium', ingredients: ['面条', '鲫鱼', '猪骨', '姜'] },
      { name: '朱自清的豆腐', desc: '豆腐嫩滑，咸鲜适中', cookTime: 15, difficulty: 'easy', ingredients: ['嫩豆腐', '虾皮', '葱', '生抽'] },
    ],
  },
  {
    id: 'zhejiang', name: '浙菜', fullName: '浙江菜系',
    emoji: '🦀', color: '#00BCD4', lightColor: '#E0F7FA',
    description: '鲜嫩软滑，清淡优雅',
    longDesc: '浙菜取材以海鲜河鲜为主，注重鲜嫩软滑，口味清鲜。',
    tags: ['鲜嫩', '清淡', '海鲜'], sortOrder: 4,
    quickIngredients: ['草鱼', '虾仁', '五花肉', '豆腐皮', '荷叶', '醋', '黄酒', '冰糖'],
    representativeDishes: [
      { name: '西湖醋鱼', desc: '鱼肉鲜嫩，酸甜适口', cookTime: 30, difficulty: 'medium', ingredients: ['草鱼', '醋', '白糖', '生姜'] },
      { name: '东坡肉', desc: '肥而不腻，入口即化', cookTime: 120, difficulty: 'medium', ingredients: ['五花肉', '黄酒', '生抽', '冰糖'] },
      { name: '龙井虾仁', desc: '虾仁清鲜，茶香四溢', cookTime: 20, difficulty: 'medium', ingredients: ['虾仁', '龙井茶', '蛋白', '淀粉'] },
      { name: '干炸响铃', desc: '外酥内嫩，豆皮飘香', cookTime: 25, difficulty: 'medium', ingredients: ['豆腐皮', '猪肉', '淀粉', '食用油'] },
      { name: '宋嫂鱼羹', desc: '汤鲜味美，鱼肉细嫩', cookTime: 35, difficulty: 'medium', ingredients: ['鳜鱼', '鸡汤', '姜丝', '醋'] },
      { name: '荷叶粉蒸肉', desc: '荷香肉嫩，糯米软糯', cookTime: 90, difficulty: 'medium', ingredients: ['五花肉', '荷叶', '糯米粉', '甜面酱'] },
      { name: '腌笃鲜', desc: '汤鲜味美，鲜咸交融', cookTime: 90, difficulty: 'medium', ingredients: ['鲜猪肉', '腊猪肉', '春笋', '百叶结'] },
      { name: '蜜汁火腿', desc: '金黄油亮，甜咸适口', cookTime: 60, difficulty: 'medium', ingredients: ['金华火腿', '蜂蜜', '冰糖', '高汤'] },
      { name: '绍兴醉鸡', desc: '酒香四溢，鸡肉嫩滑', cookTime: 60, difficulty: 'medium', ingredients: ['整鸡', '绍兴酒', '盐', '姜'] },
      { name: '笋干老鸭煲', desc: '汤鲜味美，鸭肉软烂', cookTime: 120, difficulty: 'easy', ingredients: ['老鸭', '笋干', '姜', '盐'] },
      { name: '清汤鱼圆', desc: '鱼圆弹牙，汤清味美', cookTime: 30, difficulty: 'hard', ingredients: ['草鱼', '蛋白', '淀粉', '高汤'] },
      { name: '扣三丝', desc: '刀工精细，鲜香软嫩', cookTime: 40, difficulty: 'hard', ingredients: ['火腿', '鸡胸', '冬笋', '高汤'] },
      { name: '杭州小笼', desc: '皮薄馅多，汤汁鲜美', cookTime: 45, difficulty: 'hard', ingredients: ['面粉', '猪肉', '皮冻', '姜'] },
      { name: '炸响铃', desc: '外酥内嫩，豆皮飘香', cookTime: 20, difficulty: 'medium', ingredients: ['豆腐皮', '猪肉末', '食用油', '盐'] },
      { name: '虾爆鳝背', desc: '鳝鱼嫩滑，虾仁鲜嫩', cookTime: 20, difficulty: 'medium', ingredients: ['鳝鱼', '虾仁', '蒜', '生抽'] },
      { name: '杭州烤鸭', desc: '皮脆肉嫩，果木香气', cookTime: 90, difficulty: 'hard', ingredients: ['整鸭', '蜂蜜', '生抽', '五香粉'] },
      { name: '炒鳝糊', desc: '鳝鱼嫩滑，蒜香浓郁', cookTime: 15, difficulty: 'medium', ingredients: ['鳝鱼', '蒜', '生抽', '胡椒'] },
      { name: '片儿川', desc: '面条爽滑，配料丰富', cookTime: 20, difficulty: 'easy', ingredients: ['面条', '倒笃菜', '猪肉', '笋'] },
      { name: '奉化芋艿头', desc: '芋头软糯，咸香入味', cookTime: 30, difficulty: 'easy', ingredients: ['芋头', '猪肉', '盐', '葱'] },
      { name: '嵊州炒年糕', desc: '年糕软糯，配料鲜香', cookTime: 15, difficulty: 'easy', ingredients: ['年糕', '猪肉', '雪菜', '笋'] },
      { name: '温州鱼饼', desc: '鱼香浓郁，外酥内嫩', cookTime: 25, difficulty: 'medium', ingredients: ['鱼肉', '淀粉', '蛋', '盐'] },
      { name: '青田田鱼', desc: '鱼肉鲜嫩，稻香四溢', cookTime: 20, difficulty: 'easy', ingredients: ['田鱼', '姜', '葱', '生抽'] },
      { name: '舟山黄鱼鲞', desc: '咸鲜浓郁，鱼肉紧实', cookTime: 20, difficulty: 'easy', ingredients: ['黄鱼鲞', '姜', '葱', '食用油'] },
      { name: '萧山萝卜干', desc: '咸香爽脆，下饭佳品', cookTime: 10, difficulty: 'easy', ingredients: ['萝卜干', '辣椒', '蒜', '食用油'] },
      { name: '桂花糯米藕', desc: '藕香糯甜，桂花飘香', cookTime: 60, difficulty: 'medium', ingredients: ['莲藕', '糯米', '桂花', '冰糖'] },
      { name: '苔菜小方烤', desc: '外酥内软，苔香独特', cookTime: 30, difficulty: 'medium', ingredients: ['面包', '苔菜', '猪油', '盐'] },
      { name: '油焖笋', desc: '笋肉鲜嫩，咸甜适口', cookTime: 20, difficulty: 'easy', ingredients: ['春笋', '生抽', '白糖', '食用油'] },
      { name: '梅干菜烧肉', desc: '梅干菜香，猪肉软烂', cookTime: 90, difficulty: 'medium', ingredients: ['五花肉', '梅干菜', '生抽', '冰糖'] },
      { name: '宁波汤圆', desc: '皮薄馅多，甜糯可口', cookTime: 20, difficulty: 'medium', ingredients: ['糯米粉', '黑芝麻', '猪油', '白糖'] },
      { name: '醉蟹', desc: '蟹肉鲜嫩，酒香四溢', cookTime: 10, difficulty: 'easy', ingredients: ['河蟹', '绍兴酒', '盐', '姜'] },
    ],
  },
  {
    id: 'hunan', name: '湘菜', fullName: '湖南菜系',
    emoji: '🥩', color: '#FF5722', lightColor: '#FBE9E7',
    description: '辣而不燥，香辣浓郁',
    longDesc: '湘菜以辣著称，偏重香辣，多用熏腊食材，香味浓郁，下饭极佳。',
    tags: ['香辣', '熏腊', '浓郁'], sortOrder: 5,
    quickIngredients: ['猪肉', '牛肉', '剁椒', '小米椒', '腊肉', '蒜', '姜', '香芹'],
    representativeDishes: [
      { name: '剁椒鱼头', desc: '鱼头鲜嫩，剁椒香辣', cookTime: 30, difficulty: 'easy', ingredients: ['鱼头', '剁椒', '姜', '蒜'] },
      { name: '小炒黄牛肉', desc: '牛肉嫩滑，香辣下饭', cookTime: 20, difficulty: 'easy', ingredients: ['牛肉', '小米椒', '大蒜', '香芹'] },
      { name: '毛氏红烧肉', desc: '色泽红亮，肥而不腻', cookTime: 90, difficulty: 'medium', ingredients: ['五花肉', '冰糖', '豆豉', '辣椒'] },
      { name: '东安鸡', desc: '酸辣鲜嫩，风味独特', cookTime: 35, difficulty: 'medium', ingredients: ['嫩鸡', '辣椒', '醋', '花椒'] },
      { name: '湘西腊肉', desc: '腊香浓郁，咸鲜适口', cookTime: 30, difficulty: 'easy', ingredients: ['腊肉', '蒜苗', '辣椒', '豆豉'] },
      { name: '农家小炒肉', desc: '简单家常，香辣入味', cookTime: 15, difficulty: 'easy', ingredients: ['猪肉', '青椒', '豆豉', '蒜'] },
      { name: '麻辣子鸡', desc: '鸡肉嫩滑，麻辣鲜香', cookTime: 25, difficulty: 'medium', ingredients: ['鸡肉', '干辣椒', '花椒', '蒜'] },
      { name: '酱板鸭', desc: '皮脆肉嫩，酱香浓郁', cookTime: 60, difficulty: 'medium', ingredients: ['整鸭', '酱油', '八角', '辣椒'] },
      { name: '口味虾', desc: '虾肉嫩滑，麻辣鲜香', cookTime: 25, difficulty: 'easy', ingredients: ['小龙虾', '剁椒', '蒜', '姜'] },
      { name: '韭菜炒腊肉', desc: '腊香浓郁，韭菜清香', cookTime: 10, difficulty: 'easy', ingredients: ['腊肉', '韭菜', '辣椒', '蒜'] },
      { name: '酸辣土豆丝', desc: '土豆爽脆，酸辣开胃', cookTime: 10, difficulty: 'easy', ingredients: ['土豆', '醋', '小米椒', '蒜'] },
      { name: '湖南炒肚', desc: '猪肚爽脆，辣椒鲜香', cookTime: 20, difficulty: 'medium', ingredients: ['猪肚', '青椒', '小米椒', '蒜'] },
      { name: '炒血鸭', desc: '鸭血鲜嫩，香辣浓郁', cookTime: 30, difficulty: 'medium', ingredients: ['鸭肉', '鸭血', '辣椒', '豆豉'] },
      { name: '湘味红烧鱼', desc: '鱼肉鲜嫩，辣椒入味', cookTime: 25, difficulty: 'easy', ingredients: ['草鱼', '辣椒', '豆瓣酱', '姜'] },
      { name: '剁椒蒸蛋', desc: '嫩滑鲜香，剁椒提味', cookTime: 15, difficulty: 'easy', ingredients: ['鸡蛋', '剁椒', '蒸鱼豉油', '葱'] },
      { name: '长沙臭豆腐', desc: '外酥内嫩，臭香独特', cookTime: 20, difficulty: 'medium', ingredients: ['臭豆腐', '辣椒酱', '食用油', '葱'] },
      { name: '炒腊猪耳', desc: '猪耳爽脆，腊香浓郁', cookTime: 15, difficulty: 'easy', ingredients: ['腊猪耳', '青椒', '辣椒', '蒜'] },
      { name: '湘西外婆菜', desc: '酸辣爽口，下饭神菜', cookTime: 10, difficulty: 'easy', ingredients: ['外婆菜', '小米椒', '蒜', '食用油'] },
      { name: '红烧甲鱼', desc: '甲鱼鲜嫩，红烧入味', cookTime: 60, difficulty: 'hard', ingredients: ['甲鱼', '豆豉', '辣椒', '冰糖'] },
      { name: '湖南霉豆腐', desc: '霉香浓郁，咸辣开胃', cookTime: 5, difficulty: 'easy', ingredients: ['霉豆腐', '辣椒粉', '芝麻', '盐'] },
      { name: '辣炒花蛤', desc: '蛤蜊鲜嫩，辣椒提香', cookTime: 10, difficulty: 'easy', ingredients: ['花蛤', '辣椒', '豆豉', '蒜'] },
      { name: '石锅鱼', desc: '汤鲜鱼嫩，辣椒香浓', cookTime: 35, difficulty: 'medium', ingredients: ['鱼', '豆腐', '辣椒', '花椒'] },
      { name: '湘味牛蛙', desc: '牛蛙嫩滑，香辣鲜香', cookTime: 25, difficulty: 'medium', ingredients: ['牛蛙', '小米椒', '蒜', '豆豉'] },
      { name: '永州血鸭', desc: '鸭血浓香，风味独特', cookTime: 35, difficulty: 'medium', ingredients: ['鸭肉', '鸭血', '辣椒', '生姜'] },
      { name: '冬笋炒腊肉', desc: '笋肉鲜香，腊味浓郁', cookTime: 15, difficulty: 'easy', ingredients: ['冬笋', '腊肉', '辣椒', '蒜'] },
      { name: '湖南米粉', desc: '粉条爽滑，卤汤浓香', cookTime: 20, difficulty: 'easy', ingredients: ['米粉', '猪肉卤', '辣椒油', '葱'] },
      { name: '酸豆角炒肉末', desc: '酸辣爽口，肉末鲜香', cookTime: 10, difficulty: 'easy', ingredients: ['酸豆角', '猪肉末', '小米椒', '蒜'] },
      { name: '湘西土匪猪肝', desc: '猪肝嫩滑，香辣浓郁', cookTime: 15, difficulty: 'easy', ingredients: ['猪肝', '辣椒', '蒜', '豆豉'] },
      { name: '红烧牛肉', desc: '牛肉软烂，香辣浓郁', cookTime: 90, difficulty: 'medium', ingredients: ['牛腱子', '辣椒', '豆豉', '冰糖'] },
      { name: '腊味合蒸', desc: '腊香四溢，多味融合', cookTime: 35, difficulty: 'easy', ingredients: ['腊猪肉', '腊鸡', '腊鱼', '蒸架'] },
    ],
  },
  {
    id: 'shandong', name: '鲁菜', fullName: '山东菜系',
    emoji: '🐟', color: '#607D8B', lightColor: '#ECEFF1',
    description: '咸鲜纯正，清香宜人',
    longDesc: '鲁菜是中国最古老的菜系之一，用料广泛，以海鲜和山珍为主，口味咸鲜纯正。',
    tags: ['咸鲜', '纯正', '大气'], sortOrder: 6,
    quickIngredients: ['海参', '大虾', '鲤鱼', '猪肉', '大葱', '黄豆芽', '醋', '糖'],
    representativeDishes: [
      { name: '糖醋黄河鲤鱼', desc: '外酥内嫩，酸甜可口', cookTime: 35, difficulty: 'medium', ingredients: ['黄河鲤鱼', '糖', '醋', '番茄酱'] },
      { name: '葱烧海参', desc: '葱香浓郁，海参软糯', cookTime: 45, difficulty: 'hard', ingredients: ['海参', '大葱', '生抽', '高汤'] },
      { name: '油焖大虾', desc: '虾肉鲜嫩，浓油赤酱', cookTime: 25, difficulty: 'easy', ingredients: ['大虾', '番茄酱', '料酒', '葱姜'] },
      { name: '九转大肠', desc: '色泽红亮，酸甜微辣', cookTime: 60, difficulty: 'hard', ingredients: ['猪大肠', '醋', '糖', '砂仁'] },
      { name: '把子肉', desc: '肥而不腻，香糯入味', cookTime: 90, difficulty: 'medium', ingredients: ['五花肉', '生抽', '冰糖', '八角'] },
      { name: '爆炒腰花', desc: '脆嫩爽口，鲜香浓郁', cookTime: 15, difficulty: 'medium', ingredients: ['猪腰', '木耳', '黄瓜', '葱'] },
      { name: '德州扒鸡', desc: '皮烂脱骨，五香浓郁', cookTime: 90, difficulty: 'hard', ingredients: ['整鸡', '五香粉', '生抽', '冰糖'] },
      { name: '锅烧肘子', desc: '外酥内烂，色泽红亮', cookTime: 120, difficulty: 'hard', ingredients: ['猪肘子', '冰糖', '生抽', '五香粉'] },
      { name: '清汤燕窝', desc: '清香淡雅，营养丰富', cookTime: 30, difficulty: 'hard', ingredients: ['燕窝', '鸡汤', '盐', '冰糖'] },
      { name: '四喜丸子', desc: '肉质鲜嫩，汤汁醇厚', cookTime: 60, difficulty: 'medium', ingredients: ['猪肉', '荸荠', '鸡蛋', '生抽'] },
      { name: '芙蓉鸡片', desc: '鸡肉嫩滑，色泽洁白', cookTime: 20, difficulty: 'medium', ingredients: ['鸡胸肉', '蛋白', '牛奶', '淀粉'] },
      { name: '孔府一品锅', desc: '食材丰富，汤汁鲜美', cookTime: 60, difficulty: 'hard', ingredients: ['猪肉', '鸡肉', '海参', '高汤'] },
      { name: '蒸熊掌', desc: '软烂鲜嫩，汤汁浓郁', cookTime: 180, difficulty: 'hard', ingredients: ['熊掌', '高汤', '火腿', '姜'] },
      { name: '砂锅鱼头豆腐', desc: '汤白浓郁，鱼肉鲜嫩', cookTime: 40, difficulty: 'easy', ingredients: ['鱼头', '豆腐', '姜', '葱'] },
      { name: '爆炒黄豆芽', desc: '爽脆鲜嫩，家常美味', cookTime: 8, difficulty: 'easy', ingredients: ['黄豆芽', '大葱', '盐', '食用油'] },
      { name: '葱爆羊肉', desc: '羊肉嫩滑，葱香浓郁', cookTime: 10, difficulty: 'medium', ingredients: ['羊肉片', '大葱', '生抽', '料酒'] },
      { name: '蟹黄豆腐', desc: '豆腐嫩滑，蟹味鲜美', cookTime: 20, difficulty: 'easy', ingredients: ['豆腐', '蟹黄', '高汤', '葱'] },
      { name: '炸藕盒', desc: '外酥内嫩，咸香可口', cookTime: 25, difficulty: 'medium', ingredients: ['莲藕', '猪肉末', '鸡蛋', '淀粉'] },
      { name: '胶东海鲜面', desc: '汤鲜料足，面条爽滑', cookTime: 25, difficulty: 'easy', ingredients: ['面条', '虾', '蛤蜊', '鱼片'] },
      { name: '烤肉鲤鱼', desc: '鱼肉香嫩，烤香浓郁', cookTime: 30, difficulty: 'medium', ingredients: ['鲤鱼', '孜然', '辣椒粉', '生抽'] },
      { name: '香酥鸡', desc: '皮脆肉嫩，色泽金黄', cookTime: 45, difficulty: 'medium', ingredients: ['整鸡', '五香粉', '盐', '食用油'] },
      { name: '糟鱼', desc: '酒香鱼嫩，咸鲜适口', cookTime: 30, difficulty: 'medium', ingredients: ['草鱼', '酒糟', '盐', '姜'] },
      { name: '老醋花生', desc: '香脆酸甜，开胃下酒', cookTime: 10, difficulty: 'easy', ingredients: ['花生', '陈醋', '白糖', '葱'] },
      { name: '煎饼果子', desc: '外酥内软，咸香美味', cookTime: 10, difficulty: 'easy', ingredients: ['煎饼', '薄脆', '鸡蛋', '甜面酱'] },
      { name: '博山豆腐箱', desc: '外酥内嫩，馅料鲜美', cookTime: 35, difficulty: 'hard', ingredients: ['豆腐', '猪肉末', '木耳', '鸡蛋'] },
      { name: '威海海胆蒸蛋', desc: '蛋嫩海胆鲜，鲜美无比', cookTime: 20, difficulty: 'medium', ingredients: ['海胆', '鸡蛋', '鸡汤', '盐'] },
      { name: '即墨老酒炖鸡', desc: '酒香浓郁，鸡肉鲜嫩', cookTime: 60, difficulty: 'easy', ingredients: ['整鸡', '即墨老酒', '姜', '盐'] },
      { name: '沂蒙山全蝎', desc: '外酥内嫩，独特风味', cookTime: 15, difficulty: 'hard', ingredients: ['全蝎', '食用油', '盐', '花椒'] },
      { name: '潍坊朝天锅', desc: '汤白肉烂，暖胃耐饥', cookTime: 90, difficulty: 'medium', ingredients: ['猪杂', '白菜', '大葱', '饼'] },
      { name: '临沂炒鸡', desc: '鸡肉嫩滑，咸鲜适口', cookTime: 25, difficulty: 'easy', ingredients: ['鸡肉', '辣椒', '大葱', '生抽'] },
    ],
  },
  {
    id: 'northeastern', name: '东北菜', fullName: '东北菜系',
    emoji: '🥘', color: '#FF8F00', lightColor: '#FFF8E1',
    description: '量大味重，咸香浓郁',
    longDesc: '东北菜以量大、味重、咸香著称，多炖菜，豪爽粗犷。',
    tags: ['咸香', '量大', '炖菜'], sortOrder: 7,
    quickIngredients: ['猪肉', '土豆', '白菜', '粉条', '蘑菇', '茄子', '豆角', '大葱'],
    representativeDishes: [
      { name: '猪肉炖粉条', desc: '粉条软糯，肉香浓郁', cookTime: 60, difficulty: 'easy', ingredients: ['猪五花', '粉条', '白菜', '姜'] },
      { name: '小鸡炖蘑菇', desc: '鸡肉鲜嫩，菌香浓郁', cookTime: 60, difficulty: 'easy', ingredients: ['土鸡', '野蘑菇', '粉条', '葱姜'] },
      { name: '锅包肉', desc: '外酥内嫩，酸甜可口', cookTime: 30, difficulty: 'medium', ingredients: ['猪里脊', '淀粉', '醋', '白糖'] },
      { name: '地三鲜', desc: '家常味美，营养丰富', cookTime: 20, difficulty: 'easy', ingredients: ['土豆', '茄子', '青椒', '蒜'] },
      { name: '东北乱炖', desc: '食材丰富，汤汁鲜美', cookTime: 50, difficulty: 'easy', ingredients: ['猪肉', '土豆', '豆角', '茄子'] },
      { name: '杀猪菜', desc: '咸香浓郁，冬日暖胃', cookTime: 70, difficulty: 'medium', ingredients: ['五花肉', '酸菜', '血肠', '大骨'] },
      { name: '酸菜白肉', desc: '酸菜爽口，白肉鲜嫩', cookTime: 40, difficulty: 'easy', ingredients: ['五花肉', '酸菜', '粉丝', '姜'] },
      { name: '溜肉段', desc: '外酥内嫩，咸香可口', cookTime: 25, difficulty: 'medium', ingredients: ['猪里脊', '淀粉', '葱', '生抽'] },
      { name: '东北酱骨头', desc: '骨肉软烂，酱香浓郁', cookTime: 90, difficulty: 'medium', ingredients: ['猪脊骨', '大酱', '八角', '冰糖'] },
      { name: '猪肉白菜炖豆腐', desc: '豆腐嫩滑，鲜香温暖', cookTime: 35, difficulty: 'easy', ingredients: ['猪肉', '白菜', '豆腐', '粉条'] },
      { name: '拔丝地瓜', desc: '糖丝飘飞，地瓜软甜', cookTime: 20, difficulty: 'medium', ingredients: ['地瓜', '白糖', '食用油', '芝麻'] },
      { name: '东北大拌菜', desc: '爽口清脆，鲜香多彩', cookTime: 10, difficulty: 'easy', ingredients: ['黄瓜', '西红柿', '生菜', '香菜'] },
      { name: '砂锅白菜', desc: '清淡鲜嫩，暖胃养身', cookTime: 30, difficulty: 'easy', ingredients: ['白菜', '虾皮', '豆腐', '粉丝'] },
      { name: '老式红烧肉', desc: '色泽红亮，肥而不腻', cookTime: 90, difficulty: 'medium', ingredients: ['五花肉', '大酱', '冰糖', '八角'] },
      { name: '东北冷面', desc: '面条爽滑，汤汁酸甜', cookTime: 15, difficulty: 'easy', ingredients: ['荞麦面', '牛肉汤', '苹果', '鸡蛋'] },
      { name: '铁锅炖大鹅', desc: '鹅肉软烂，汤汁浓郁', cookTime: 90, difficulty: 'medium', ingredients: ['鹅肉', '土豆', '白菜', '酱油'] },
      { name: '大骨棒', desc: '骨髓鲜美，汤汁浓白', cookTime: 90, difficulty: 'easy', ingredients: ['猪大骨', '玉米', '大葱', '姜'] },
      { name: '东北饺子', desc: '皮薄馅多，鲜香多汁', cookTime: 40, difficulty: 'medium', ingredients: ['面粉', '猪肉白菜', '葱', '姜'] },
      { name: '熏鸡', desc: '皮脆肉嫩，烟熏鲜香', cookTime: 60, difficulty: 'hard', ingredients: ['整鸡', '红茶', '白糖', '五香粉'] },
      { name: '拌菠菜', desc: '清爽鲜嫩，蒜香十足', cookTime: 10, difficulty: 'easy', ingredients: ['菠菜', '蒜', '盐', '芝麻油'] },
      { name: '煎豆腐', desc: '外焦里嫩，简单美味', cookTime: 15, difficulty: 'easy', ingredients: ['豆腐', '蒜', '生抽', '葱'] },
      { name: '猪血豆腐汤', desc: '血旺嫩滑，汤汁鲜香', cookTime: 20, difficulty: 'easy', ingredients: ['猪血', '豆腐', '酸菜', '葱'] },
      { name: '炸豆腐串', desc: '外酥内软，香辣可口', cookTime: 20, difficulty: 'easy', ingredients: ['豆腐', '辣椒面', '孜然', '食用油'] },
      { name: '砂锅豆腐', desc: '豆腐嫩滑，汤汁鲜美', cookTime: 25, difficulty: 'easy', ingredients: ['豆腐', '猪肉', '香菇', '粉丝'] },
      { name: '茄子炖土豆', desc: '软糯入味，家常美味', cookTime: 25, difficulty: 'easy', ingredients: ['茄子', '土豆', '番茄', '蒜'] },
      { name: '大碗宽面', desc: '面条劲道，卤汁浓香', cookTime: 20, difficulty: 'easy', ingredients: ['宽面', '猪肉卤', '黄瓜', '大葱'] },
      { name: '醋溜白菜', desc: '酸爽脆嫩，开胃下饭', cookTime: 8, difficulty: 'easy', ingredients: ['白菜', '醋', '干辣椒', '蒜'] },
      { name: '丸子汤', desc: '丸子软嫩，汤汁清鲜', cookTime: 25, difficulty: 'easy', ingredients: ['猪肉末', '葱姜', '粉条', '盐'] },
      { name: '猪皮冻', desc: '晶莹剔透，咸鲜爽滑', cookTime: 90, difficulty: 'medium', ingredients: ['猪皮', '生抽', '八角', '盐'] },
      { name: '鸡架汤', desc: '汤白如乳，鲜美无比', cookTime: 30, difficulty: 'easy', ingredients: ['鸡架', '白菜', '粉条', '葱姜'] },
    ],
  },
  {
    id: 'beijing', name: '京菜', fullName: '北京菜系',
    emoji: '🦆', color: '#C62828', lightColor: '#FFEBEE',
    description: '宫廷风味，大气端庄',
    longDesc: '京菜融合满汉饮食文化，以宫廷菜为代表，讲究形色味俱全。',
    tags: ['宫廷', '咸鲜', '大气'], sortOrder: 8,
    quickIngredients: ['鸭肉', '羊肉片', '猪肉丁', '黄豆酱', '白菜', '豆腐', '麻酱', '手擀面'],
    representativeDishes: [
      { name: '北京烤鸭', desc: '皮脆肉嫩，色泽红亮', cookTime: 120, difficulty: 'hard', ingredients: ['北京鸭', '甜面酱', '葱丝', '薄饼'] },
      { name: '涮羊肉', desc: '肉质鲜嫩，蘸酱香浓', cookTime: 30, difficulty: 'easy', ingredients: ['羊肉片', '白菜', '豆腐', '麻酱'] },
      { name: '炸酱面', desc: '面条劲道，炸酱醇厚', cookTime: 30, difficulty: 'easy', ingredients: ['手擀面', '猪肉丁', '黄豆酱', '黄瓜'] },
      { name: '爆肚', desc: '脆嫩爽口，蘸酱香鲜', cookTime: 20, difficulty: 'medium', ingredients: ['牛肚', '麻酱', '香菜', '辣椒油'] },
      { name: '老北京卤煮', desc: '卤汤浓郁，食材丰富', cookTime: 90, difficulty: 'medium', ingredients: ['猪肺', '猪肠', '豆腐', '火烧'] },
      { name: '芥末墩', desc: '爽辣清脆，开胃下饭', cookTime: 20, difficulty: 'easy', ingredients: ['白菜', '芥末', '醋', '白糖'] },
      { name: '宫保鸡丁（京式）', desc: '酸甜微辣，鸡肉嫩滑', cookTime: 20, difficulty: 'easy', ingredients: ['鸡胸肉', '花生', '葱', '醋'] },
      { name: '醋溜木须', desc: '鸡蛋嫩滑，木耳爽脆', cookTime: 10, difficulty: 'easy', ingredients: ['鸡蛋', '木耳', '黄瓜', '醋'] },
      { name: '葱爆羊肉', desc: '羊肉嫩滑，葱香浓郁', cookTime: 10, difficulty: 'medium', ingredients: ['羊肉片', '大葱', '生抽', '料酒'] },
      { name: '白肉丸子汤', desc: '丸子软嫩，汤汁清澈', cookTime: 25, difficulty: 'easy', ingredients: ['猪肉末', '冬瓜', '葱姜', '盐'] },
      { name: '三不粘', desc: '外皮金黄，甜糯可口', cookTime: 20, difficulty: 'hard', ingredients: ['鸡蛋', '白糖', '淀粉', '食用油'] },
      { name: '清炖羊肉', desc: '汤清肉嫩，鲜香温补', cookTime: 90, difficulty: 'easy', ingredients: ['羊肉', '萝卜', '枸杞', '姜'] },
      { name: '炸灌肠', desc: '外酥内软，蒜汁提香', cookTime: 15, difficulty: 'easy', ingredients: ['淀粉肠', '蒜汁', '盐', '食用油'] },
      { name: '卤煮火烧', desc: '卤香浓郁，饼软肉烂', cookTime: 20, difficulty: 'easy', ingredients: ['火烧', '猪肠', '豆腐', '卤汤'] },
      { name: '豆汁', desc: '酸臭独特，北京特色', cookTime: 20, difficulty: 'easy', ingredients: ['豆汁', '焦圈', '咸菜', '辣椒丝'] },
      { name: '奶油炸糕', desc: '外酥内软，奶香浓郁', cookTime: 20, difficulty: 'medium', ingredients: ['面粉', '奶油', '白糖', '食用油'] },
      { name: '驴打滚', desc: '香甜软糯，豆香扑鼻', cookTime: 30, difficulty: 'medium', ingredients: ['糯米粉', '豆沙', '黄豆粉', '白糖'] },
      { name: '豌豆黄', desc: '细腻甜糯，消暑解渴', cookTime: 40, difficulty: 'medium', ingredients: ['豌豆', '白糖', '琼脂', '桂花'] },
      { name: '艾窝窝', desc: '软糯香甜，芝麻飘香', cookTime: 30, difficulty: 'medium', ingredients: ['糯米粉', '豆沙', '芝麻', '白糖'] },
      { name: '茯苓夹饼', desc: '酥脆香甜，茯苓清香', cookTime: 20, difficulty: 'medium', ingredients: ['茯苓粉', '面粉', '白糖', '蜂蜜'] },
      { name: '杏仁豆腐', desc: '细腻滑嫩，杏仁清香', cookTime: 30, difficulty: 'easy', ingredients: ['杏仁露', '牛奶', '琼脂', '白糖'] },
      { name: '焦熘丸子', desc: '外酥内嫩，酸甜可口', cookTime: 25, difficulty: 'medium', ingredients: ['猪肉末', '淀粉', '番茄酱', '醋'] },
      { name: '葱烧鳜鱼', desc: '鱼肉嫩滑，葱香浓郁', cookTime: 25, difficulty: 'medium', ingredients: ['鳜鱼', '大葱', '生抽', '料酒'] },
      { name: '拌黄瓜', desc: '清脆爽口，蒜香十足', cookTime: 5, difficulty: 'easy', ingredients: ['黄瓜', '蒜', '盐', '芝麻油'] },
      { name: '京酱肉丝', desc: '肉丝嫩滑，酱香浓郁', cookTime: 15, difficulty: 'easy', ingredients: ['猪里脊', '甜面酱', '葱', '豆腐皮'] },
      { name: '清蒸茄段', desc: '茄子软烂，蒜香爽口', cookTime: 20, difficulty: 'easy', ingredients: ['茄子', '蒜', '生抽', '香油'] },
      { name: '炒合菜', desc: '多菜合炒，鲜香爽口', cookTime: 15, difficulty: 'easy', ingredients: ['豆芽', '韭菜', '粉丝', '鸡蛋'] },
      { name: '红烧带鱼', desc: '鱼肉嫩滑，酱香浓郁', cookTime: 20, difficulty: 'easy', ingredients: ['带鱼', '生抽', '料酒', '葱姜'] },
      { name: '砂锅什锦', desc: '食材丰富，暖胃鲜香', cookTime: 35, difficulty: 'easy', ingredients: ['豆腐', '粉丝', '白菜', '虾仁'] },
      { name: '酱牛肉', desc: '酱香浓郁，软烂入味', cookTime: 90, difficulty: 'medium', ingredients: ['牛腱子', '黄豆酱', '八角', '桂皮'] },
    ],
  },
];

// ==================== 减脂餐（30条，每条含完整菜谱步骤）====================
const FAT_LOSS_DATA = [
  { id: 'fl_001', name: '水煮鸡胸肉沙拉', category: 'fat_loss', calories: 280, protein: 35, carbs: 12, fat: 8, cookTime: 20, difficulty: 'easy', desc: '高蛋白低脂，减脂期间最佳选择', ingredients: ['鸡胸肉150g', '生菜100g', '番茄1个', '黄瓜半根', '橄榄油5ml', '盐少许', '黑胡椒少许', '柠檬汁少许'], tags: ['高蛋白', '低脂', '清淡'], tips: '鸡胸肉提前腌制可增加风味，橄榄油不超过5ml', steps: ['鸡胸肉加盐、黑胡椒腌制10分钟', '水煮鸡胸肉8分钟至熟透', '取出晾凉撕成条', '生菜洗净切段，番茄黄瓜切块', '所有食材拌匀，淋橄榄油和柠檬汁'], nutrition: '每100g约186卡，蛋白质23g' },
  { id: 'fl_002', name: '番茄炒鸡蛋（少油版）', category: 'fat_loss', calories: 220, protein: 14, carbs: 18, fat: 10, cookTime: 10, difficulty: 'easy', desc: '经典家常菜减脂版，减少用油量', ingredients: ['鸡蛋2个', '番茄2个', '盐少许', '食用油3ml', '白糖少许', '葱花少许'], tags: ['低油', '快手', '营养'], tips: '用不粘锅，少放油，番茄先炒出汁再加蛋', steps: ['番茄切块，鸡蛋打散', '不粘锅少油加热', '先炒鸡蛋至八成熟盛出', '再炒番茄出汁', '加入鸡蛋翻炒均匀，调味出锅'], nutrition: '每份约220卡，蛋白质14g' },
  { id: 'fl_003', name: '清蒸鱼柳', category: 'fat_loss', calories: 180, protein: 28, carbs: 3, fat: 5, cookTime: 15, difficulty: 'easy', desc: '低热量高蛋白，清蒸保留最多营养', ingredients: ['鲈鱼柳200g', '姜3片', '葱2根', '生抽10ml', '蒸鱼豉油10ml', '热油少许'], tags: ['低卡', '高蛋白', '清蒸'], tips: '蒸鱼时鱼身划刀，蒸好后浇热油增香', steps: ['鱼柳洗净划刀，姜片垫底', '上蒸锅大火蒸8分钟', '取出倒掉蒸汁', '铺葱丝，淋生抽豉油', '浇热油激香葱丝即可'], nutrition: '每份约180卡，蛋白质28g' },
  { id: 'fl_004', name: '藜麦蔬菜碗', category: 'fat_loss', calories: 320, protein: 12, carbs: 45, fat: 8, cookTime: 25, difficulty: 'easy', desc: '超级食物藜麦搭配彩虹蔬菜，营养均衡', ingredients: ['藜麦100g', '西兰花100g', '胡萝卜1根', '紫甘蓝50g', '牛油果半个', '橄榄油5ml', '盐少许', '柠檬汁少许'], tags: ['藜麦', '素食', '营养均衡'], tips: '藜麦提前浸泡30分钟口感更好', steps: ['藜麦浸泡后按1:2加水煮15分钟', '西兰花焯水2分钟', '胡萝卜切条蒸熟', '紫甘蓝切丝，牛油果切片', '所有食材摆盘，淋橄榄油柠檬汁'], nutrition: '每份约320卡，膳食纤维8g' },
  { id: 'fl_005', name: '凉拌黄瓜', category: 'fat_loss', calories: 45, protein: 2, carbs: 8, fat: 1, cookTime: 10, difficulty: 'easy', desc: '超低卡路里，爽口解腻', ingredients: ['黄瓜2根', '大蒜3瓣', '米醋15ml', '盐3g', '辣椒油少许', '芝麻油少许', '白糖少许'], tags: ['超低卡', '爽口', '开胃'], tips: '拍碎黄瓜更入味，蒜泥多放增加风味', steps: ['黄瓜拍碎切段', '蒜泥加盐腌2分钟', '加醋、辣椒油、芝麻油调味', '拌匀腌5分钟入味', '装盘即可'], nutrition: '每份约45卡，几乎零脂肪' },
  { id: 'fl_006', name: '燕麦鸡蛋早餐', category: 'fat_loss', calories: 290, protein: 18, carbs: 38, fat: 7, cookTime: 10, difficulty: 'easy', desc: '饱腹感强，持续供能的减脂早餐', ingredients: ['纯燕麦片50g', '鸡蛋1个', '牛奶200ml', '蓝莓30g', '香蕉半根', '坚果5g'], tags: ['早餐', '高纤维', '低GI'], tips: '选纯燕麦片不加糖，搭配水果增加维生素', steps: ['燕麦加牛奶小火煮5分钟', '鸡蛋煮熟切半', '蓝莓洗净，香蕉切片', '燕麦粥装碗', '摆上鸡蛋水果坚果即可'], nutrition: '每份约290卡，蛋白质18g' },
  { id: 'fl_007', name: '虾仁西兰花', category: 'fat_loss', calories: 200, protein: 24, carbs: 10, fat: 6, cookTime: 15, difficulty: 'easy', desc: '高蛋白低脂肪，健身减脂必备', ingredients: ['虾仁150g', '西兰花200g', '蒜末10g', '盐2g', '黑胡椒少许', '食用油5ml'], tags: ['高蛋白', '低脂', '快手'], tips: '虾仁去虾线，西兰花焯水保脆嫩', steps: ['西兰花切小朵焯水2分钟', '虾仁去虾线洗净', '锅中少油爆香蒜末', '加虾仁翻炒至变色', '加西兰花翻炒，调味出锅'], nutrition: '每份约200卡，蛋白质24g' },
  { id: 'fl_008', name: '豆腐蔬菜汤', category: 'fat_loss', calories: 150, protein: 10, carbs: 15, fat: 4, cookTime: 20, difficulty: 'easy', desc: '低热量高蛋白素汤，营养温暖', ingredients: ['嫩豆腐200g', '菠菜100g', '蘑菇50g', '虾皮10g', '盐2g', '葱姜少许'], tags: ['低卡', '素食', '暖胃'], tips: '虾皮提鲜减少加盐，菠菜焯水去草酸', steps: ['豆腐切块，菠菜焯水切段', '锅加水放葱姜煮沸', '加豆腐蘑菇煮5分钟', '加虾皮菠菜煮2分钟', '调盐出锅'], nutrition: '每份约150卡，低脂低卡' },
  { id: 'fl_009', name: '牛肉蔬菜饭盒', category: 'fat_loss', calories: 380, protein: 32, carbs: 35, fat: 10, cookTime: 30, difficulty: 'medium', desc: '均衡减脂便当，饱腹感持久', ingredients: ['牛里脊100g', '糙米饭100g', '青豆50g', '胡萝卜1根', '生抽10ml', '黑胡椒少许'], tags: ['便当', '均衡', '高蛋白'], tips: '牛肉选脂肪含量低的部位，糙米饭增加饱腹感', steps: ['糙米提前浸泡煮饭', '牛肉切片加生抽腌制', '锅中少油煎牛肉至熟', '青豆胡萝卜焯水', '便当盒装饭摆上食材'], nutrition: '每份约380卡，蛋白质32g' },
  { id: 'fl_010', name: '蒸蛋羹', category: 'fat_loss', calories: 130, protein: 10, carbs: 2, fat: 8, cookTime: 15, difficulty: 'easy', desc: '嫩滑爽口，消化吸收率高', ingredients: ['鸡蛋2个', '温水300ml', '盐1g', '生抽5ml', '葱花少许', '芝麻油少许'], tags: ['低卡', '易消化', '嫩滑'], tips: '水蛋比1:1.5，水温40度，大火蒸3分钟转小火10分钟', steps: ['鸡蛋打散加温水搅匀', '过筛去气泡', '加盖或保鲜膜', '大火蒸3分钟转小火蒸10分钟', '出锅淋生抽、葱花、芝麻油'], nutrition: '每份约130卡，消化吸收率达99%' },
  { id: 'fl_011', name: '苹果鸡肉沙拉', category: 'fat_loss', calories: 260, protein: 28, carbs: 22, fat: 6, cookTime: 20, difficulty: 'easy', desc: '水果与蛋白质完美搭配，鲜甜可口', ingredients: ['鸡胸肉120g', '苹果半个', '生菜80g', '核桃5g', '低脂沙拉酱15ml', '盐少许'], tags: ['水果沙拉', '高蛋白', '清爽'], tips: '苹果切丁泡盐水防氧化，核桃补充优质脂肪', steps: ['鸡胸肉水煮撕成条', '苹果切丁泡盐水', '生菜洗净', '所有食材拌匀', '淋沙拉酱即可'], nutrition: '每份约260卡，富含维生素C' },
  { id: 'fl_012', name: '冬瓜排骨汤', category: 'fat_loss', calories: 210, protein: 20, carbs: 12, fat: 8, cookTime: 60, difficulty: 'easy', desc: '利水消肿，清淡滋补', ingredients: ['排骨200g', '冬瓜300g', '姜3片', '盐2g', '葱花少许'], tags: ['消肿', '清淡', '滋补'], tips: '冬瓜含水利尿，排骨焯水去血水后再炖', steps: ['排骨焯水去血沫', '冬瓜去皮切块', '排骨加姜加水炖30分钟', '加冬瓜继续炖20分钟', '调盐撒葱花出锅'], nutrition: '每份约210卡，含丰富胶原蛋白' },
  { id: 'fl_013', name: '无油麻辣豆腐', category: 'fat_loss', calories: 170, protein: 12, carbs: 10, fat: 8, cookTime: 15, difficulty: 'easy', desc: '减脂版麻辣豆腐，满足口味不增脂', ingredients: ['豆腐200g', '豆瓣酱5g', '花椒粉1g', '葱花10g', '蒸鱼豉油10ml', '水适量'], tags: ['减脂版', '麻辣', '下饭'], tips: '豆腐先焯水，少量豆瓣酱调味，不额外加油', steps: ['豆腐切块焯水2分钟', '锅加少量水烧开', '加豆瓣酱调味', '加豆腐小火煮5分钟', '撒花椒粉葱花出锅'], nutrition: '每份约170卡，素食高蛋白' },
  { id: 'fl_014', name: '紫薯燕麦粥', category: 'fat_loss', calories: 240, protein: 8, carbs: 48, fat: 2, cookTime: 20, difficulty: 'easy', desc: '低GI主食替代，花青素丰富', ingredients: ['紫薯100g', '燕麦30g', '水500ml', '枸杞10g'], tags: ['低GI', '抗氧化', '代餐'], tips: '紫薯蒸熟捣泥后加入燕麦粥，花青素不要高温久煮', steps: ['紫薯蒸熟去皮', '燕麦加水煮10分钟', '紫薯捣泥加入粥中', '加枸杞煮2分钟', '装碗即可'], nutrition: '每份约240卡，富含花青素和膳食纤维' },
  { id: 'fl_015', name: '轻版水煮牛肉', category: 'fat_loss', calories: 320, protein: 38, carbs: 8, fat: 14, cookTime: 25, difficulty: 'medium', desc: '减脂版水煮牛肉，少油多蛋白', ingredients: ['牛里脊150g', '豆芽100g', '菠菜80g', '辣椒少许', '花椒少许', '生抽10ml', '淀粉5g'], tags: ['高蛋白', '减脂川菜', '鲜嫩'], tips: '牛肉用淀粉腌制更嫩，花椒辣椒提味减少用油', steps: ['牛肉切片加淀粉生抽腌制', '豆芽菠菜焯水垫底', '锅加少量油爆香辣椒花椒', '加水烧开滑入牛肉片', '煮熟捞出浇在蔬菜上'], nutrition: '每份约320卡，蛋白质38g' },
  { id: 'fl_016', name: '蔬菜蛋饼', category: 'fat_loss', calories: 200, protein: 14, carbs: 18, fat: 8, cookTime: 15, difficulty: 'easy', desc: '早餐神器，蔬菜鸡蛋均衡搭配', ingredients: ['鸡蛋2个', '西葫芦100g', '胡萝卜丝50g', '葱花10g', '盐2g', '食用油3ml'], tags: ['早餐', '快手', '营养'], tips: '蔬菜丝挤出多余水分，小火慢煎至两面金黄', steps: ['西葫芦胡萝卜擦丝挤水', '鸡蛋打散加盐', '加入蔬菜丝葱花拌匀', '不粘锅少油倒入蛋液', '小火煎至两面金黄'], nutrition: '每份约200卡，两个鸡蛋的营养' },
  { id: 'fl_017', name: '三文鱼牛油果卷', category: 'fat_loss', calories: 350, protein: 25, carbs: 20, fat: 18, cookTime: 15, difficulty: 'easy', desc: '富含omega-3，优质脂肪减脂餐', ingredients: ['三文鱼80g', '牛油果半个', '紫菜2张', '藜麦饭80g', '柠檬汁少许', '盐少许'], tags: ['omega-3', '优质脂肪', '抗炎'], tips: '三文鱼要新鲜，牛油果选熟透的', steps: ['藜麦饭晾凉', '三文鱼切片', '牛油果切片淋柠檬汁', '紫菜铺平放藜麦饭', '摆上三文鱼牛油果，卷起切段'], nutrition: '每份约350卡，富含omega-3脂肪酸' },
  { id: 'fl_018', name: '莴笋炒肉片', category: 'fat_loss', calories: 190, protein: 16, carbs: 12, fat: 8, cookTime: 12, difficulty: 'easy', desc: '清脆爽口，低热量补充维生素', ingredients: ['莴笋200g', '猪里脊80g', '蒜2瓣', '盐2g', '生抽5ml'], tags: ['低卡', '清脆', '快手'], tips: '莴笋切斜片更脆嫩，猪里脊切薄片更快熟', steps: ['莴笋去皮切片，猪肉切薄片', '猪肉加生抽腌2分钟', '锅中少油爆香蒜', '加猪肉炒至变色', '加莴笋大火翻炒调味出锅'], nutrition: '每份约190卡，富含叶酸和铁' },
  { id: 'fl_019', name: '菌菇鸡肉粥', category: 'fat_loss', calories: 270, protein: 22, carbs: 30, fat: 5, cookTime: 40, difficulty: 'easy', desc: '低脂暖胃主食，菌菇增强免疫力', ingredients: ['鸡胸肉100g', '香菇3朵', '金针菇50g', '大米50g', '盐2g', '姜2片'], tags: ['低脂', '暖胃', '免疫力'], tips: '鸡肉切小丁更快熟，菌菇鲜味减少用盐', steps: ['大米洗净加水煮20分钟', '鸡肉切丁，菌菇切片', '加入鸡肉煮10分钟', '加菌菇再煮5分钟', '调盐加姜丝出锅'], nutrition: '每份约270卡，菌菇多糖增强免疫' },
  { id: 'fl_020', name: '凉拌木耳', category: 'fat_loss', calories: 60, protein: 2, carbs: 12, fat: 1, cookTime: 15, difficulty: 'easy', desc: '超低热量，润肠排毒', ingredients: ['黑木耳50g（干）', '红椒半个', '葱10g', '米醋15ml', '蒜泥5g', '盐2g', '芝麻油少许'], tags: ['超低卡', '排毒', '爽口'], tips: '木耳提前泡发，焯水1分钟，凉水过一遍增加脆感', steps: ['木耳泡发洗净', '焯水1分钟过凉水', '红椒切丝', '所有调料混合', '拌匀即可'], nutrition: '每份约60卡，富含铁和多糖' },
  { id: 'fl_021', name: '豆腐皮卷蔬菜', category: 'fat_loss', calories: 160, protein: 14, carbs: 10, fat: 6, cookTime: 15, difficulty: 'easy', desc: '低热量高蛋白，代替主食好选择', ingredients: ['豆腐皮100g', '胡萝卜丝50g', '黄瓜丝50g', '生抽5ml', '芝麻少许'], tags: ['高蛋白', '代餐', '低卡'], tips: '豆腐皮焯水软化，蔬菜丝切细一点', steps: ['豆腐皮焯水软化', '蔬菜丝切细', '豆腐皮铺平放蔬菜', '卷起切段', '淋生抽撒芝麻'], nutrition: '每份约160卡，植物蛋白丰富' },
  { id: 'fl_022', name: '南瓜鸡肉汤', category: 'fat_loss', calories: 230, protein: 20, carbs: 25, fat: 5, cookTime: 40, difficulty: 'easy', desc: '南瓜富含β-胡萝卜素，暖胃饱腹', ingredients: ['南瓜200g', '鸡腿肉100g', '姜3片', '盐2g', '枸杞10g'], tags: ['低脂', '暖胃', '抗氧化'], tips: '南瓜自带甜味可减少调料，鸡腿去皮减脂', steps: ['鸡腿去皮切块焯水', '南瓜切块', '锅加水放姜片烧开', '加鸡肉煮20分钟', '加南瓜枸杞煮15分钟调盐'], nutrition: '每份约230卡，β-胡萝卜素丰富' },
  { id: 'fl_023', name: '蒸蔬菜拼盘', category: 'fat_loss', calories: 120, protein: 5, carbs: 22, fat: 2, cookTime: 15, difficulty: 'easy', desc: '极低热量，保留蔬菜最多营养', ingredients: ['西兰花100g', '胡萝卜1根', '玉米半根', '芦笋80g', '蒸鱼豉油10ml'], tags: ['超低卡', '蒸食', '营养'], tips: '各种蔬菜蒸制时间不同，胡萝卜最先放', steps: ['胡萝卜切块蒸8分钟', '加玉米蒸5分钟', '加西兰花蒸3分钟', '最后加芦笋蒸2分钟', '出锅淋豉油'], nutrition: '每份约120卡，多种维生素矿物质' },
  { id: 'fl_024', name: '番茄蛋花汤', category: 'fat_loss', calories: 100, protein: 7, carbs: 10, fat: 4, cookTime: 10, difficulty: 'easy', desc: '轻盈低卡汤品，维C丰富', ingredients: ['番茄2个', '鸡蛋1个', '葱花5g', '盐1g', '芝麻油2ml'], tags: ['低卡', '维C', '简单'], tips: '番茄先炒出汁，鸡蛋液分次加入', steps: ['番茄切块，鸡蛋打散', '番茄炒出汁加水', '烧开后淋入蛋液', '搅拌成蛋花', '调盐淋芝麻油撒葱花'], nutrition: '每份约100卡，维C含量高' },
  { id: 'fl_025', name: '糙米卤鸡蛋', category: 'fat_loss', calories: 310, protein: 18, carbs: 40, fat: 7, cookTime: 30, difficulty: 'easy', desc: '低GI主食搭配高蛋白，饱腹不升糖', ingredients: ['糙米100g', '鸡蛋2个', '生抽15ml', '八角1个', '老抽5ml', '盐少许'], tags: ['低GI', '高蛋白', '饱腹'], tips: '糙米提前浸泡，卤蛋去壳后划几刀更入味', steps: ['糙米浸泡2小时煮饭', '鸡蛋煮熟去壳', '加生抽老抽八角小火卤15分钟', '糙米饭配卤蛋'], nutrition: '每份约310卡，低GI饱腹持久' },
  { id: 'fl_026', name: '草莓燕麦碗', category: 'fat_loss', calories: 280, protein: 10, carbs: 50, fat: 5, cookTime: 10, difficulty: 'easy', desc: '高纤维早餐，血糖平稳不饿', ingredients: ['即食燕麦50g', '草莓8个', '希腊酸奶100g', '蜂蜜5g'], tags: ['早餐', '高纤维', '低GI'], tips: '选纯燕麦不加糖，希腊酸奶蛋白质更高', steps: ['燕麦加热水或牛奶泡软', '草莓洗净切半', '燕麦装碗铺上草莓', '加希腊酸奶', '淋蜂蜜即可'], nutrition: '每份约280卡，益生菌丰富' },
  { id: 'fl_027', name: '清炒芦笋', category: 'fat_loss', calories: 80, protein: 3, carbs: 8, fat: 4, cookTime: 8, difficulty: 'easy', desc: '低热量高纤维，利尿排毒', ingredients: ['芦笋200g', '蒜末10g', '盐2g', '橄榄油5ml'], tags: ['低卡', '利尿', '排毒'], tips: '芦笋根部较硬折断就好，大火爆炒保留营养', steps: ['芦笋洗净折断老根', '锅热加橄榄油', '爆香蒜末', '加芦笋大火翻炒2分钟', '调盐出锅'], nutrition: '每份约80卡，含天冬氨酸利尿' },
  { id: 'fl_028', name: '酸辣白菜', category: 'fat_loss', calories: 65, protein: 2, carbs: 10, fat: 2, cookTime: 10, difficulty: 'easy', desc: '开胃低卡，白菜富含维生素C', ingredients: ['白菜300g', '干辣椒3个', '米醋20ml', '生抽5ml', '蒜3瓣', '盐2g'], tags: ['低卡', '开胃', '维C'], tips: '白菜切条，大火快炒保持脆感，醋最后放', steps: ['白菜切条，蒜切片', '锅热放少量油', '爆香蒜片干辣椒', '加白菜大火翻炒', '淋醋生抽调盐出锅'], nutrition: '每份约65卡，维C含量丰富' },
  { id: 'fl_029', name: '金枪鱼蛋白质沙拉', category: 'fat_loss', calories: 300, protein: 30, carbs: 15, fat: 12, cookTime: 10, difficulty: 'easy', desc: '罐头金枪鱼方便快捷，蛋白质丰富', ingredients: ['金枪鱼罐头80g（水浸）', '混合生菜100g', '小番茄8个', '橄榄油10ml', '柠檬汁10ml', '盐少许'], tags: ['高蛋白', '方便', '低卡'], tips: '金枪鱼选水浸款低脂，柠檬汁代替沙拉酱更低卡', steps: ['金枪鱼沥干', '生菜洗净，番茄切半', '所有食材拌匀', '淋橄榄油柠檬汁', '调盐即可'], nutrition: '每份约300卡，蛋白质30g' },
  { id: 'fl_030', name: '芹菜炒豆干', category: 'fat_loss', calories: 180, protein: 12, carbs: 12, fat: 8, cookTime: 10, difficulty: 'easy', desc: '高蛋白低脂，清香爽口', ingredients: ['芹菜200g', '豆干100g', '蒜2瓣', '生抽5ml', '盐1g', '食用油5ml'], tags: ['高蛋白', '清香', '低脂'], tips: '豆干提前焯水去豆腥，芹菜叶也可以吃别浪费', steps: ['豆干焯水切条', '芹菜切段', '蒜切片', '锅热加油爆香蒜', '加豆干芹菜翻炒', '淋生抽调盐出锅'], nutrition: '每份约180卡，植物蛋白12g' },
];

// ==================== 孕妇营养餐（30条，含完整信息）====================
const PREGNANCY_DATA = [
  { id: 'pg_001', name: '菠菜猪肝汤', category: 'pregnancy', nutrients: ['铁', '叶酸', '维生素A'], trimester: ['early', 'mid', 'late'], calories: 240, cookTime: 25, difficulty: 'easy', desc: '补铁补血，预防孕期贫血', ingredients: ['猪肝100g', '菠菜150g', '姜3片', '盐少许', '枸杞10g', '料酒少许'], tags: ['补铁', '补血', '孕期必备'], nutrition: '猪肝含大量血红素铁，菠菜补充叶酸，共同预防孕期贫血', caution: '猪肝每周不超过2次，维生素A过量有风险', steps: ['猪肝切片加料酒腌5分钟', '菠菜焯水切段', '锅加水放姜片烧开', '加猪肝煮5分钟', '加菠菜枸杞调盐出锅'] },
  { id: 'pg_002', name: '豆腐小虾炒蔬菜', category: 'pregnancy', nutrients: ['钙', '蛋白质', '维生素D'], trimester: ['mid', 'late'], calories: 210, cookTime: 15, difficulty: 'easy', desc: '高钙补钙，促进宝宝骨骼发育', ingredients: ['嫩豆腐200g', '小虾仁80g', '西兰花100g', '姜2片', '盐2g'], tags: ['高钙', '补钙', '骨骼发育'], nutrition: '豆腐和虾均富含钙质，配合蔬菜维生素D促进钙吸收', caution: '虾不宜过多，每日适量即可', steps: ['豆腐切块，西兰花焯水', '锅少油爆香姜片', '加虾仁炒变色', '加豆腐西兰花翻炒', '调盐出锅'] },
  { id: 'pg_003', name: '核桃牛奶燕麦粥', category: 'pregnancy', nutrients: ['DHA前体', '钙', '铁', '膳食纤维'], trimester: ['early', 'mid', 'late'], calories: 330, cookTime: 15, difficulty: 'easy', desc: '补充DHA促进胎儿大脑发育', ingredients: ['燕麦50g', '核桃仁15g', '牛奶200ml', '枸杞10g', '蜂蜜5g'], tags: ['DHA', '脑发育', '营养早餐'], nutrition: '核桃富含α-亚麻酸，有助DHA合成，牛奶补钙', caution: '蜂蜜少量，孕早期如有妊娠反应可减少', steps: ['燕麦加牛奶小火煮5分钟', '核桃仁掰碎', '枸杞洗净', '燕麦粥装碗', '撒核桃仁枸杞淋蜂蜜'] },
  { id: 'pg_004', name: '深海鱼炖豆腐', category: 'pregnancy', nutrients: ['DHA', 'EPA', '钙', '蛋白质'], trimester: ['mid', 'late'], calories: 280, cookTime: 30, difficulty: 'easy', desc: '富含DHA，促进胎儿神经发育', ingredients: ['三文鱼100g', '豆腐150g', '姜3片', '盐2g', '葱2根', '料酒少许'], tags: ['DHA', '神经发育', '高蛋白'], nutrition: '三文鱼DHA含量高，豆腐补钙，搭配营养全面', caution: '鱼要选汞含量低的品种，三文鱼需煮熟', steps: ['三文鱼切块加料酒腌制', '豆腐切块', '锅加少量水放姜片', '加三文鱼豆腐炖15分钟', '调盐撒葱花出锅'] },
  { id: 'pg_005', name: '牛奶炖鸡蛋', category: 'pregnancy', nutrients: ['钙', '蛋白质', '维生素B12'], trimester: ['early', 'mid', 'late'], calories: 200, cookTime: 20, difficulty: 'easy', desc: '优质蛋白质和钙的完美来源', ingredients: ['牛奶200ml', '鸡蛋1个', '白糖少许'], tags: ['高钙', '高蛋白', '易消化'], nutrition: '牛奶钙磷比例适宜，鸡蛋氨基酸完整，消化吸收率高', caution: '孕期乳糖不耐受可选低乳糖牛奶', steps: ['牛奶加热至60度', '鸡蛋打散', '牛奶慢慢倒入蛋液', '过滤装碗', '蒸锅蒸15分钟'] },
  { id: 'pg_006', name: '花生猪脚汤', category: 'pregnancy', nutrients: ['胶原蛋白', '叶酸', '铁'], trimester: ['mid', 'late'], calories: 380, cookTime: 120, difficulty: 'easy', desc: '胶原蛋白丰富，为哺乳做准备', ingredients: ['猪脚1只', '花生50g', '大枣5颗', '姜3片', '盐2g'], tags: ['胶原蛋白', '催乳', '补气血'], nutrition: '猪脚胶原蛋白丰富，花生含叶酸和铁，大枣补气血', caution: '猪脚高脂肪，适量食用，孕期体重增长过快需控制', steps: ['猪脚斩块焯水', '花生提前浸泡', '锅加水放猪脚花生姜', '大火烧开转小火炖90分钟', '加大枣再炖20分钟，调盐'] },
  { id: 'pg_007', name: '蔬菜豆腐羹', category: 'pregnancy', nutrients: ['钙', '叶酸', '维生素C', '膳食纤维'], trimester: ['early', 'mid', 'late'], calories: 150, cookTime: 15, difficulty: 'easy', desc: '孕早期控制孕吐，营养温和', ingredients: ['嫩豆腐200g', '菠菜80g', '胡萝卜半根', '鸡蛋1个', '盐2g', '水淀粉少许'], tags: ['孕早期', '控吐', '温和'], nutrition: '温热的食物有助于减轻孕吐，豆腐蛋白质易消化', caution: '孕早期食欲不振可减少食量，重在营养均衡', steps: ['豆腐切碎，蔬菜切丁', '锅加水烧开', '加豆腐蔬菜煮5分钟', '鸡蛋打散淋入', '加水淀粉勾芡调盐'] },
  { id: 'pg_008', name: '黑芝麻核桃粥', category: 'pregnancy', nutrients: ['钙', 'DHA前体', '维生素E', '铁'], trimester: ['mid', 'late'], calories: 350, cookTime: 30, difficulty: 'easy', desc: '补钙促进大脑发育，孕期营养粥', ingredients: ['黑芝麻20g', '核桃15g', '大米50g', '牛奶100ml', '枸杞5g'], tags: ['补钙', '益智', '孕期粥'], nutrition: '黑芝麻钙含量极高，核桃含亚麻酸，有助胎儿大脑发育', caution: '核桃和芝麻热量较高，每次不宜过多', steps: ['大米洗净煮粥20分钟', '黑芝麻炒香磨碎', '核桃掰碎', '粥加牛奶搅匀', '撒黑芝麻核桃枸杞'] },
  { id: 'pg_009', name: '清蒸鲈鱼', category: 'pregnancy', nutrients: ['蛋白质', 'DHA', '维生素D', '钙'], trimester: ['mid', 'late'], calories: 190, cookTime: 20, difficulty: 'easy', desc: '优质蛋白DHA鱼类，清蒸最佳', ingredients: ['鲈鱼1条约300g', '姜3片', '葱2根', '生抽10ml', '香油2ml'], tags: ['DHA', '高蛋白', '清淡'], nutrition: '鲈鱼汞含量低，DHA丰富，是孕期最安全的鱼类之一', caution: '避免生鱼片，鱼类一定要煮熟', steps: ['鲈鱼洗净划刀，姜片塞入', '蒸锅上汽，鱼蒸8分钟', '取出倒掉蒸汁', '铺葱丝淋生抽', '浇热油激香'] },
  { id: 'pg_010', name: '红枣银耳莲子汤', category: 'pregnancy', nutrients: ['铁', '叶酸', '维生素C', '胶质'], trimester: ['early', 'mid', 'late'], calories: 200, cookTime: 60, difficulty: 'easy', desc: '补气血安神，孕期调理佳品', ingredients: ['红枣8颗', '银耳半朵', '莲子20颗', '冰糖15g'], tags: ['补气血', '安神', '孕期滋补'], nutrition: '红枣含铁和维生素C，银耳含多糖，莲子安神镇定', caution: '糖分不宜过多，有妊娠糖尿病风险需控制冰糖用量', steps: ['银耳提前泡发撕小朵', '莲子提前泡发', '锅加水放银耳莲子', '大火烧开转小火炖40分钟', '加红枣冰糖再炖15分钟'] },
  { id: 'pg_011', name: '西兰花炒蛋', category: 'pregnancy', nutrients: ['叶酸', '钙', '维生素C', '蛋白质'], trimester: ['early', 'mid', 'late'], calories: 180, cookTime: 10, difficulty: 'easy', desc: '叶酸丰富，预防胎儿神经管缺陷', ingredients: ['西兰花200g', '鸡蛋2个', '蒜3瓣', '盐2g', '食用油5ml'], tags: ['叶酸', '预防畸形', '营养快手'], nutrition: '西兰花是叶酸宝库，配合鸡蛋蛋白质，早期必吃', caution: '孕早期每日叶酸0.4mg，食补加补剂共同补充', steps: ['西兰花焯水2分钟', '鸡蛋打散加盐', '锅热加油炒鸡蛋至熟', '加蒜末爆香', '加西兰花翻炒调味'] },
  { id: 'pg_012', name: '牛腱子炖萝卜', category: 'pregnancy', nutrients: ['铁', '蛋白质', '锌', '维生素B12'], trimester: ['mid', 'late'], calories: 290, cookTime: 90, difficulty: 'easy', desc: '补铁补血，优质蛋白助胎儿生长', ingredients: ['牛腱子肉200g', '白萝卜200g', '姜3片', '盐2g', '八角2颗'], tags: ['补铁', '补血', '高蛋白'], nutrition: '牛肉血红素铁吸收率高，萝卜助消化，组合营养全面', caution: '萝卜性凉，孕早期体质弱者少量即可', steps: ['牛肉切块焯水', '萝卜切块', '锅加水放牛肉姜八角', '炖60分钟加萝卜', '再炖20分钟调盐'] },
  { id: 'pg_013', name: '紫薯山药粥', category: 'pregnancy', nutrients: ['花青素', '维生素C', '膳食纤维', '钙'], trimester: ['early', 'mid', 'late'], calories: 250, cookTime: 30, difficulty: 'easy', desc: '富含花青素，抗氧化促胎儿发育', ingredients: ['紫薯80g', '铁棍山药100g', '大米30g', '枸杞10g'], tags: ['抗氧化', '花青素', '温补'], nutrition: '紫薯花青素抗氧化，山药含多糖和钙，健脾养胃', caution: '山药过多可能腹胀，适量即可', steps: ['大米洗净，紫薯山药去皮切块', '锅加水烧开', '加大米煮15分钟', '加紫薯山药再煮10分钟', '加枸杞煮2分钟出锅'] },
  { id: 'pg_014', name: '豌豆玉米炒虾仁', category: 'pregnancy', nutrients: ['叶酸', '维生素C', '蛋白质', '铁'], trimester: ['mid', 'late'], calories: 240, cookTime: 15, difficulty: 'easy', desc: '彩色蔬菜营养全面，豌豆叶酸丰富', ingredients: ['虾仁100g', '豌豆50g', '玉米粒50g', '胡萝卜半根', '盐2g'], tags: ['叶酸', '彩色营养', '清淡'], nutrition: '豌豆含丰富叶酸，玉米含膳食纤维，虾仁高蛋白', caution: '虾蟹类适量，对海鲜过敏者避免', steps: ['虾仁去虾线，蔬菜洗净', '豌豆胡萝卜焯水', '锅少油炒虾仁至变色', '加玉米豌豆胡萝卜', '翻炒调盐出锅'] },
  { id: 'pg_015', name: '香菇木耳蒸鸡', category: 'pregnancy', nutrients: ['铁', '多糖', '维生素D', '蛋白质'], trimester: ['mid', 'late'], calories: 260, cookTime: 35, difficulty: 'easy', desc: '菌菇增强免疫力，孕期好帮手', ingredients: ['鸡腿2只', '香菇5朵', '木耳20g（干）', '姜3片', '生抽15ml'], tags: ['增强免疫', '菌菇', '补铁'], nutrition: '香菇含维生素D和多糖，木耳含铁，鸡肉优质蛋白', caution: '鸡腿去皮可减少脂肪摄入', steps: ['鸡腿去皮，香菇木耳泡发', '所有食材加生抽姜片拌匀', '腌制20分钟', '上蒸锅大火蒸25分钟', '出锅即可'] },
  { id: 'pg_016', name: '南瓜牛奶浓汤', category: 'pregnancy', nutrients: ['维生素A', '钙', '钾', '膳食纤维'], trimester: ['early', 'mid', 'late'], calories: 230, cookTime: 30, difficulty: 'easy', desc: '维生素A丰富，温暖营养浓汤', ingredients: ['南瓜300g', '牛奶200ml', '洋葱半个', '盐1g', '黑胡椒少许'], tags: ['维生素A', '浓汤', '温暖'], nutrition: '南瓜β-胡萝卜素丰富，牛奶补钙，暖胃健脾', caution: '南瓜含糖量较高，妊娠糖尿病患者需控制', steps: ['南瓜洋葱切块蒸熟', '放入料理机加牛奶打匀', '倒入锅中小火加热', '调盐黑胡椒', '出锅即可'] },
  { id: 'pg_017', name: '豆浆麦片早餐', category: 'pregnancy', nutrients: ['植物蛋白', '钙', '异黄酮', '膳食纤维'], trimester: ['early', 'mid', 'late'], calories: 280, cookTime: 10, difficulty: 'easy', desc: '植物钙蛋白补充，孕期均衡早餐', ingredients: ['无糖豆浆250ml', '燕麦40g', '坚果10g', '枸杞5g', '黑芝麻5g'], tags: ['植物蛋白', '高钙', '早餐'], nutrition: '豆浆植物雌激素适量，燕麦纤维控血糖，坚果补充不饱和脂肪酸', caution: '豆浆不能代替牛奶，两者可交替饮用', steps: ['豆浆加热', '燕麦用热豆浆泡5分钟', '加坚果枸杞', '撒黑芝麻', '即可食用'] },
  { id: 'pg_018', name: '番茄牛肉汤', category: 'pregnancy', nutrients: ['铁', '维生素C', '番茄红素', '蛋白质'], trimester: ['mid', 'late'], calories: 270, cookTime: 60, difficulty: 'easy', desc: '维生素C促进铁吸收，番茄红素抗氧化', ingredients: ['牛肉150g', '番茄2个', '土豆1个', '姜3片', '盐2g'], tags: ['补铁', '维C', '番茄红素'], nutrition: '番茄维C促进牛肉铁的吸收，番茄红素对胎儿发育有益', caution: '牛肉需完全煮熟，避免食用未熟肉类', steps: ['牛肉切块焯水', '番茄土豆切块', '锅加水放牛肉姜炖40分钟', '加番茄土豆再炖15分钟', '调盐出锅'] },
  { id: 'pg_019', name: '海带豆腐汤', category: 'pregnancy', nutrients: ['碘', '钙', '维生素K', '膳食纤维'], trimester: ['mid', 'late'], calories: 120, cookTime: 20, difficulty: 'easy', desc: '补碘促进胎儿甲状腺发育', ingredients: ['海带100g', '嫩豆腐150g', '虾皮10g', '姜3片', '盐1g'], tags: ['补碘', '甲状腺发育', '低卡'], nutrition: '海带碘含量极高，豆腐补钙，虾皮同时补碘和钙', caution: '碘每日推荐230μg，海带碘含量高不宜过量', steps: ['海带洗净切段，豆腐切块', '锅加水放姜片烧开', '加海带煮5分钟', '加豆腐虾皮', '煮3分钟调盐'] },
  { id: 'pg_020', name: '猕猴桃燕麦酸奶碗', category: 'pregnancy', nutrients: ['维生素C', '叶酸', '钙', '益生菌'], trimester: ['early', 'mid', 'late'], calories: 290, cookTime: 5, difficulty: 'easy', desc: '超高维生素C，叶酸丰富，酸奶助消化', ingredients: ['猕猴桃1个', '燕麦30g', '希腊酸奶150ml', '蓝莓20g', '蜂蜜5g'], tags: ['维C', '叶酸', '益生菌'], nutrition: '猕猴桃维C是苹果的10倍，含大量叶酸，酸奶益生菌助消化', caution: '猕猴桃性寒，孕早期体质偏寒者适量', steps: ['燕麦用少量热水泡软', '猕猴桃去皮切片', '希腊酸奶装碗', '铺燕麦', '摆猕猴桃蓝莓淋蜂蜜'] },
  { id: 'pg_021', name: '小米红枣粥', category: 'pregnancy', nutrients: ['铁', '叶酸', 'B族维生素', '硒'], trimester: ['early', 'mid', 'late'], calories: 220, cookTime: 30, difficulty: 'easy', desc: '养胃补血，孕期传统调补粥', ingredients: ['小米60g', '红枣6颗', '枸杞10g', '红糖5g'], tags: ['补气血', '养胃', '传统滋补'], nutrition: '小米含叶酸和铁，红枣维C促进铁吸收，温养脾胃', caution: '红糖量要控制，妊娠糖尿病患者用枸杞代替', steps: ['小米洗净，红枣去核', '锅加水烧开', '加小米红枣', '小火煮20分钟', '加枸杞红糖搅匀出锅'] },
  { id: 'pg_022', name: '鸡汤蒸蛋', category: 'pregnancy', nutrients: ['蛋白质', '钙', '磷', '维生素A'], trimester: ['early', 'mid', 'late'], calories: 180, cookTime: 20, difficulty: 'easy', desc: '容易消化，孕期理想蛋白质来源', ingredients: ['鸡蛋2个', '鸡汤150ml', '盐极少', '葱花少许'], tags: ['易消化', '高蛋白', '温补'], nutrition: '鸡汤提鲜增加口感，鸡蛋氨基酸完整，消化利用率高', caution: '盐要极少，孕期高血压者更要控钠', steps: ['鸡蛋打散加鸡汤搅匀', '过筛去气泡', '调极少盐', '蒸锅上汽蒸12分钟', '出锅撒葱花'] },
  { id: 'pg_023', name: '芦笋炒虾仁', category: 'pregnancy', nutrients: ['叶酸', '蛋白质', '膳食纤维', '钾'], trimester: ['early', 'mid'], calories: 190, cookTime: 12, difficulty: 'easy', desc: '芦笋叶酸之王，配虾仁蛋白质完美', ingredients: ['芦笋200g', '虾仁100g', '蒜3瓣', '盐2g', '黑胡椒少许', '食用油5ml'], tags: ['叶酸', '高蛋白', '孕早期'], nutrition: '芦笋叶酸含量高，是孕早期必备蔬菜，虾仁补充蛋白质', caution: '孕早期是补充叶酸黄金期，食补+叶酸补剂双管齐下', steps: ['芦笋折断老根斜切', '虾仁去虾线', '锅热少油爆香蒜', '加虾仁炒至变色', '加芦笋翻炒调盐'] },
  { id: 'pg_024', name: '胡萝卜玉米排骨汤', category: 'pregnancy', nutrients: ['维生素A', '钙', '磷', '维生素C'], trimester: ['mid', 'late'], calories: 320, cookTime: 90, difficulty: 'easy', desc: '促进视觉发育，钙磷比例适宜', ingredients: ['排骨200g', '胡萝卜2根', '玉米1根', '姜3片', '盐2g'], tags: ['视觉发育', '补钙', '滋补汤'], nutrition: '胡萝卜β-胡萝卜素丰富，玉米含维生素B，排骨钙磷均衡', caution: '汤中浮沫去除干净，排骨高嘌呤痛风患者少食', steps: ['排骨焯水去血沫', '胡萝卜玉米切块', '锅加水放排骨姜', '大火烧开转小火炖60分钟', '加胡萝卜玉米炖20分钟调盐'] },
  { id: 'pg_025', name: '藕片炒肉', category: 'pregnancy', nutrients: ['铁', '维生素C', '膳食纤维', '钾'], trimester: ['mid', 'late'], calories: 230, cookTime: 15, difficulty: 'easy', desc: '藕补铁止血，孕期调理好帮手', ingredients: ['鲜藕200g', '猪里脊80g', '盐2g', '生抽5ml', '葱10g'], tags: ['补铁', '止血', '清热'], nutrition: '鲜藕含铁和维C，猪肉血红素铁，双重补铁效果好', caution: '藕性偏凉，孕早期体质寒凉者炒熟再吃', steps: ['藕去皮切片泡水', '猪肉切薄片腌制', '锅热少油炒肉至熟', '加藕片大火翻炒', '调盐出锅撒葱花'] },
  { id: 'pg_026', name: '菠菜鸡蛋面', category: 'pregnancy', nutrients: ['叶酸', '铁', '蛋白质', '维生素K'], trimester: ['early', 'mid', 'late'], calories: 310, cookTime: 20, difficulty: 'easy', desc: '简单营养主食，叶酸铁质一碗齐', ingredients: ['菠菜100g', '鸡蛋2个', '面条100g', '生抽5ml', '芝麻油2ml', '盐少许'], tags: ['叶酸', '简单主食', '营养均衡'], nutrition: '菠菜叶酸丰富，鸡蛋完整蛋白，面条提供能量', caution: '菠菜含草酸，提前焯水减少草酸，避免影响钙吸收', steps: ['菠菜焯水切段', '鸡蛋炒熟', '面条煮熟', '加菠菜鸡蛋', '淋生抽芝麻油调盐'] },
  { id: 'pg_027', name: '黑豆猪蹄汤', category: 'pregnancy', nutrients: ['植物雌激素', '铁', '胶原蛋白', '钙'], trimester: ['late'], calories: 360, cookTime: 120, difficulty: 'easy', desc: '孕晚期为哺乳准备，胶原蛋白丰富', ingredients: ['猪蹄2只', '黑豆50g', '花生30g', '姜3片', '盐2g'], tags: ['催乳', '胶原蛋白', '孕晚期'], nutrition: '黑豆含植物雌激素和铁，猪蹄胶原蛋白为哺乳做准备', caution: '猪蹄高脂，孕期体重管理要控制食用频率', steps: ['猪蹄斩块焯水', '黑豆花生提前泡发', '锅加水放猪蹄黑豆花生姜', '大火烧开转小火炖90分钟', '加花生再炖20分钟调盐'] },
  { id: 'pg_028', name: '清蒸冬瓜虾', category: 'pregnancy', nutrients: ['钾', '维生素C', '蛋白质', '锌'], trimester: ['late'], calories: 170, cookTime: 20, difficulty: 'easy', desc: '消水肿利尿，孕晚期必备', ingredients: ['冬瓜300g', '虾6只', '蒸鱼豉油10ml', '姜3片', '葱2根'], tags: ['消肿', '孕晚期', '低卡'], nutrition: '冬瓜利水消肿，低钠高钾，孕晚期浮肿者推荐', caution: '冬瓜性凉，体寒者少量', steps: ['冬瓜去皮切片铺盘', '虾洗净去虾线', '虾放冬瓜上', '加姜片', '蒸锅大火蒸12分钟，出锅淋豉油撒葱花'] },
  { id: 'pg_029', name: '蓝莓奶昔', category: 'pregnancy', nutrients: ['花青素', '维生素C', '钙', '益生菌'], trimester: ['early', 'mid', 'late'], calories: 220, cookTime: 5, difficulty: 'easy', desc: '抗氧化花青素，护眼明目', ingredients: ['蓝莓80g', '牛奶200ml', '香蕉半根', '蜂蜜5g'], tags: ['花青素', '护眼', '抗氧化'], nutrition: '蓝莓花青素对眼部发育和抗氧化有益，牛奶补钙', caution: '蓝莓含草酸不宜过多，奶昔喝常温或温热', steps: ['蓝莓洗净', '香蕉切段', '所有食材放入料理机', '加牛奶打匀', '倒入杯中淋蜂蜜'] },
  { id: 'pg_030', name: '山药蒸排骨', category: 'pregnancy', nutrients: ['钙', '磷', '锌', '蛋白质'], trimester: ['mid', 'late'], calories: 300, cookTime: 40, difficulty: 'easy', desc: '健脾补肺，孕期温和滋补', ingredients: ['排骨200g', '山药150g', '枸杞10g', '盐少许', '姜3片'], tags: ['健脾', '温和滋补', '钙磷'], nutrition: '山药健脾助消化，排骨含钙磷，蒸制营养损失最少', caution: '山药有助缓解孕期便秘，排骨焯水去血水再蒸', steps: ['排骨焯水，山药去皮切段', '排骨山药姜枸杞拌匀', '加少量盐腌10分钟', '上蒸锅大火蒸30分钟', '出锅即可'] },
];

// ==================== 云数据库批量写入 ====================

const batchInsert = async (db, collectionName, dataList) => {
  const results = { success: 0, fail: 0, total: dataList.length };
  for (const item of dataList) {
    try {
      await db.collection(collectionName).add({
        data: { ...item, createdAt: db.serverDate(), updatedAt: db.serverDate() },
      });
      results.success++;
    } catch (err) {
      console.error(`[data-init] 写入失败 ${item.id || item.name}:`, err.message);
      results.fail++;
    }
  }
  return results;
};

const clearCollection = async (db, collectionName) => {
  try {
    const result = await db.collection(collectionName).get();
    let deleted = 0;
    for (const item of result.data) {
      await db.collection(collectionName).doc(item._id).remove();
      deleted++;
    }
    return deleted;
  } catch (err) {
    console.error(`[data-init] 清空失败 ${collectionName}:`, err.message);
    return 0;
  }
};

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
  console.log('[data-init] v3.0 action:', action);

  try {
    switch (action) {

      case 'status': {
        const status = await getStatus(db);
        return { code: 0, message: '查询成功', data: status };
      }

      case 'init_cuisines': {
        const cleared = await clearCollection(db, COLLECTIONS.CUISINES);
        const result = await batchInsert(db, COLLECTIONS.CUISINES, CUISINES_DATA);
        return { code: 0, message: `菜系数据初始化完成，清除${cleared}条旧数据`, data: { ...result, collection: COLLECTIONS.CUISINES } };
      }

      case 'init_fat_loss': {
        const cleared = await clearCollection(db, COLLECTIONS.FAT_LOSS_MEALS);
        const result = await batchInsert(db, COLLECTIONS.FAT_LOSS_MEALS, FAT_LOSS_DATA);
        return { code: 0, message: `减脂餐数据初始化完成，清除${cleared}条旧数据`, data: { ...result, collection: COLLECTIONS.FAT_LOSS_MEALS } };
      }

      case 'init_pregnancy': {
        const cleared = await clearCollection(db, COLLECTIONS.PREGNANCY_MEALS);
        const result = await batchInsert(db, COLLECTIONS.PREGNANCY_MEALS, PREGNANCY_DATA);
        return { code: 0, message: `孕妇营养餐数据初始化完成，清除${cleared}条旧数据`, data: { ...result, collection: COLLECTIONS.PREGNANCY_MEALS } };
      }

      case 'init_all': {
        const allResults = {};
        allResults.cuisines = { cleared: await clearCollection(db, COLLECTIONS.CUISINES), ...await batchInsert(db, COLLECTIONS.CUISINES, CUISINES_DATA) };
        allResults.fatLoss = { cleared: await clearCollection(db, COLLECTIONS.FAT_LOSS_MEALS), ...await batchInsert(db, COLLECTIONS.FAT_LOSS_MEALS, FAT_LOSS_DATA) };
        allResults.pregnancy = { cleared: await clearCollection(db, COLLECTIONS.PREGNANCY_MEALS), ...await batchInsert(db, COLLECTIONS.PREGNANCY_MEALS, PREGNANCY_DATA) };
        return { code: 0, message: '全量数据初始化完成（v3.0）', data: allResults };
      }

      case 'clear_all': {
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
