require('dotenv').config();
const logger = require('./utils/logger');
const db = require('./config/database');
const App = require('./server/app');
const CronScheduler = require('./scheduler/cronScheduler');

class Application {
  constructor() {
    this.app = new App();
    this.scheduler = new CronScheduler();
    this.isShuttingDown = false;
  }

  /**
   * 启动应用
   */
  async start() {
    try {
      logger.info('正在启动基金折溢价数据服务...');

      // 连接数据库
      await db.connect();
      logger.info('数据库连接成功');

      // 启动定时任务
      this.scheduler.start();
      logger.info('定时任务启动成功');

      // 启动Web服务器
      await this.app.start();
      logger.info('Web服务器启动成功');

      // 设置优雅关闭
      this.setupGracefulShutdown();

      logger.info('基金折溢价数据服务启动完成！');
      logger.info(`服务地址: http://localhost:${process.env.PORT || 3000}`);
      logger.info(`健康检查: http://localhost:${process.env.PORT || 3000}/health`);

    } catch (error) {
      logger.error('应用启动失败:', error);
      process.exit(1);
    }
  }

  /**
   * 设置优雅关闭
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      if (this.isShuttingDown) {
        logger.warn('正在关闭中，忽略重复信号');
        return;
      }

      this.isShuttingDown = true;
      logger.info(`收到 ${signal} 信号，开始优雅关闭...`);

      try {
        // 停止定时任务
        this.scheduler.stop();
        logger.info('定时任务已停止');

        // 停止Web服务器
        await this.app.stop();
        logger.info('Web服务器已停止');

        // 关闭数据库连接
        await db.disconnect();
        logger.info('数据库连接已关闭');

        logger.info('应用已优雅关闭');
        process.exit(0);

      } catch (error) {
        logger.error('关闭过程中发生错误:', error);
        process.exit(1);
      }
    };

    // 监听关闭信号
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon重启信号

    // 监听未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的Promise拒绝:', reason);
      shutdown('unhandledRejection');
    });
  }

  /**
   * 获取应用状态
   */
  getStatus() {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      scheduler: this.scheduler.getTaskStatus(),
      database: !!db.connection,
      server: !!this.app.server
    };
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const app = new Application();
  app.start().catch((error) => {
    logger.error('应用启动失败:', error);
    process.exit(1);
  });
}

module.exports = Application;
