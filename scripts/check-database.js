#!/usr/bin/env node

/**
 * 检查数据库中的数据
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const logger = require('../src/utils/logger');

async function checkDatabase() {
  console.log('🔍 检查数据库中的数据...\n');

  let connection;
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'fund_arbitrage'
    });

    // 检查总记录数
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM fund_data');
    const totalRecords = countResult[0].total;
    console.log(`📊 数据库总记录数: ${totalRecords}`);

    if (totalRecords > 0) {
      // 获取最新的5条记录
      const [latestRecords] = await connection.execute(`
        SELECT fund_code, fund_name, discount, current_price, value, created_at 
        FROM fund_data 
        ORDER BY created_at DESC 
        LIMIT 5
      `);

      console.log('\n📈 最新5条基金数据:');
      latestRecords.forEach((record, index) => {
        console.log(`${index + 1}. ${record.fund_name} (${record.fund_code})`);
        console.log(`   折溢价率: ${record.discount}%`);
        console.log(`   当前价格: ¥${record.current_price}`);
        console.log(`   估值: ¥${record.value}`);
        console.log(`   入库时间: ${record.created_at}`);
        console.log('');
      });

      // 检查今日数据
      const [todayRecords] = await connection.execute(`
        SELECT COUNT(*) as today_count 
        FROM fund_data 
        WHERE DATE(created_at) = CURDATE()
      `);
      console.log(`📅 今日新增数据: ${todayRecords[0].today_count} 条`);

    } else {
      console.log('⚠️  数据库中暂无数据');
    }

  } catch (error) {
    console.error('❌ 数据库检查失败:', error.message);
    logger.error('数据库检查失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  checkDatabase()
    .then(() => {
      console.log('\n🎉 数据库检查完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('检查执行失败:', error);
      process.exit(1);
    });
}

module.exports = checkDatabase;
