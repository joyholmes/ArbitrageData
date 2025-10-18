const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'fund_arbitrage',
        charset: 'utf8mb4'
      });
      
      logger.info('数据库连接成功');
      return this.connection;
    } catch (error) {
      logger.error('数据库连接失败:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      logger.info('数据库连接已关闭');
    }
  }

  getConnection() {
    if (!this.connection) {
      throw new Error('数据库未连接');
    }
    return this.connection;
  }

  async query(sql, params = []) {
    try {
      const [rows] = await this.connection.execute(sql, params);
      return rows;
    } catch (error) {
      logger.error('数据库查询失败:', error);
      throw error;
    }
  }
}

module.exports = new Database();
