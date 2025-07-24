import express from 'express';
import { requireAuth } from '../middleware/auth';
import { trustKong } from '../middleware/trust-kong';
import { grpcBusinessClient } from '../utils/grpcClient';
import axios from 'axios';

const router = express.Router();

// 获取分析仪表板数据 - 调用 analytics-service
router.get('/dashboard', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    const analyticsUrl = process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8001';
    const response = await axios.get(`${analyticsUrl}/analytics/dashboard`, {
      params: req.query,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role,
        'x-user-name': user.name,
        'x-user-email': user.email
      }
    });
    
    res.json({
      success: true,
      data: response.data.data,
      source: 'analytics-service'
    });
  } catch (error: any) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics dashboard',
      error: error.message
    });
  }
});

// 执行数据分析查询 - 调用 analytics-service
router.post('/query', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    const analyticsUrl = process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8001';
    const response = await axios.post(`${analyticsUrl}/analytics/query`, req.body, {
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role,
        'x-user-name': user.name,
        'x-user-email': user.email,
        'Content-Type': 'application/json'
      }
    });
    
    res.json({
      success: true,
      data: response.data.data,
      source: 'analytics-service'
    });
  } catch (error: any) {
    console.error('Analytics query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute analytics query',
      error: error.message
    });
  }
});

// 导出分析数据 - 调用 analytics-service
router.get('/export', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    const analyticsUrl = process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8001';
    const response = await axios.get(`${analyticsUrl}/analytics/export`, {
      params: req.query,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role,
        'x-user-name': user.name,
        'x-user-email': user.email
      }
    });
    
    res.json({
      success: true,
      data: response.data.data,
      format: response.data.format,
      count: response.data.count
    });
  } catch (error: any) {
    console.error('Analytics export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data',
      error: error.message
    });
  }
});

// 记录用户事件 - 调用 analytics-service
router.post('/events', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    const analyticsUrl = process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8001';
    const response = await axios.post(`${analyticsUrl}/data/events`, req.body, {
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role,
        'x-user-name': user.name,
        'x-user-email': user.email,
        'Content-Type': 'application/json'
      }
    });
    
    res.json({
      success: true,
      data: response.data.data,
      message: response.data.message || 'Event recorded successfully'
    });
  } catch (error: any) {
    console.error('Record event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record event',
      error: error.message
    });
  }
});

// 获取用户事件 - 调用 analytics-service
router.get('/events', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    const analyticsUrl = process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8001';
    const response = await axios.get(`${analyticsUrl}/data/events`, {
      params: req.query,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role,
        'x-user-name': user.name,
        'x-user-email': user.email
      }
    });
    
    res.json({
      success: true,
      events: response.data.events,
      total: response.data.total,
      skip: response.data.skip,
      limit: response.data.limit
    });
  } catch (error: any) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error.message
    });
  }
});

// 获取聚合摘要 - 结合 business-service 和 analytics-service
router.get('/summary', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    try {
      // 并行调用business-service和analytics-service
      const [businessData, analyticsData] = await Promise.allSettled([
        grpcBusinessClient.getBusinessData(user.id, 1, 5),
        axios.get(`${process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8001'}/analytics/dashboard`, {
          headers: {
            'x-user-id': user.id,
            'x-user-role': user.role,
            'x-user-name': user.name,
            'x-user-email': user.email
          }
        })
      ]);

      const response: any = {
        success: true,
        data: {},
        aggregated: true
      };

      // 处理business-service数据
      if (businessData.status === 'fulfilled') {
        response.data.business = {
          recent_records: businessData.value.data || [],
          total_records: businessData.value.total || 0
        };
      } else {
        console.warn('Failed to fetch business data:', businessData.reason);
        response.data.business = {
          recent_records: [],
          total_records: 0,
          error: 'Failed to fetch business data'
        };
      }

      // 处理analytics-service数据
      if (analyticsData.status === 'fulfilled') {
        const analytics = analyticsData.value.data.data;
        response.data.analytics = {
          total_events: analytics?.total_events || 0,
          event_breakdown: analytics?.event_breakdown || {},
          recent_events: analytics?.recent_events || []
        };
      } else {
        console.warn('Failed to fetch analytics data:', analyticsData.reason);
        response.data.analytics = {
          total_events: 0,
          event_breakdown: {},
          recent_events: [],
          error: 'Failed to fetch analytics data'
        };
      }

      res.json(response);
    } catch (error) {
      throw error;
    }
  } catch (error: any) {
    console.error('Summary aggregation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summary data',
      error: error.message
    });
  }
});

export default router;