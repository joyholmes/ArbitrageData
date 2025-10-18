const express = require('express');
const router = express.Router();
const FundRepository = require('../../database/fundRepository');
const logger = require('../../utils/logger');

const fundRepository = new FundRepository();

/**
 * 获取所有基金数据
 * GET /api/funds
 * 查询参数:
 * - limit: 限制返回数量
 * - discount_min: 最小折溢价率
 * - discount_max: 最大折溢价率
 * - type: 基金类型
 * - sort: 排序方式 (discount, update_time)
 * - order: 排序顺序 (asc, desc)
 */
router.get('/', async (req, res) => {
  try {
    const {
      limit = 100,
      discount_min,
      discount_max,
      type,
      sort = 'discount',
      order = 'desc'
    } = req.query;

    // 构建筛选条件
    const filters = {};
    if (discount_min !== undefined) filters.discountMin = parseFloat(discount_min);
    if (discount_max !== undefined) filters.discountMax = parseFloat(discount_max);
    if (type !== undefined) filters.type = parseInt(type);
    if (limit) filters.limit = parseInt(limit);

    const funds = await fundRepository.getLatestFunds(filters);

    // 排序处理
    if (sort === 'discount') {
      funds.sort((a, b) => order === 'desc' ? b.discount - a.discount : a.discount - b.discount);
    } else if (sort === 'update_time') {
      funds.sort((a, b) => {
        const timeA = new Date(a.update_time);
        const timeB = new Date(b.update_time);
        return order === 'desc' ? timeB - timeA : timeA - timeB;
      });
    }

    res.json({
      success: true,
      data: funds,
      total: funds.length,
      filters: {
        limit: parseInt(limit),
        discount_min,
        discount_max,
        type,
        sort,
        order
      }
    });

  } catch (error) {
    logger.error('获取基金数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取基金数据失败',
      message: error.message
    });
  }
});

/**
 * 获取指定基金数据
 * GET /api/funds/:code
 */
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: '基金代码不能为空'
      });
    }

    const funds = await fundRepository.getLatestFunds({ fundCode: code });
    
    if (funds.length === 0) {
      return res.status(404).json({
        success: false,
        error: '未找到指定基金数据'
      });
    }

    res.json({
      success: true,
      data: funds[0]
    });

  } catch (error) {
    logger.error('获取基金数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取基金数据失败',
      message: error.message
    });
  }
});

/**
 * 获取基金历史数据
 * GET /api/funds/:code/history
 * 查询参数:
 * - days: 历史天数，默认30天
 */
router.get('/:code/history', async (req, res) => {
  try {
    const { code } = req.params;
    const { days = 30 } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: '基金代码不能为空'
      });
    }

    const history = await fundRepository.getFundHistory(code, parseInt(days));

    res.json({
      success: true,
      data: history,
      total: history.length,
      fund_code: code,
      days: parseInt(days)
    });

  } catch (error) {
    logger.error('获取基金历史数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取基金历史数据失败',
      message: error.message
    });
  }
});

/**
 * 获取折溢价异常基金
 * GET /api/funds/abnormal
 * 查询参数:
 * - threshold: 异常阈值，默认3.0
 */
router.get('/abnormal', async (req, res) => {
  try {
    const { threshold = 3.0 } = req.query;
    const abnormalFunds = await fundRepository.getAbnormalFunds(parseFloat(threshold));

    res.json({
      success: true,
      data: abnormalFunds,
      total: abnormalFunds.length,
      threshold: parseFloat(threshold)
    });

  } catch (error) {
    logger.error('获取异常基金数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取异常基金数据失败',
      message: error.message
    });
  }
});

/**
 * 获取折溢价排行榜
 * GET /api/funds/ranking
 * 查询参数:
 * - type: 排行榜类型 (discount_high, discount_low, volume_high)
 * - limit: 返回数量，默认20
 */
router.get('/ranking', async (req, res) => {
  try {
    const { type = 'discount_high', limit = 20 } = req.query;
    
    let funds = await fundRepository.getLatestFunds({ limit: parseInt(limit) * 2 });

    // 根据类型排序
    switch (type) {
      case 'discount_high':
        funds.sort((a, b) => b.discount - a.discount);
        break;
      case 'discount_low':
        funds.sort((a, b) => a.discount - b.discount);
        break;
      case 'volume_high':
        // 按涨跌幅排序（假设涨跌幅反映交易活跃度）
        funds.sort((a, b) => Math.abs(b.increase_rt) - Math.abs(a.increase_rt));
        break;
      default:
        funds.sort((a, b) => b.discount - a.discount);
    }

    // 限制返回数量
    funds = funds.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: funds,
      total: funds.length,
      ranking_type: type,
      limit: parseInt(limit)
    });

  } catch (error) {
    logger.error('获取排行榜数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取排行榜数据失败',
      message: error.message
    });
  }
});

module.exports = router;
