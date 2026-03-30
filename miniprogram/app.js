/**
 * 小厨AI - 小程序入口文件 v2.0
 * 初始化云开发环境，配置全局数据
 */


// 引入缓存工具（用于启动时清理）
const cache = require('./utils/cache');

App({
  /**
   * 小程序启动时执行
   * 初始化云开发、清理过期缓存
   */
  onLaunch: function () {
    // 全局数据配置
    this.globalData = {
      // 云开发环境 ID
      // 请在微信开发者工具右上角点击【云开发】按钮获取环境 ID
      // 留空则使用默认环境
      env: "cloud1-6gsy5gsr3cdc8ba2",

      // 小程序版本信息
      version: "2.0.0",
      appName: "小厨AI",

      // 2.0.0 新增：菜系模块相关全局数据
      presetIngredients: null,   // 从菜系页/首页带入的预设食材
      presetCuisine: null,       // 预设的菜系信息
      presetDishName: null,      // 预设的菜名
    };

    // 初始化云开发
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
      console.log("[app] 云开发初始化成功，环境：", this.globalData.env || "默认环境");
    }

    // 启动时清理过期缓存（异步执行，不阻塞启动）
    setTimeout(() => {
      try {
        const clearedCount = cache.clearExpiredCache();
        if (clearedCount > 0) {
          console.log(`[app] 启动清理过期缓存 ${clearedCount} 条`);
        }
      } catch (e) {
        // 缓存清理失败不影响正常使用
        console.warn("[app] 缓存清理失败：", e.message);
      }
    }, 1000);
  },

  /**
   * 小程序进入前台时执行
   */
  onShow: function (options) {
    console.log("[app] 小程序进入前台");
  },

  /**
   * 小程序进入后台时执行
   */
  onHide: function () {
    console.log("[app] 小程序进入后台");
  },

  /**
   * 全局错误监听
   */
  onError: function (msg) {
    console.error("[app] 全局错误：", msg);
  },
});

// {
//   "pagePath": "pages/recipe/recipe",
//   "text": "生成菜谱",
//   "iconPath": "images/icons/goods.png",
//   "selectedIconPath": "images/icons/goods-active.png"
// },
// {
//   "pagePath": "pages/upload/index",
//   "text": "上传数据",
//   "iconPath": "images/icons/examples.png",
//   "selectedIconPath": "images/icons/examples-active.png"
// }