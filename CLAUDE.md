# 小厨AI - Claude 项目规范文档

## 项目概述

**项目名称**: 小厨AI（xiaochu）  
**技术栈**: 微信小程序 + 微信云开发 + 腾讯混元大模型  
**项目目标**: 基于 AI 的智能食谱生成小程序，帮助用户根据现有食材快速生成菜谱  

---

## 目录结构

```
webapp/
├── miniprogram/                  # 小程序前端代码
│   ├── pages/
│   │   ├── index/               # 首页
│   │   ├── recipe/              # 食谱生成页（核心功能）
│   │   └── example/             # 示例页
│   ├── utils/
│   │   ├── ai-service.js        # AI 接口统一封装
│   │   └── cache.js             # 本地缓存工具
│   ├── components/              # 公共组件
│   ├── images/                  # 静态图片资源
│   ├── app.js                   # 小程序入口
│   ├── app.json                 # 小程序全局配置
│   └── app.wxss                 # 全局样式
├── cloudfunctions/              # 云函数（注意：非 cloud-functions）
│   ├── quickstartFunctions/     # 示例云函数
│   └── recipe-generate/         # 食谱生成云函数
├── prompts/                     # AI Prompt 模板
│   └── recipe-generation.md    # 食谱生成 Prompt
├── tests/                       # 测试代码
│   └── unit/                    # 单元测试
├── package.json                 # 根目录依赖（Jest 测试）
├── CLAUDE.md                    # 本文件
└── project.config.json          # 微信开发者工具配置
```

---

## 代码规范

### 通用规范

- **缩进**: 2 个空格（不使用 Tab）
- **编码**: UTF-8
- **换行**: LF（Unix 风格）
- **注释语言**: 中文注释，英文代码

### 注释规范

```javascript
// ✅ 正确：所有变量、函数均需中文注释
// 食材列表 - 用户输入的食材数组
const ingredients = [];

/**
 * 生成快速食谱
 * @param {string[]} ingredients - 食材列表
 * @param {number} cookTime - 烹饪时间（分钟）
 * @param {string} difficulty - 难度：easy | medium | hard
 * @returns {Promise<Object>} 食谱对象
 */
async function quickRecipe(ingredients, cookTime, difficulty) {}
```

### JavaScript 规范

- 使用 `const` / `let`，禁止 `var`
- 使用箭头函数（回调场景）
- 使用 `async/await` 替代 Promise 链
- 错误处理必须有 `try/catch`
- 函数单一职责，不超过 50 行

### 微信小程序规范

- Page 数据全部在 `data` 对象中声明
- 使用 `this.setData()` 更新视图
- 网络请求统一走云函数，不直接调用第三方 API
- 页面销毁时清理定时器和监听器

### 云函数规范

- 统一返回格式：`{ code: number, message: string, data: any }`
- `code: 0` 表示成功，非 0 表示错误
- 必须有完整的 `try/catch` 错误处理
- 环境变量通过 `process.env.VARIABLE_NAME` 读取
- 云函数目录位于 `cloudfunctions/`（项目根目录下）

---

## 环境变量配置

云函数中使用的环境变量（在微信云开发控制台配置）：

| 变量名            | 用途               | 示例值                    |
|-------------------|-------------------|--------------------------|
| `HUNYUAN_API_KEY` | 腾讯混元 API 密钥  | `sk-xxxxxxxxxxxxxxxx`    |
| `HUNYUAN_API_URL` | 混元 API 地址      | `https://api.hunyuan.cloud.tencent.com/v1` |

---

## AI 接口规范

### 混元 API 调用格式

```javascript
// 标准请求格式
const requestBody = {
  model: "hunyuan-lite",       // 模型选择：lite / pro / turbo
  messages: [
    { role: "system", content: "系统提示词" },
    { role: "user", content: "用户输入" }
  ],
  temperature: 0.7,            // 0.0-1.0，食谱生成用 0.7
  max_tokens: 1024,            // 最大 Token 数
  stream: false                // 食谱功能不使用流式输出
};
```

### 返回格式标准

```javascript
// 云函数统一返回
{
  code: 0,           // 0=成功, 1=参数错误, 2=AI调用失败, 3=解析失败
  message: "success",
  data: {
    recipe: {},      // 解析后的食谱对象
    rawText: "",     // AI 原始返回文本
    tokensUsed: 0    // 本次调用消耗的 Token 数
  }
}
```

---

## Token 消耗规划

| 功能           | 预计 Token/次 | 月调用量   | 月消耗估算    |
|----------------|--------------|-----------|-------------|
| 快速食谱生成    | ~100 tokens  | 5万次     | 500万 tokens |
| 详细食谱生成    | ~300 tokens  | 2万次     | 600万 tokens |
| 食材识别       | ~50 tokens   | 3万次     | 150万 tokens |

---

## 测试规范

- 测试框架：Jest
- 测试文件位置：`tests/unit/`
- 测试文件命名：`功能名.test.js`
- 每个功能至少 5 个测试用例
- Mock 外部依赖（云函数、AI API）

---

## Git 提交规范

```
feat(recipe): 实现快速食谱生成功能
fix(cache): 修复缓存过期判断逻辑
test(recipe): 添加食谱生成单元测试
docs: 更新项目配置文档
```
