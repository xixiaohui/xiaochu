# 小厨AI 小程序项目 - Claude开发指南

## 项目概述
**项目名称**: 小厨AI  
**描述**: 基于腾讯混元大模型的个性化烹饪助手微信小程序  
**技术栈**: 
- 前端: 微信小程序原生框架
- 后端: 腾讯云开发 (CloudBase)
- AI: 腾讯混元大模型 API
- 版本控制: Git

## 项目结构
xiaochuai/ ├── CLAUDE.md # Claude开发指南（本文件） ├── package.json # 项目配置 ├── miniprogram/ # 小程序前端代码 │ ├── app.js │ ├── app.json │ ├── app.wxss │ ├── pages/ │ │ ├── recipe/ # 食谱页面 │ │ ├── profile/ # 个人中心 │ │ ├── community/ # 社区页面 │ │ ├── shopping/ # 商城页面 │ │ └── meal-plan/ # 周食谱规划页面 │ ├── components/ # 可复用组件 │ │ ├── recipe-card/ │ │ ├── ingredient-input/ │ │ ├── ad-banner/ # 广告组件 │ │ └── member-dialog/ │ ├── utils/ │ │ ├── api.js # API调用统一接口 │ │ ├── ai-service.js # AI服务调用 │ │ ├── cache.js # 缓存管理 │ │ ├── storage.js # 本地存储管理 │ │ └── analytics.js # 数据分析 │ └── styles/ │ └── common.wxss ├── cloud-functions/ # 云函数代码 │ ├── recipe-generate/ # 食谱生成云函数 │ │ ├── index.js │ │ └── package.json │ ├── meal-plan-generate/ # 周规划生成云函数 │ │ ├── index.js │ │ └── package.json │ ├── image-recognize/ # 图像识别云函数 │ │ ├── index.js │ │ └── package.json │ ├── user-service/ # 用户服务云函数 │ │ ├── index.js │ │ └── package.json │ └── notification/ # 推送通知云函数 │ ├── index.js │ └── package.json ├── database/ # 数据库定义 │ ├── users.json # 用户表schema │ ├── recipes.json # 食谱表schema │ ├── user-preferences.json # 用户偏好表schema │ └── purchase-history.json # 购买历史表schema ├── prompts/ # AI Prompt库 │ ├── recipe-generation.md │ ├── meal-planning.md │ ├── cooking-guidance.md │ ├── content-generation.md │ └── nutrition-analysis.md ├── tests/ # 测试文件 │ ├── unit/ │ ├── integration/ │ └── mock-data/ ├── docs/ # 文档 │ ├── API.md │ ├── DEPLOYMENT.md │ ├── ARCHITECTURE.md │ └── MONETIZATION.md ├── .gitignore ├── .env.example # 环境变量示例 └── README.md


## 代码规范

### 前端规范
- **文件命名**: kebab-case (my-component.js)
- **变量命名**: camelCase
- **函数命名**: camelCase，动词开头 (getRecipe, handleSubmit)
- **常量命名**: CONSTANT_CASE
- **缩进**: 2个空格
- **代码注释**: 中文注释，关键逻辑必须有说明

