# 项目结构说明

## 📁 目录结构

```
ArbitrageData/
├── src/                          # 源代码目录
│   ├── app.js                    # 主应用入口
│   ├── config/                   # 配置文件
│   │   └── database.js          # 数据库配置
│   ├── crawler/                  # 数据爬取模块
│   │   └── fundCrawler.js       # 基金数据爬取器
│   ├── database/                 # 数据库模块
│   │   └── fundRepository.js    # 基金数据仓库
│   ├── scheduler/                # 定时任务模块
│   │   └── cronScheduler.js     # 定时任务调度器
│   ├── notifier/                # 提醒模块
│   │   ├── alertService.js      # 提醒服务
│   │   ├── consoleNotifier.js   # 控制台通知器
│   │   ├── emailNotifier.js     # 邮件通知器
│   │   └── telegramNotifier.js  # Telegram通知器
│   ├── server/                   # API服务模块
│   │   ├── app.js               # Express应用
│   │   └── routes/              # 路由文件
│   │       ├── fundRoutes.js    # 基金数据路由
│   │       └── systemRoutes.js  # 系统管理路由
│   └── utils/                   # 工具函数
│       └── logger.js            # 日志工具
├── scripts/                     # 脚本文件
│   ├── init-database.js         # 数据库初始化脚本
│   ├── start.sh                # 启动脚本
│   ├── deploy.sh               # 部署脚本
│   └── test.js                 # 测试脚本
├── logs/                        # 日志文件目录
├── package.json                # 项目配置
├── env.example                 # 环境变量示例
├── .gitignore                  # Git忽略文件
├── README.md                   # 项目说明
├── DEPLOYMENT.md               # 部署指南
└── PROJECT_STRUCTURE.md        # 项目结构说明
```

## 🏗️ 架构设计

### 核心模块

1. **数据爬取模块** (`src/crawler/`)
   - `FundCrawler`: 负责从API获取基金数据
   - 支持数据验证和格式化
   - 异常处理和重试机制

2. **数据存储模块** (`src/database/`)
   - `FundRepository`: 数据库操作封装
   - 支持批量插入和增量更新
   - 数据去重和清理功能

3. **定时任务模块** (`src/scheduler/`)
   - `CronScheduler`: 定时任务调度器
   - 支持多种定时策略
   - 任务状态监控

4. **提醒模块** (`src/notifier/`)
   - `AlertService`: 统一提醒服务
   - 支持多种通知方式
   - 消息格式化和发送

5. **API服务模块** (`src/server/`)
   - RESTful API接口
   - 数据查询和筛选
   - 系统管理功能

### 数据流

```
API数据源 → 爬取器 → 数据验证 → 数据库存储 → 阈值检查 → 提醒发送
                ↓
           定时任务调度
                ↓
           异常处理 → 日志记录
```

## 🔧 配置管理

### 环境变量

- **数据库配置**: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- **API配置**: `API_BASE_URL`, `API_TOKEN`
- **服务器配置**: `PORT`, `NODE_ENV`
- **定时任务**: `CRON_SCHEDULE_1`, `CRON_SCHEDULE_2`
- **提醒配置**: `ALERT_THRESHOLD_POSITIVE`, `ALERT_THRESHOLD_NEGATIVE`
- **通知配置**: SMTP、Telegram等

### 数据库表结构

1. **fund_data**: 基金数据表
   - 主键: `id`
   - 唯一约束: `(fund_code, update_time)`
   - 索引: `fund_code`, `discount`, `update_time`

2. **alert_records**: 提醒记录表
   - 记录提醒发送历史
   - 支持状态跟踪

3. **system_config**: 系统配置表
   - 动态配置管理
   - 支持配置更新

## 🚀 部署方式

### 开发环境

```bash
# 1. 安装依赖
npm install

# 2. 配置环境
cp env.example .env

# 3. 初始化数据库
npm run init-db

# 4. 启动服务
npm run dev
```

### 生产环境

```bash
# 使用部署脚本
sudo ./scripts/deploy.sh

# 或手动部署
# 参考 DEPLOYMENT.md
```

## 📊 监控和维护

### 健康检查

- **服务状态**: `GET /health`
- **系统状态**: `GET /api/system/status`
- **API连接**: `GET /api/system/test-api`

### 日志管理

- **应用日志**: `logs/combined.log`
- **错误日志**: `logs/error.log`
- **系统日志**: `journalctl -u fund-arbitrage-crawler`

### 数据维护

- **自动清理**: 定时清理过期数据
- **手动清理**: API接口支持
- **数据备份**: 数据库备份脚本

## 🔒 安全考虑

1. **数据库安全**
   - 使用专用数据库用户
   - 限制权限范围
   - 定期备份数据

2. **API安全**
   - Token认证
   - 请求频率限制
   - 输入验证

3. **系统安全**
   - 服务用户隔离
   - 日志轮转
   - 异常监控

## 📈 扩展性

### 水平扩展

- 支持多实例部署
- 数据库读写分离
- 负载均衡

### 功能扩展

- 支持更多基金类型
- 增加更多通知方式
- 添加数据分析功能

### 性能优化

- 数据库索引优化
- 缓存机制
- 异步处理

## 🧪 测试

### 单元测试

```bash
# 运行测试脚本
node scripts/test.js
```

### 集成测试

- 数据库连接测试
- API功能测试
- 通知功能测试

### 性能测试

- 数据抓取性能
- 数据库查询性能
- API响应性能
