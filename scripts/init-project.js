#!/usr/bin/env node

/**
 * 小厨AI项目初始化脚本
 * 运行: node scripts/init-project.js
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

const filesToCreate = [
  {
    path: 'database/users.json',
    content: `{
  "collectionName": "users",
  "schema": {
    "openid": { "type": "string", "required": true },
    "nickname": { "type": "string" },
    "avatarUrl": { "type": "string" },
    "createdAt": { "type": "date" },
    "updatedAt": { "type": "date" },
    "membership": { "type": "object" }
  }
}`
  },
  {
    path: 'database/recipes.json',
    content: `{
  "collectionName": "recipes",
  "schema": {
    "recipeId": { "type": "string", "required": true },
    "name": { "type": "string", "required": true },
    "ingredients": { "type": "array" },
    "steps": { "type": "array" },
    "cookingTime": { "type": "number" },
    "difficulty": { "type": "string" },
    "nutrition": { "type": "object" },
    "createdAt": { "type": "date" }
  }
}`
  },
  {
    path: '.env.example',
    content: `# WeChat Mini Program
WEIXIN_APP_ID=your_app_id
WEIXIN_APP_SECRET=your_app_secret

# Tencent Cloud
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
CLOUD_ENV_ID=your_env_id

# Hunyuan API
HUNYUAN_API_KEY=your_api_key
HUNYUAN_SECRET_KEY=your_secret_key

# App Config
APP_ENV=development
LOG_LEVEL=debug
`
  }
];

filesToCreate.forEach(file => {
  const filePath = path.join(projectRoot, file.path);
  const dir = path.dirname(filePath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, file.content);
    console.log(`✅ Created: ${file.path}`);
  } else {
    console.log(`⏭️  Already exists: ${file.path}`);
  }
});

console.log('\n✨ Project initialization complete!');
console.log('Next steps:');
console.log('1. cp .env.example .env');
console.log('2. Edit .env with your actual credentials');
console.log('3. npm install');
console.log('4. npm run dev');