示例:
```javascript
// 获取用户的个性化食谱
async function getUserPersonalizedRecipe(userId, preferences) {
  const cacheKey = `recipe_${userId}`;
  const cached = await getCache(cacheKey);
  
  if (cached) {
    return cached; // 优先返回缓存，节省token
  }
  
  // 调用AI服务
  const recipe = await AIService.generateRecipe(preferences);
  
  // 缓存5分钟
  await setCache(cacheKey, recipe, 5 * 60);
  
  return recipe;
}
云函数规范
云函数入口函数签名: async function main(event, context)
错误处理: 必须使用try-catch，返回标准JSON
返回格式: 统一返回 { code, message, data }
日志记录: 使用console.log记录关键步骤
示例:

Copy// cloud-functions/recipe-generate/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: process.env.CLOUD_ENV_ID
});

const hunyuan = require('./hunyuan-sdk'); // 混元SDK

exports.main = async (event, context) => {
  try {
    const { ingredients, cookingLevel, dietaryGoal } = event;
    
    // 调用混元API生成食谱
    const recipe = await hunyuan.generateRecipe({
      ingredients,
      cookingLevel,
      dietaryGoal
    });
    
    // 返回成功响应
    return {
      code: 200,
      message: 'success',
      data: recipe
    };
  } catch (error) {
    console.error('Recipe generation error:', error);
    return {
      code: 500,
      message: error.message,
      data: null
    };
  }
};
Copy
AI Token管理
Token预算分配
总预算: 1亿 tokens (180天)
日均预算: 约556万 tokens
月均预算: 约1400万 tokens
功能Token消耗标准
功能	消耗	优化建议
快速食谱	100 tokens	使用缓存、精简格式
实时对话	300 tokens	流式返回、上下文精简
周食谱规划	1200 tokens	批量生成、复用框架
营养报告	1500 tokens	定时生成、缓存
内容生成	800 tokens	模板化、批处理
Git工作流
分支策略
main: 正式版本分支，只接受PR
develop: 开发分支
feature/*: 功能分支 (feature/recipe-page)
bugfix/*: 修复分支 (bugfix/cache-issue)
Commit规范
type(scope): subject

body

footer
类型:

feat: 新功能
fix: 修复
refactor: 重构
docs: 文档
style: 代码风格
perf: 性能优化
test: 测试
示例:

feat(recipe): 实现食谱快速生成功能

- 接入混元API
- 实现5分钟缓存
- 支持食材识别

关联任务: #12
环境配置
必需环境变量 (.env)
# 微信小程序
WEIXIN_APP_ID=your_app_id
WEIXIN_APP_SECRET=your_app_secret

# 腾讯云
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
CLOUD_ENV_ID=your_env_id

# 混元API
HUNYUAN_API_KEY=your_api_key
HUNYUAN_SECRET_KEY=your_secret_key

# 应用配置
APP_ENV=development
LOG_LEVEL=debug
开发命令
Copy# 安装依赖
npm install

# 启动本地开发（需要微信开发者工具）
npm run dev

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 部署云函数
npm run deploy:cloud

# 生成部署包
npm run build

# 提交代码规范检查
npm run lint

# 提交前检查
npm run pre-commit
测试要求
提交代码前必须满足:

✅ 通过所有单元测试 (npm run test:unit)
✅ 通过所有集成测试 (npm run test:integration)
✅ 通过Lint检查 (npm run lint)
✅ 没有console.error
✅ Token消耗评估 (大于100 tokens的功能需要评估)
常见任务的Prompt模板
新增页面功能
[见下方详细部分]

修复已知BUG
[见下方详细部分]

优化Token消耗
[见下方详细部分]

贡献指南
从develop分支创建feature分支
完成功能开发和测试
提交PR到develop
代码审查通过后merge
定期从develop merge到main进行发布

---

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

---

#### **prompts/meal-planning.md** - 周规划Prompt库

```markdown
# 周食谱规划Prompt库

## Prompt: 智能周规划 + 购物清单

### 完整实现示例
```javascript
// cloud-functions/meal-plan-generate/index.js
const cloud = require('wx-server-sdk');

exports.main = async (event, context) => {
  const {
    userId,
    dietaryGoal,
    ingredients,
    budget,
    familySize,
    restrictions = []
  } = event;
  
  // Step 1: 生成周食谱
  const mealPlanPrompt = `
【用户档案】
目标：${dietaryGoal}
人数：${familySize}人
可用食材：${ingredients.join('、')}
周预算：￥${budget}
禁忌：${restrictions.join('、') || '无'}

【任务】生成科学的7天三餐食谱及购物清单

【输出格式】
# 7天食谱规划

## 第1天
**早餐**：[菜名] (预计成本 ¥X)
- 食材：[清单]
- 做法：[2-3步]

**午餐**：[菜名]
**晚餐**：[菜名]

## 购物清单
[按类别列出需购买的食材]

【约束条件】
- 营养均衡，满足${dietaryGoal}目标
- 食材循环使用，减少浪费
- 尽量使用已有食材
- 总成本 ≤ ￥${budget}
    `;
  
  const mealPlan = await callHunyuanAPI(mealPlanPrompt);
  
  // Step 2: 保存到数据库
  const db = cloud.database();
  await db.collection('meal_plans').add({
    data: {
      userId,
      mealPlan: mealPlan.data,
      createdAt: new Date(),
      week: getCurrentWeek()
    }
  });
  
  return {
    code: 200,
    message: 'success',
    data: mealPlan
  };
};

function getCurrentWeek() {
  const now = new Date();
  return Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000));
}
从Prompt到产品的完整链路
用户输入（食材+目标）
        ↓
云函数接收请求
        ↓
[Token评估] - 检查是否需要调用AI还是使用缓存
        ↓
构建Prompt（注入用户数据）
        ↓
调用混元API
        ↓
[缓存存储] - 将结果缓存5-7天
        ↓
返回给小程序前端
        ↓
前端展示 + 用户交互
        ↓
保存用户反馈 → 优化下次生成

---

#### **prompts/content-generation.md** - 内容生成与营销Prompt库

```markdown
# 内容生成与营销Prompt库

