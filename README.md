# 基金折溢价数据爬取与服务系统

## 项目简介

这是一个基于 Node.js + MySQL 的基金折溢价数据爬取与提醒服务系统，能够定期抓取基金数据，提供 RESTful API 查询服务，并支持多种提醒方式。

## 功能特性

- 🔄 定时抓取基金折溢价数据
- 💾 MySQL 数据库存储
- 📊 RESTful API 查询接口
- 🔔 多种提醒方式（邮件、Telegram、控制台）
- 📈 阈值触发提醒
- 🛡️ 异常处理和日志记录

## 技术栈

- **后端**: Node.js >= 18
- **数据库**: MySQL
- **HTTP客户端**: axios
- **定时任务**: node-cron
- **Web框架**: Express
- **日志**: winston
- **配置管理**: dotenv

## 快速开始

### 1. 环境准备

确保已安装：
- Node.js >= 18
- MySQL >= 5.7

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `env.example` 为 `.env` 并配置：

```bash
cp env.example .env
```

编辑 `.env` 文件，配置数据库连接、API token 等信息。

### 4. 初始化数据库

```bash
npm run init-db
```

### 5. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## API 接口

### 获取所有基金数据
```
GET /api/funds
```

### 获取指定基金数据
```
GET /api/funds/:code
```

### 按折溢价筛选
```
GET /api/funds?discount_lt=-3&discount_gt=3
```

## 项目结构

```
├── src/
│   ├── app.js              # 主应用入口
│   ├── config/             # 配置文件
│   ├── crawler/           # 数据爬取模块
│   ├── database/          # 数据库模块
│   ├── scheduler/         # 定时任务模块
│   ├── notifier/          # 提醒模块
│   ├── server/            # API服务模块
│   └── utils/             # 工具函数
├── scripts/               # 脚本文件
├── logs/                  # 日志文件
└── docs/                  # 文档
```

## 配置说明

### 数据库配置
- `DB_HOST`: 数据库主机
- `DB_PORT`: 数据库端口
- `DB_NAME`: 数据库名称
- `DB_USER`: 数据库用户名
- `DB_PASSWORD`: 数据库密码

### API配置
- `API_BASE_URL`: 数据源API地址
- `API_TOKEN`: API访问令牌

### 提醒配置
- `ALERT_THRESHOLD_POSITIVE`: 正折溢价阈值
- `ALERT_THRESHOLD_NEGATIVE`: 负折溢价阈值

## 部署说明

1. 确保服务器已安装 Node.js 和 MySQL
2. 克隆项目并安装依赖
3. 配置环境变量
4. 初始化数据库
5. 启动服务

## 许可证

MIT License
