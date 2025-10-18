const logger = require('../utils/logger');

class ConsoleNotifier {
  constructor() {
    this.name = 'ConsoleNotifier';
  }

  /**
   * 发送控制台通知
   * @param {string} title - 通知标题
   * @param {string} message - 通知内容
   * @param {Array} fundData - 基金数据（可选）
   */
  async send(title, message, fundData = null) {
    try {
      console.log('\n' + '='.repeat(60));
      console.log(`📢 ${title}`);
      console.log('='.repeat(60));
      console.log(message);
      
      if (fundData && fundData.length > 0) {
        console.log('\n📊 基金数据详情:');
        fundData.forEach((fund, index) => {
          console.log(`\n${index + 1}. ${fund.fundName} (${fund.fundCode})`);
          console.log(`   折溢价率: ${fund.discount > 0 ? '+' : ''}${fund.discount.toFixed(2)}%`);
          console.log(`   当前价格: ¥${fund.currentPrice}`);
          console.log(`   估值: ¥${fund.value}`);
          console.log(`   涨跌幅: ${fund.increaseRt > 0 ? '+' : ''}${fund.increaseRt.toFixed(2)}%`);
        });
      }
      
      console.log('='.repeat(60) + '\n');
      
      logger.info(`控制台通知发送成功: ${title}`);
    } catch (error) {
      logger.error('控制台通知发送失败:', error);
      throw error;
    }
  }
}

module.exports = ConsoleNotifier;