## 运营内容自动生成系统

### Prompt: 多平台内容自动生成

```javascript
// cloud-functions/content-generation/index.js
const cloud = require('wx-server-sdk');

// 内容生成的统一接口
exports.generateContent = async (event) => {
  const {
    contentType,    // 'xiaohongshu', 'weibo', 'article', 'video-script'
    topic,          // 内容主题
    targetAudience, // 目标用户
    tone            // 语气：'professional', 'casual', 'funny'
  } = event;
  
  const prompts = {
    xiaohongshu: generateXiaohongshuContent,
    weibo: generateWeiboContent,
    article: generateArticleContent,
    videoScript: generateVideoScript
  };
  
  const contentGenerator = prompts[contentType];
  const content = await contentGenerator(topic, targetAudience, tone);
  
  // 保存生成的内容
  await saveGeneratedContent(contentType, content);
  
  return {
    code: 200,
    message: 'success',
    data: content
  };
};

// 小红书笔记生成
async function generateXiaohongshuContent(topic, audience, tone) {
  const prompt = `
你是一位小红书内容运营专家，已成功运营3个10万+账号。

【内容主题】：${topic}
【目标用户】：${audience}
【语气】：${tone}

【任务】生成一篇高质量的小红书笔记

【输出格式】：
[🎯 精准标题，15字以内，包含关键词]

[正文段落1 - 建立共鸣，描述痛点]

[正文段落2 - 提供价值，分享经验]

[正文段落3 - 行动号召，引导评论/分享]

[5个高转化率的话题标签]

【小红书爆款特征】：
- 标题新奇、个性化
- 首句要吸引人（有趣、有用、有共鸣）
- 逻辑清晰，避免过长段落
- 包含生活细节和个人经历
- 话题标签相关性高

【植入要点】：
在内容中自然植入"小厨AI"，激发用户下载欲望
  `;
  
  return await callHunyuanAPI(prompt);
}

// 微博段子生成
async function generateWeiboContent(topic, audience, tone) {
  const prompt = `
你是一位微博幽默文案写手。

【主题】：${topic}
【目标】：引起${audience}的转发和评论
【风格】：${tone}

【任务】生成3条高转发率的微博文案

每条文案：
- 字数：80-140字
- 首句必须有槽点或有趣观点
- 必须包含1个相关emoji
- 可选：@品牌账号 或 #话题

示例格式：
【文案1】
[吸引人的文案] #小厨AI #烹饪 #生活

【文案2】
[另一个角度的文案]

【文案3】
[第三个文案，更偏专业]

【评判标准】：
- 容易引发共鸣
- 有转发价值
- 语言自然流畅
  `;
  
  return await callHunyuanAPI(prompt);
}

// 长篇文章生成
async function generateArticleContent(topic, audience, tone) {
  const prompt = `
你是一位食品营养领域的专业博主。

【主题】：${topic}
【目标读者】：${audience}
【写作风格】：${tone}

【任务】生成一篇1500字的专业文章

【文章结构】：
# [吸引人的标题]

## 开篇
[2-3段的背景和问题设定，激发读者兴趣]

## 核心内容
[3-4个主要段落，每个段落解决一个问题]
- 包含专业知识
- 提供实用建议
- 举例说明

## 小贴士
[5条黄金法则]

## 总结
[回应开篇，提出行动建议]

[植入CTA：推荐使用小厨AI获得个性化食谱]

【写作要求】：
- 专业但易懂
- 每段不超过150字
- 包含小标题
- 提供可操作的建议
  `;
  
  return await callHunyuanAPI(prompt);
}

// 视频脚本生成
async function generateVideoScript(topic, audience, tone) {
  const prompt = `
你是一位短视频脚本撰写专家。

【主题】：${topic}
【观众】：${audience}
【语气】：${tone}

【任务】生成一份60秒短视频脚本

【视频框架】（每部分约10秒）：

