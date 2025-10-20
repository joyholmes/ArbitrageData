#!/usr/bin/env node

/**
 * 检查系统状态和数据爬取结果
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const logger = require('../src/utils/logger');

async function checkStatus() {
  console.log('🔍 检查系统状态和数据爬取结果...\n');

  let connection;
  try {
    // 连接数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'fund_arbitrage'
    });

    // 1. 检查总记录数
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM fund_data');
    const totalRecords = countResult[0].total;
    console.log(`📊 数据库总记录数: ${totalRecords}`);

    // 2. 检查今日数据
    const [todayResult] = await connection.execute(`
      SELECT COUNT(*) as today_count 
      FROM fund_data 
      WHERE DATE(created_at) = CURDATE()
    `);
    const todayCount = todayResult[0].today_count;
    console.log(`📅 今日新增数据: ${todayCount} 条`);

    // 3. 检查最近1小时的数据
    const [recentResult] = await connection.execute(`
      SELECT COUNT(*) as recent_count 
      FROM fund_data 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `);
    const recentCount = recentResult[0].recent_count;
    console.log(`⏰ 最近1小时新增: ${recentCount} 条`);

    // 4. 显示最新的5条数据
    if (totalRecords > 0) {
      const [latestRecords] = await connection.execute(`
        SELECT fund_code, fund_name, discount, current_price, value, created_at 
        FROM fund_data 
        ORDER BY created_at DESC 
        LIMIT 5
      `);

      console.log('\n📈 最新5条基金数据:');
      latestRecords.forEach((record, index) => {
        const timeAgo = getTimeAgo(record.created_at);
        console.log(`${index + 1}. ${record.fund_name} (${record.fund_code})`);
        console.log(`   折溢价率: ${record.discount}%`);
        console.log(`   当前价格: ¥${record.current_price}`);
        console.log(`   估值: ¥${record.value}`);
        console.log(`   入库时间: ${timeAgo}`);
        console.log('');
      });
    }

    // 5. 检查服务状态
    console.log('🌐 检查Web服务状态...');
    try {
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        console.log('✅ Web服务正常运行');
      } else {
        console.log('❌ Web服务异常');
      }
    } catch (error) {
      console.log('❌ Web服务未运行或无法访问');
    }

    // 6. 数据统计
    if (totalRecords > 0) {
      const [statsResult] = await connection.execute(`
        SELECT 
          COUNT(DISTINCT fund_code) as unique_funds,
          AVG(discount) as avg_discount,
          MAX(discount) as max_discount,
          MIN(discount) as min_discount
        FROM fund_data 
        WHERE DATE(created_at) = CURDATE()
      `);
      
      const stats = statsResult[0];
      console.log('\n📊 今日数据统计:');
      console.log(`   唯一基金数: ${stats.unique_funds}`);
      console.log(`   平均折溢价率: ${stats.avg_discount ? Number(stats.avg_discount).toFixed(2) : 0}%`);
      console.log(`   最高折溢价率: ${stats.max_discount || 0}%`);
      console.log(`   最低折溢价率: ${stats.min_discount || 0}%`);
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    logger.error('状态检查失败:', error);
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
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return '刚刚';
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else {
    return `${diffDays}天前`;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  checkStatus()
    .then(() => {
      console.log('\n🎉 状态检查完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('检查执行失败:', error);
      process.exit(1);
    });
}

module.exports = checkStatus;
