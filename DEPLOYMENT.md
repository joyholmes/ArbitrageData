# 部署指南

## 快速开始

### 1. 环境准备

确保服务器已安装：
- **Node.js >= 18**
- **MySQL >= 5.7**
- **Git**（用于代码拉取）

### 2. 本地开发部署

```bash
# 1. 克隆项目
git clone <repository-url>
cd ArbitrageData

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp env.example .env
# 编辑 .env 文件，配置数据库连接等信息

# 4. 初始化数据库
npm run init-db

# 5. 启动服务
# 开发模式
npm run dev

# 生产模式
npm start
```

### 3. 生产环境部署

#### 方法一：使用部署脚本（推荐）

```bash
# 1. 上传项目到服务器
scp -r . user@server:/opt/fund-arbitrage-crawler

# 2. 在服务器上运行部署脚本
sudo ./scripts/deploy.sh
```

#### 方法二：手动部署

```bash
# 1. 创建服务用户
sudo useradd -r -s /bin/false -d /opt/fund-arbitrage-crawler fund-crawler

# 2. 创建目录
sudo mkdir -p /opt/fund-arbitrage-crawler
sudo mkdir -p /var/log/fund-arbitrage-crawler

# 3. 复制项目文件
sudo cp -r . /opt/fund-arbitrage-crawler/
sudo chown -R fund-crawler:fund-crawler /opt/fund-arbitrage-crawler
sudo chown -R fund-crawler:fund-crawler /var/log/fund-arbitrage-crawler

# 4. 安装依赖
cd /opt/fund-arbitrage-crawler
sudo -u fund-crawler npm install --production

# 5. 创建systemd服务文件
sudo nano /etc/systemd/system/fund-arbitrage-crawler.service
# 复制scripts/deploy.sh中的服务配置

# 6. 启用并启动服务
sudo systemctl daemon-reload
sudo systemctl enable fund-arbitrage-crawler
sudo systemctl start fund-arbitrage-crawler
```

## 配置说明

### 环境变量配置

复制 `env.example` 为 `.env` 并配置以下参数：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fund_arbitrage
DB_USER=root
DB_PASSWORD=your_password

# API配置
API_BASE_URL=http://xiaoyudecqg.cn/htl/mp/api/arbitrage/list
API_TOKEN=your_api_token_here

# 服务器配置
PORT=3000
NODE_ENV=production

# 定时任务配置
CRON_SCHEDULE_1=0 10 * * *  # 每天10:00
CRON_SCHEDULE_2=0 15 * * *  # 每天15:00

# 提醒配置
ALERT_THRESHOLD_POSITIVE=3.0
ALERT_THRESHOLD_NEGATIVE=-3.0

# 邮件配置（可选）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_TO=recipient@example.com

# Telegram配置（可选）
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 数据库配置

1. **创建数据库**：
```sql
CREATE DATABASE fund_arbitrage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. **创建用户**（可选）：
```sql
CREATE USER 'fund_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON fund_arbitrage.* TO 'fund_user'@'localhost';
FLUSH PRIVILEGES;
```

3. **初始化表结构**：
```bash
npm run init-db
```

## 服务管理

### systemd服务管理

```bash
# 启动服务
sudo systemctl start fund-arbitrage-crawler

# 停止服务
sudo systemctl stop fund-arbitrage-crawler

# 重启服务
sudo systemctl restart fund-arbitrage-crawler

# 查看状态
sudo systemctl status fund-arbitrage-crawler

# 查看日志
sudo journalctl -u fund-arbitrage-crawler -f

# 开机自启
sudo systemctl enable fund-arbitrage-crawler
```

### 日志管理

- **应用日志**：`/var/log/fund-arbitrage-crawler/`
- **系统日志**：`sudo journalctl -u fund-arbitrage-crawler`
- **日志轮转**：已配置自动日志轮转，保留30天

## 监控和维护

### 健康检查

```bash
# 检查服务状态
curl http://localhost:3000/health

# 检查API连接
curl http://localhost:3000/api/system/test-api

# 手动触发抓取
curl -X POST http://localhost:3000/api/system/crawl
```

### 数据维护

```bash
# 清理过期数据
curl -X POST http://localhost:3000/api/system/cleanup \
  -H "Content-Type: application/json" \
  -d '{"days": 90}'
```

### 性能监控

```bash
# 查看系统状态
curl http://localhost:3000/api/system/status

# 查看内存使用
ps aux | grep node

# 查看数据库连接
mysql -u root -p -e "SHOW PROCESSLIST;"
```

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查MySQL服务是否运行
   - 验证数据库配置信息
   - 确认数据库用户权限

2. **API抓取失败**
   - 检查网络连接
   - 验证API Token是否有效
   - 查看抓取日志

3. **提醒发送失败**
   - 检查邮件SMTP配置
   - 验证Telegram Bot Token
   - 查看通知日志

4. **服务启动失败**
   - 检查端口是否被占用
   - 验证环境变量配置
   - 查看系统日志

### 日志分析

```bash
# 查看错误日志
tail -f /var/log/fund-arbitrage-crawler/error.log

# 查看所有日志
tail -f /var/log/fund-arbitrage-crawler/combined.log

# 查看系统日志
sudo journalctl -u fund-arbitrage-crawler --since "1 hour ago"
```

## 安全建议

1. **数据库安全**
   - 使用强密码
   - 限制数据库用户权限
   - 定期备份数据

2. **网络安全**
   - 配置防火墙规则
   - 使用HTTPS（如需要）
   - 限制API访问

3. **系统安全**
   - 定期更新系统
   - 监控服务状态
   - 设置日志轮转

## 备份和恢复

### 数据备份

```bash
# 备份数据库
mysqldump -u root -p fund_arbitrage > backup_$(date +%Y%m%d).sql

# 备份配置文件
cp .env backup_env_$(date +%Y%m%d)
```

### 数据恢复

```bash
# 恢复数据库
mysql -u root -p fund_arbitrage < backup_20231201.sql

# 重启服务
sudo systemctl restart fund-arbitrage-crawler
```