**0-5秒 开场**
[引起注意的开场白或视觉冲击]

**5-30秒 主要内容**
[核心价值展现，分2-3个小段]

**30-55秒 示范或深化**
[实际操作、结果展示或故事讲述]

**55-60秒 结尾**
[号召行动：评论、点赞、关注、下载小厨AI]

【脚本格式】：
[视觉描述] | [语音文案]

示例：
[镜头：打开冰箱] | "你是不是经常打开冰箱，却不知道吃什么？"
[镜头：划手机] | "现在有了小厨AI..."

【短视频要点】：
- 首3秒必须有hook（抓住注意力）
- 节奏快，镜头切换频繁
- 文案简洁有力
- 包含明确的CTA
  `;
  
  return await callHunyuanAPI(prompt);
}

// 保存生成的内容到数据库
async function saveGeneratedContent(type, content) {
  const db = cloud.database();
  await db.collection('generated_content').add({
    data: {
      type,
      content,
      createdAt: new Date(),
      status: 'draft', // draft, published, scheduled
      views: 0,
      engagement: 0
    }
  });
}
内容运营计划表
Copy// 每周自动生成的内容配置
const CONTENT_SCHEDULE = {
  monday: [
    { type: 'xiaohongshu', topic: '本周食材推荐' },
    { type: 'weibo', topic: '周一轻食建议' }
  ],
  wednesday: [
    { type: 'article', topic: '营养专题' },
    { type: 'videoScript', topic: '烹饪技巧' }
  ],
  friday: [
    { type: 'xiaohongshu', topic: '周末菜谱推荐' },
    { type: 'weibo', topic: '周末约饭文案' }
  ]
};

// 自动执行：每周固定时间生成内容
async function scheduledContentGeneration() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
  const todaySchedule = CONTENT_SCHEDULE[today] || [];
  
  for (const task of todaySchedule) {
    await generateContent({
      contentType: task.type,
      topic: task.topic,
      targetAudience: '美食爱好者',
      tone: 'casual'
    });
  }
}
Copy

---

### **三、分阶段实现的Claude Prompt模板**

现在创建一个文件 `IMPLEMENTATION_PROMPTS.md`，包含各个开发阶段的Prompt：

```markdown
# 小厨AI 分阶段实现Prompts

## 💡 使用方法

当你需要开发某个功能时，复制对应的Prompt，粘贴给Claude Sonnet 4.5。
Claude会自动读取你的项目上下文（CLAUDE.md）和代码库，生成适配的代码。

---

## 第一阶段（第1-2周）：MVP快速食谱功能

### Prompt 1.1: 实现快速食谱生成页面和云函数

PROJECT_CONTEXT: xiaochuai TASK: 实现快速食谱生成功能（MVP版本）

需求
前端页面 (miniprogram/pages/recipe/recipe.js)

输入框：用户输入食材（多个，逗号分隔）
输入框：选择烹饪时间（15/30/60分钟）
输入框：选择难度（新手/中级/高手）
按钮：生成食谱
展示区：显示生成的食谱（菜名/步骤/时间/难度）
Loading状态：生成中显示加载动画
云函数 (cloud-functions/recipe-generate/index.js)

接收：ingredients(数组), cookingTime(数字), level(字符串)
调用混元API生成食谱
返回标准格式：{ code, message, data }
错误处理：try-catch，记录error日志
Token优化：返回结果不超过200字
缓存层 (miniprogram/utils/cache.js)

实现localStorage缓存
缓存Key：recipe_${ingredients_hash}
缓存时间：5分钟
技术要求
遵循CLAUDE.md中的代码规范
函数命名：camelCase，变量注释清晰
使用Promise/async-await
前端需要处理网络错误、超时
云函数需要环境变量.env配置
测试要求
测试文件：tests/unit/recipe-generate.test.js
至少覆盖3个测试用例：
正常生成食谱
网络错误处理
空输入处理
提交要求
代码通过npm run lint
通过npm run test:unit
commit message格式: feat(recipe): 实现快速食谱生成功能
更新README.md的功能列表

### Prompt 1.2: 实现用户首选项存储

PROJECT_CONTEXT: xiaochuai TASK: 实现用户基本档案存储（新手/中级/高手标签）

需求
数据库schema (database/user-preferences.json)

