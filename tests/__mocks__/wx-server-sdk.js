/**
 * wx-server-sdk Mock
 * 在 Node.js/Jest 测试环境中模拟微信云开发 SDK
 *
 * 云函数 recipe-generate/index.js 使用 cloud.ai.createModel('hunyuan')
 * 测试时 cloud.ai 不可用，会自动抛出错误（被测试捕获并返回 AI_CALL_FAILED）
 */

'use strict';

// Mock cloud.ai.createModel - 测试环境中返回模拟对象
const mockModel = {
  streamText: jest.fn().mockRejectedValue(
    Object.assign(new Error('cloud.ai 在测试环境中不可用（wx-server-sdk mock）'), {
      code: 2,
    })
  ),
};

// Mock cloud 对象
const cloud = {
  // 初始化（无操作）
  init: jest.fn(),

  // 动态当前环境
  DYNAMIC_CURRENT_ENV: 'mock-test-env',

  // 数据库（不在本模块使用，但为了兼容性提供）
  database: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnValue({
      add: jest.fn(),
      where: jest.fn().mockReturnThis(),
      get: jest.fn(),
    }),
  }),

  // AI 接口 Mock
  ai: {
    createModel: jest.fn().mockReturnValue(mockModel),
  },

  // 获取微信上下文（用于 getOpenId 等）
  getWXContext: jest.fn().mockReturnValue({
    OPENID: 'mock-openid-test',
    APPID: 'mock-appid-test',
    UNIONID: '',
  }),

  // 文件存储
  uploadFile: jest.fn(),
  getTempFileURL: jest.fn(),
};

module.exports = cloud;
