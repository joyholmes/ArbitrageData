#!/usr/bin/env node

/**
 * 快速检查数据爬取结果
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function quickCheck() {
  console.log('🔍 快速检查数据爬取结果...\n');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'fund_arbitrage'
    });

    // 检查最近的数据
    const [recentData] = await connection.execute(`
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE) THEN 1 END) as recent_count,
        MAX(created_at) as latest_time
      FROM fund_data
    `);

    const data = recentData[0];
    console.log(`📊 数据库总记录: ${data.total_count} 条`);
    console.log(`⏰ 最近10分钟新增: ${data.recent_count} 条`);
    console.log(`🕐 最新数据时间: ${data.latest_time}`);

    if (data.recent_count > 0) {
      console.log('✅ 数据爬取成功！');
    } else {
      console.log('⚠️  最近10分钟没有新数据');
    }

    // 显示最新3条数据
    const [latestRecords] = await connection.execute(`
      SELECT fund_name, fund_code, discount, created_at 
      FROM fund_data 
      ORDER BY created_at DESC 
      LIMIT 3
    `);

    console.log('\n📈 最新3条数据:');
    latestRecords.forEach((record, index) => {
      const timeAgo = getTimeAgo(record.created_at);
      console.log(`${index + 1}. ${record.fund_name} (${record.fund_code}) - ${record.discount}% - ${timeAgo}`);
    });

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

function getTimeAgo(date) {
  const now = new Date();
  const recordTime = new Date(date);
  const diffMs = now - recordTime;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return '刚刚';
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`;
  } else {
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}小时前`;
  }
}

if (require.main === module) {
  quickCheck()
    .then(() => {
      console.log('\n🎉 检查完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('检查失败:', error);
      process.exit(1);
    });
}

module.exports = quickCheck;