userId: string (微信openid)
cookingLevel: enum (新手/中级/高手)
dietaryGoal: enum (无特殊要求/减脂/增肌/美容)
favoriteIngredients: array
allergens: array (过敏食材)
createdAt: timestamp
updatedAt: timestamp
云函数 (cloud-functions/user-service/index.js)

saveUserPreferences(userId, preferences)
getUserPreferences(userId)
updateUserPreferences(userId, updates)
前端集成 (miniprogram/utils/api.js)

提供API调用接口
登录时自动加载用户档案
首次登录时弹窗引导设置
测试
测试新用户创建
测试现有用户更新
测试登录时加载档案
提交
commit: feat(user): 实现用户档案存储系统

---

## 第二阶段（第3-4周）：会员系统与变现

### Prompt 2.1: 实现会员订阅系统

PROJECT_CONTEXT: xiaochuai TASK: 实现微信虚拟支付+会员订阅功能

需求
会员等级定义

FREE: 免费用户，每天3次查询
MONTHLY: 月卡9.9元，无限查询，无广告
QUARTERLY: 季卡24.9元，折合8.3元/月
YEARLY: 年卡68元，折合5.7元/月
数据库 (database/membership.json)

userId: string
tier: enum (FREE/MONTHLY/QUARTERLY/YEARLY)
expiresAt: timestamp
purchaseHistory: array
queryCount: number (今日查询次数)
queryCountResetTime: timestamp
云函数 (cloud-functions/membership-service/index.js)

checkMembershipStatus(userId)
createOrder(userId, tier) - 返回支付参数
handlePaymentCallback(orderId, paymentInfo)
resetDailyQueryCount() - 每日定时任务
前端 (miniprogram/pages/profile/membership.js)

显示当前会员等级和过期时间
显示升级选项（三个卡片，价格突出）
调用支付接口
支付成功后刷新会员状态
技术细节
使用微信支付JSBridge
支付状态持久化
错误重试机制
测试
测试支付流程（使用沙箱）
测试会员权限生效
测试过期处理
提交
commit: feat(payment): 实现会员订阅和微信支付

### Prompt 2.2: 实现广告系统与流量主变现

PROJECT_CONTEXT: xiaochuai TASK: 实现微信广告组件集成（非会员用户看广告）

需求
广告位置规划

食谱列表底部：banner广告
查看食谱详情后：激励视频广告
个人中心底部：插屏广告
实现 (miniprogram/components/ad-banner/ad-banner.js)

使用微信原生ad组件
仅非会员用户显示
广告加载失败优雅降级
广告统计 (miniprogram/utils/analytics.js)

记录广告展示数
记录广告点击数
每日上报统计数据
代码结构
components/ad-banner/
├── ad-banner.js      # 组件逻辑
├── ad-banner.wxml    # 视图
├── ad-banner.wxss    # 样式
└── ad-banner.json    # 配置
测试
验证广告正确显示
验证非会员/会员的显示逻辑
测试失败情况
提交
commit: feat(ads): 集成微信广告组件和流量主变现

---

## 第三阶段（第5-8周）：周食谱规划

### Prompt 3.1: 实现周食谱规划功能

PROJECT_CONTEXT: xiaochuai TASK: 实现会员专属的7天个性化食谱规划

需求
前端页面 (miniprogram/pages/meal-plan/meal-plan.js)

读取用户档案（cooking level, dietary goal）
显示可用食材列表（从用户历史或推荐）
显示周预算输入框
生成规划按钮
生成后展示7天的食谱
可导出为购物清单
云函数 (cloud-functions/meal-plan-generate/index.js)

输入：userId, 食材列表, 周预算, 饮食目标
调用混元API（注意Token消耗约1200）
解析返回的7天规划
存储到数据库
返回结构化的规划数据
数据库 (database/meal-plans.json)

userId
mealPlan: { day: 1-7, breakfast/lunch/dinner }
shoppingList: 对应的购物清单
createdAt
week: 周编号
Prompt优化
使用缓存：同样的输入（用户+食材+目标）在7天内复用结果
Token预算：周规划每个会员每周调用一次，合理范围
测试
验证规划完整性（7天×3餐）
验证营养均衡性
验证成本不超过预算
提交
commit: feat(meal-plan): 实现7天个性化食谱规划

---

## 第四阶段（第9-12周）：社交裂变和用户增长

### Prompt 4.1: 实现邀请好友和分享功能

PROJECT_CONTEXT: xiaochuai TASK: 实现社交裂变：邀请好友获得会员周卡

