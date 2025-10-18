const mysql = require('mysql2/promise');
const logger = require('../src/utils/logger');

async function initDatabase() {
  let connection;
  
  try {
    // 连接数据库（不指定数据库名）
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      charset: 'utf8mb4'
    });

    const dbName = process.env.DB_NAME || 'fund_arbitrage';
    
    // 创建数据库
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    logger.info(`数据库 ${dbName} 创建成功`);

    // 关闭当前连接，重新连接到指定数据库
    await connection.end();
    
    // 重新连接到指定数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: dbName,
      charset: 'utf8mb4'
    });

    // 创建基金数据表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS fund_data (
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
    logger.info('基金数据表创建成功');

    // 创建提醒记录表
    const createAlertTableSQL = `
      CREATE TABLE IF NOT EXISTS alert_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fund_code VARCHAR(20) NOT NULL COMMENT '基金代码',
        fund_name VARCHAR(100) NOT NULL COMMENT '基金名称',
        discount DECIMAL(5,2) NOT NULL COMMENT '折溢价率',
        alert_type ENUM('positive', 'negative') NOT NULL COMMENT '提醒类型',
        threshold DECIMAL(5,2) NOT NULL COMMENT '触发阈值',
        message TEXT COMMENT '提醒消息',
        sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
        status ENUM('sent', 'failed') NOT NULL DEFAULT 'sent' COMMENT '发送状态',
        INDEX idx_fund_code (fund_code),
        INDEX idx_sent_at (sent_at),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提醒记录表'
    `;

    await connection.execute(createAlertTableSQL);
    logger.info('提醒记录表创建成功');

    // 创建系统配置表
    const createConfigTableSQL = `
      CREATE TABLE IF NOT EXISTS system_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(50) NOT NULL UNIQUE COMMENT '配置键',
        config_value TEXT COMMENT '配置值',
        description VARCHAR(200) COMMENT '配置描述',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_config_key (config_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表'
    `;

    await connection.execute(createConfigTableSQL);
    logger.info('系统配置表创建成功');

    // 插入默认配置
    const defaultConfigs = [
      ['alert_threshold_positive', '3.0', '正折溢价提醒阈值'],
      ['alert_threshold_negative', '-3.0', '负折溢价提醒阈值'],
      ['crawl_schedule_1', '0 10 * * *', '第一次抓取时间（每天10:00）'],
      ['crawl_schedule_2', '0 15 * * *', '第二次抓取时间（每天15:00）'],
      ['data_retention_days', '90', '数据保留天数']
    ];

    for (const [key, value, description] of defaultConfigs) {
      await connection.execute(
        'INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES (?, ?, ?)',
        [key, value, description]
      );
    }

    logger.info('默认配置插入成功');
    logger.info('数据库初始化完成！');

  } catch (error) {
    logger.error('数据库初始化失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  require('dotenv').config();
  initDatabase()
    .then(() => {
      console.log('数据库初始化成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('数据库初始化失败:', error);
      process.exit(1);
    });
}

module.exports = initDatabase;
