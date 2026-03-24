/**
 * 菜系服务云函数 - cuisine-service
 * 功能：
 *   1. 获取菜系列表（支持云数据库存储）
 *   2. 保存用户生成的菜谱到云数据库
 *   3. 获取用户历史菜谱
 *   4. AI生成指定菜系风格的菜谱
 *   5. 获取减脂餐列表（支持热量筛选）
 *   6. 获取孕妇营养餐列表（支持孕期阶段筛选）
 * 版本：2.1.0
 */

'use strict';

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

// ==================== 常量配置 ====================

// 集合名称
const COLLECTIONS = {
  RECIPES: 'recipes',               // 用户生成的菜谱
  CUISINE_LIKES: 'cuisine_likes',   // 菜系收藏/点赞
  CUISINES: 'cuisines',             // 菜系基础数据
  FAT_LOSS_MEALS: 'fat_loss_meals', // 减脂餐系列
  PREGNANCY_MEALS: 'pregnancy_meals', // 孕妇营养餐系列
};

// AI 配置
const AI_PROVIDER = 'hunyuan-exp';
const HUNYUAN_MODEL = 'hunyuan-turbos-latest';
const CALL_TIMEOUT = 35000;

// ==================== 错误码 ====================

const ERROR_CODES = {
  SUCCESS: 0,
  PARAM_ERROR: 1,
  DB_ERROR: 2,
  AI_ERROR: 3,
  NOT_FOUND: 4,
  TIMEOUT: 5,
};

// ==================== 数据库操作 ====================

/**
 * 保存生成的菜谱到云数据库
 */
const saveRecipe = async (openid, recipe, cuisineId, ingredients) => {
  const db = cloud.database();

  try {
    const result = await db.collection(COLLECTIONS.RECIPES).add({
      data: {
        openid,
        recipe,
        cuisineId: cuisineId || null,
        ingredients: ingredients || [],
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
        likeCount: 0,
        shareCount: 0,
      },
    });

    return { success: true, id: result._id };
  } catch (err) {
    console.error('[cuisine-service] 保存菜谱失败：', err);
    throw err;
  }
};

/**
 * 获取用户历史菜谱
 */
const getUserRecipes = async (openid, page = 1, pageSize = 10) => {
  const db = cloud.database();
  const skip = (page - 1) * pageSize;

  try {
    const countResult = await db.collection(COLLECTIONS.RECIPES)
      .where({ openid })
      .count();

    const result = await db.collection(COLLECTIONS.RECIPES)
      .where({ openid })
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    return {
      total: countResult.total,
      list: result.data,
      page,
      pageSize,
    };
  } catch (err) {
    console.error('[cuisine-service] 获取历史菜谱失败：', err);
    throw err;
  }
};

/**
 * 点赞菜谱
 */
const likeRecipe = async (openid, recipeId) => {
  const db = cloud.database();
  const _ = db.command;

  try {
    // 检查是否已点赞
    const likeKey = `${openid}_${recipeId}`;
    const likeResult = await db.collection(COLLECTIONS.CUISINE_LIKES)
      .where({ likeKey })
      .count();

    if (likeResult.total > 0) {
      return { success: true, liked: false, message: '已取消点赞' };
    }

    // 添加点赞记录
    await db.collection(COLLECTIONS.CUISINE_LIKES).add({
      data: {
        likeKey,
        openid,
        recipeId,
        createdAt: db.serverDate(),
      },
    });

    // 更新菜谱点赞数
    await db.collection(COLLECTIONS.RECIPES).doc(recipeId).update({
      data: {
        likeCount: _.inc(1),
      },
    });

    return { success: true, liked: true, message: '点赞成功' };
  } catch (err) {
    console.error('[cuisine-service] 点赞失败：', err);
    throw err;
  }
};

// ==================== AI 菜系菜谱生成 ====================

/**
 * 构建菜系专属系统提示词
 */
