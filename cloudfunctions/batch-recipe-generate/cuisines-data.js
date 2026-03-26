/**
 * batch-recipe-generate/cuisines-data.js
 * 菜系数据集合
 */

const CUISINES_DATA = [{
        id: 'sichuan',
        name: '川菜',
        fullName: '四川菜系',
        emoji: '🌶️',
        color: '#E53935',
        lightColor: '#FFEBEE',
        description: '麻辣鲜香，层次丰富',
        longDesc: '川菜以麻辣著称，善用花椒、辣椒，讲究"一菜一格，百菜百味"。',
        tags: ['麻辣', '鲜香', '下饭'],
        sortOrder: 1,
        quickIngredients: ['豆腐', '猪肉末', '花椒', '豆瓣酱', '辣椒', '鸡肉', '牛肉', '花生'],
        representativeDishes: [{
                name: '麻婆豆腐',
                desc: '豆腐鲜嫩，麻辣鲜香',
                cookTime: 20,
                difficulty: 'easy',
                ingredients: ['豆腐', '猪肉末', '豆瓣酱', '花椒']
            },
            {
                name: '宫保鸡丁',
                desc: '鸡肉鲜嫩，花生香脆',
                cookTime: 25,
                difficulty: 'easy',
                ingredients: ['鸡胸肉', '花生', '干辣椒', '葱']
            },
            {
                name: '回锅肉',
                desc: '肥而不腻，香辣适口',
                cookTime: 40,
                difficulty: 'medium',
                ingredients: ['五花肉', '青椒', '豆瓣酱', '蒜苗']
            },
            {
                name: '夫妻肺片',
                desc: '麻辣爽口，回味无穷',
                cookTime: 30,
                difficulty: 'medium',
                ingredients: ['牛肉', '牛杂', '花椒油', '辣椒油']
            },
            {
                name: '水煮鱼',
                desc: '鱼肉滑嫩，麻辣鲜香',
                cookTime: 35,
                difficulty: 'medium',
                ingredients: ['草鱼', '豆芽', '豆瓣酱', '花椒']
            },
            {
                name: '担担面',
                desc: '麻辣咸香，芝麻飘香',
                cookTime: 20,
                difficulty: 'easy',
                ingredients: ['面条', '猪肉末', '花椒粉', '芝麻酱']
            },
            {
                name: '鱼香肉丝',
                desc: '酸甜微辣，鱼香浓郁',
                cookTime: 15,
                difficulty: 'easy',
                ingredients: ['猪里脊', '木耳', '胡萝卜', '郫县豆瓣']
            },
            {
                name: '口水鸡',
                desc: '嫩滑爽口，红油飘香',
                cookTime: 40,
                difficulty: 'easy',
                ingredients: ['整鸡', '花椒油', '辣椒油', '芝麻酱']
            },
            {
                name: '红油抄手',
                desc: '皮薄馅鲜，红油鲜香',
                cookTime: 25,
                difficulty: 'medium',
                ingredients: ['馄饨皮', '猪肉', '红油', '花椒粉']
            },
            {
                name: '干煸四季豆',
                desc: '焦香酥脆，咸香下饭',
                cookTime: 15,
                difficulty: 'easy',
                ingredients: ['四季豆', '猪肉末', '干辣椒', '蒜']
            },
            {
                name: '酸菜鱼',
                desc: '酸爽鲜辣，鱼肉嫩滑',
                cookTime: 30,
                difficulty: 'medium',
                ingredients: ['草鱼', '酸菜', '花椒', '辣椒']
            },
            {
                name: '毛血旺',
                desc: '麻辣鲜烫，食材丰富',
                cookTime: 35,
                difficulty: 'medium',
                ingredients: ['毛肚', '鸭血', '豆皮', '花椒']
            },
            {
                name: '水煮牛肉',
                desc: '牛肉嫩滑，麻辣浓香',
                cookTime: 30,
                difficulty: 'medium',
                ingredients: ['牛里脊', '豆芽', '花椒', '辣椒油']
            },
            {
                name: '蚂蚁上树',
                desc: '粉条筋道，肉末鲜香',
                cookTime: 20,
                difficulty: 'easy',
                ingredients: ['粉条', '猪肉末', '豆瓣酱', '葱']
            },
            {
                name: '辣子鸡',
                desc: '鸡丁酥香，辣椒翻炒',
                cookTime: 30,
                difficulty: 'medium',
                ingredients: ['鸡肉', '干辣椒', '花椒', '蒜']
            },
            {
                name: '夹沙肉',
                desc: '甜糯软烂，咸甜交融',
                cookTime: 90,
                difficulty: 'hard',
                ingredients: ['五花肉', '豆沙', '白糖', '鸡蛋']
            },
            {
                name: '棒棒鸡',
                desc: '麻辣鲜香，鸡肉嫩滑',
                cookTime: 40,
                difficulty: 'easy',
                ingredients: ['鸡腿', '芝麻酱', '辣椒油', '花椒油']
            },
            {
                name: '川式红烧肉',
                desc: '色泽红亮，麻辣浓香',
                cookTime: 80,
                difficulty: 'medium',
                ingredients: ['五花肉', '豆瓣酱', '冰糖', '花椒']
            },
            {
                name: '豆花鱼',
                desc: '豆花嫩滑，鱼肉鲜嫩',
                cookTime: 35,
                difficulty: 'medium',
                ingredients: ['草鱼', '内酯豆腐', '豆瓣酱', '花椒']
            },
            {
                name: '烧白',
                desc: '肥而不腻，梅干菜香',
                cookTime: 90,
                difficulty: 'hard',
                ingredients: ['五花肉', '芽菜', '豆瓣酱', '冰糖']
            },
            {
                name: '川北凉粉',
                desc: '滑嫩爽口，麻辣鲜香',
                cookTime: 15,
                difficulty: 'easy',
                ingredients: ['豌豆凉粉', '红油', '花椒粉', '蒜']
            },
            {
                name: '泡椒凤爪',
                desc: '酸辣爽脆，开胃解馋',
                cookTime: 60,
                difficulty: 'medium',
                ingredients: ['鸡爪', '泡椒', '泡姜', '醋']
            },
            {
                name: '锅巴肉片',
                desc: '外酥内嫩，酸甜可口',
                cookTime: 30,
                difficulty: 'medium',
                ingredients: ['猪里脊', '锅巴', '番茄酱', '醋']
            },
            {
                name: '夫妻豆腐',
                desc: '豆腐嫩滑，麻辣鲜香',
                cookTime: 20,
                difficulty: 'easy',
                ingredients: ['豆腐', '辣椒油', '花椒油', '葱']
            },
            {
                name: '川味香肠',
                desc: '麻辣鲜香，咸鲜适口',
                cookTime: 25,
                difficulty: 'easy',
                ingredients: ['猪肉', '花椒', '辣椒粉', '盐']
            },
            {
                name: '干锅土豆片',
                desc: '焦香软糯，麻辣下饭',
                cookTime: 20,
                difficulty: 'easy',
                ingredients: ['土豆', '干辣椒', '花椒', '蒜']
            },
            {
                name: '钟水饺',
                desc: '皮薄馅嫩，红油鲜香',
                cookTime: 30,
                difficulty: 'medium',
                ingredients: ['饺子皮', '猪肉', '红油', '花椒粉']
            },
            {
                name: '豆瓣鱼',
                desc: '鱼肉鲜嫩，豆瓣浓香',
                cookTime: 25,
                difficulty: 'easy',
                ingredients: ['鲫鱼', '豆瓣酱', '姜', '葱']
            },
            {
                name: '肥肠粉',
                desc: '粉条滑嫩，肥肠香醇',
                cookTime: 40,
                difficulty: 'medium',
                ingredients: ['红薯粉', '肥肠', '豆瓣酱', '花椒']
            },
            {
                name: '糖醋里脊',
                desc: '外酥内嫩，酸甜可口',
                cookTime: 25,
                difficulty: 'medium',
                ingredients: ['猪里脊', '淀粉', '番茄酱', '白醋']
            },
        ],
    },
    // ... 其他菜系 ...
];

module.exports = {
    CUISINES_DATA
};