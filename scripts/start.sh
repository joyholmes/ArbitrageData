#!/bin/bash

# 基金折溢价数据服务启动脚本

echo "🚀 启动基金折溢价数据服务..."

# 检查Node.js版本
node_version=$(node -v 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ 错误: 未找到Node.js，请先安装Node.js >= 18"
    exit 1
fi

required_version="18.0.0"
current_version=$(echo $node_version | sed 's/v//')
if [ "$(printf '%s\n' "$required_version" "$current_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ 错误: Node.js版本过低，当前版本: $node_version，需要版本 >= $required_version"
    exit 1
fi

echo "✅ Node.js版本检查通过: $node_version"

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  警告: 未找到.env文件，请复制env.example为.env并配置"
    if [ -f "env.example" ]; then
        echo "💡 提示: 运行 cp env.example .env 创建配置文件"
    fi
    exit 1
fi

echo "✅ 环境配置文件检查通过"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
fi

echo "✅ 依赖检查通过"

# 检查数据库连接
echo "🔍 检查数据库连接..."
node -e "
require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'fund_arbitrage'
    });
    await connection.end();
    console.log('✅ 数据库连接成功');
    process.exit(0);
  } catch (error) {
    console.log('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
})();
"

if [ $? -ne 0 ]; then
    echo "❌ 数据库连接失败，请检查数据库配置"
    exit 1
fi

# 启动应用
echo "🎯 启动应用..."
if [ "$1" = "dev" ]; then
    echo "🔧 开发模式启动"
    npm run dev
else
    echo "🚀 生产模式启动"
    npm start
fi
