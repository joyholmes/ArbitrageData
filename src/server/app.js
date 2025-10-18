const express = require('express');
const cors = require('cors');
const logger = require('../utils/logger');
const fundRoutes = require('./routes/fundRoutes');
const systemRoutes = require('./routes/systemRoutes');

class App {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * 设置中间件
   */
  setupMiddleware() {
    // CORS配置
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
      credentials: true
    }));

    // 请求解析
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 请求日志
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  /**
   * 设置路由
   */
  setupRoutes() {
    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // API路由
    this.app.use('/api/funds', fundRoutes);
    this.app.use('/api/system', systemRoutes);

    // 根路径
    this.app.get('/', (req, res) => {
      res.json({
        message: '基金折溢价数据服务',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          funds: '/api/funds',
          system: '/api/system'
        }
      });
    });

    // 404处理
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: '接口不存在',
        path: req.originalUrl,
        method: req.method
      });
    });
  }

  /**
   * 设置错误处理
   */
  setupErrorHandling() {
    // 全局错误处理
    this.app.use((error, req, res, next) => {
      logger.error('API错误:', error);
      
      res.status(error.status || 500).json({
        error: error.message || '服务器内部错误',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    });

    // 未捕获的异常处理
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的Promise拒绝:', reason);
    });
  }

  /**
   * 启动服务器
   */
  async start() {
    try {
      this.server = this.app.listen(this.port, () => {
        logger.info(`服务器启动成功，端口: ${this.port}`);
        logger.info(`健康检查: http://localhost:${this.port}/health`);
        logger.info(`API文档: http://localhost:${this.port}/`);
      });
    } catch (error) {
      logger.error('服务器启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止服务器
   */
  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          logger.info('服务器已停止');
          resolve();
        });
      });
    }
  }

  /**
   * 获取Express应用实例
   */
  getApp() {
    return this.app;
  }
}

module.exports = App;
