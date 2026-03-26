/**
 * 微信云数据库 - 食谱集合初始化脚本
 * 功能：创建并初始化食谱表（recipes）的完整结构和索引
 * 
 * 使用方式：
 * 1. 在微信开发者工具中，进入"云开发"控制台
 * 2. 选择对应的云环境
 * 3. 在"云函数"中新建一个云函数（如 initRecipeDB）
 * 4. 将此代码放入 index.js
 * 5. 部署并触发执行一次即可
 */

'use strict';

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  console.log('[initRecipeDB] 开始初始化食谱数据库...');

  try {
    // ==================== 创建集合和初始记录 ====================
    // 注：微信云数据库会在插入第一条数据时自动创建集合
    // 我们通过插入一个示例文档来初始化集合结构

    const sampleRecipe = {
      // ===== 基础信息 =====
      name: '番茄鸡蛋汤（示例菜谱）',
      description: '清汤鲜美，开胃又营养丰富',
      
      // ===== 烹饪信息 =====
      cookTime: 15,
      difficulty: '简单',
      servings: 2,
      
      // ===== 食材列表 =====
      ingredients: [
        {
          name: '番茄',
          amount: '2',
          unit: '个',
        },
        {
          name: '鸡蛋',
          amount: '3',
          unit: '个',
        },
        {
          name: '盐',
          amount: '2',
          unit: '克',
        },
        {
          name: '油',
          amount: '10',
          unit: '毫升',
        },
      ],
      
      // ===== 烹饪步骤 =====
      steps: [
        {
          step: 1,
          description: '番茄切块，鸡蛋打散',
          tip: '番茄要充分切碎以释放汁液',
        },
        {
          step: 2,
          description: '热油炒番茄块至软烂',
          tip: null,
        },
        {
          step: 3,
          description: '加水烧开，倒入蛋液',
          tip: '蛋液要慢慢倒入形成蛋花',
        },
        {
          step: 4,
          description: '调味后煮2分钟即可',
          tip: null,
        },
      ],
      
      // ===== 营养信息 =====
      nutrition: {
        calories: 120,
        protein: 8.5,
        carbs: 6.2,
        fat: 7.3,
      },
      
      // ===== 标签和分类 =====
      tags: ['汤类', '家常菜', '快手菜', '清汤'],
      category: '汤类',
      cuisineStyle: '中餐',
      
      // ===== 来源追踪 =====
      sourceType: 'ai_generated', // ai_generated | user_submitted | official
      sourceIngredients: ['番茄', '鸡蛋'],
      sourceRequestParams: {
        cookTime: 15,
        difficulty: 'easy',
        extraRequirements: '',
      },
      
      // ===== 元数据 =====
      aiModel: 'hunyuan-turbos-latest',
      tokensUsed: 256,
      rawAIResponse: '{}', // 存储原始AI返回（可选，节省空间可不存）
      
      // ===== 用户反馈 =====
      rating: 0, // 用户评分 0-5
      ratingCount: 0, // 评分人数
      liked: false, // 当前用户是否点赞
      likeCount: 0, // 点赞总数
      userComments: [], // 用户评论数组
      
      // ===== 时间戳 =====
      createdAt: db.serverDate(), // 创建时间
      updatedAt: db.serverDate(), // 更新时间
      expireTime: null, // 可选：过期时间（如需自动删除）
      
      // ===== 其他字段 =====
      version: '2.1.0', // 数据格式版本
      status: 'active', // active | archived | deleted
      isPublic: true, // 是否公开
      author: 'system', // 作者（AI或用户ID）
      views: 0, // 浏览次数
      shares: 0, // 分享次数
    };

    // 插入示例文档来创建集合
    const res = await db.collection('recipes').add({
      data: sampleRecipe,
    });

    console.log('[initRecipeDB] 示例菜谱创建成功，ID：', res._id);

    // ==================== 创建数据库索引（可选但强烈推荐）====================
    // 注：索引需要在云数据库控制面板中手动配置
    // 以下是建议的索引配置（在控制台"索引"标签页中操作）

    console.log('[initRecipeDB] 📌 建议在云数据库控制台创建以下索引：');
    console.log('');
    console.log('【单字段索引】');
    console.log('  - name (升序) - 用于菜谱名称搜索');
    console.log('  - category (升序) - 用于分类过滤');
    console.log('  - difficulty (升序) - 用于难度筛选');
    console.log('  - cookTime (升序) - 用于烹饪时间排序');
    console.log('  - createdAt (降序) - 用于时间排序');
    console.log('  - rating (降序) - 用于评分排序');
    console.log('  - sourceType (升序) - 用于来源过滤');
    console.log('  - status (升序) - 用于状态过滤');
    console.log('  - isPublic (升序) - 用于隐私过滤');
    console.log('');
    console.log('【复合索引】');
    console.log('  - (category 升序, rating 降序) - 分类内按评分排序');
    console.log('  - (difficulty 升序, cookTime 升序) - 按难度和时间排序');
    console.log('  - (isPublic 升序, createdAt 降序) - 公开菜谱按时间排序');
    console.log('  - (sourceType 升序, createdAt 降序) - 按来源和时间排序');
    console.log('');

    return {
      code: 0,
      message: '数据库初始化完成',
      data: {
        collectionName: 'recipes',
        sampleDocId: res._id,
        documentStructure: sampleRecipe,
      },
    };

  } catch (err) {
    console.error('[initRecipeDB] 初始化失败：', err);
    return {
      code: 1,
      message: '初始化失败：' + err.message,
      data: null,
    };
  }
};


// /**
//  * 在你的其他云函数中使用这些查询示例
//  */

// const db = cloud.database();

// // 1. 查询所有活跃的公开菜谱，按评分降序排列
// const recipes = await db
//   .collection('recipes')
//   .where({
//     status: 'active',
//     isPublic: true,
//   })
//   .orderBy('rating', 'desc')
//   .limit(10)
//   .get();

// // 2. 按难度和烹饪时间搜索
// const easyQuickRecipes = await db
//   .collection('recipes')
//   .where({
//     difficulty: '简单',
//     cookTime: db.command.lte(30),
//   })
//   .get();

// // 3. 按分类和AI来源查询
// const aiRecipes = await db
//   .collection('recipes')
//   .where({
//     category: '汤类',
//     sourceType: 'ai_generated',
//   })
//   .orderBy('createdAt', 'desc')
//   .limit(20)
//   .get();

// // 4. 更新菜谱点赞数
// await db
//   .collection('recipes')
//   .doc('docId')
//   .update({
//     data: {
//       likeCount: db.command.inc(1),
//       updatedAt: db.serverDate(),
//     },
//   });
