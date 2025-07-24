import express from 'express';
import { requireAuth } from '../middleware/auth';
import { trustKong } from '../middleware/trust-kong';
import { grpcBusinessClient } from '../utils/grpcClient';
import axios from 'axios';

const router = express.Router();

// UI 聚合路由：/ui/business/summary → business-service (gRPC) + analytics-service
router.get('/summary', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    // 并行调用business-service和analytics-service
    const [businessResult, analyticsResult] = await Promise.allSettled([
      // 通过gRPC调用business-service获取业务汇总
      grpcBusinessClient.getBusinessSummary(user.id),
      // 通过HTTP调用analytics-service获取分析数据
      axios.get(`${process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8001'}/analytics/dashboard`, {
        headers: {
          'x-user-id': user.id,
          'x-user-role': user.role || 'student',
          'x-user-name': user.name || '',
          'x-user-email': user.email || ''
        }
      })
    ]);

    // 处理business-service响应
    let businessData = null;
    let businessError = null;
    if (businessResult.status === 'fulfilled') {
      businessData = businessResult.value;
    } else {
      businessError = businessResult.reason?.message || 'Business service error';
      console.error('Business service error:', businessResult.reason);
    }

    // 处理analytics-service响应
    let analyticsData = null;
    let analyticsError = null;
    if (analyticsResult.status === 'fulfilled') {
      analyticsData = analyticsResult.value.data;
    } else {
      analyticsError = analyticsResult.reason?.message || 'Analytics service error';
      console.error('Analytics service error:', analyticsResult.reason);
    }

    res.json({
      success: true,
      data: {
        business: {
          success: businessData?.success || false,
          data: businessData?.data || null,
          error: businessError
        },
        analytics: {
          success: analyticsData ? true : false,
          data: analyticsData?.data || null,
          error: analyticsError
        }
      },
      source: 'middleware-ui-aggregation',
      aggregated_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Business summary aggregation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch business summary',
      error: error.message,
      source: 'middleware-ui-aggregation'
    });
  }
});

// 获取业务数据 - 调用 business-service gRPC
router.get('/data', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // 通过gRPC调用business-service获取业务数据
    const businessData = await grpcBusinessClient.getBusinessData(user.id, page, limit);
    
    res.json({
      success: businessData.success,
      data: businessData.data,
      total: businessData.total,
      source: 'business-service-grpc'
    });
  } catch (error: any) {
    console.error('Business data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch business data',
      error: error.message
    });
  }
});

// 创建业务记录 - 调用 business-service gRPC
router.post('/records', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    // 通过gRPC调用business-service创建记录
    const result = await grpcBusinessClient.createRecord(req.body, user.id);
    
    res.json({
      success: result.success,
      data: result.data,
      message: result.message || 'Record created successfully'
    });
  } catch (error: any) {
    console.error('Create record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create record',
      error: error.message
    });
  }
});

// 获取业务记录列表 - 调用 business-service gRPC
router.get('/records', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      category: req.query.category as string,
      status: req.query.status as string
    };

    // 通过gRPC调用business-service获取记录
    const result = await grpcBusinessClient.getRecords(user.id, options);
    
    res.json({
      success: result.success,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit
    });
  } catch (error: any) {
    console.error('Get records error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch records',
      error: error.message
    });
  }
});

// 更新业务记录 - 调用 business-service gRPC
router.put('/records/:id', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    const recordId = parseInt(req.params.id);

    // 通过gRPC调用business-service更新记录
    const result = await grpcBusinessClient.updateRecord(recordId, user.id, req.body);
    
    res.json({
      success: result.success,
      data: result.data,
      message: result.message || 'Record updated successfully'
    });
  } catch (error: any) {
    console.error('Update record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update record',
      error: error.message
    });
  }
});

// 删除业务记录 - 调用 business-service gRPC
router.delete('/records/:id', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    const recordId = parseInt(req.params.id);

    // 通过gRPC调用business-service删除记录
    const result = await grpcBusinessClient.deleteRecord(recordId, user.id);
    
    res.json({
      success: result.success,
      message: result.message || 'Record deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete record',
      error: error.message
    });
  }
});

