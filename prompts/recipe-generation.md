### **二、分阶段实现Prompt模板库**

现在创建 `prompts/` 目录下的各个Prompt文件：

#### **prompts/recipe-generation.md** - 食谱生成Prompt

```markdown

# 食谱生成Prompt库

## Prompt 1: 快速食谱生成（低Token消耗）

### 使用场景
用户输入食材，快速获取食谱，不超过200字

### 调用代码
```javascript
// miniprogram/utils/ai-service.js
async quickRecipe(ingredients, preferences = {}) {
  const prompt = `
用户提供的食材：${ingredients.join('、')}
烹饪时间偏好：${preferences.cookingTime || '30分钟'}
难度等级：${preferences.level || '中等'}

任务：快速生成一道食谱。

输出格式必须是：
菜名：[菜名]
做菜时间：[时间]
难度：[难度]
步骤：
1. [第一步]
2. [第二步]
3. [第三步]

约束条件：
- 总长度不超过200字
- 只使用提供的食材
- 步骤清晰易执行
  `;
  
  return await callHunyuanAPI(prompt);
}
Prompt 2: 个性化周食谱规划（中等Token消耗）
使用场景
会员用户生成一周的个性化食谱规划

调用代码
Copy// cloud-functions/meal-plan-generate/index.js
async function generateMealPlan(event) {
  const {
    userId,
    dietaryGoal,       // 减脂/增肌/美容/日常
    cookingLevel,      // 新手/中级/高手
    ingredients,       // 可用食材列表
    budget,           // 周预算
    familySize        // 人数
  } = event;
  
  const prompt = `
用户档案：
- 饮食目标：${dietaryGoal}
- 烹饪水平：${cookingLevel}
- 家庭人数：${familySize}
- 周预算：￥${budget}
- 可用食材：${ingredients.join('、')}

任务：生成一份7天个性化食谱规划。

每天输出：
**第X天**
- 早餐：[菜名]（10分钟以内，简餐）
- 午餐：[菜名]（标准餐）
- 晚餐：[菜名]（主菜+配菜）
- 💡 营养提示：[一句话]

约束条件：
- 食材循环使用，减少浪费
- 营养均衡（碳水:蛋白:脂肪 = 50:25:25）
- 符合用户的难度等级
- 总成本不超过预算
- 避免重复菜式
  `;
  
  return await callHunyuanAPI(prompt);
}
Copy
Prompt 3: 实时烹饪指导（高Token消耗，需流式处理）
使用场景
用户在做菜时有问题，实时获得专业指导

调用代码
Copy// miniprogram/pages/recipe/cooking-guide.js
async realTimeCookingGuidance(dishName, step, userQuestion) {
  const prompt = `
你是一位资深烹饪顾问，有15年专业烹饪经验。

用户正在做菜：${dishName}
当前步骤：${step}
用户问题：${userQuestion}

任务：快速诊断问题并给出解决方案。

输出格式：
🔍 问题诊断：[1句话快速诊断]

💡 解决方案（按难度排序）：
1. [最简单的方案] - ★☆☆☆☆
2. [中等方案] - ★★☆☆☆
3. [专业方案] - ★★★☆☆

✨ 专业建议：[1个进阶技巧]

约束条件：
- 总长度不超过150字
- 回答要快（用户在做菜时看）
- 语言简洁，避免过于专业术语
- 优先推荐最简单方案
  `;
  
  // 使用流式调用降低延迟感
  return await callHunyuanAPIStream(prompt);
}
Copy
使用这些Prompt时的Token优化建议
缓存策略
Copy// miniprogram/utils/cache.js
const CACHE_CONFIG = {
  quickRecipe: { ttl: 5 * 60 }, // 5分钟
  mealPlan: { ttl: 7 * 24 * 60 * 60 }, // 7天
  cookingGuidance: { ttl: 10 * 60 } // 10分钟
};

// 实现缓存+AI的混合调用
async function getRecipeWithCache(ingredients, preferences) {
  const cacheKey = generateCacheKey(ingredients, preferences);
  
  // 先查缓存
  const cached = await cache.get(cacheKey);
  if (cached) return cached;
  
  // 缓存未命中，调用AI
  const result = await quickRecipe(ingredients, preferences);
  
  // 保存到缓存
  await cache.set(cacheKey, result, CACHE_CONFIG.quickRecipe.ttl);
  
  return result;
}
Token消耗评估
快速食谱：约100 tokens
周规划：约1200 tokens
实时指导：约300 tokens
内容生成：约800 tokens