需求
邀请码生成 (cloud-functions/referral-service/index.js)

为每个用户生成唯一邀请码（base62编码）
每次邀请成功，邀请者获得1周会员卡
分享功能 (miniprogram/pages/recipe/recipe.js)

点击分享按钮，显示邀请码
可复制邀请码到剪贴板
分享到微信群（带邀请码）
分享小程序卡片时附带邀请码
邀请追踪 (cloud-functions/referral-service/index.js)

记录邀请者和被邀请者的关系
被邀请者首次登录时检测邀请码
自动为邀请者加上1周会员权益
数据库 (database/referrals.json)

referrerId: 邀请者userId
referralCode: 邀请码
referredUser: 被邀请的userId
status: pending/completed
reward: 奖励类型（1week_member_card）
createdAt
测试
测试邀请码生成的唯一性
测试邀请者获得奖励
测试重复邀请处理
提交
commit: feat(referral): 实现邀请好友获得会员周卡

---

## 第五阶段（第13-16周）：课程和电商变现

### Prompt 5.1: 实现课程商城

PROJECT_CONTEXT: xiaochuai TASK: 实现高毛利课程销售（30天减脂食谱、宝宝辅食等）

需求
课程数据结构 (database/courses.json)

courseId
title: string
description: string
price: number
cover: image_url
category: 减脂/增肌/美容/儿童等
lessons: array of { lessonId, title, content }
tags: array
前端课程商城 (miniprogram/pages/shopping/courses.js)

显示课程列表（网格或列表）
课程详情页：完整介绍、购买按钮、评论
已购课程列表：显示用户已购的课程
购买流程

点击购买 → 确认付款 → 支付 → 获得访问权限
调用同步的支付接口（复用Prompt 2.1的支付系统）
云函数 (cloud-functions/course-service/index.js)

getCourses(category) - 获取课程列表
getCourseDetail(courseId) - 获取课程详情
purchaseCourse(userId, courseId) - 购买课程
getUserCourses(userId) - 获取用户已购课程
初始课程内容（使用Prompt生成）
《30天减脂食谱》19.9元 - 使用content-generation.md中的Prompt生成
《宝宝辅食全指南》29.9元
《一周快手菜》9.9元
测试
测试课程购买流程
测试权限控制（未购无法访问内容）
测试订单记录
提交
commit: feat(course): 实现课程商城和销售

---

## 第六阶段（第17-24周）：运营自动化和数据驱动

### Prompt 6.1: 实现自动化内容运营系统

PROJECT_CONTEXT: xiaochuai TASK: 实现每周自动生成运营内容（小红书、微博、文章等）

需求
内容生成系统 (cloud-functions/content-generation/index.js)

见prompts/content-generation.md中的实现
集成定时任务，每周固定时间自动生成内容
生成的内容存储到数据库，标记为draft
内容管理后台 (miniprogram/pages/admin/content-management.js)

显示最近生成的内容列表
支持编辑生成的内容
发布/取消发布按钮
查看发布后的反馈（阅读数、转发数）
发布集成

小红书：调用小红书API或人工复制
微博：调用微博API
公众号：使用公众号同步接口
技术细节
使用云函数的定时任务功能
内容模板库（见content-generation.md）
错误重试机制
提交
commit: feat(content): 实现自动化内容运营系统

---

## 代码提交模板

每次提交代码时，使用标准的Git Commit格式：

```bash
# 功能开发
git commit -m "feat(scope): 功能描述

- 详细改动1
- 详细改动2

关联任务: #12"

# 修复
git commit -m "fix(scope): 修复问题描述

修复原因和方案。

关联任务: #15"

# 重构
git commit -m "refactor(scope): 重构说明

重构前后的差异。

关联任务: #18"
测试提交前Checklist
每次提交前：

Copy# 1. 运行单元测试
npm run test:unit

# 2. 运行集成测试
npm run test:integration

# 3. Lint检查
npm run lint

# 4. 云函数本地测试
npm run test:cloud

# 5. 小程序编译检查
npm run build

# 确认所有检查通过
echo "All checks passed!"

# 提交
git add .
git commit -m "feat(...): ..."
git push origin feature/xxx
快速参考
阶段	周数	主要功能	Token预算
MVP	1-2	快速食谱	500万
变现	3-4	会员+广告	500万
规划	5-8	周规划	4000万
增长	9-12	邀请裂变	2000万
电商	13-16	课程+商城	1500万
运营	17-24	自动化内容	1500万

---

### **四、测试和CI/CD Prompt**

创建文件 `TESTING_PROMPTS.md`：

```markdown
# 测试和部署Prompts

