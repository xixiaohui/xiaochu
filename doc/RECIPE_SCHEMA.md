菜谱基础表（recipe_base）：
- id: 唯一标识
- name: 菜谱名称
- category: 菜系分类（鲁菜、川菜、粤菜、苏菜、浙菜、闽菜、湘菜、徽菜、减脂、孕妇、西式等）
- season: 季节标签
- difficulty: 难度等级
- cookTime: 烹饪时间
- tags: 标签数组
- thumbnail: 缩略图URL
- summary: 简短描述（100字以内）

菜谱详情表（recipe_details）：
- recipeId: 关联基础表
- ingredients: 食材清单
- steps: 烹饪步骤
- nutrition: 营养信息
- tips: 烹饪小贴士