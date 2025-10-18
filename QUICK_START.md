# 快速开始指南

## 🚀 5分钟快速部署

### 1. 环境准备

确保已安装：
- Node.js >= 18
- MySQL >= 5.7

### 2. 一键启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp env.example .env
# 编辑 .env 文件，配置数据库连接

# 3. 初始化数据库
npm run init-db

# 4. 测试系统
npm test

# 5. 启动服务
npm start
```

### 3. 验证部署

```bash
# 检查服务状态
curl http://localhost:3000/health

# 查看API文档
curl http://localhost:3000/api/system/docs

# 手动触发数据抓取
curl -X POST http://localhost:3000/api/system/crawl
```

## 📋 配置清单

### 必需配置

- [ ] 数据库连接信息
- [ ] API Token（如果需要）
- [ ] 服务器端口

### 可选配置

- [ ] 邮件提醒（SMTP）
- [ ] Telegram提醒
- [ ] 自定义定时任务
- [ ] 提醒阈值

## 🔧 常用命令

```bash
# 开发模式启动
npm run dev

# 生产模式启动
npm start

# 运行测试
npm test

# 初始化数据库
npm run init-db

# 部署到生产环境
npm run deploy
```

## 📊 API接口

### 基础接口

- `GET /health` - 健康检查
- `GET /api/system/status` - 系统状态
- `GET /api/system/docs` - API文档

### 数据接口

- `GET /api/funds` - 获取所有基金数据
- `GET /api/funds/:code` - 获取指定基金
- `GET /api/funds/abnormal` - 获取异常基金
- `GET /api/funds/ranking` - 获取排行榜

### 管理接口

- `POST /api/system/crawl` - 手动抓取
- `POST /api/system/test-notifications` - 测试通知
- `POST /api/system/cleanup` - 清理数据

## 🚨 故障排除

### 常见问题

1. **数据库连接失败**
   ```bash
   # 检查MySQL服务
   sudo systemctl status mysql
   
   # 测试连接
   mysql -u root -p
   ```

2. **API抓取失败**
   ```bash
   # 测试API连接
   curl http://localhost:3000/api/system/test-api
   ```

3. **服务启动失败**
   ```bash
   # 查看日志
   tail -f logs/error.log
   
   # 检查端口占用
   lsof -i :3000
   ```

### 日志查看

```bash
# 应用日志
tail -f logs/combined.log

# 错误日志
tail -f logs/error.log

# 系统日志（如果使用systemd）
sudo journalctl -u fund-arbitrage-crawler -f
```

## 📈 监控指标

### 关键指标

- 服务运行时间
- 内存使用情况
- 数据库连接状态
- 定时任务执行状态
- 数据抓取成功率

### 监控命令

```bash
# 系统状态
curl http://localhost:3000/api/system/status

# 内存使用
ps aux | grep node

# 数据库状态
mysql -u root -p -e "SHOW PROCESSLIST;"
```

## 🔄 维护任务

### 日常维护

- 检查服务状态
- 查看错误日志
- 监控数据抓取
- 清理过期数据

### 定期维护

- 数据库备份
- 日志轮转
- 系统更新
- 性能优化

## 📞 技术支持

如果遇到问题，请：

1. 查看日志文件
2. 运行测试脚本
3. 检查配置文件
4. 参考部署文档

## 🎯 下一步

部署完成后，您可以：

1. 配置提醒阈值
2. 设置通知方式
3. 自定义定时任务
4. 集成到现有系统
5. 开发前端界面
