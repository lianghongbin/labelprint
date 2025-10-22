const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const VikaClient = require('./vika_client');

const app = express();
const PORT = 8081;

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 初始化Vika客户端
const vika = new VikaClient("dst0SSLLF0l2Y4dHcw");

// 缓存配置
const CACHE_CONFIG = {
  labelGroups: {
    enabled: true,
    ttl: 30 * 60 * 1000, // 30分钟
    autoRefresh: true
  },
  labelData: {
    enabled: true,
    ttl: 60 * 60 * 1000, // 1小时
    autoRefresh: false
  }
};

// 缓存存储
const cache = {
  labelGroups: {
    data: null,
    timestamp: 0,
    ttl: CACHE_CONFIG.labelGroups.ttl
  },
  labelData: new Map(), // groupId -> {data, timestamp, ttl}
  settings: {
    cacheEnabled: true,
    autoRefresh: true
  }
};

// 缓存管理器
class CacheManager {
  // 检查缓存是否有效
  static isCacheValid(key, ttl) {
    if (!cache[key]) return false;
    const now = Date.now();
    return (now - cache[key].timestamp) < ttl;
  }

  // 获取缓存数据
  static getCache(key) {
    if (!cache[key]) return null;
    return cache[key].data;
  }

  // 设置缓存数据
  static setCache(key, data, ttl) {
    cache[key] = {
      data: data,
      timestamp: Date.now(),
      ttl: ttl
    };
  }

  // 清除指定缓存
  static clearCache(key) {
    if (key === 'all') {
      cache.labelGroups = { data: null, timestamp: 0, ttl: CACHE_CONFIG.labelGroups.ttl };
      cache.labelData.clear();
    } else if (key === 'labelGroups') {
      cache.labelGroups = { data: null, timestamp: 0, ttl: CACHE_CONFIG.labelGroups.ttl };
    } else if (key.startsWith('labelData:')) {
      const groupId = key.replace('labelData:', '');
      cache.labelData.delete(groupId);
    }
  }

  // 获取标签组缓存
  static getLabelGroupsCache() {
    if (!CACHE_CONFIG.labelGroups.enabled) return null;
    if (this.isCacheValid('labelGroups', CACHE_CONFIG.labelGroups.ttl)) {
      return this.getCache('labelGroups');
    }
    return null;
  }

  // 设置标签组缓存
  static setLabelGroupsCache(data) {
    if (CACHE_CONFIG.labelGroups.enabled) {
      this.setCache('labelGroups', data, CACHE_CONFIG.labelGroups.ttl);
    }
  }

  // 获取标签数据缓存
  static getLabelDataCache(groupId) {
    if (!CACHE_CONFIG.labelData.enabled) return null;
    const cacheKey = `labelData:${groupId}`;
    if (cache.labelData.has(groupId)) {
      const cached = cache.labelData.get(groupId);
      const now = Date.now();
      if ((now - cached.timestamp) < cached.ttl) {
        return cached.data;
      }
    }
    return null;
  }

  // 设置标签数据缓存
  static setLabelDataCache(groupId, data) {
    if (CACHE_CONFIG.labelData.enabled) {
      cache.labelData.set(groupId, {
        data: data,
        timestamp: Date.now(),
        ttl: CACHE_CONFIG.labelData.ttl
      });
    }
  }

  // 获取缓存状态
  static getCacheStatus() {
    const now = Date.now();
    const status = {
      labelGroups: {
        cached: cache.labelGroups.data !== null,
        timestamp: cache.labelGroups.timestamp,
        age: cache.labelGroups.data ? Math.floor((now - cache.labelGroups.timestamp) / 1000) : 0,
        ttl: CACHE_CONFIG.labelGroups.ttl,
        valid: this.isCacheValid('labelGroups', CACHE_CONFIG.labelGroups.ttl)
      },
      labelData: {},
      settings: cache.settings
    };

    // 统计标签数据缓存
    for (const [groupId, cached] of cache.labelData.entries()) {
      status.labelData[groupId] = {
        cached: true,
        timestamp: cached.timestamp,
        age: Math.floor((now - cached.timestamp) / 1000),
        ttl: cached.ttl,
        valid: (now - cached.timestamp) < cached.ttl
      };
    }

    return status;
  }
}

