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