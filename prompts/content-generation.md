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