/**
 * 本地缓存工具模块 - cache.js
 * 功能：基于微信小程序 wx.getStorageSync/wx.setStorageSync 实现带过期时间的缓存系统
 * 特性：支持TTL（存活时间），自动清理过期缓存，防止重复调用AI接口
 */

'use strict';

// ==================== 缓存配置常量 ====================

// 缓存键名前缀（防止与其他存储数据冲突）
const CACHE_PREFIX = 'xiaochu_cache_';

// 缓存版本号（版本升级时自动失效旧缓存）
const CACHE_VERSION = 'v1';

// 默认缓存过期时间：30分钟（毫秒）
const DEFAULT_TTL = 30 * 60 * 1000;

// 食谱缓存过期时间：2小时（相同食材+条件在2小时内复用结果）
const RECIPE_CACHE_TTL = 2 * 60 * 60 * 1000;

// 最大缓存条目数（防止存储空间溢出）
const MAX_CACHE_ENTRIES = 50;

// 缓存元数据存储键（记录所有缓存键列表，用于批量管理）
const CACHE_INDEX_KEY = `${CACHE_PREFIX}${CACHE_VERSION}_index`;

// ==================== 核心工具函数 ====================

/**
 * 生成带版本的完整缓存键名
 * @param {string} key - 业务缓存键
 * @returns {string} 完整缓存键
 */
const buildCacheKey = (key) => {
  return `${CACHE_PREFIX}${CACHE_VERSION}_${key}`;
};

/**
 * 获取缓存索引（所有已存储的缓存键列表）
 * @returns {string[]} 缓存键列表
 */
const getCacheIndex = () => {
  try {
    const index = wx.getStorageSync(CACHE_INDEX_KEY);
    return Array.isArray(index) ? index : [];
  } catch (e) {
    console.warn('[cache] 读取缓存索引失败：', e.message);
    return [];
  }
};

/**
 * 更新缓存索引（添加新的缓存键）
 * @param {string} fullKey - 完整的缓存键名
 */
const updateCacheIndex = (fullKey) => {
  try {
    const index = getCacheIndex();
    // 避免重复添加
    if (!index.includes(fullKey)) {
      index.push(fullKey);
      wx.setStorageSync(CACHE_INDEX_KEY, index);
    }
  } catch (e) {
    console.warn('[cache] 更新缓存索引失败：', e.message);
  }
};

/**
 * 从缓存索引中移除指定键
 * @param {string} fullKey - 完整的缓存键名
 */
const removeFromCacheIndex = (fullKey) => {
  try {
    const index = getCacheIndex();
    const newIndex = index.filter(k => k !== fullKey);
    wx.setStorageSync(CACHE_INDEX_KEY, newIndex);
  } catch (e) {
    console.warn('[cache] 移除缓存索引失败：', e.message);
  }
};

// ==================== 主要缓存操作 ====================

/**
 * 设置缓存
 * @param {string} key - 缓存键名（业务层面）
 * @param {any} value - 缓存值（会被 JSON 序列化）
 * @param {number} ttl - 过期时间（毫秒），默认 DEFAULT_TTL
 * @returns {boolean} 是否设置成功
 */
const setCache = (key, value, ttl = DEFAULT_TTL) => {
  try {
    const fullKey = buildCacheKey(key);

    // 构建缓存条目（包含元数据）
    const cacheEntry = {
      value,                          // 缓存的实际数据
      createdAt: Date.now(),          // 创建时间戳（毫秒）
      expiresAt: Date.now() + ttl,    // 过期时间戳（毫秒）
      ttl,                            // 存活时间（毫秒），便于调试
    };

    // 存储到微信 Storage
    wx.setStorageSync(fullKey, cacheEntry);
    // 更新缓存索引
    updateCacheIndex(fullKey);

    console.log(`[cache] 设置缓存成功：${key}，TTL：${ttl / 1000}s`);
    return true;
  } catch (e) {
    console.error('[cache] 设置缓存失败：', e.message);
    return false;
  }
};

/**
 * 获取缓存
 * @param {string} key - 缓存键名
 * @returns {any} 缓存值，未命中或已过期返回 null
 */
const getCache = (key) => {
  try {
    const fullKey = buildCacheKey(key);
    const entry = wx.getStorageSync(fullKey);

    // 缓存不存在
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      console.log(`[cache] 缓存已过期：${key}，过期于 ${new Date(entry.expiresAt).toLocaleTimeString()}`);
      // 清理过期缓存
      deleteCache(key);
      return null;
    }

    // 计算剩余有效时间
    const remainingMs = entry.expiresAt - Date.now();
    console.log(`[cache] 命中缓存：${key}，剩余有效期：${Math.round(remainingMs / 1000)}s`);

    return entry.value;
  } catch (e) {
    console.error('[cache] 读取缓存失败：', e.message);
    return null;
  }
};

/**
 * 删除指定缓存
 * @param {string} key - 缓存键名
 * @returns {boolean} 是否删除成功
 */
const deleteCache = (key) => {
  try {
    const fullKey = buildCacheKey(key);
    wx.removeStorageSync(fullKey);
    removeFromCacheIndex(fullKey);
    console.log(`[cache] 删除缓存：${key}`);
    return true;
  } catch (e) {
    console.error('[cache] 删除缓存失败：', e.message);
    return false;
  }
};

/**
 * 检查缓存是否存在且未过期
 * @param {string} key - 缓存键名
 * @returns {boolean} 是否有效
 */
