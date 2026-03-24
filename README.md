
# xiaochu
小厨AI 微信小程序
=======
# 云开发 quickstart

这是云开发的快速启动指引，其中演示了如何上手使用云开发的三大基础能力：

- 数据库：一个既可在小程序前端操作，也能在云函数中读写的 JSON 文档型数据库
- 文件存储：在小程序前端直接上传/下载云端文件，在云开发控制台可视化管理
- 云函数：在云端运行的代码，微信私有协议天然鉴权，开发者只需编写业务逻辑代码

## 参考文档

- [云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)


- [生文模型]
```js
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
- [生图模型]

```js
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






