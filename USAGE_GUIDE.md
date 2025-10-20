# 使用指南

## 🚀 快速开始

### 1. 启动服务
```bash
npm start
```

### 2. 手动触发数据爬取
```bash
curl -X POST http://localhost:3000/api/system/crawl
```

### 3. 检查数据爬取结果
```bash
# 快速检查（推荐）
npm run quick-check

# 详细状态检查
npm run check-status

# 查看数据库数据
npm run check-db
```

## 📊 数据检查命令

### 快速检查（最常用）
```bash
npm run quick-check
```
**功能**: 快速查看数据爬取状态，显示最近的数据和时间

### 详细状态检查
```bash
npm run check-status
```
**功能**: 完整的系统状态检查，包括：
- 数据库总记录数
- 今日新增数据
- 最近1小时数据
- 最新5条基金数据
- Web服务状态
- 数据统计信息

### 数据库检查
```bash
npm run check-db
```
**功能**: 查看数据库中的具体数据内容

## 🔍 如何判断数据爬取是否成功

### 1. 执行爬取命令后
```bash
curl -X POST http://localhost:3000/api/system/crawl
```
**期望输出**: `{"success":true,"message":"数据抓取任务已启动"}`

### 2. 立即检查结果
```bash
npm run quick-check
```
**成功标志**:
- ✅ `最近10分钟新增: X 条` (X > 0)
- ✅ `数据爬取成功！`

**失败标志**:
- ⚠️ `最近10分钟没有新数据`
- ❌ `检查失败: ...`

### 3. 查看具体数据
```bash
npm run check-status
```
**查看内容**:
- 最新基金数据列表
- 折溢价率信息
- 入库时间
- 数据统计

## 📈 API接口使用

### 获取最新基金数据
```bash
curl "http://localhost:3000/api/funds/latest?limit=5"
```

### 健康检查
```bash
curl http://localhost:3000/health
```

### 手动触发爬取
```bash
curl -X POST http://localhost:3000/api/system/crawl
```

## ⏰ 定时任务

系统会自动在以下时间执行数据爬取：
- **每日 10:00** - 上午数据抓取
- **每日 15:00** - 下午数据抓取
- **每日 23:00** - 数据清理
- **每小时** - 提醒检查

## 🛠️ 故障排除

### 1. 服务未启动
```bash
# 检查服务状态
ps aux | grep "node src/app.js"

# 启动服务
npm start
```

### 2. 数据库连接问题
```bash
# 检查数据库
npm run check-db
```

### 3. API连接问题
```bash
# 检查详细状态
npm run check-status
```

## 📝 常用工作流程

### 日常使用
1. 启动服务: `npm start`
2. 手动爬取: `curl -X POST http://localhost:3000/api/system/crawl`
3. 检查结果: `npm run quick-check`
4. 查看数据: `npm run check-status`

### 部署后使用
1. 检查服务: `curl http://localhost:3000/health`
2. 触发爬取: `curl -X POST http://localhost:3000/api/system/crawl`
3. 验证数据: `npm run quick-check`

## 🎯 关键指标

- **数据库总记录**: 显示历史数据总量
- **今日新增数据**: 显示今天爬取的数据量
- **最近10分钟新增**: 显示刚刚爬取的数据量
- **最新数据时间**: 显示最后一次数据更新时间

**正常状态**: 最近10分钟有新增数据，且时间是最新的
**异常状态**: 最近10分钟没有新数据，或数据时间过旧
