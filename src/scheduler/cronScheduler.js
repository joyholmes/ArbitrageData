const cron = require('node-cron');
const logger = require('../utils/logger');
const FundCrawler = require('../crawler/fundCrawler');
const FundRepository = require('../database/fundRepository');
const AlertService = require('../notifier/alertService');

class CronScheduler {
  constructor() {
    this.crawler = new FundCrawler();
    this.repository = new FundRepository();
    this.alertService = new AlertService();
    this.tasks = new Map();
  }

  /**
   * 启动所有定时任务
   */
  start() {
    logger.info('启动定时任务调度器');

    // 每天10:00执行数据抓取
    this.scheduleTask('crawl-10am', process.env.CRON_SCHEDULE_1 || '0 10 * * *', () => {
      this.executeCrawlTask('上午10点数据抓取');
    });

    // 每天15:00执行数据抓取
    this.scheduleTask('crawl-3pm', process.env.CRON_SCHEDULE_2 || '0 15 * * *', () => {
      this.executeCrawlTask('下午3点数据抓取');
    });

    // 每天23:00清理过期数据
    this.scheduleTask('cleanup', '0 23 * * *', () => {
      this.executeCleanupTask();
    });

    // 每小时检查提醒
    this.scheduleTask('alert-check', '0 * * * *', () => {
      this.executeAlertCheck();
    });

    logger.info('所有定时任务已启动');
  }

  /**
   * 停止所有定时任务
   */
  stop() {
    logger.info('停止定时任务调度器');
    
    for (const [taskName, task] of this.tasks) {
      if (task && typeof task.destroy === 'function') {
        task.destroy();
        logger.info(`任务 ${taskName} 已停止`);
      } else if (task && typeof task.stop === 'function') {
        task.stop();
        logger.info(`任务 ${taskName} 已停止`);
      } else {
        logger.warn(`任务 ${taskName} 无法停止，方法不存在`);
      }
    }
    
    this.tasks.clear();
  }

  /**
   * 调度单个任务
   * @param {string} taskName - 任务名称
   * @param {string} schedule - cron表达式
   * @param {Function} taskFunction - 任务函数
   */
  scheduleTask(taskName, schedule, taskFunction) {
    try {
      const task = cron.schedule(schedule, taskFunction, {
        scheduled: true,
        timezone: 'Asia/Shanghai'
      });

      this.tasks.set(taskName, task);
      logger.info(`任务 ${taskName} 已调度: ${schedule}`);
    } catch (error) {
      logger.error(`调度任务 ${taskName} 失败:`, error);
    }
  }

  /**
   * 执行数据抓取任务
   * @param {string} taskDescription - 任务描述
   */
  async executeCrawlTask(taskDescription) {
    const startTime = new Date();
    logger.info(`开始执行${taskDescription}`);

    try {
      // 抓取数据
      const fundData = await this.crawler.fetchFundData();
      
      if (!fundData || fundData.length === 0) {
        logger.warn('未获取到基金数据');
        return;
      }

      // 数据验证
      const validData = fundData.filter(data => this.crawler.validateFundData(data));
      logger.info(`有效数据: ${validData.length}/${fundData.length}`);

      // 存储数据
      const result = await this.repository.batchInsert(validData);
      logger.info(`数据存储完成: 插入 ${result.inserted} 条，跳过 ${result.skipped} 条`);

      // 检查异常数据并发送提醒
      await this.checkAndSendAlerts(validData);

      const duration = new Date() - startTime;
      logger.info(`${taskDescription}执行完成，耗时: ${duration}ms`);

    } catch (error) {
      logger.error(`${taskDescription}执行失败:`, error);
    }
  }

  /**
   * 执行清理任务
   */
  async executeCleanupTask() {
    logger.info('开始执行数据清理任务');

    try {
      const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS) || 90;
      const deletedCount = await this.repository.cleanOldData(retentionDays);
      logger.info(`数据清理完成，删除了 ${deletedCount} 条过期数据`);
    } catch (error) {
      logger.error('数据清理任务执行失败:', error);
    }
  }

  /**
   * 执行提醒检查
   */
  async executeAlertCheck() {
    logger.info('开始执行提醒检查');

    try {
      const thresholdPositive = parseFloat(process.env.ALERT_THRESHOLD_POSITIVE) || 3.0;
      const thresholdNegative = parseFloat(process.env.ALERT_THRESHOLD_NEGATIVE) || -3.0;

      // 获取异常数据
      const abnormalFunds = await this.repository.getAbnormalFunds(Math.max(thresholdPositive, Math.abs(thresholdNegative)));

      if (abnormalFunds.length > 0) {
        logger.info(`发现 ${abnormalFunds.length} 个异常基金`);
        await this.alertService.sendAbnormalFundsAlert(abnormalFunds);
      }

    } catch (error) {
      logger.error('提醒检查执行失败:', error);
    }
  }

  /**
   * 检查并发送提醒
   * @param {Array} fundData - 基金数据
   */
  async checkAndSendAlerts(fundData) {
    const thresholdPositive = parseFloat(process.env.ALERT_THRESHOLD_POSITIVE) || 3.0;
    const thresholdNegative = parseFloat(process.env.ALERT_THRESHOLD_NEGATIVE) || -3.0;

    const alertFunds = fundData.filter(fund => {
      return fund.discount >= thresholdPositive || fund.discount <= thresholdNegative;
    });

    if (alertFunds.length > 0) {
      logger.info(`发现 ${alertFunds.length} 个需要提醒的基金`);
      await this.alertService.sendAbnormalFundsAlert(alertFunds);
    }
  }

  /**
   * 手动执行数据抓取
   * @returns {Promise<Object>} 执行结果
   */
  async manualCrawl() {
    return await this.executeCrawlTask('手动数据抓取');
  }

  /**
   * 获取任务状态
   * @returns {Object} 任务状态信息
   */
  getTaskStatus() {
    const status = {};
    for (const [taskName, task] of this.tasks) {
      status[taskName] = {
        running: task.running,
        scheduled: task.scheduled
      };
    }
    return status;
  }
}

module.exports = CronScheduler;
