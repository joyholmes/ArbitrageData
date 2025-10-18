const TelegramBot = require('node-telegram-bot-api');
const logger = require('../utils/logger');

class TelegramNotifier {
  constructor() {
    this.name = 'TelegramNotifier';
    this.bot = null;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.initializeBot();
  }

  /**
   * 初始化Telegram Bot
   */
  initializeBot() {
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        throw new Error('Telegram Bot Token 未配置');
      }

      this.bot = new TelegramBot(token, { polling: false });
      logger.info('Telegram通知器初始化成功');
    } catch (error) {
      logger.error('Telegram通知器初始化失败:', error);
    }
  }

  /**
   * 发送Telegram通知
   * @param {string} title - 通知标题
   * @param {string} message - 通知内容
   * @param {Array} fundData - 基金数据（可选）
   */
  async send(title, message, fundData = null) {
    if (!this.bot || !this.chatId) {
      throw new Error('Telegram Bot 未正确配置');
    }

    try {
      let fullMessage = `*${title}*\n\n${message}`;

      if (fundData && fundData.length > 0) {
        fullMessage += '\n\n*📊 基金数据详情:*\n';
        fundData.forEach((fund, index) => {
          const discountText = fund.discount > 0 ? 
            `溢价 ${fund.discount.toFixed(2)}%` : 
            `折价 ${Math.abs(fund.discount).toFixed(2)}%`;
          
          fullMessage += `\n${index + 1}\\. *${fund.fundName}* \\(${fund.fundCode}\\)\n`;
          fullMessage += `折溢价率: ${discountText}\n`;
          fullMessage += `当前价格: ¥${fund.currentPrice}\n`;
          fullMessage += `估值: ¥${fund.value}\n`;
          fullMessage += `涨跌幅: ${fund.increaseRt > 0 ? '+' : ''}${fund.increaseRt.toFixed(2)}%\n`;
        });
      }

      // 添加时间戳
      fullMessage += `\n\n_发送时间: ${new Date().toLocaleString('zh-CN')}_`;

      const result = await this.bot.sendMessage(this.chatId, fullMessage, {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true
      });

      logger.info(`Telegram消息发送成功: ${result.message_id}`);
      
    } catch (error) {
      logger.error('Telegram消息发送失败:', error);
      throw error;
    }
  }

  /**
   * 发送格式化表格消息
   * @param {string} title - 标题
   * @param {Array} fundData - 基金数据
   */
  async sendTableMessage(title, fundData) {
    if (!this.bot || !this.chatId || !fundData || fundData.length === 0) {
      return;
    }

    try {
      let message = `*${title}*\n\n`;
      message += '```\n';
      message += '基金名称                   代码      折溢价率    当前价格\n';
      message += '─'.repeat(60) + '\n';

      fundData.forEach(fund => {
        const name = fund.fundName.length > 20 ? 
          fund.fundName.substring(0, 17) + '...' : 
          fund.fundName.padEnd(20);
        const discount = (fund.discount > 0 ? '+' : '') + fund.discount.toFixed(2) + '%';
        
        message += `${name} ${fund.fundCode} ${discount.padStart(8)} ¥${fund.currentPrice}\n`;
      });

      message += '```\n';
      message += `\n_数据更新时间: ${new Date().toLocaleString('zh-CN')}_`;

      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown'
      });

      logger.info('Telegram表格消息发送成功');
      
    } catch (error) {
      logger.error('Telegram表格消息发送失败:', error);
      throw error;
    }
  }

  /**
   * 测试Telegram连接
   * @returns {Promise<boolean>} 测试结果
   */
  async testConnection() {
    try {
      if (!this.bot || !this.chatId) {
        throw new Error('Telegram Bot 未正确配置');
      }

      await this.bot.sendMessage(this.chatId, '🤖 Telegram通知测试成功！');
      logger.info('Telegram连接测试成功');
      return true;
    } catch (error) {
      logger.error('Telegram连接测试失败:', error);
      return false;
    }
  }

  /**
   * 获取Bot信息
   * @returns {Promise<Object>} Bot信息
   */
  async getBotInfo() {
    try {
      if (!this.bot) {
        throw new Error('Telegram Bot 未初始化');
      }

      const me = await this.bot.getMe();
      return me;
    } catch (error) {
      logger.error('获取Telegram Bot信息失败:', error);
      throw error;
    }
  }
}

module.exports = TelegramNotifier;