const hasCache = (key) => {
  return getCache(key) !== null;
};

/**
 * 获取缓存元数据（不返回数据本身，只返回元信息）
 * @param {string} key - 缓存键名
 * @returns {{ exists: boolean, expiresAt: number, remainingMs: number } | null} 元数据
 */
const getCacheMeta = (key) => {
  try {
    const fullKey = buildCacheKey(key);
    const entry = wx.getStorageSync(fullKey);

    if (!entry || typeof entry !== 'object') {
      return { exists: false, expiresAt: 0, remainingMs: 0 };
    }

    const now = Date.now();
    const remainingMs = Math.max(0, entry.expiresAt - now);
    const isExpired = now > entry.expiresAt;

    return {
      exists: !isExpired,
      expiresAt: entry.expiresAt,
      createdAt: entry.createdAt,
      remainingMs,
      isExpired,
    };
  } catch (e) {
    return { exists: false, expiresAt: 0, remainingMs: 0 };
  }
};

// ==================== 批量操作 ====================

/**
 * 清理所有过期缓存（建议在 App.onLaunch 时调用）
 * @returns {number} 清理的过期缓存数量
 */
const clearExpiredCache = () => {
  const index = getCacheIndex();
  let clearedCount = 0;
  const now = Date.now();

  index.forEach(fullKey => {
    try {
      const entry = wx.getStorageSync(fullKey);
      if (entry && entry.expiresAt && now > entry.expiresAt) {
        wx.removeStorageSync(fullKey);
        removeFromCacheIndex(fullKey);
        clearedCount++;
      }
    } catch (e) {
      // 读取失败的条目也从索引中移除
      removeFromCacheIndex(fullKey);
    }
  });

  if (clearedCount > 0) {
    console.log(`[cache] 清理过期缓存 ${clearedCount} 条`);
  }

  return clearedCount;
};

/**
 * 清空所有小厨AI相关缓存（慎用）
 * @returns {number} 清空的缓存数量
 */
const clearAllCache = () => {
  const index = getCacheIndex();
  let clearedCount = 0;

  index.forEach(fullKey => {
    try {
      wx.removeStorageSync(fullKey);
      clearedCount++;
    } catch (e) {
      console.warn(`[cache] 清空缓存失败：${fullKey}`);
    }
  });

  // 清空索引
  try {
    wx.removeStorageSync(CACHE_INDEX_KEY);
  } catch (e) {
    console.warn('[cache] 清空缓存索引失败');
  }

  console.log(`[cache] 清空所有缓存，共 ${clearedCount} 条`);
  return clearedCount;
};

/**
 * 获取当前缓存统计信息（用于调试）
 * @returns {{ total: number, expired: number, valid: number, sizeKB: number }} 统计信息
 */
const getCacheStats = () => {
  const index = getCacheIndex();
  let expired = 0;
  let valid = 0;
  const now = Date.now();

  index.forEach(fullKey => {
    try {
      const entry = wx.getStorageSync(fullKey);
      if (entry && entry.expiresAt) {
        if (now > entry.expiresAt) {
          expired++;
        } else {
          valid++;
        }
      }
    } catch (e) {
      expired++;
    }
  });

  return {
    total: index.length,
    expired,
    valid,
  };
};

// ==================== 食谱专用缓存 ====================

/**
 * 生成食谱缓存键
 * 基于食材列表 + 烹饪时间 + 难度生成唯一哈希键
 * @param {string[]} ingredients - 食材列表
 * @param {number} cookTime - 烹饪时间
 * @param {string} difficulty - 难度
 * @returns {string} 缓存键
 */
const buildRecipeCacheKey = (ingredients, cookTime, difficulty) => {
  // 食材排序后拼接，保证顺序无关的相同食材组合命中同一缓存
  const sortedIngredients = [...ingredients].sort().join(',');
  return `recipe_${sortedIngredients}_${cookTime}_${difficulty}`;
};

/**
 * 获取食谱缓存
 * @param {string[]} ingredients - 食材列表
 * @param {number} cookTime - 烹饪时间
 * @param {string} difficulty - 难度
 * @returns {Object|null} 缓存的食谱数据，未命中返回 null
 */
const getRecipeCache = (ingredients, cookTime, difficulty) => {
  const key = buildRecipeCacheKey(ingredients, cookTime, difficulty);
  return getCache(key);
};

/**
 * 设置食谱缓存（2小时有效期）
 * @param {string[]} ingredients - 食材列表
 * @param {number} cookTime - 烹饪时间
 * @param {string} difficulty - 难度
 * @param {Object} recipeData - 食谱数据
 * @returns {boolean} 是否设置成功
 */
const setRecipeCache = (ingredients, cookTime, difficulty, recipeData) => {
  const key = buildRecipeCacheKey(ingredients, cookTime, difficulty);
  return setCache(key, recipeData, RECIPE_CACHE_TTL);
};

// ==================== 模块导出 ====================

module.exports = {
  // 基础操作
  setCache,
  getCache,
  deleteCache,
  hasCache,
  getCacheMeta,
  // 批量操作
  clearExpiredCache,
  clearAllCache,
  getCacheStats,
  // 食谱专用
  getRecipeCache,
  setRecipeCache,
  buildRecipeCacheKey,
  // 常量导出（供其他模块使用）
  DEFAULT_TTL,
  RECIPE_CACHE_TTL,
};
