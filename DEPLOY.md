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
env: "cloud1-6gsy5gsr3cdc8ba2",

// ✅ 修改后（填入你的环境ID，格式如 prod-xxxxxx 或 dev-xxxxxx）
env: "cloud1-6gsy5gsr3cdc8ba2",
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



## 架构说明
腾讯文生模型
```javascript
const res = await wx.cloud.extend.AI.createModel(
  "hunyuan-exp"
).streamText({
  data: {
    model: "hunyuan-turbos-latest",
    messages: [
      {
        role: "user",
        content: "你好"
      }
    ]
  }
});

for await (let event of res.eventStream) {
  if (event.data === "[DONE]") {
    break;
  }
  const data = JSON.parse(event.data);

  // 当使用 deepseek-r1 时，模型会生成思维链内容
  const think = data?.choices?.[0]?.delta?.reasoning_content;
  if (think) {
    console.log(think);
  }

  // 打印生成文本内容
  const text = data?.choices?.[0]?.delta?.content;
  if (text) {
    console.log(text);
  }
}
```

生图模型
```javascript
// 调用生图云函数
wx.cloud.callFunction({
  name: "<YOUR_FUNCTION_NAME>",
  data: {
    prompt: "一只可爱的猫咪在阳光下玩耍"
  },
  success: res => {
    const result = res.result;

    if (result.success) {
      // 生成成功
      console.log("生成成功!");
      console.log("图片URL:", result.imageUrl);
      console.log("优化后的提示词:", result.revised_prompt);

      // 使用图片
      // 注意：图片URL有效期为24小时，请及时保存或转存
    } else {
      // 生成失败
      console.error("生成失败:", result.code, result.message);
    }
  },
  fail: err => {
    console.error("调用失败:", err);
  }
});
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

- UI 配色风格保持一致，使用微信官方推荐最稳定的UI功能组件


## 参考链接

- [云开发 AI 文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloud/guide/init.html)
- [AI 小程序成长计划 生文模型](https://tcb.cloud.tencent.com/dev?envId=cloud1-6gsy5gsr3cdc8ba2&source=mp.weixin.qq.com#/ai?tab=text-aiModel)
-  [AI 小程序成长计划 生图模型](https://tcb.cloud.tencent.com/dev?envId=cloud1-6gsy5gsr3cdc8ba2&source=mp.weixin.qq.com#/ai?tab=image-aiModel)
