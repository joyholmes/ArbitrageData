#!/usr/bin/env node

/**
 * 数据库迁移脚本 - 更新表结构以支持新的字段
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const logger = require('../src/utils/logger');

async function migrateDatabase() {
  let connection;
  
  try {
    // 连接数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'fund_arbitrage',
      charset: 'utf8mb4'
    });

    logger.info('开始数据库迁移...');

    // 删除现有表（如果存在）
    await connection.execute('DROP TABLE IF EXISTS fund_data');
    logger.info('已删除现有fund_data表');

    // 创建新的基金数据表
    const createTableSQL = `
      CREATE TABLE fund_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fund_code VARCHAR(20) NOT NULL COMMENT '基金代码',
        fund_name VARCHAR(100) NOT NULL COMMENT '基金名称',
        type INT NOT NULL DEFAULT 0 COMMENT '基金类型',
        value DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT '当前估值',
        discount DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '折溢价率',
        estimate_limit DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '估值上下限',
        current_price DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT '当前价格',
        increase_rt DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '涨跌幅',
        update_time DATETIME NOT NULL COMMENT '数据更新时间',
        open_remind BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否开启提醒',
        wx_user_id VARCHAR(50) DEFAULT NULL COMMENT '微信用户ID',
        into_time DATETIME DEFAULT NULL COMMENT '进入时间',
        is_pause INT NOT NULL DEFAULT 0 COMMENT '是否暂停',
        info TEXT DEFAULT NULL COMMENT '额外信息',
        nav BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否净值',
        fall_num DECIMAL(10,2) DEFAULT NULL COMMENT '下跌数量',
        amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT '金额',
        all_share DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT '总份额',
        incr_share DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT '增量份额',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '数据入库时间',
        UNIQUE KEY unique_fund_update (fund_code, update_time),
        INDEX idx_fund_code (fund_code),
        INDEX idx_discount (discount),
        INDEX idx_update_time (update_time),
        INDEX idx_created_at (created_at),
        INDEX idx_wx_user_id (wx_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='基金折溢价数据表'
    `;

    await connection.execute(createTableSQL);
    logger.info('新的fund_data表创建成功');

    logger.info('数据库迁移完成！');

  } catch (error) {
    logger.error('数据库迁移失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('数据库迁移成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('数据库迁移失败:', error);
      process.exit(1);
    });
}

module.exports = migrateDatabase;
