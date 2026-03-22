# 小厨AI — 部署与配置指南

> **免费资源包已自动绑定**：`pkg-3l8hj0zy-ai-inspire-free`  
> 有效期：2026-03-22 至 2026-09-18（180天，1亿混元 tokens）  
> **无需配置任何 API Key！**

---

## 快速上手（4 步）

### 第 1 步：填写云开发环境 ID

打开 `miniprogram/app.js`，第 20 行：

```javascript
// ❌ 修改前（空的，云函数无法调用）
env: "",

// ✅ 修改后（填入你的环境ID，格式如 prod-xxxxxx 或 dev-xxxxxx）
env: "prod-xxxxxx",
```

**如何获取环境 ID**：
1. 打开微信开发者工具
2. 点击右上角「云开发」按钮
3. 在云开发控制台顶部即可看到环境ID（格式：`prod-XXXXXXXX`）
4. 复制粘贴到 `app.js`

---

### 第 2 步：升级基础库版本到 3.7.1+

`wx.cloud.extend.AI` 需要基础库 ≥ 3.7.1。

1. 微信开发者工具右上角 → 「详情」
2. 「本地设置」→「调试基础库」
3. 选择 **3.7.1** 或更高版本

---

### 第 3 步：在云开发控制台开启 AI 功能

1. 打开 [云开发控制台](https://tcb.cloud.tencent.com/dev)
2. 选择对应环境
3. 左侧菜单 → **AI**
4. 点击「开启 AI 功能」
5. 确认资源包 `pkg-3l8hj0zy-ai-inspire-free` 已绑定到该环境

---

### 第 4 步：（可选）上传云函数作为备用方案

当 `wx.cloud.extend.AI` 不可用时，系统自动降级到云函数。

1. 微信开发者工具左侧 → 展开 `cloudfunctions/`
2. 右键 `recipe-generate` → 「上传并部署：云端安装依赖」
3. 等待部署完成

> **注意**：云函数内使用 `cloud.ai.createModel('hunyuan')`，同样无需 API Key。

---

## 架构说明

```
前端（小程序）
    │
    ├─ 优先：wx.cloud.extend.AI.model.invoke()
    │        ↓
    │    直接调用云开发 AI 服务（延迟低，无额外费用）
    │        ↓
    │    混元大模型（hunyuan-lite）
    │        ↓
    │    消耗：环境绑定的 Token 资源包
    │
    └─ 降级：wx.cloud.callFunction('recipe-generate')
             ↓
         云函数（cloud.ai.createModel）
             ↓
         混元大模型（hunyuan-lite）
```

---

## Token 消耗估算

| 场景 | 每次消耗 | 月预算（5M tokens） |
|------|---------|-------------------|
| 快速食谱生成 | ~100 tokens | 约 50,000 次 |
| 缓存命中（30-40%） | 0 tokens | 节省 15,000-20,000 次 |
| **实际月消耗** | — | **约 3-3.5M tokens** |

免费资源包总量：**1亿 tokens**，预计可使用 **6个月**。

---

## 常见问题排查

### Q: 提示"wx.cloud.extend.AI 不可用"

**原因**：基础库版本低于 3.7.1  
**解决**：微信开发者工具 → 详情 → 本地设置 → 调试基础库 → 选 3.7.1+

---

### Q: 提示"云开发 AI 功能未开启"

**原因**：云开发控制台未开启 AI 功能  
**解决**：[云开发控制台](https://tcb.cloud.tencent.com/dev) → AI → 开启 AI 功能

---

### Q: 提示"云开发环境错误"

**原因**：`miniprogram/app.js` 中 `env` 字段为空或填写错误  
**解决**：填入正确的云开发环境ID（格式：`prod-XXXXXXXX`）

---

### Q: 提示"云函数未部署"（降级方案时）

**原因**：`recipe-generate` 云函数未上传  
**解决**：右键 `cloudfunctions/recipe-generate` → 上传并部署

---

### Q: 生成的食谱 JSON 解析失败

**原因**：AI 偶发返回了非标准 JSON 格式  
**解决**：系统内置三层 JSON 解析兜底，正常可自动恢复；如果反复失败，请重试几次

---

## 参考链接

- [云开发 AI 文档](https://docs.cloudbase.net/ai/miniprogram-using)
- [wx.cloud.extend.AI SDK 参考](https://docs.cloudbase.net/ai/sdk-reference/init)
- [AI 小程序成长计划](https://docs.cloudbase.net/ai/ai-inspire-plan)
- [云开发控制台](https://tcb.cloud.tencent.com/dev#/ai)
