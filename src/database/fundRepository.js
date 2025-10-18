const db = require('../config/database');
const logger = require('../utils/logger');

class FundRepository {
  constructor() {
    this.tableName = 'fund_data';
  }

  /**
   * 批量插入基金数据
   * @param {Array} fundDataList - 基金数据数组
   * @returns {Promise<Object>} 插入结果
   */
  async batchInsert(fundDataList) {
    if (!Array.isArray(fundDataList) || fundDataList.length === 0) {
      logger.warn('没有数据需要插入');
      return { inserted: 0, skipped: 0 };
    }

    const connection = db.getConnection();
    let inserted = 0;
    let skipped = 0;

    try {
      await connection.beginTransaction();

      for (const fundData of fundDataList) {
        try {
          // 检查是否已存在相同基金和时间的记录
          const exists = await this.checkExists(fundData.fundCode, fundData.updateTime);
          
          if (exists) {
            skipped++;
            logger.debug(`跳过重复数据: ${fundData.fundCode} - ${fundData.updateTime}`);
            continue;
          }

          // 插入新数据
          await this.insertSingle(fundData);
          inserted++;
          
        } catch (error) {
          logger.error(`插入单条数据失败: ${fundData.fundCode}`, error);
          skipped++;
        }
      }

      await connection.commit();
      logger.info(`数据插入完成: 成功 ${inserted} 条，跳过 ${skipped} 条`);
      
      return { inserted, skipped };
      
    } catch (error) {
      await connection.rollback();
      logger.error('批量插入数据失败:', error);
      throw error;
    }
  }

  /**
   * 插入单条基金数据
   * @param {Object} fundData - 基金数据
   * @returns {Promise<void>}
   */
  async insertSingle(fundData) {
    const sql = `
      INSERT INTO ${this.tableName} (
        fund_code, fund_name, type, value, discount, 
        estimate_limit, current_price, increase_rt, 
        update_time, open_remind, wx_user_id, into_time,
        is_pause, info, nav, fall_num, amount, all_share, incr_share, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const params = [
      fundData.fundCode,
      fundData.fundName,
      fundData.type,
      fundData.value,
      fundData.discount,
      fundData.estimateLimit,
      fundData.currentPrice,
      fundData.increaseRt,
      fundData.updateTime,
      fundData.openRemind,
      fundData.wxUserId,
      fundData.intoTime,
      fundData.isPause,
      fundData.info,
      fundData.nav,
      fundData.fallNum,
      fundData.amount,
      fundData.allShare,
      fundData.incrShare
    ];

    await db.query(sql, params);
  }

  /**
   * 检查数据是否已存在
   * @param {string} fundCode - 基金代码
   * @param {Date} updateTime - 更新时间
   * @returns {Promise<boolean>} 是否存在
   */
  async checkExists(fundCode, updateTime) {
    const sql = `
      SELECT COUNT(*) as count 
      FROM ${this.tableName} 
      WHERE fund_code = ? AND update_time = ?
    `;
    
    const result = await db.query(sql, [fundCode, updateTime]);
    return result[0].count > 0;
  }

  /**
   * 获取最新基金数据
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Array>} 基金数据列表
   */
  async getLatestFunds(filters = {}) {
    let sql = `
      SELECT f1.* FROM ${this.tableName} f1
      INNER JOIN (
        SELECT fund_code, MAX(update_time) as max_time
        FROM ${this.tableName}
        GROUP BY fund_code
      ) f2 ON f1.fund_code = f2.fund_code AND f1.update_time = f2.max_time
    `;

    const params = [];
    const conditions = [];

    // 添加筛选条件
    if (filters.fundCode) {
      conditions.push('f1.fund_code = ?');
      params.push(filters.fundCode);
    }

    if (filters.discountMin !== undefined) {
      conditions.push('f1.discount >= ?');
      params.push(filters.discountMin);
    }

    if (filters.discountMax !== undefined) {
      conditions.push('f1.discount <= ?');
      params.push(filters.discountMax);
    }

    if (filters.type !== undefined) {
      conditions.push('f1.type = ?');
      params.push(filters.type);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY f1.discount DESC';

    if (filters.limit) {
      sql += ` LIMIT ${parseInt(filters.limit)}`;
    }

    return await db.query(sql, params);
  }

  /**
   * 获取指定基金的历史数据
   * @param {string} fundCode - 基金代码
   * @param {number} days - 天数
   * @returns {Promise<Array>} 历史数据
   */
  async getFundHistory(fundCode, days = 30) {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE fund_code = ?
      AND update_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY update_time DESC
    `;

    return await db.query(sql, [fundCode, days]);
  }

  /**
   * 获取折溢价异常数据
   * @param {number} threshold - 阈值
   * @returns {Promise<Array>} 异常数据
   */
  async getAbnormalFunds(threshold = 3.0) {
    const sql = `
      SELECT f1.* FROM ${this.tableName} f1
      INNER JOIN (
        SELECT fund_code, MAX(update_time) as max_time
        FROM ${this.tableName}
        GROUP BY fund_code
      ) f2 ON f1.fund_code = f2.fund_code AND f1.update_time = f2.max_time
      WHERE ABS(f1.discount) >= ?
      ORDER BY ABS(f1.discount) DESC
    `;

    return await db.query(sql, [threshold]);
  }

  /**
   * 清理过期数据
   * @param {number} days - 保留天数
   * @returns {Promise<number>} 删除的记录数
   */
  async cleanOldData(days = 90) {
    const sql = `
      DELETE FROM ${this.tableName}
      WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;

    const result = await db.query(sql, [days]);
    logger.info(`清理了 ${result.affectedRows} 条过期数据`);
    return result.affectedRows;
  }
}

module.exports = FundRepository;
