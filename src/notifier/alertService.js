const logger = require('../utils/logger');
const EmailNotifier = require('./emailNotifier');
const TelegramNotifier = require('./telegramNotifier');
const ConsoleNotifier = require('./consoleNotifier');

class AlertService {
  constructor() {
    this.notifiers = [];
    this.initializeNotifiers();
  }

  /**
   * 初始化通知器
   */
  initializeNotifiers() {
    // 控制台通知器（始终启用）
    this.notifiers.push(new ConsoleNotifier());

    // 邮件通知器（如果配置了SMTP）
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.notifiers.push(new EmailNotifier());
    }

    // Telegram通知器（如果配置了Bot Token）
    if (process.env.TELEGRAM_BOT_TOKEN) {
      this.notifiers.push(new TelegramNotifier());
    }

    logger.info(`已初始化 ${this.notifiers.length} 个通知器`);
  }

  /**
   * 发送异常基金提醒
   * @param {Array} abnormalFunds - 异常基金数据
   */
  async sendAbnormalFundsAlert(abnormalFunds) {
    if (!abnormalFunds || abnormalFunds.length === 0) {
      return;
    }

    const message = this.formatAbnormalFundsMessage(abnormalFunds);
    const title = `基金折溢价异常提醒 (${abnormalFunds.length}个基金)`;

    logger.info(`发送异常基金提醒: ${abnormalFunds.length}个基金`);

    // 并行发送到所有通知器
    const promises = this.notifiers.map(notifier => 
      this.sendNotification(notifier, title, message, abnormalFunds)
    );

    try {
      await Promise.allSettled(promises);
      logger.info('异常基金提醒发送完成');
    } catch (error) {
      logger.error('发送异常基金提醒失败:', error);
    }
  }

  /**
   * 发送单个基金提醒
   * @param {Object} fundData - 基金数据
   * @param {string} alertType - 提醒类型
   */
  async sendSingleFundAlert(fundData, alertType) {
    const message = this.formatSingleFundMessage(fundData, alertType);
    const title = `基金${alertType === 'positive' ? '溢价' : '折价'}提醒`;

    logger.info(`发送单个基金提醒: ${fundData.fundName} (${fundData.fundCode})`);

    const promises = this.notifiers.map(notifier => 
      this.sendNotification(notifier, title, message, [fundData])
    );

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      logger.error('发送单个基金提醒失败:', error);
    }
  }

  /**
   * 发送系统状态提醒
   * @param {string} status - 系统状态
   * @param {string} message - 状态消息
   */
  async sendSystemAlert(status, message) {
    const title = `系统${status}提醒`;
    
    const promises = this.notifiers.map(notifier => 
      this.sendNotification(notifier, title, message)
    );

    try {
      await Promise.allSettled(promises);
      logger.info(`系统${status}提醒发送完成`);
    } catch (error) {
      logger.error(`发送系统${status}提醒失败:`, error);
    }
  }

  /**
   * 发送通知到指定通知器
   * @param {Object} notifier - 通知器实例
   * @param {string} title - 标题
   * @param {string} message - 消息内容
   * @param {Array} fundData - 基金数据（可选）
   */
  async sendNotification(notifier, title, message, fundData = null) {
    try {
      await notifier.send(title, message, fundData);
      logger.debug(`通知发送成功: ${notifier.constructor.name}`);
    } catch (error) {
      logger.error(`通知发送失败: ${notifier.constructor.name}`, error);
    }
  }

  /**
   * 格式化异常基金消息
   * @param {Array} abnormalFunds - 异常基金数据
   * @returns {string} 格式化后的消息
   */
  formatAbnormalFundsMessage(abnormalFunds) {
    let message = `发现 ${abnormalFunds.length} 个基金折溢价异常：\n\n`;
    
    abnormalFunds.forEach((fund, index) => {
      const discountText = fund.discount > 0 ? `溢价 ${fund.discount.toFixed(2)}%` : `折价 ${Math.abs(fund.discount).toFixed(2)}%`;
      message += `${index + 1}. ${fund.fundName} (${fund.fundCode})\n`;
      message += `   折溢价率: ${discountText}\n`;
      message += `   当前价格: ¥${fund.currentPrice}\n`;
      message += `   估值: ¥${fund.value}\n`;
      message += `   涨跌幅: ${fund.increaseRt > 0 ? '+' : ''}${fund.increaseRt.toFixed(2)}%\n\n`;
    });

    message += `数据更新时间: ${new Date().toLocaleString('zh-CN')}`;
    return message;
  }

  /**
   * 格式化单个基金消息
   * @param {Object} fundData - 基金数据
   * @param {string} alertType - 提醒类型
   * @returns {string} 格式化后的消息
   */
  formatSingleFundMessage(fundData, alertType) {
    const discountText = alertType === 'positive' ? 
      `溢价 ${fundData.discount.toFixed(2)}%` : 
      `折价 ${Math.abs(fundData.discount).toFixed(2)}%`;

    let message = `基金${alertType === 'positive' ? '溢价' : '折价'}提醒\n\n`;
    message += `基金名称: ${fundData.fundName}\n`;
    message += `基金代码: ${fundData.fundCode}\n`;
    message += `折溢价率: ${discountText}\n`;
    message += `当前价格: ¥${fundData.currentPrice}\n`;
    message += `估值: ¥${fundData.value}\n`;
    message += `涨跌幅: ${fundData.increaseRt > 0 ? '+' : ''}${fundData.increaseRt.toFixed(2)}%\n`;
    message += `更新时间: ${new Date(fundData.updateTime).toLocaleString('zh-CN')}`;

    return message;
  }

  /**
   * 测试所有通知器
   * @returns {Promise<Object>} 测试结果
   */
  async testNotifications() {
    const testMessage = '这是一条测试消息，用于验证通知功能是否正常工作。';
    const results = {};

    for (const notifier of this.notifiers) {
      try {
        await notifier.send('测试通知', testMessage);
        results[notifier.constructor.name] = { success: true };
        logger.info(`通知器测试成功: ${notifier.constructor.name}`);
      } catch (error) {
        results[notifier.constructor.name] = { success: false, error: error.message };
        logger.error(`通知器测试失败: ${notifier.constructor.name}`, error);
      }
    }

    return results;
  }
}

module.exports = AlertService;
