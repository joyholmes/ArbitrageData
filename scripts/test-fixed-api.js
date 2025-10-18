#!/usr/bin/env node

/**
 * 测试修复后的API连接
 */

require('dotenv').config();
const FundCrawler = require('../src/crawler/fundCrawler');
const logger = require('../src/utils/logger');

async function testFixedApi() {
  console.log('🔧 测试修复后的API连接...\n');

  try {
    const crawler = new FundCrawler();
    
    console.log('📡 开始抓取基金数据...');
    const fundData = await crawler.fetchFundData(1); // 使用type=1测试
    
    if (fundData && fundData.length > 0) {
      console.log(`✅ 成功抓取到 ${fundData.length} 条基金数据`);
      
      // 显示前3条数据
      console.log('\n📊 前3条基金数据:');
      fundData.slice(0, 3).forEach((fund, index) => {
        console.log(`${index + 1}. ${fund.fundName} (${fund.fundCode})`);
        console.log(`   折溢价率: ${fund.discount}%`);
        console.log(`   当前价格: ¥${fund.currentPrice}`);
        console.log(`   估值: ¥${fund.value}`);
        console.log('');
      });
      
    } else {
      console.log('⚠️  未获取到基金数据');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    logger.error('API测试失败:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testFixedApi()
    .then(() => {
      console.log('\n🎉 API测试完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = testFixedApi;
