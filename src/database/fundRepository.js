const db = require('../config/database');
const logger = require('../utils/logger');

class FundRepository {
  constructor() {
    this.tableName = 'fund_data';
  }

  /**
   * 清空所有数据
   * @returns {Promise<number>} 删除的记录数
   */
  async clearAllData() {
    const pool = db.getConnection();
    
    try {
      // 使用 TRUNCATE 命令，不会产生临时文件
      await pool.execute(`TRUNCATE TABLE ${this.tableName}`);
      
      logger.info(`清空所有数据: 使用 TRUNCATE 清空表`);
      return 0; // TRUNCATE 不返回删除的行数
    } catch (error) {
      logger.error('清空数据失败:', error);
      throw error;
    }
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

    let inserted = 0;
    let skipped = 0;

    logger.info(`开始逐条插入 ${fundDataList.length} 条数据`);

    // 直接逐条插入，避免任何可能导致临时文件的操作
    for (let i = 0; i < fundDataList.length; i++) {
      const fundData = fundDataList[i];
      try {
        // 使用最简单的插入方法
        await this.insertSingle(fundData);
        inserted++;
        
        // 每插入10条数据显示一次进度
        if ((i + 1) % 10 === 0) {
          logger.info(`已插入 ${i + 1}/${fundDataList.length} 条数据`);
        }
        
      } catch (error) {
        logger.error(`插入第 ${i + 1} 条数据失败: ${fundData.fundCode}`, error);
        skipped++;
      }
    }

    logger.info(`数据插入完成: 成功 ${inserted} 条，跳过 ${skipped} 条`);
    return { inserted, skipped };
  }

  /**
   * 批量插入单批数据
   * @param {Array} batch - 单批数据数组
   * @returns {Promise<Object>} 插入结果
   */
  async batchInsertSingle(batch) {
    if (!batch || batch.length === 0) {
      return { inserted: 0, skipped: 0 };
    }

    const connection = db.getConnection();
    let inserted = 0;
    let skipped = 0;

    try {
      await connection.beginTransaction();

      // 构建批量插入SQL
      const sql = `
        INSERT INTO ${this.tableName} (
          fund_code, fund_name, type, value, discount, 
          estimate_limit, current_price, increase_rt, 
          update_time, open_remind, wx_user_id, into_time,
          is_pause, info, nav, fall_num, amount, all_share, incr_share, created_at
        ) VALUES ${batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())').join(', ')}
      `;

      // 构建参数数组
      const params = [];
      for (const fundData of batch) {
        params.push(
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
        );
      }

      await connection.execute(sql, params);
      await connection.commit();
      
      inserted = batch.length;
      logger.info(`批量插入成功: ${inserted} 条数据`);

    } catch (error) {
      await connection.rollback();
      logger.error('批量插入失败:', error);
      throw error;
    }

    return { inserted, skipped };
  }

  /**
   * 插入单条基金数据
   * @param {Object} fundData - 基金数据
   * @returns {Promise<void>}
   */
  async insertSingle(fundData) {
    const pool = db.getConnection();
    
    const sql = `INSERT INTO ${this.tableName} (fund_code, fund_name, type, value, discount, estimate_limit, current_price, increase_rt, update_time, open_remind, wx_user_id, into_time, is_pause, info, nav, fall_num, amount, all_share, incr_share, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

    const params = [
      fundData.fundCode, fundData.fundName, fundData.type, fundData.value, fundData.discount,
      fundData.estimateLimit, fundData.currentPrice, fundData.increaseRt, fundData.updateTime,
      fundData.openRemind, fundData.wxUserId, fundData.intoTime, fundData.isPause, fundData.info,
      fundData.nav, fundData.fallNum, fundData.amount, fundData.allShare, fundData.incrShare
    ];

    await pool.execute(sql, params);
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

  /**
   * 删除指定基金的旧数据
   * @param {string} fundCode - 基金代码
   * @returns {Promise<number>} 删除的记录数
   */
  async deleteOldDataForFund(fundCode) {
    const sql = `DELETE FROM ${this.tableName} WHERE fund_code = ?`;
    const result = await db.query(sql, [fundCode]);
    const deletedCount = result.affectedRows || 0;
    
    if (deletedCount > 0) {
      logger.debug(`删除基金 ${fundCode} 的 ${deletedCount} 条旧数据`);
    }
    
    return deletedCount;
  }

  /**
   * 清理旧数据
   * @param {number} days - 保留天数，默认90天
   * @returns {Promise<number>} 删除的记录数
   */
  async cleanOldData(days = 90) {
    const sql = `
      DELETE FROM ${this.tableName} 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    
    const result = await db.query(sql, [days]);
    const deletedCount = result.affectedRows || 0;
    
    logger.info(`数据清理完成: 删除了 ${deletedCount} 条 ${days} 天前的数据`);
    return deletedCount;
  }
}

module.exports = FundRepository;
