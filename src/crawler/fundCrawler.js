const axios = require('axios');
const logger = require('../utils/logger');

class FundCrawler {
  constructor() {
    this.baseURL = process.env.API_BASE_URL || 'http://xiaoyudecqg.cn/htl/mp/api/arbitrage/list';
    this.token = process.env.API_TOKEN;
    
    // 配置axios实例 - 使用正确的微信请求头
    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Host': 'xiaoyudecqg.cn',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) MacWechat/3.8.7(0x13080712) UnifiedPCMacWechat(0xf2641111) XWEB/16730 Flue',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'http://www.xiaoyudecqg.cn',
        'Referer': 'http://www.xiaoyudecqg.cn/',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    });
  }

  /**
   * 获取所有类型的基金数据
   * @returns {Promise<Array>} 所有基金数据数组
   */
  async fetchAllFundData() {
    const allData = [];
    const types = [0, 1, 2, 3]; // 所有类型
    
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      try {
        logger.info(`开始抓取基金数据，类型: ${type}`);
        const typeData = await this.fetchFundData(type);
        allData.push(...typeData);
        logger.info(`类型 ${type} 抓取完成，获得 ${typeData.length} 条数据`);
        
        // 如果不是最后一个类型，等待60秒再抓取下一个类型
        if (i < types.length - 1) {
          logger.info('等待60秒后抓取下一个类型...');
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      } catch (error) {
        logger.error(`抓取类型 ${type} 数据失败:`, error.message);
        // 如果是第一个类型失败，直接抛出错误
        if (i === 0) {
          throw error;
        }
        // 其他类型失败时继续，但记录错误
        logger.warn(`类型 ${type} 抓取失败，继续抓取其他类型`);
        // 即使失败也要等待，避免请求过于频繁
        if (i < types.length - 1) {
          logger.info('等待60秒后抓取下一个类型...');
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      }
    }
    
    logger.info(`所有类型数据抓取完成，总计 ${allData.length} 条数据`);
    return allData;
  }

  /**
   * 获取基金折溢价数据
   * @param {number} type - 基金类型，0表示所有类型
   * @returns {Promise<Array>} 基金数据数组
   */
  async fetchFundData(type = 0) {
    try {
      logger.info(`开始抓取基金数据，类型: ${type}`);
      
      const response = await this.httpClient.get('', {
        params: { type },
        headers: {
          'token': this.token || undefined
        }
      });

      if (response.status !== 200) {
        throw new Error(`HTTP请求失败，状态码: ${response.status}`);
      }

      const data = response.data;
      
      if (!data) {
        logger.warn('API返回数据为空');
        return [];
      }
      
      // 首先检查API是否返回错误信息
      logger.info(`API返回数据: code=${data.code}, msg=${data.msg}`);
      
      if (data.code && data.code !== 200 && data.code !== 0) {
        const errorMsg = data.msg || '未知错误';
        logger.error(`API返回错误: 代码=${data.code}, 消息=${errorMsg}`);
        throw new Error(`API错误: ${errorMsg} (代码: ${data.code})`);
      }
      
      // 检查是否有错误消息但没有错误代码的情况
      if (data.msg && (data.msg.includes('访问太过频繁') || data.msg.includes('请稍后再试'))) {
        logger.error(`API访问限制: ${data.msg}`);
        throw new Error(`API访问限制: ${data.msg}`);
      }
      
      // 处理API返回的数据格式
      let fundData = [];
      if (data && data.data && data.data.arbitrageListVos && Array.isArray(data.data.arbitrageListVos)) {
        fundData = data.data.arbitrageListVos;
        logger.info(`API返回状态: ${data.msg || 'success'}, 代码: ${data.code || 200}`);
      } else if (Array.isArray(data)) {
        fundData = data;
      } else if (data.data && Array.isArray(data.data)) {
        fundData = data.data;
      } else if (data.result && Array.isArray(data.result)) {
        fundData = data.result;
      } else {
        logger.warn('API返回数据格式异常，期望包含arbitrageListVos数组的格式');
        logger.info('实际返回的数据结构:', JSON.stringify(data, null, 2));
        
        // 尝试其他可能的数据结构
        if (data && typeof data === 'object') {
          logger.info('尝试查找其他可能的数据字段...');
          for (const key in data) {
            if (Array.isArray(data[key])) {
              logger.info(`找到数组字段: ${key}, 长度: ${data[key].length}`);
              fundData = data[key];
              break;
            }
          }
        }
        
        if (fundData.length === 0) {
          return [];
        }
      }

      logger.info(`成功抓取到 ${fundData.length} 条基金数据`);
      
      // 数据清洗和格式化
      const formattedData = this.formatFundData(fundData);
      
      return formattedData;
      
    } catch (error) {
      logger.error('抓取基金数据失败:', error.message);
      throw error;
    }
  }

  /**
   * 格式化基金数据
   * @param {Array} rawData - 原始数据
   * @returns {Array} 格式化后的数据
   */
  formatFundData(rawData) {
    return rawData.map(item => {
      return {
        fundCode: item.fundCode || '',
        fundName: item.fundName || '',
        type: parseInt(item.type) || 0,
        value: parseFloat(item.value) || 0,
        discount: parseFloat(item.discount) || 0,
        estimateLimit: parseFloat(item.estimateLimit) || 0,
        currentPrice: parseFloat(item.currentPrice) || 0,
        increaseRt: parseFloat(item.increaseRt) || 0,
        updateTime: new Date(item.updateTime || new Date()),
        openRemind: Boolean(item.openRemind),
        // 新增字段
        wxUserId: item.wxUserId || '',
        intoTime: item.intoTime || null,
        isPause: parseInt(item.isPause) || 0,
        info: item.info || null,
        nav: Boolean(item.nav),
        fallNum: item.fallNum || null,
        amount: parseFloat(item.amount) || 0,
        allShare: parseFloat(item.allShare) || 0,
        incrShare: parseFloat(item.incrShare) || 0
      };
    });
  }

  /**
   * 验证数据完整性
   * @param {Object} fundData - 基金数据
   * @returns {boolean} 数据是否有效
   */
  validateFundData(fundData) {
    const requiredFields = ['fundCode', 'fundName', 'value', 'discount'];
    
    for (const field of requiredFields) {
      if (fundData[field] === undefined || fundData[field] === null) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 测试API连接
   * @returns {Promise<boolean>} 连接是否成功
   */
  async testConnection() {
    try {
      const data = await this.fetchFundData();
      return Array.isArray(data);
    } catch (error) {
      logger.error('API连接测试失败:', error.message);
      return false;
    }
  }
}

module.exports = FundCrawler;
