# 小厨AI小程序开发维护指南

## 项目背景
- 微信小程序个人开发者
- 已接入腾讯小程序开发计划（免费1亿token）
- 已上线菜谱生成功能
- 限制：不支持AI问答功能模式

## 功能规划
1. 八大菜系菜谱库
鲁、川、粤、苏、浙、闽、湘、徽
2. 减脂菜谱库
3. 孕妇营养菜谱库
4. 西式菜谱库
5. 季节推荐菜谱
6. 每日菜谱海报分享功能

## 技术栈
- 前端：微信小程序
- 后端：小程序云函数(云环境：cloud1-6gsy5gsr3cdc8ba2)
- 数据库：小程序云数据库(云环境：cloud1-6gsy5gsr3cdc8ba2)
- AI服务：https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloud/guide/init.html
参考这个文生模型
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


## 腾讯大模型"hunyuan-exp" ，model: "hunyuan-turbos-latest"集成方案
- 用于实时菜谱详情生成
- 用于营养分析
- 用于菜谱海报文案生成

## 关键决策
- 只存储菜谱基本信息（名称、分类、描述）
- 详细信息在用户点击时实时通过腾讯大模型hunyuan-exp生成
- 用户可保存、下载、分享生成的菜谱，海报带有小程序二维码

## 当前进度
- 完成时间：YYYY-MM-DD
- 已完成功能：菜谱生成
- 进行中：多菜系数据库建设
- 计划中：分享功能开发

## 维护注意事项
- [UI]使用微信小程序开发官方推荐，最稳定版本的UI组件
- [UI风格]UI配色方案保持不变
