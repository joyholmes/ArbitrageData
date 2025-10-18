const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailNotifier {
  constructor() {
    this.name = 'EmailNotifier';
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * 初始化邮件传输器
   */
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      logger.info('邮件通知器初始化成功');
    } catch (error) {
      logger.error('邮件通知器初始化失败:', error);
    }
  }

  /**
   * 发送邮件通知
   * @param {string} title - 邮件标题
   * @param {string} message - 邮件内容
   * @param {Array} fundData - 基金数据（可选）
   */
  async send(title, message, fundData = null) {
    if (!this.transporter) {
      throw new Error('邮件传输器未初始化');
    }

    try {
      const htmlContent = this.formatHtmlMessage(title, message, fundData);
      
      const mailOptions = {
        from: `"基金折溢价监控系统" <${process.env.SMTP_USER}>`,
        to: process.env.EMAIL_TO,
        subject: title,
        text: message,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`邮件发送成功: ${result.messageId}`);
      
    } catch (error) {
      logger.error('邮件发送失败:', error);
      throw error;
    }
  }

  /**
   * 格式化HTML邮件内容
   * @param {string} title - 标题
   * @param {string} message - 消息内容
   * @param {Array} fundData - 基金数据
   * @returns {string} HTML内容
   */
  formatHtmlMessage(title, message, fundData) {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
          .fund-item { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007bff; }
          .fund-name { font-weight: bold; color: #007bff; }
          .fund-code { color: #666; font-size: 0.9em; }
          .discount-positive { color: #dc3545; font-weight: bold; }
          .discount-negative { color: #28a745; font-weight: bold; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📢 ${title}</h2>
          </div>
          <div class="content">
            <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${message}</pre>
    `;

    if (fundData && fundData.length > 0) {
      html += '<h3>📊 基金数据详情</h3>';
      fundData.forEach((fund, index) => {
        const discountClass = fund.discount > 0 ? 'discount-positive' : 'discount-negative';
        const discountText = fund.discount > 0 ? `溢价 ${fund.discount.toFixed(2)}%` : `折价 ${Math.abs(fund.discount).toFixed(2)}%`;
        
        html += `
          <div class="fund-item">
            <div class="fund-name">${index + 1}. ${fund.fundName}</div>
            <div class="fund-code">基金代码: ${fund.fundCode}</div>
            <div>折溢价率: <span class="${discountClass}">${discountText}</span></div>
            <div>当前价格: ¥${fund.currentPrice}</div>
            <div>估值: ¥${fund.value}</div>
            <div>涨跌幅: ${fund.increaseRt > 0 ? '+' : ''}${fund.increaseRt.toFixed(2)}%</div>
          </div>
        `;
      });
    }

    html += `
          </div>
          <div class="footer">
            <p>此邮件由基金折溢价监控系统自动发送</p>
            <p>发送时间: ${new Date().toLocaleString('zh-CN')}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * 测试邮件发送
   * @returns {Promise<boolean>} 测试结果
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      logger.info('邮件服务连接测试成功');
      return true;
    } catch (error) {
      logger.error('邮件服务连接测试失败:', error);
      return false;
    }
  }
}

module.exports = EmailNotifier;
