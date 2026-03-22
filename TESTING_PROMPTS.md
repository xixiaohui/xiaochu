### **四、测试和CI/CD Prompt**

创建文件 `TESTING_PROMPTS.md`：

```markdown
# 测试和部署Prompts

## Prompt: 生成单元测试

PROJECT_CONTEXT: xiaochuai TASK: 为recipe-generate功能编写完整的单元测试

需求
测试文件位置：tests/unit/recipe-generate.test.js
使用Jest框架
覆盖率要求：>80%
测试用例
正常流程：输入有效食材，返回正确格式的食谱
边界情况：空食材列表，应返回错误
超时处理：API响应超过5秒，应返回timeout error
缓存命中：同样的输入调用两次，第二次应返回缓存
混元API错误：API返回500，应捕获并返回标准错误格式
测试覆盖的代码文件
cloud-functions/recipe-generate/index.js
miniprogram/utils/ai-service.js
miniprogram/utils/cache.js
Mock数据要求
Mock混元API响应
Mock localStorage
Mock云函数调用
生成的测试应该能通过
npm run test:unit tests/unit/recipe-generate.test.js


## Prompt: 生成集成测试

PROJECT_CONTEXT: xiaochuai TASK: 编写端到端集成测试，验证完整的食谱生成流程

测试流程
前端发起请求（输入食材）
触发云函数
云函数调用混元API
返回食谱并显示在UI上
测试文件
tests/integration/recipe-flow.test.js

环境设置
使用云开发的测试环境
Mock混元API（不真实调用，节省Token）
预期结果
用户输入 → 云函数调用 → 返回结果 → UI显示
所有步骤应该在5秒内完成

## Prompt: 部署前检查

PROJECT_CONTEXT: xiaochuai TASK: 生成部署前的检查脚本和清单

需求
生成deploy-checklist.js脚本

检查所有环境变量已设置
检查云函数已编译
检查数据库连接正常
检查混元API可访问
生成GitHub Actions工作流 (.github/workflows/deploy.yml)

自动运行测试
自动部署到云函数
自动发送部署通知
生成部署指南 (docs/DEPLOYMENT.md)

详细的部署步骤
回滚方法
常见问题
输出文件
scripts/deploy-checklist.js
.github/workflows/deploy.yml
docs/DEPLOYMENT.md