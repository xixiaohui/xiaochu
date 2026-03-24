/**
 * 小厨AI - 小程序云数据库 Schema 定义
 * 基于微信云开发（MongoDB）
 * 
 * 说明：
 * 1. 小程序云数据库是Schema-less的，但我们通过此文件定义规范
 * 2. 此文件用作文档和数据验证参考
 * 3. 实际集合需要在微信云开发控制台手动创建，或通过管理端API创建
 */

/**
 * ==========================================
 * 集合1: recipe_base（菜谱基础信息库）
 * ==========================================
 * 用途：存储所有菜谱的基本信息，不包含详细的做法
 * 特点：轻量级，用于列表展示和快速查询
 */
const recipeBaseSchema = {
    collectionName: 'recipe_base',
    description: '菜谱基础信息集合',
    indexes: [
      { key: { category: 1 }, name: 'idx_category' },
      { key: { season: 1 }, name: 'idx_season' },
      { key: { cuisine_type: 1 }, name: 'idx_cuisine_type' },
      { key: { createdAt: -1 }, name: 'idx_createdAt' },
    ],
    rules: {
      // 权限规则（在微信云开发控制台中配置）
      read: 'doc._openid == auth.openid', // 所有用户可读
      write: 'doc._openid == auth.openid', // 只有创建者可写
    },
    document: {
      _id: 'String (ObjectId)', // MongoDB自动生成
      _openid: 'String', // 用户OpenID（系统字段）
  
      // 基本信息
      name: {
        type: 'String',
        description: '菜谱名称',
        required: true,
        example: '宫保鸡丁'
      },
  
      description: {
        type: 'String',
        description: '菜谱描述（100字以内，用于列表展示）',
        required: true,
        maxLength: 100,
        example: '经典川菜，麻辣鲜香，营养丰富'
      },
  
      // 分类信息
      category: {
        type: 'String',
        description: '菜系分类',
        required: true,
        enum: ['鲁菜', '川菜', '粤菜', '淮扬菜', '闽菜', '浙菜', '徽菜', '湘菜', '减脂菜', '孕妇菜', '西式菜'],
        index: true,
        example: '川菜'
      },
  
      cuisine_type: {
        type: 'String',
        description: '菜品类型',
        enum: ['传统', '健康', '快手', '宴客', '儿童'],
        example: '传统'
      },
  
      // 季节标签
      season: {
        type: 'Array<String>',
        description: '适合季节',
        enum: ['春', '夏', '秋', '冬', '全年'],
        example: ['春', '秋']
      },
  
      // 难度和耗时
      difficulty: {
        type: 'String',
        description: '烹饪难度',
        enum: ['简单', '中等', '困难'],
        example: '中等'
      },
  
      cooking_time: {
        type: 'Number',
        description: '烹饪时间（分钟）',
        example: 30
      },
  
      prep_time: {
        type: 'Number',
        description: '准备时间（分钟）',
        example: 10
      },
  
      // 份量
      servings: {
        type: 'Number',
        description: '建议份数',
        example: 2
      },
  
      // 图片
      thumbnail_url: {
        type: 'String',
        description: '菜谱缩略图URL',
        example: 'https://cloud.tencent.com/...'
      },
  
      // 标签
      tags: {
        type: 'Array<String>',
        description: '菜谱标签',
        example: ['麻辣', '快手菜', '下饭菜', '家常菜']
      },
  
      // 营养标签
      nutrition_tags: {
        type: 'Array<String>',
        description: '营养特性标签',
        enum: ['高蛋白', '低脂肪', '高纤维', '补钙', '补铁', '美容养颜'],
        example: ['高蛋白', '补钙']
      },
  
      // 适用人群（特别是孕妇菜时重要）
      applicable_people: {
        type: 'Array<String>',
        description: '适用人群',
        enum: ['全年龄', '儿童', '成人', '孕妇', '产妇', '老年人', '减脂人群'],
        example: ['孕妇', '全年龄']
      },
  
      // 成本和热量（参考值）
      cost_level: {
        type: 'String',
        description: '成本等级',
        enum: ['低', '中', '高'],
        example: '中'
      },
  
      calories_estimate: {
        type: 'Number',
        description: '估计热量（大卡/份）',
        example: 350
      },
  
      // 统计信息
      view_count: {
        type: 'Number',
        description: '浏览次数',
        default: 0
      },
  
      like_count: {
        type: 'Number',
        description: '点赞次数',
        default: 0
      },
  
      // 时间戳
      created_at: {
        type: 'Date (ISOString)',
        description: '创建时间',
        example: '2026-03-24T10:30:00Z'
      },
  
      updated_at: {
        type: 'Date (ISOString)',
        description: '更新时间',
        example: '2026-03-24T10:30:00Z'
      },
  
      // 状态
      is_published: {
        type: 'Boolean',
        description: '是否已发布',
        default: true
      }
    },
  
    // 示例文档
    example: {
      name: '宫保鸡丁',
      description: '经典川菜，麻辣鲜香，营养丰富',
      category: '川菜',
      cuisine_type: '传统',
      season: ['春', '秋'],
      difficulty: '中等',
      cooking_time: 30,
      prep_time: 10,
      servings: 2,
      tags: ['麻辣', '快手菜', '下饭菜'],
      nutrition_tags: ['高蛋白'],
      applicable_people: ['全年龄'],
      cost_level: '中',
      calories_estimate: 350,
      created_at: '2026-03-24T10:30:00Z'
    }
  };
  
  /**
   * ==========================================
   * 集合2: recipe_details（菜谱详情缓存）
   * ==========================================
   * 用途：存储Claude AI生成的完整菜谱详情（用于缓存和快速查询）
   * 特点：可选存储，用户查看过的菜谱可以缓存
   */
  const recipeDetailsSchema = {
    collectionName: 'recipe_details',
    description: '菜谱详情缓存集合',
    indexes: [
      { key: { recipe_base_id: 1 }, name: 'idx_recipe_base_id', unique: true },
      { key: { created_at: -1 }, name: 'idx_created_at' },
    ],
    document: {
      _id: 'String (ObjectId)',
      _openid: 'String',
  
      recipe_base_id: {
        type: 'String (ObjectId)',
        description: '关联的recipe_base ID',
        required: true,
        index: true
      },
  
      // Claude生成的完整菜谱内容
      full_content: {
        type: 'String (大文本)',
        description: '完整菜谱内容（包含食材、步骤等，由Claude生成）',
        required: true,
      },
  
      // 细分字段（便于查询和展示）
      ingredients: {
        type: 'Array<Object>',
        description: '食材列表',
        example: [
          { name: '鸡腿肉', amount: '300g', notes: '切块' },
          { name: '花生米', amount: '80g', notes: '提前浸泡' }
        ]
      },
  
      steps: {
        type: 'Array<String>',
        description: '烹饪步骤',
        example: ['第一步：鸡肉提前腌制...', '第二步：锅中油烧热...']
      },
  
      nutrition_info: {
        type: 'Object',
        description: '营养信息',
        fields: {
          protein: { type: 'String', example: '20g' },
          fat: { type: 'String', example: '15g' },
          carbs: { type: 'String', example: '25g' },
          fiber: { type: 'String', example: '3g' }
        }
      },
  
      tips: {
        type: 'Array<String>',
        description: '烹饪小贴士',
        example: ['花生米要提前浸泡...', '火不能太大...']
      },
  
      alternatives: {
        type: 'Array<Object>',
        description: '食材替代方案',
        example: [
          { original: '花生米', substitute: '腰果', reason: '口感相似' }
        ]
      },
  
      // 用于孕妇菜和减脂菜的特殊字段
      special_notes: {
        type: 'String',
        description: '特殊说明（如孕妇禁忌、减脂建议等）',
        example: '此菜含钙丰富，适合孕期食用...'
      },
  
      // 缓存状态
      ai_model_version: {
        type: 'String',
        description: 'Claude模型版本',
        example: 'claude-3-5-sonnet'
      },
  
      generated_at: {
        type: 'Date (ISOString)',
        description: 'Claude生成时间'
      },
  
      expires_at: {
        type: 'Date (ISOString)',
        description: '缓存过期时间（可选）'
      },
  
      created_at: {
        type: 'Date (ISOString)',
        description: '记录创建时间'
      }
    },
  
    example: {
      recipe_base_id: '507f1f77bcf86cd799439011',
      full_content: '详细菜谱内容...',
      ingredients: [
        { name: '鸡腿肉', amount: '300g', notes: '切块' }
      ],
      steps: ['第一步：...'],
      nutrition_info: { protein: '20g' },
      tips: ['花生米要提前浸泡'],
      ai_model_version: 'claude-3-5-sonnet',
      generated_at: '2026-03-24T10:30:00Z'
    }
  };
  
  /**
   * ==========================================
   * 集合3: user_saved_recipes（用户保存的菜谱）
   * ==========================================
   * 用途：记录用户收藏的菜谱
   */
  const userSavedRecipesSchema = {
    collectionName: 'user_saved_recipes',
    description: '用户保存菜谱集合',
    indexes: [
      { key: { _openid: 1, created_at: -1 }, name: 'idx_user_recipes' },
      { key: { recipe_base_id: 1 }, name: 'idx_recipe_base_id' },
      { key: { share_code: 1 }, name: 'idx_share_code', unique: true, sparse: true },
    ],
    rules: {
      read: 'doc._openid == auth.openid || doc.is_shared == true',
      write: 'doc._openid == auth.openid'
    },
    document: {
      _id: 'String (ObjectId)',
      _openid: 'String', // 用户OpenID
  
      recipe_base_id: {
        type: 'String (ObjectId)',
        description: '关联的recipe_base ID'
      },
  
      recipe_name: {
        type: 'String',
        description: '菜谱名称（冗余字段，便于快速显示）'
      },
  
      // 用户保存的详情内容（从recipe_details复制）
      saved_details: {
        type: 'Object',
        description: '保存时的菜谱详情快照',
      },
  
      // 个人笔记
      personal_notes: {
        type: 'String',
        description: '用户个人笔记',
        maxLength: 1000
      },
  
      // 用户评分
      user_rating: {
        type: 'Number',
        description: '用户评分（1-5）',
        min: 1,
        max: 5
      },
  
      user_review: {
        type: 'String',
        description: '用户评价',
        maxLength: 500
      },
  
      // 分享相关
      is_shared: {
        type: 'Boolean',
        description: '是否已分享',
        default: false
      },
  
      share_code: {
        type: 'String',
        description: '分享码（唯一标识），用于生成分享链接',
        example: 'XIAOCHU2026ABC123',
        sparse: true
      },
  
      share_count: {
        type: 'Number',
        description: '分享次数',
        default: 0
      },
  
      // 下载相关
      download_count: {
        type: 'Number',
        description: '下载次数',
        default: 0
      },
  
      last_downloaded_at: {
        type: 'Date (ISOString)',
        description: '最后下载时间'
      },
  
      // 时间戳
      created_at: {
        type: 'Date (ISOString)',
        description: '保存时间'
      },
  
      updated_at: {
        type: 'Date (ISOString)',
        description: '更新时间'
      }
    },
  
    example: {
      recipe_base_id: '507f1f77bcf86cd799439011',
      recipe_name: '宫保鸡丁',
      personal_notes: '家人很喜欢，下次可以加点豆腐',
      user_rating: 5,
      user_review: '味道很不错，推荐！',
      is_shared: true,
      share_code: 'XIAOCHU2026ABC123',
      created_at: '2026-03-24T10:30:00Z'
    }
  };
  
  /**
   * ==========================================
   * 集合4: daily_recommended（每日推荐菜谱）
   * ==========================================
   * 用途：存储每日推荐的菜谱组合
   */
  const dailyRecommendedSchema = {
    collectionName: 'daily_recommended',
    description: '每日推荐菜谱集合',
    indexes: [
      { key: { date: -1 }, name: 'idx_date', unique: true },
      { key: { season: 1 }, name: 'idx_season' },
    ],
    document: {
      _id: 'String (ObjectId)',
  
      date: {
        type: 'String (YYYY-MM-DD)',
        description: '推荐日期',
        required: true,
        unique: true,
        example: '2026-03-24'
      },
  
      season: {
        type: 'String',
        description: '季节',
        enum: ['春', '夏', '秋', '冬']
      },
  
      // 每日推荐菜谱组合（早中晚三餐）
      meals: {
        type: 'Object',
        description: '每日三餐推荐',
        fields: {
          breakfast: {
            type: 'Array<Object>',
            description: '早餐推荐',
            example: [
              { recipe_base_id: '...', name: '番茄鸡蛋面' }
            ]
          },
          lunch: {
            type: 'Array<Object>',
            description: '午餐推荐',
            example: [
              { recipe_base_id: '...', name: '宫保鸡丁' }
            ]
          },
          dinner: {
            type: 'Array<Object>',
            description: '晚餐推荐',
            example: [
              { recipe_base_id: '...', name: '清汤面' }
            ]
          },
          snack: {
            type: 'Array<Object>',
            description: '加餐推荐（可选）',
            example: [
              { recipe_base_id: '...', name: '水果沙拉' }
            ]
          }
        }
      },
  
      // 推荐主题
      theme: {
        type: 'String',
        description: '推荐主题',
        enum: ['健康养生', '快手菜', '季节时令', '减脂瘦身', '孕期营养'],
        example: '季节时令'
      },
  
      daily_tip: {
        type: 'String',
        description: '每日饮食小贴士',
        example: '春季适合食用春笋和香椿，有利于春阳生发'
      },
  
      // 营养建议
      nutrition_suggestion: {
        type: 'String',
        description: '当日营养建议',
        example: '今日推荐搭配蛋白质丰富的菜品...'
      },
  
      // 海报文案（用于分享）
      poster_copy: {
        type: 'String',
        description: '推荐菜谱的海报文案',
        example: '春天到，吃春笋！新鲜滋补，一碗下肚，春阳满满...'
      },
  
      // 配图
      poster_image_url: {
        type: 'String',
        description: '海报配图URL'
      },
  
      // 统计
      view_count: {
        type: 'Number',
        description: '浏览次数',
        default: 0
      },
  
      share_count: {
        type: 'Number',
        description: '分享次数',
        default: 0
      },
  
      created_at: {
        type: 'Date (ISOString)',
        description: '创建时间'
      },
  
      updated_at: {
        type: 'Date (ISOString)',
        description: '更新时间'
      }
    },
  
    example: {
      date: '2026-03-24',
      season: '春',
      theme: '季节时令',
      meals: {
        breakfast: [{ recipe_base_id: '...', name: '番茄鸡蛋面' }],
        lunch: [{ recipe_base_id: '...', name: '宫保鸡丁' }],
        dinner: [{ recipe_base_id: '...', name: '清汤面' }]
      },
      daily_tip: '春季适合食用春笋...',
      poster_copy: '春天到，吃春笋！...'
    }
  };
  
  /**
   * ==========================================
   * 集合5: user_feedback（用户反馈）
   * ==========================================
   * 用途：收集用户对菜谱的反馈
   */
  const userFeedbackSchema = {
    collectionName: 'user_feedback',
    description: '用户反馈集合',
    indexes: [
      { key: { _openid: 1, created_at: -1 }, name: 'idx_user_feedback' },
      { key: { recipe_base_id: 1 }, name: 'idx_recipe_id' },
    ],
    document: {
      _id: 'String (ObjectId)',
      _openid: 'String',
  
      recipe_base_id: {
        type: 'String (ObjectId)',
        description: '关联的菜谱ID'
      },
  
      rating: {
        type: 'Number',
        description: '评分（1-5）',
        required: true,
        min: 1,
        max: 5
      },
  
      title: {
        type: 'String',
        description: '反馈标题',
        required: true,
        maxLength: 50
      },
  
      content: {
        type: 'String',
        description: '反馈内容',
        required: true,
        maxLength: 1000
      },
  
      feedback_type: {
        type: 'String',
        description: '反馈类型',
        enum: ['错误纠正', '建议改进', '表扬', '其他'],
        required: true
      },
  
      is_resolved: {
        type: 'Boolean',
        description: '反馈是否已处理',
        default: false
      },
  
      admin_reply: {
        type: 'String',
        description: '管理员回复',
        maxLength: 500
      },
  
      created_at: {
        type: 'Date (ISOString)',
        description: '反馈时间'
      },
  
      resolved_at: {
        type: 'Date (ISOString)',
        description: '处理时间'
      }
    }
  };
  
  /**
   * ==========================================
   * 导出所有Schema定义
   * ==========================================
   */
  module.exports = {
    recipeBaseSchema,
    recipeDetailsSchema,
    userSavedRecipesSchema,
    dailyRecommendedSchema,
    userFeedbackSchema,
  
    // 所有集合名称（用于引用）
    COLLECTIONS: {
      RECIPE_BASE: 'recipe_base',
      RECIPE_DETAILS: 'recipe_details',
      USER_SAVED_RECIPES: 'user_saved_recipes',
      DAILY_RECOMMENDED: 'daily_recommended',
      USER_FEEDBACK: 'user_feedback'
    },
  
    // 获取集合配置的方法
    getCollectionConfig(collectionName) {
      const schemas = {
        [this.COLLECTIONS.RECIPE_BASE]: recipeBaseSchema,
        [this.COLLECTIONS.RECIPE_DETAILS]: recipeDetailsSchema,
        [this.COLLECTIONS.USER_SAVED_RECIPES]: userSavedRecipesSchema,
        [this.COLLECTIONS.DAILY_RECOMMENDED]: dailyRecommendedSchema,
        [this.COLLECTIONS.USER_FEEDBACK]: userFeedbackSchema
      };
      return schemas[collectionName];
    },
  
    // 数据库初始化文档
    initializationGuide: `
    # 小程序云数据库初始化指南
  
    ## 1. 在微信云开发控制台创建集合
    依次创建以下5个集合：
    - recipe_base（菜谱基础信息）
    - recipe_details（菜谱详情缓存）
    - user_saved_recipes（用户保存菜谱）
    - daily_recommended（每日推荐）
    - user_feedback（用户反馈）
  
    ## 2. 配置安全规则
    每个集合需要在"数据库">"集合">"权限"中配置相应的读写规则
  
    ## 3. 创建索引
    在"数据库">"集合">"索引"中创建本schema中定义的索引
  
    ## 4. 导入初始数据
    使用导入功能或云函数批量导入recipe_base初始数据
    `
  };
  