// 数据现在从Vika在线表格获取

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '服务器运行正常',
    timestamp: new Date().toISOString()
  });
});

// 获取标签组列表
app.get('/api/label-groups', async (req, res) => {
  try {
    const { forceRefresh } = req.query;
    
    // 检查缓存
    if (!forceRefresh) {
      const cachedData = CacheManager.getLabelGroupsCache();
      if (cachedData) {
        console.log('使用标签组缓存数据');
        return res.json({
          success: true,
          data: cachedData,
          fromCache: true,
          cacheAge: Math.floor((Date.now() - cache.labelGroups.timestamp) / 1000)
        });
      }
    }
    
    console.log('从Vika获取标签组数据...');
    // 从Vika获取标签组数据
    const result = await vika.queryRecords({
      "pageSize": 100
    });
    
    if (!result.success) {
      throw new Error(result.message || '查询Vika失败');
    }
    
    // 处理标签组数据 - 按标签组字段分组
    const groupMap = new Map();
    result.data.forEach(record => {
      const groupName = record.标签组 || record.labelGroup;
      if (groupName && !groupMap.has(groupName)) {
        groupMap.set(groupName, {
          id: groupName, // 使用标签组名称作为ID
          name: groupName,
          description: `标签组: ${groupName}`
        });
      }
    });
    
    const labelGroups = Array.from(groupMap.values());
    
    // 缓存数据
    CacheManager.setLabelGroupsCache(labelGroups);
    console.log('标签组数据已缓存');
    
    res.json({
      success: true,
      data: labelGroups,
      fromCache: false
    });
  } catch (error) {
    console.error('获取标签组失败:', error);
    res.status(500).json({
      success: false,
      message: '获取标签组失败',
      error: error.message
    });
  }
});

// 获取指定标签组的标签数据
app.get('/api/label-groups/:groupId/labels', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { forceRefresh } = req.query;
    
    // 检查缓存
    if (!forceRefresh) {
      const cachedData = CacheManager.getLabelDataCache(groupId);
      if (cachedData) {
        console.log(`使用标签组 ${groupId} 的缓存数据`);
        return res.json({
          success: true,
          data: cachedData,
          fromCache: true,
          cacheAge: Math.floor((Date.now() - cache.labelData.get(groupId).timestamp) / 1000)
        });
      }
    }
    
    console.log(`从Vika获取标签组 ${groupId} 的数据...`);
    // 从Vika获取所有数据，然后筛选指定标签组
    const result = await vika.queryRecords({
      "pageSize": 100
    });
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '查询Vika失败'
      });
    }
    
    // 筛选指定标签组的记录
    const groupRecords = result.data.filter(record => {
      const recordGroup = record.标签组 || record.labelGroup;
      return recordGroup === groupId;
    });
    
    if (groupRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: '标签组不存在或该组下没有标签'
      });
    }
    
    // 构建标签数据
    const labels = groupRecords.map(record => ({
      oldBarcode: record.旧标签 || record.oldLabel,
      newBarcode: record.新标签 || record.newLabel,
      productName: record.产品名称 || record.productName || '产品',
      description: record.产品描述 || record.productDescription || '产品描述',
      count: record.换标数量 || record.changeCount || 1
    }));
    
    // 缓存数据
    CacheManager.setLabelDataCache(groupId, labels);
    console.log(`标签组 ${groupId} 数据已缓存`);
    
    res.json({
      success: true,
      data: labels,
      fromCache: false
    });
  } catch (error) {
    console.error('获取标签数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取标签数据失败',
      error: error.message
    });
  }
});

// 批量更新标签数据
app.post('/api/label-groups/batch-update', async (req, res) => {
  try {
    const { updates } = req.body;
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: '更新数据格式错误'
      });
    }
    
    // 处理每个更新
    for (const update of updates) {
      const { groupId, oldBarcode, count } = update;
      
      try {
        // 更新Vika中的处理完成状态
        const updateResult = await vika.updateRecord(groupId, {
          "处理完成": true
        });
        
        if (updateResult.success) {
          console.log(`更新Vika记录 ${groupId} 处理完成状态`);
        } else {
          console.error(`更新Vika记录失败: ${updateResult.message}`);
        }
      } catch (error) {
        console.error(`更新记录 ${groupId} 失败:`, error);
      }
    }
    
    res.json({
      success: true,
      message: '批量更新成功',
      updatedCount: updates.length
    });
  } catch (error) {
    console.error('批量更新失败:', error);
    res.status(500).json({
      success: false,
      message: '批量更新失败',
      error: error.message
    });
  }
});