const buildCuisineSystemPrompt = (cuisineName, cuisineDesc) => {
  return `你是一位专精于${cuisineName}的厨师助手，名叫"小厨AI"。
${cuisineDesc || ''}

你的任务是根据用户提供的食材，生成一道正宗的${cuisineName}菜谱。

输出要求：
1. 必须严格以 JSON 格式输出，不包含任何 Markdown 代码块标记
2. 菜谱必须体现${cuisineName}的典型风味特点
3. JSON 结构如下：
{
  "name": "菜名",
  "description": "一句话描述（须体现${cuisineName}风味特点）",
  "cookTime": 烹饪时间（分钟，数字），
  "difficulty": "难度（简单/中等/困难）",
  "servings": 份量（人数，数字），
  "ingredients": [{"name": "食材名", "amount": "用量", "unit": "单位"}],
  "steps": [{"step": 步骤号, "description": "步骤说明", "tip": "小贴士或null"}],
  "nutrition": {"calories": 热量, "protein": 蛋白质g, "carbs": 碳水g, "fat": 脂肪g},
  "tags": ["标签1", "标签2"],
  "cuisineStyle": "${cuisineName}"
}
4. 仅输出一个可被 JSON.parse 直接解析的 JSON 对象`;
};

/**
 * 用指定菜系风格 AI 生成菜谱
 */
const generateCuisineRecipe = async (ingredients, cookTime, difficulty, cuisineName, cuisineDesc, extraReq) => {
  const model = cloud.ai.createModel(AI_PROVIDER);

  const ingStr = Array.isArray(ingredients) ? ingredients.join('、') : String(ingredients);
  const diffMap = { easy: '简单', medium: '中等', hard: '困难', 简单: '简单', 中等: '中等', 困难: '困难' };
  const diffText = diffMap[difficulty] || '简单';

  const userPrompt = `我有以下食材：${ingStr}

请帮我生成一道正宗${cuisineName}风格的菜谱：
- 烹饪时间：${cookTime}分钟以内
- 难度：${diffText}
- 特别要求：${extraReq || '无'}

请严格按照${cuisineName}的烹调技法和调味习惯来制作，直接输出 JSON 格式菜谱。`;

  const requestPromise = async () => {
    const res = await model.streamText({
      model: HUNYUAN_MODEL,
      messages: [
        { role: 'system', content: buildCuisineSystemPrompt(cuisineName, cuisineDesc) },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.75,
      max_tokens: 1200,
    });

    let rawText = '';
    for await (const chunk of res.textStream) {
      rawText += chunk;
    }

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('AI返回内容为空');
    }

    // 解析 JSON
    let recipe = null;
    try {
      recipe = JSON.parse(rawText.trim());
    } catch (e) {
      const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) recipe = JSON.parse(match[1].trim());
      else {
        const fb = rawText.indexOf('{');
        const lb = rawText.lastIndexOf('}');
        if (fb !== -1 && lb > fb) recipe = JSON.parse(rawText.substring(fb, lb + 1));
      }
    }

    if (!recipe) throw new Error('无法解析AI返回的菜谱数据');

    // 补全字段
    return {
      name: recipe.name || '未命名菜谱',
      description: recipe.description || '',
      cookTime: Number(recipe.cookTime) || cookTime,
      difficulty: recipe.difficulty || diffText,
      servings: Number(recipe.servings) || 2,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      steps: Array.isArray(recipe.steps) ? recipe.steps : [],
      nutrition: {
        calories: Number((recipe.nutrition || {}).calories) || 0,
        protein: Number((recipe.nutrition || {}).protein) || 0,
        carbs: Number((recipe.nutrition || {}).carbs) || 0,
        fat: Number((recipe.nutrition || {}).fat) || 0,
      },
      tags: Array.isArray(recipe.tags) ? recipe.tags : [],
      cuisineStyle: cuisineName,
    };
  };

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('AI调用超时')), CALL_TIMEOUT)
  );

  return Promise.race([requestPromise(), timeoutPromise]);
};

