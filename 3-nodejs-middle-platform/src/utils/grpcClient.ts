import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

// 业务服务gRPC客户端
interface BusinessRecord {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: number;
  user_id: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

interface BusinessServiceClient {
  GetBusinessData: (request: any, callback: (error: any, response: any) => void) => void;
  GetBusinessSummary: (request: any, callback: (error: any, response: any) => void) => void;
  CreateRecord: (request: any, callback: (error: any, response: any) => void) => void;
  GetRecords: (request: any, callback: (error: any, response: any) => void) => void;
  GetRecordById: (request: any, callback: (error: any, response: any) => void) => void;
  UpdateRecord: (request: any, callback: (error: any, response: any) => void) => void;
  DeleteRecord: (request: any, callback: (error: any, response: any) => void) => void;
}

interface CampusServiceClient {
  GetCourses: (request: any, callback: (error: any, response: any) => void) => void;
  GetCourseClasses: (request: any, callback: (error: any, response: any) => void) => void;
  GetEnrollments: (request: any, callback: (error: any, response: any) => void) => void;
  GetGrades: (request: any, callback: (error: any, response: any) => void) => void;
  GetBooks: (request: any, callback: (error: any, response: any) => void) => void;
  GetBorrowings: (request: any, callback: (error: any, response: any) => void) => void;
  GetStats: (request: any, callback: (error: any, response: any) => void) => void;
}

class GRPCBusinessClient {
  private businessClient: BusinessServiceClient | null = null;
  private campusClient: CampusServiceClient | null = null;
  private businessServiceUrl: string;

  constructor() {
    this.businessServiceUrl = process.env.BUSINESS_GRPC_URL || 'business-service:9090';
    this.initClients();
  }

  private async initClients() {
    try {
      // 加载业务服务proto
      const businessProtoPath = path.join(__dirname, '../proto/business.proto');
      const businessPackageDefinition = protoLoader.loadSync(businessProtoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });
      const businessProto = grpc.loadPackageDefinition(businessPackageDefinition) as any;

      // 加载校园服务proto  
      const campusProtoPath = path.join(__dirname, '../proto/campus.proto');
      const campusPackageDefinition = protoLoader.loadSync(campusProtoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });
      const campusProto = grpc.loadPackageDefinition(campusPackageDefinition) as any;

      // 创建客户端
      this.businessClient = new businessProto.business.BusinessService(
        this.businessServiceUrl,
        grpc.credentials.createInsecure()
      );

      this.campusClient = new campusProto.campus.CampusService(
        this.businessServiceUrl,
        grpc.credentials.createInsecure()
      );

      console.log(`Connected to business-service at ${this.businessServiceUrl}`);
    } catch (error) {
      console.error('Failed to initialize gRPC clients:', error);
      throw error;
    }
  }

  // 业务记录相关方法
  async getBusinessData(userId: string, page: number = 1, limit: number = 10): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.businessClient) {
        reject(new Error('Business client not initialized'));
        return;
      }

      this.businessClient.GetBusinessData(
        { user_id: userId, page, limit },
        (error: any, response: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async createRecord(data: any, userId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.businessClient) {
        reject(new Error('Business client not initialized'));
        return;
      }

      this.businessClient.CreateRecord(
        { ...data, user_id: userId },
        (error: any, response: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async getRecords(userId: string, options: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.businessClient) {
        reject(new Error('Business client not initialized'));
        return;
      }

      this.businessClient.GetRecords(
        { user_id: userId, ...options },
        (error: any, response: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async updateRecord(id: number, userId: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.businessClient) {
        reject(new Error('Business client not initialized'));
        return;
      }

      this.businessClient.UpdateRecord(
        { id, user_id: userId, ...data },
        (error: any, response: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async deleteRecord(id: number, userId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.businessClient) {
        reject(new Error('Business client not initialized'));
        return;
      }

      this.businessClient.DeleteRecord(
        { id, user_id: userId },
        (error: any, response: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  // 校园数据相关方法
  async getCourses(options: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.campusClient) {
        reject(new Error('Campus client not initialized'));
        return;
      }

      this.campusClient.GetCourses(options, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async getCourseClasses(options: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.campusClient) {
        reject(new Error('Campus client not initialized'));
        return;
      }

      this.campusClient.GetCourseClasses(options, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async getEnrollments(studentId: string, options: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.campusClient) {
        reject(new Error('Campus client not initialized'));
        return;
      }

      this.campusClient.GetEnrollments(
        { student_id: studentId, ...options },
        (error: any, response: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async getGrades(studentId: string, options: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.campusClient) {
        reject(new Error('Campus client not initialized'));
        return;
      }

      this.campusClient.GetGrades(
        { student_id: studentId, ...options },
        (error: any, response: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async getStats(type: string, period: string = 'daily'): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.campusClient) {
        reject(new Error('Campus client not initialized'));
        return;
      }

      this.campusClient.GetStats(
        { type, period },
        (error: any, response: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async getBusinessSummary(userId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.businessClient) {
        reject(new Error('Business client not initialized'));
        return;
      }

      this.businessClient.GetBusinessSummary(
        { user_id: userId },
        (error: any, response: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }
}

export const grpcBusinessClient = new GRPCBusinessClient();