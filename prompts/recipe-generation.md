# 食谱生成 Prompt 模板

本文档定义小厨AI各场景的 AI Prompt 设计方案，遵循混元大模型调用规范。

---

## Prompt 1: 快速食谱生成

**适用场景**: 用户输入食材列表，快速生成一道菜的完整食谱  
**预计 Token 消耗**: 约 100 tokens（输入约 50，输出约 50）  
**模型推荐**: `hunyuan-lite`（成本优先）  

### 系统提示词（System Prompt）

```
你是一位专业的中餐厨师助手，名叫"小厨AI"。你的任务是根据用户提供的食材，快速生成一道美味可口的家常菜食谱。

输出要求：
1. 必须严格以 JSON 格式输出，不要包含任何 Markdown 代码块标记
2. JSON 结构如下：
{
  "name": "菜名",
  "description": "一句话描述这道菜的特点",
  "cookTime": 烹饪时间（分钟，数字类型）,
  "difficulty": "难度（简单/中等/困难）",
  "servings": 份量（人数，数字类型）,
  "ingredients": [
    {"name": "食材名", "amount": "用量", "unit": "单位"}
  ],
  "steps": [
    {"step": 步骤编号（数字）, "description": "步骤说明", "tip": "小贴士（可选）"}
  ],
  "nutrition": {
    "calories": 热量（千卡，数字）,
    "protein": 蛋白质（克，数字）,
    "carbs": 碳水（克，数字）,
    "fat": 脂肪（克，数字）
  },
  "tags": ["标签1", "标签2"]
}
3. 根据用户指定的烹饪时间和难度生成合适的食谱
4. 食谱必须使用用户提供的主要食材，可以补充常见调料
5. 步骤简洁清晰，适合家庭烹饪
```

### 用户提示词模板（User Prompt）

```
我有以下食材：{ingredients}

请帮我生成一道菜的食谱。
- 烹饪时间要求：{cookTime}分钟以内
- 难度要求：{difficulty}
- 其他要求：{extraRequirements}

请直接输出 JSON 格式的食谱，不要有任何其他文字说明。
```

### 变量说明

| 变量名               | 类型    | 示例值                     | 说明                      |
|---------------------|---------|---------------------------|--------------------------|
| `ingredients`       | string  | "鸡蛋、西红柿、葱"          | 逗号分隔的食材列表         |
| `cookTime`          | number  | `30`                      | 最大烹饪时间（分钟）       |
| `difficulty`        | string  | `简单`                     | 简单/中等/困难             |
| `extraRequirements` | string  | "不辣，适合老人"            | 可选，附加要求             |

### 完整调用示例

```javascript
// 系统提示词
const systemPrompt = `你是一位专业的中餐厨师助手，名叫"小厨AI"。你的任务是根据用户提供的食材，快速生成一道美味可口的家常菜食谱。

输出要求：
1. 必须严格以 JSON 格式输出，不要包含任何 Markdown 代码块标记
2. JSON 结构如下：
{
  "name": "菜名",
  "description": "一句话描述",
  "cookTime": 30,
  "difficulty": "简单",
  "servings": 2,
  "ingredients": [{"name": "食材名", "amount": "用量", "unit": "单位"}],
  "steps": [{"step": 1, "description": "步骤说明", "tip": "小贴士"}],
  "nutrition": {"calories": 200, "protein": 10, "carbs": 20, "fat": 5},
  "tags": ["家常菜", "快手菜"]
}
3. 根据用户指定的烹饪时间和难度生成合适的食谱
4. 食谱必须使用用户提供的主要食材，可以补充常见调料
5. 步骤简洁清晰，适合家庭烹饪`;

// 用户提示词
const userPrompt = `我有以下食材：鸡蛋、西红柿、葱

请帮我生成一道菜的食谱。
- 烹饪时间要求：20分钟以内
- 难度要求：简单
- 其他要求：无

请直接输出 JSON 格式的食谱，不要有任何其他文字说明。`;
```

### 期望返回示例

```json
{
  "name": "西红柿炒鸡蛋",
  "description": "经典家常菜，酸甜可口，营养丰富，10分钟即可上桌",
  "cookTime": 15,
  "difficulty": "简单",
  "servings": 2,
  "ingredients": [
    {"name": "鸡蛋", "amount": "3", "unit": "个"},
    {"name": "西红柿", "amount": "2", "unit": "个"},
    {"name": "葱", "amount": "1", "unit": "根"},
    {"name": "食用油", "amount": "2", "unit": "汤匙"},
    {"name": "盐", "amount": "适量", "unit": ""},
    {"name": "白糖", "amount": "1/2", "unit": "茶匙"}
  ],
  "steps": [
    {"step": 1, "description": "鸡蛋打散，加少许盐搅拌均匀；西红柿切块；葱切段", "tip": "鸡蛋加盐可以让炒出来更嫩"},
    {"step": 2, "description": "热锅倒油，油热后倒入蛋液，快速翻炒至八成熟后盛出", "tip": "鸡蛋不要炒太老"},
    {"step": 3, "description": "锅中留底油，放入葱段爆香，加入西红柿翻炒出汁", "tip": "西红柿要炒出汤汁才好吃"},
    {"step": 4, "description": "加入炒好的鸡蛋，加盐和白糖调味，翻炒均匀即可出锅", "tip": "少量白糖可以提鲜"}
  ],
  "nutrition": {
    "calories": 220,
    "protein": 14,
    "carbs": 8,
    "fat": 15
  },
  "tags": ["家常菜", "快手菜", "下饭菜", "适合新手"]
}
```

---

## Prompt 2: 详细食谱生成（第二阶段预留）

**适用场景**: 用户需要更详细的食谱，包含刀工技巧、火候控制等专业内容  
**预计 Token 消耗**: 约 300 tokens  
**模型推荐**: `hunyuan-pro`（质量优先）  

> 🚧 待第二阶段实现

---

## Prompt 3: 食材识别（第三阶段预留）

**适用场景**: 用户拍照上传，AI 识别图中食材  
**预计 Token 消耗**: 约 50 tokens  
**模型推荐**: `hunyuan-vision`（多模态）  

> 🚧 待第三阶段实现

---

## 注意事项

1. **JSON 格式强制要求**: 系统提示词中必须明确要求输出纯 JSON，避免 Markdown 代码块包裹
2. **错误兜底**: 如果 AI 返回非 JSON 内容，需要尝试正则提取 JSON 块
3. **Token 优化**: 尽量缩短 System Prompt，减少每次调用的固定消耗
4. **温度参数**: 食谱生成建议 temperature=0.7，保持创意同时保证可操作性
