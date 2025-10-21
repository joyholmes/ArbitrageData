const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'fund_arbitrage',
        charset: 'utf8mb4',
        connectionLimit: 10,
        queueLimit: 0
      });
      
      logger.info('数据库连接池创建成功');
      return this.pool;
    } catch (error) {
      logger.error('数据库连接失败:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      logger.info('数据库连接池已关闭');
    }
  }

  getConnection() {
    if (!this.pool) {
      throw new Error('数据库未连接');
    }
    return this.pool;
  }

  async query(sql, params = []) {
    try {
      const [rows, fields] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      logger.error('数据库查询失败:', error);
      throw error;
    }
  }

  async execute(sql, params = []) {
    try {
      const [rows, fields] = await this.pool.execute(sql, params);
      return { affectedRows: rows.affectedRows || 0, insertId: rows.insertId };
    } catch (error) {
      logger.error('数据库执行失败:', error);
      throw error;
    }
  }
}

module.exports = new Database();