## Prompt: 生成单元测试

PROJECT_CONTEXT: xiaochuai TASK: 为recipe-generate功能编写完整的单元测试

需求
测试文件位置：tests/unit/recipe-generate.test.js
使用Jest框架
覆盖率要求：>80%
测试用例
正常流程：输入有效食材，返回正确格式的食谱
边界情况：空食材列表，应返回错误
超时处理：API响应超过5秒，应返回timeout error
缓存命中：同样的输入调用两次，第二次应返回缓存
混元API错误：API返回500，应捕获并返回标准错误格式
测试覆盖的代码文件
cloud-functions/recipe-generate/index.js
miniprogram/utils/ai-service.js
miniprogram/utils/cache.js
Mock数据要求
Mock混元API响应
Mock localStorage
Mock云函数调用
生成的测试应该能通过
npm run test:unit tests/unit/recipe-generate.test.js


## Prompt: 生成集成测试

PROJECT_CONTEXT: xiaochuai TASK: 编写端到端集成测试，验证完整的食谱生成流程

测试流程
前端发起请求（输入食材）
触发云函数
云函数调用混元API
返回食谱并显示在UI上
测试文件
tests/integration/recipe-flow.test.js

环境设置
使用云开发的测试环境
Mock混元API（不真实调用，节省Token）
预期结果
用户输入 → 云函数调用 → 返回结果 → UI显示
所有步骤应该在5秒内完成

## Prompt: 部署前检查

PROJECT_CONTEXT: xiaochuai TASK: 生成部署前的检查脚本和清单

需求
生成deploy-checklist.js脚本

检查所有环境变量已设置
检查云函数已编译
检查数据库连接正常
检查混元API可访问
生成GitHub Actions工作流 (.github/workflows/deploy.yml)

自动运行测试
自动部署到云函数
自动发送部署通知
生成部署指南 (docs/DEPLOYMENT.md)

详细的部署步骤
回滚方法
常见问题
输出文件
scripts/deploy-checklist.js
.github/workflows/deploy.yml
docs/DEPLOYMENT.md
五、项目初始化脚本
创建 scripts/init-project.js 来快速初始化项目：

Copy#!/usr/bin/env node

/**
 * 小厨AI项目初始化脚本
 * 运行: node scripts/init-project.js
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

const filesToCreate = [
  {
    path: 'database/users.json',
    content: `{
  "collectionName": "users",
  "schema": {
    "openid": { "type": "string", "required": true },
    "nickname": { "type": "string" },
    "avatarUrl": { "type": "string" },
    "createdAt": { "type": "date" },
    "updatedAt": { "type": "date" },
    "membership": { "type": "object" }
  }
}`
  },
  {
    path: 'database/recipes.json',
    content: `{
  "collectionName": "recipes",
  "schema": {
    "recipeId": { "type": "string", "required": true },
    "name": { "type": "string", "required": true },
    "ingredients": { "type": "array" },
    "steps": { "type": "array" },
    "cookingTime": { "type": "number" },
    "difficulty": { "type": "string" },
    "nutrition": { "type": "object" },
    "createdAt": { "type": "date" }
  }
}`
  },
  {
    path: '.env.example',
    content: `# WeChat Mini Program
WEIXIN_APP_ID=your_app_id
WEIXIN_APP_SECRET=your_app_secret

# Tencent Cloud
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
CLOUD_ENV_ID=your_env_id

# Hunyuan API
HUNYUAN_API_KEY=your_api_key
HUNYUAN_SECRET_KEY=your_secret_key

# App Config
APP_ENV=development
LOG_LEVEL=debug
`
  }
];

filesToCreate.forEach(file => {
  const filePath = path.join(projectRoot, file.path);
  const dir = path.dirname(filePath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, file.content);
    console.log(`✅ Created: ${file.path}`);
  } else {
    console.log(`⏭️  Already exists: ${file.path}`);
  }
});

console.log('\n✨ Project initialization complete!');
console.log('Next steps:');
console.log('1. cp .env.example .env');
console.log('2. Edit .env with your actual credentials');
console.log('3. npm install');
console.log('4. npm run dev');