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