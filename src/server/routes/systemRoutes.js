const express = require('express');
const router = express.Router();
const CronScheduler = require('../../scheduler/cronScheduler');
const AlertService = require('../../notifier/alertService');
const FundRepository = require('../../database/fundRepository');
const fundRepository = new FundRepository();
const FundCrawler = require('../../crawler/fundCrawler');
const logger = require('../../utils/logger');

const cronScheduler = new CronScheduler();
const alertService = new AlertService();
const fundCrawler = new FundCrawler();

/**
 * 获取系统状态
 * GET /api/system/status
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        platform: process.platform
      },
      tasks: cronScheduler.getTaskStatus(),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('获取系统状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取系统状态失败',
      message: error.message
    });
  }
});

  /**
   * 手动触发数据抓取
   * POST /api/system/crawl
   */
  router.post('/crawl', async (req, res) => {
    try {
      logger.info('收到手动抓取请求');

      // 1. 清空所有旧数据
      logger.info('清空所有旧数据...');
      await fundRepository.clearAllData();

      // 2. 抓取所有类型的数据 (0,1,2,3)
      logger.info('开始抓取所有类型的数据...');
      const allFundData = await fundCrawler.fetchAllFundData();

      if (allFundData && allFundData.length > 0) {
        // 3. 存储新数据
        const result = await fundRepository.batchInsert(allFundData);
        logger.info(`手动抓取完成: 成功 ${result.inserted} 条，跳过 ${result.skipped} 条`);

        res.json({
          success: true,
          message: `数据抓取完成，新增 ${result.inserted} 条数据`,
          inserted: result.inserted,
          skipped: result.skipped
        });
      } else {
        logger.warn('手动抓取未获取到数据');
        res.json({
          success: true,
          message: '数据抓取完成，但未获取到数据'
        });
      }

    } catch (error) {
      logger.error('手动抓取失败:', error);
      res.status(500).json({
        success: false,
        error: '手动抓取失败',
        message: error.message
      });
    }
  });

/**
 * 测试API连接
 * GET /api/system/test-api
 */
router.get('/test-api', async (req, res) => {
  try {
    const isConnected = await fundCrawler.testConnection();
    
    res.json({
      success: true,
      data: {
        api_connected: isConnected,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('API连接测试失败:', error);
    res.status(500).json({
      success: false,
      error: 'API连接测试失败',
      message: error.message
    });
  }
});

/**
 * 测试通知功能
 * POST /api/system/test-notifications
 */
router.post('/test-notifications', async (req, res) => {
  try {
    const results = await alertService.testNotifications();
    
    res.json({
      success: true,
      data: results,
      message: '通知测试完成'
    });

  } catch (error) {
    logger.error('通知测试失败:', error);
    res.status(500).json({
      success: false,
      error: '通知测试失败',
      message: error.message
    });
  }
});

/**
 * 发送测试提醒
 * POST /api/system/send-test-alert
 */
router.post('/send-test-alert', async (req, res) => {
  try {
    const { message = '这是一条测试提醒消息' } = req.body;
    
    await alertService.sendSystemAlert('测试', message);
    
    res.json({
      success: true,
      message: '测试提醒已发送'
    });

  } catch (error) {
    logger.error('发送测试提醒失败:', error);
    res.status(500).json({
      success: false,
      error: '发送测试提醒失败',
      message: error.message
    });
  }
});

/**
 * 获取系统配置
 * GET /api/system/config
 */
router.get('/config', async (req, res) => {
  try {
    const config = {
      database: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        name: process.env.DB_NAME
      },
      api: {
        base_url: process.env.API_BASE_URL,
        token_configured: !!process.env.API_TOKEN
      },
      alerts: {
        threshold_positive: process.env.ALERT_THRESHOLD_POSITIVE,
        threshold_negative: process.env.ALERT_THRESHOLD_NEGATIVE,
        email_configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
        telegram_configured: !!process.env.TELEGRAM_BOT_TOKEN
      },
      cron: {
        schedule_1: process.env.CRON_SCHEDULE_1,
        schedule_2: process.env.CRON_SCHEDULE_2
      }
    };

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    logger.error('获取系统配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取系统配置失败',
      message: error.message
    });
  }
});

/**
 * 清理过期数据
 * POST /api/system/cleanup
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { days = 90 } = req.body;
    
    // 调用真正的数据清理方法
    const deletedCount = await fundRepository.cleanOldData(parseInt(days));
    
    res.json({
      success: true,
      message: `数据清理完成，删除了 ${deletedCount} 条 ${days} 天前的数据`,
      deletedCount: deletedCount
    });

  } catch (error) {
    logger.error('数据清理失败:', error);
    res.status(500).json({
      success: false,
      error: '数据清理失败',
      message: error.message
    });
  }
});

/**
 * 获取API文档
 * GET /api/system/docs
 */
router.get('/docs', (req, res) => {
  const docs = {
    title: '基金折溢价数据服务 API 文档',
    version: '1.0.0',
    base_url: `${req.protocol}://${req.get('host')}`,
    endpoints: {
      health: {
        method: 'GET',
        path: '/health',
        description: '健康检查'
      },
      funds: {
        method: 'GET',
        path: '/api/funds',
        description: '获取所有基金数据',
        parameters: {
          limit: '限制返回数量',
          discount_min: '最小折溢价率',
          discount_max: '最大折溢价率',
          type: '基金类型',
          sort: '排序方式 (discount, update_time)',
          order: '排序顺序 (asc, desc)'
        }
      },
      fund_detail: {
        method: 'GET',
        path: '/api/funds/:code',
        description: '获取指定基金数据'
      },
      fund_history: {
        method: 'GET',
        path: '/api/funds/:code/history',
        description: '获取基金历史数据',
        parameters: {
          days: '历史天数，默认30天'
        }
      },
      abnormal_funds: {
        method: 'GET',
        path: '/api/funds/abnormal',
        description: '获取折溢价异常基金',
        parameters: {
          threshold: '异常阈值，默认3.0'
        }
      },
      ranking: {
        method: 'GET',
        path: '/api/funds/ranking',
        description: '获取折溢价排行榜',
        parameters: {
          type: '排行榜类型 (discount_high, discount_low, volume_high)',
          limit: '返回数量，默认20'
        }
      },
      system_status: {
        method: 'GET',
        path: '/api/system/status',
        description: '获取系统状态'
      },
      manual_crawl: {
        method: 'POST',
        path: '/api/system/crawl',
        description: '手动触发数据抓取'
      },
      test_api: {
        method: 'GET',
        path: '/api/system/test-api',
        description: '测试API连接'
      },
      test_notifications: {
        method: 'POST',
        path: '/api/system/test-notifications',
        description: '测试通知功能'
      }
    }
  };

  res.json(docs);
});

module.exports = router;
