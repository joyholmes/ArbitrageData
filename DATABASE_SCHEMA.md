# 数据库字段说明文档

## 基金数据表 (fund_data)

根据基金折溢价数据表格的实际显示内容，以下是各字段的详细说明：

### 基础信息字段

| 字段名 | 类型 | 说明 | 示例值 | 对应表格列 |
|--------|------|------|--------|------------|
| `fund_code` | VARCHAR(20) | 基金代码，6位数字标识 | 501096, 501079 | 基金名称下方的代码 |
| `fund_name` | VARCHAR(100) | 基金名称 | 国联安科创LOF, 科创大成LOF | 基金名称列 |
| `type` | INT | 基金类型分类 | 0=LOF基金, 1=ETF基金, 2=其他, 3=特殊 | 内部分类标识 |

### 估值和价格字段

| 字段名 | 类型 | 说明 | 示例值 | 对应表格列 |
|--------|------|------|--------|------------|
| `value` | DECIMAL(10,4) | 估值/净值，基金的理论价值 | 1.0274, 3.0519 | 估值/净值列 |
| `nav` | DECIMAL(10,4) | 净值数据，精确的基金净值 | 1.0274, 3.0519 | 与value类似，更精确 |
| `current_price` | DECIMAL(10,3) | 场内价格，当前交易价格 | 1.037, 3.078 | 场内价格列 |
| `discount` | DECIMAL(5,2) | 溢价率/折价率，正值为溢价，负值为折价 | 0.94, -0.86 | 溢价率列（红色显示） |

### 涨跌幅字段

| 字段名 | 类型 | 说明 | 示例值 | 对应表格列 |
|--------|------|------|--------|------------|
| `increase_rt` | DECIMAL(5,2) | 场内价格涨跌幅 | 4.02, 1.82 | 场内价格列的百分比 |
| `estimate_limit` | DECIMAL(5,2) | 估值涨跌幅（估值/净值列的百分比） | 2.52, 1.71 | 估值/净值列的百分比 |
| `fall_num` | DECIMAL(10,2) | 跌幅次数或跌幅数值 | 3/5, 7/8, 5/10 | 可能包含分数的跌幅数据 |

### 交易和份额字段

| 字段名 | 类型 | 说明 | 示例值 | 用途 |
|--------|------|------|--------|------|
| `amount` | DECIMAL(15,2) | 交易金额或成交额 | 1000000.00 | 交易统计 |
| `all_share` | DECIMAL(15,2) | 总份额，基金总发行份额 | 1000000.00 | 份额统计 |
| `incr_share` | DECIMAL(15,2) | 增量份额，份额变化量 | 1000.00 | 份额变化统计 |

### 提醒和用户字段

| 字段名 | 类型 | 说明 | 示例值 | 对应表格列 |
|--------|------|------|--------|------------|
| `open_remind` | BOOLEAN | 是否开启提醒 | true/false | 自选列（开关状态） |
| `wx_user_id` | VARCHAR(50) | 微信用户ID | 1978808406584176641 | 用于发送提醒 |
| `into_time` | DATETIME | 用户关注该基金的时间 | 2025-10-21 10:00:00 | 用户行为记录 |

### 状态和信息字段

| 字段名 | 类型 | 说明 | 示例值 | 用途 |
|--------|------|------|--------|------|
| `is_pause` | INT | 是否暂停跟踪 | 0=正常, 1=暂停, 2=限购 | 基金状态标识 |
| `info` | TEXT | 额外信息 | "限100万", "暂停申购" | 特殊说明信息 |
| `estimate_limit` | DECIMAL(5,2) | 估值上下限阈值 | 3.00, -3.00 | 提醒触发阈值 |

### 时间字段

| 字段名 | 类型 | 说明 | 示例值 | 用途 |
|--------|------|------|--------|------|
| `update_time` | DATETIME | 数据更新时间 | 2025-10-21 10:40:13 | API返回的原始时间 |
| `created_at` | DATETIME | 数据入库时间 | 2025-10-21 10:54:50 | 系统记录时间 |

## 数据映射关系

### 表格显示 → 数据库字段

1. **基金名称** → `fund_name` + `fund_code`
2. **估值/净值** → `value` 或 `nav`
3. **溢价率** → `discount`（红色显示正值，绿色显示负值）
4. **场内价格** → `current_price`
5. **自选开关** → `open_remind`

### 实际数据示例

根据红土精选基金的实际数据：

```json
{
  "wxUserId": "1978808406584176641",
  "fundCode": "168401",
  "fundName": "红土精选",
  "type": 0,
  "openRemind": false,
  "value": "3.2938",
  "discount": 1.22,
  "estimateLimit": 2.52,
  "currentPrice": 3.334,
  "increaseRt": 4.02,
  "updateTime": "2025-10-21T11:31:13",
  "intoTime": null,
  "isPause": 0,
  "info": null,
  "nav": false,
  "fallNum": null,
  "amount": 53.49,
  "allShare": 910.18,
  "incrShare": 0
}
```

**字段对应关系**：
- `fund_code`: "168401" → 基金代码
- `fund_name`: "红土精选" → 基金名称
- `value`: "3.2938" → 估值/净值（3.2938）
- `discount`: 1.22 → 溢价率（1.22%，红色显示）
- `current_price`: 3.334 → 场内价格（3.334）
- `increase_rt`: 4.02 → 场内价格涨跌幅（4.02%，红色显示）
- `estimate_limit`: 2.52 → 估值涨跌幅（2.52%，红色显示）
- `amount`: 53.49 → 交易金额
- `all_share`: 910.18 → 总份额
- `incr_share`: 0 → 增量份额

### 数据类型说明

- **溢价率计算**：`discount = (current_price - value) / value * 100`
- **涨跌幅**：`increase_rt` 表示场内价格相对于前一交易日的涨跌百分比
- **基金类型**：`type` 字段用于区分不同类型的基金，便于分类抓取和管理

### 索引说明

- `idx_fund_code`: 按基金代码查询
- `idx_discount`: 按溢价率排序和筛选
- `idx_update_time`: 按更新时间查询
- `idx_created_at`: 按入库时间查询
- `idx_wx_user_id`: 按用户ID查询提醒

## 使用示例

### 查询高溢价基金
```sql
SELECT fund_name, fund_code, discount, current_price, value 
FROM fund_data 
WHERE discount > 3.0 
ORDER BY discount DESC;
```

### 查询用户关注的基金
```sql
SELECT * FROM fund_data 
WHERE wx_user_id = '1978808406584176641' 
AND open_remind = true;
```

### 查询最新数据
```sql
SELECT * FROM fund_data 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY created_at DESC;
```
