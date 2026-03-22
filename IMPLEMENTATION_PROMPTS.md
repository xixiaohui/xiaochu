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