// 获取课程信息 - 调用 business-service gRPC
router.get('/courses', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    const options = {
      college_id: parseInt(req.query.college_id as string) || 0,
      major_id: parseInt(req.query.major_id as string) || 0,
      course_type: req.query.course_type as string || '',
      semester_type: req.query.semester_type as string || '',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      search: req.query.search as string || ''
    };

    // 通过gRPC调用business-service获取课程
    const result = await grpcBusinessClient.getCourses(options);
    
    res.json({
      success: result.success,
      data: result.courses,
      total: result.total,
      message: 'Courses fetched from business-service'
    });
  } catch (error: any) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses',
      error: error.message
    });
  }
});

// 获取选课信息 - 调用 business-service gRPC
router.get('/enrollments', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    const options = {
      semester: req.query.semester as string || '',
      year: parseInt(req.query.year as string) || 0,
      status: req.query.status as string || ''
    };

    // 通过gRPC调用business-service获取选课信息
    const result = await grpcBusinessClient.getEnrollments(user.id, options);
    
    res.json({
      success: result.success,
      data: result.enrollments,
      message: 'Enrollments fetched from business-service'
    });
  } catch (error: any) {
    console.error('Get enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollments',
      error: error.message
    });
  }
});

// 获取成绩信息 - 调用 business-service gRPC
router.get('/grades', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    const options = {
      course_class_id: parseInt(req.query.course_class_id as string) || 0,
      semester: req.query.semester as string || '',
      year: parseInt(req.query.year as string) || 0
    };

    // 通过gRPC调用business-service获取成绩
    const result = await grpcBusinessClient.getGrades(user.id, options);
    
    res.json({
      success: result.success,
      data: result.grades,
      message: 'Grades fetched from business-service'
    });
  } catch (error: any) {
    console.error('Get grades error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grades',
      error: error.message
    });
  }
});

// 获取统计数据 - 调用 analytics-service
router.get('/stats', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    const statsType = req.query.type as string || 'user';
    const period = req.query.period as string || 'daily';

    // 首先尝试通过gRPC调用business-service获取基础统计
    try {
      const businessStats = await grpcBusinessClient.getStats(statsType, period);
      
      // 然后调用analytics-service获取详细分析
      const analyticsUrl = process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8001';
      const analyticsResponse = await axios.get(`${analyticsUrl}/analytics/stats`, {
        params: {
          type: statsType,
          period: period,
          user_id: user.id
        },
        headers: {
          'x-user-id': user.id,
          'x-user-role': user.role,
          'x-user-name': user.name,
          'x-user-email': user.email
        }
      });

      res.json({
        success: true,
        data: {
          business: businessStats.stats,
          analytics: analyticsResponse.data.data
        },
        message: 'Stats fetched from business-service and analytics-service'
      });
    } catch (grpcError) {
      // 如果gRPC调用失败，只返回analytics数据
      console.warn('Business stats gRPC call failed:', grpcError);
      
      const analyticsUrl = process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8001';
      const analyticsResponse = await axios.get(`${analyticsUrl}/analytics/stats`, {
        params: {
          type: statsType,
          period: period,
          user_id: user.id
        },
        headers: {
          'x-user-id': user.id,
          'x-user-role': user.role,
          'x-user-name': user.name,
          'x-user-email': user.email
        }
      });

      res.json({
        success: true,
        data: {
          analytics: analyticsResponse.data.data
        },
        message: 'Stats fetched from analytics-service only'
      });
    }
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
});

// 获取详细分析报告 - 调用 analytics-service
router.get('/analytics/report', trustKong, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    const reportType = req.query.type as string || 'overview';
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    // 调用analytics-service获取分析报告
    const analyticsUrl = process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8001';
    const response = await axios.get(`${analyticsUrl}/analytics/report`, {
      params: {
        type: reportType,
        start_date: startDate,
        end_date: endDate,
        user_id: user.id
      },
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
      message: 'Analytics report fetched from analytics-service'
    });
  } catch (error: any) {
    console.error('Get analytics report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics report',
      error: error.message
    });
  }
});

export default router;