// 扫码查询接口 - 根据旧标签+标签组查询新标签
app.post('/api/label-groups/:groupId/scan', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { oldBarcode } = req.body;
    
    if (!oldBarcode) {
      return res.status(400).json({
        success: false,
        message: '缺少旧标签参数'
      });
    }
    
    // 从Vika获取所有数据，然后筛选指定标签组
    const result = await vika.queryRecords({
      "pageSize": 100
    });
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '查询Vika失败'
      });
    }
    
    // 筛选指定标签组和旧标签的记录
    const matchedRecord = result.data.find(record => {
      const recordGroup = record.标签组 || record.labelGroup;
      const recordOldLabel = record.旧标签 || record.oldLabel;
      return recordGroup === groupId && recordOldLabel === oldBarcode;
    });
    
    if (!matchedRecord) {
      return res.json({
        success: false,
        message: '当前条码没有对应的新条码'
      });
    }
    
    // 检查是否有新标签
    if (!matchedRecord.新标签 && !matchedRecord.newLabel) {
      return res.json({
        success: false,
        message: '当前条码没有对应的新条码'
      });
    }
    
    res.json({
      success: true,
      data: {
        oldBarcode: matchedRecord.旧标签 || matchedRecord.oldLabel,
        newBarcode: matchedRecord.新标签 || matchedRecord.newLabel,
        productName: matchedRecord.产品名称 || matchedRecord.productName || '产品',
        description: matchedRecord.产品描述 || matchedRecord.productDescription || '产品描述',
        count: matchedRecord.换标数量 || matchedRecord.changeCount || 1
      }
    });
  } catch (error) {
    console.error('扫码查询失败:', error);
    res.status(500).json({
      success: false,
      message: '扫码查询失败',
      error: error.message
    });
  }
});

// 获取服务器状态
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    data: {
      server: 'running',
      timestamp: new Date().toISOString(),
      vikaConnected: true,
      datasheetId: 'dst0SSLLF0l2Y4dHcw',
      cache: CacheManager.getCacheStatus()
    }
  });
});

// 缓存管理接口
// 获取缓存状态
app.get('/api/cache/status', (req, res) => {
  try {
    const status = CacheManager.getCacheStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('获取缓存状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取缓存状态失败',
      error: error.message
    });
  }
});

// 清除缓存
app.post('/api/cache/clear', (req, res) => {
  try {
    const { type } = req.body; // 'all', 'labelGroups', 'labelData:groupId'
    
    if (!type) {
      return res.status(400).json({
        success: false,
        message: '缺少缓存类型参数'
      });
    }
    
    CacheManager.clearCache(type);
    
    let message = '';
    switch (type) {
      case 'all':
        message = '所有缓存已清除';
        break;
      case 'labelGroups':
        message = '标签组缓存已清除';
        break;
      default:
        if (type.startsWith('labelData:')) {
          const groupId = type.replace('labelData:', '');
          message = `标签组 ${groupId} 的缓存已清除`;
        } else {
          message = '缓存已清除';
        }
    }
    
    console.log(message);
    res.json({
      success: true,
      message: message
    });
  } catch (error) {
    console.error('清除缓存失败:', error);
    res.status(500).json({
      success: false,
      message: '清除缓存失败',
      error: error.message
    });
  }
});