// ==================== 云函数主入口 ====================

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { action } = event;

  console.log(`[cuisine-service] action=${action}, openid=${openid}`);

  try {
    switch (action) {

      // 保存生成的菜谱
      case 'saveRecipe': {
        const { recipe, cuisineId, ingredients } = event;
        if (!recipe) {
          return { code: ERROR_CODES.PARAM_ERROR, message: '菜谱数据不能为空', data: null };
        }
        const result = await saveRecipe(openid, recipe, cuisineId, ingredients);
        return { code: ERROR_CODES.SUCCESS, message: 'success', data: result };
      }

      // 获取用户历史菜谱
      case 'getUserRecipes': {
        const { page = 1, pageSize = 10 } = event;
        const result = await getUserRecipes(openid, page, pageSize);
        return { code: ERROR_CODES.SUCCESS, message: 'success', data: result };
      }

      // 点赞菜谱
      case 'likeRecipe': {
        const { recipeId } = event;
        if (!recipeId) {
          return { code: ERROR_CODES.PARAM_ERROR, message: 'recipeId不能为空', data: null };
        }
        const result = await likeRecipe(openid, recipeId);
        return { code: ERROR_CODES.SUCCESS, message: 'success', data: result };
      }

      // 用菜系风格生成菜谱
      case 'generateCuisineRecipe': {
        const { ingredients, cookTime = 30, difficulty = 'easy', cuisineName, cuisineDesc, extraReq } = event;
        if (!ingredients || ingredients.length === 0) {
          return { code: ERROR_CODES.PARAM_ERROR, message: '食材不能为空', data: null };
        }
        if (!cuisineName) {
          return { code: ERROR_CODES.PARAM_ERROR, message: '菜系名称不能为空', data: null };
        }
        const recipe = await generateCuisineRecipe(
          ingredients, cookTime, difficulty, cuisineName, cuisineDesc, extraReq
        );
        return { code: ERROR_CODES.SUCCESS, message: 'success', data: { recipe } };
      }

      // 获取减脂餐列表（从云数据库读取）
      case 'getFatLossMeals': {
        const { maxCalories, limit = 30, page = 1 } = event;
        const db = cloud.database();
        const _ = db.command;
        const skip = (page - 1) * limit;

        try {
          let query = db.collection(COLLECTIONS.FAT_LOSS_MEALS);
          if (maxCalories && maxCalories > 0) {
            query = query.where({ calories: _.lte(maxCalories) });
          }

          const countResult = await query.count();
          const result = await query.skip(skip).limit(limit).get();

          return {
            code: ERROR_CODES.SUCCESS,
            message: 'success',
            data: {
              list: result.data,
              total: countResult.total,
              page,
              limit,
            },
          };
        } catch (dbErr) {
          console.error('[cuisine-service] 获取减脂餐失败:', dbErr);
          return { code: ERROR_CODES.DB_ERROR, message: '获取减脂餐数据失败', data: null };
        }
      }

      // 获取孕妇营养餐列表（从云数据库读取）
      case 'getPregnancyMeals': {
        const { trimester, nutrient, limit = 30, page = 1 } = event;
        const db = cloud.database();
        const _ = db.command;
        const skip = (page - 1) * limit;

        try {
          let whereClause = {};
          if (trimester) {
            whereClause.trimester = _.elemMatch(_.eq(trimester));
          }

          let query = db.collection(COLLECTIONS.PREGNANCY_MEALS);
          if (Object.keys(whereClause).length > 0) {
            query = query.where(whereClause);
          }

          const countResult = await query.count();
          let list = (await query.skip(skip).limit(limit).get()).data;

          // 按营养素关键词过滤（云数据库不支持数组内字符串模糊，前端过滤）
          if (nutrient) {
            list = list.filter(m =>
              m.nutrients && m.nutrients.some(n =>
                n.includes(nutrient) || nutrient.includes(n)
              )
            );
          }

          return {
            code: ERROR_CODES.SUCCESS,
            message: 'success',
            data: {
              list,
              total: countResult.total,
              page,
              limit,
            },
          };
        } catch (dbErr) {
          console.error('[cuisine-service] 获取孕妇营养餐失败:', dbErr);
          return { code: ERROR_CODES.DB_ERROR, message: '获取孕妇营养餐数据失败', data: null };
        }
      }

      // 获取菜系列表（从云数据库读取）
      case 'getCuisines': {
        const { limit = 30, page = 1 } = event;
        const db = cloud.database();
        const skip = (page - 1) * limit;

        try {
          const countResult = await db.collection(COLLECTIONS.CUISINES).count();
          const result = await db.collection(COLLECTIONS.CUISINES)
            .orderBy('sortOrder', 'asc')
            .skip(skip)
            .limit(limit)
            .get();

          return {
            code: ERROR_CODES.SUCCESS,
            message: 'success',
            data: {
              list: result.data,
              total: countResult.total,
              page,
              limit,
            },
          };
        } catch (dbErr) {
          console.error('[cuisine-service] 获取菜系列表失败:', dbErr);
          return { code: ERROR_CODES.DB_ERROR, message: '获取菜系数据失败', data: null };
        }
      }

      default:
        return { code: ERROR_CODES.PARAM_ERROR, message: `未知操作：${action}`, data: null };
    }
  } catch (err) {
    console.error(`[cuisine-service] 操作失败：`, err);
    return {
      code: err.code || ERROR_CODES.DB_ERROR,
      message: err.message || '服务异常，请稍后重试',
      data: null,
    };
  }
};