// 刷新缓存
app.post('/api/cache/refresh', async (req, res) => {
  try {
    const { type } = req.body; // 'labelGroups', 'labelData:groupId', 'all'
    
    if (!type) {
      return res.status(400).json({
        success: false,
        message: '缺少刷新类型参数'
      });
    }
    
    let results = [];
    
    if (type === 'all' || type === 'labelGroups') {
      // 刷新标签组缓存
      try {
        const result = await vika.queryRecords({ "pageSize": 100 });
        if (result.success) {
          const groupMap = new Map();
          result.data.forEach(record => {
            const groupName = record.标签组 || record.labelGroup;
            if (groupName && !groupMap.has(groupName)) {
              groupMap.set(groupName, {
                id: groupName,
                name: groupName,
                description: `标签组: ${groupName}`
              });
            }
          });
          const labelGroups = Array.from(groupMap.values());
          CacheManager.setLabelGroupsCache(labelGroups);
          results.push('标签组缓存已刷新');
        }
      } catch (error) {
        results.push(`标签组缓存刷新失败: ${error.message}`);
      }
    }
    
    if (type === 'all' || type.startsWith('labelData:')) {
      // 刷新标签数据缓存
      const groupId = type === 'all' ? null : type.replace('labelData:', '');
      
      try {
        const result = await vika.queryRecords({ "pageSize": 100 });
        if (result.success) {
          if (groupId) {
            // 刷新指定标签组
            const groupRecords = result.data.filter(record => {
              const recordGroup = record.标签组 || record.labelGroup;
              return recordGroup === groupId;
            });
            
            if (groupRecords.length > 0) {
              const labels = groupRecords.map(record => ({
                oldBarcode: record.旧标签 || record.oldLabel,
                newBarcode: record.新标签 || record.newLabel,
                productName: record.产品名称 || record.productName || '产品',
                description: record.产品描述 || record.productDescription || '产品描述',
                count: record.换标数量 || record.changeCount || 1
              }));
              CacheManager.setLabelDataCache(groupId, labels);
              results.push(`标签组 ${groupId} 的缓存已刷新`);
            }
          } else {
            // 刷新所有标签组
            const groupMap = new Map();
            result.data.forEach(record => {
              const groupName = record.标签组 || record.labelGroup;
              if (groupName) {
                if (!groupMap.has(groupName)) {
                  groupMap.set(groupName, []);
                }
                groupMap.get(groupName).push(record);
              }
            });
            
            for (const [groupId, records] of groupMap.entries()) {
              const labels = records.map(record => ({
                oldBarcode: record.旧标签 || record.oldLabel,
                newBarcode: record.新标签 || record.newLabel,
                productName: record.产品名称 || record.productName || '产品',
                description: record.产品描述 || record.productDescription || '产品描述',
                count: record.换标数量 || record.changeCount || 1
              }));
              CacheManager.setLabelDataCache(groupId, labels);
            }
            results.push(`所有标签组缓存已刷新 (${groupMap.size} 个组)`);
          }
        }
      } catch (error) {
        results.push(`标签数据缓存刷新失败: ${error.message}`);
      }
    }
    
    res.json({
      success: true,
      message: '缓存刷新完成',
      results: results
    });
  } catch (error) {
    console.error('刷新缓存失败:', error);
    res.status(500).json({
      success: false,
      message: '刷新缓存失败',
      error: error.message
    });
  }
});

// 缓存设置
app.post('/api/cache/settings', (req, res) => {
  try {
    const { cacheEnabled, autoRefresh } = req.body;
    
    if (typeof cacheEnabled === 'boolean') {
      cache.settings.cacheEnabled = cacheEnabled;
      CACHE_CONFIG.labelGroups.enabled = cacheEnabled;
      CACHE_CONFIG.labelData.enabled = cacheEnabled;
    }
    
    if (typeof autoRefresh === 'boolean') {
      cache.settings.autoRefresh = autoRefresh;
      CACHE_CONFIG.labelGroups.autoRefresh = autoRefresh;
    }
    
    res.json({
      success: true,
      message: '缓存设置已更新',
      settings: cache.settings
    });
  } catch (error) {
    console.error('更新缓存设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新缓存设置失败',
      error: error.message
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: err.message
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`标签打印服务器已启动`);
  console.log(`服务地址: http://0.0.0.0:${PORT}`);
  console.log(`健康检查: http://0.0.0.0:${PORT}/api/health`);
  console.log(`标签组列表: http://0.0.0.0:${PORT}/api/label-groups`);
  console.log(`服务器状态: http://0.0.0.0:${PORT}/api/status`);
});

module.exports = app;
