import grpc
import os
from typing import Optional
import logging
from app.proto import campus_pb2, campus_pb2_grpc

logger = logging.getLogger(__name__)

class GRPCClient:
    """gRPC客户端，用于连接business-service"""
    
    def __init__(self):
        self.channel: Optional[grpc.Channel] = None
        self.campus_stub: Optional[campus_pb2_grpc.CampusServiceStub] = None
        self.business_service_url = os.getenv('BUSINESS_GRPC_URL', 'business-service:9090')
    
    def connect(self):
        """连接到business-service"""
        try:
            self.channel = grpc.insecure_channel(self.business_service_url)
            self.campus_stub = campus_pb2_grpc.CampusServiceStub(self.channel)
            logger.info(f"Connected to business-service at {self.business_service_url}")
        except Exception as e:
            logger.error(f"Failed to connect to business-service: {e}")
            raise
    
    def close(self):
        """关闭连接"""
        if self.channel:
            self.channel.close()
            logger.info("Closed gRPC connection to business-service")
    
    def _add_user_metadata(self, user_id: str = None, user_role: str = None, 
                          user_name: str = None, user_email: str = None):
        """添加用户元数据到gRPC调用"""
        metadata = []
        if user_id:
            metadata.append(('x-user-id', user_id))
        if user_role:
            metadata.append(('x-user-role', user_role))
        if user_name:
            metadata.append(('x-user-name', user_name))
        if user_email:
            metadata.append(('x-user-email', user_email))
        return metadata
    
    # 注意：用户和学生数据现在存储在MongoDB中，不再通过gRPC获取
    
    # 课程相关方法
    async def get_courses(self, college_id: int = None, major_id: int = None,
                         course_type: str = None, semester_type: str = None,
                         page: int = 1, limit: int = 10, search: str = None,
                         requesting_user_id: str = None,
                         requesting_user_role: str = None) -> campus_pb2.GetCoursesResponse:
        """获取课程列表"""
        if not self.campus_stub:
            raise Exception("gRPC client not connected")
        
        request = campus_pb2.GetCoursesRequest(
            college_id=college_id or 0,
            major_id=major_id or 0,
            course_type=course_type or "",
            semester_type=semester_type or "",
            page=page,
            limit=limit,
            search=search or ""
        )
        metadata = self._add_user_metadata(requesting_user_id, requesting_user_role)
        
        try:
            response = self.campus_stub.GetCourses(request, metadata=metadata)
            return response
        except grpc.RpcError as e:
            logger.error(f"gRPC error getting courses: {e}")
            raise
    
    # 统计相关方法
    async def get_stats(self, stats_type: str, period: str = "daily",
                       requesting_user_id: str = None,
                       requesting_user_role: str = None) -> campus_pb2.GetStatsResponse:
        """获取系统统计数据"""
        if not self.campus_stub:
            raise Exception("gRPC client not connected")
        
        request = campus_pb2.GetStatsRequest(
            type=stats_type,
            period=period
        )
        metadata = self._add_user_metadata(requesting_user_id, requesting_user_role)
        
        try:
            response = self.campus_stub.GetStats(request, metadata=metadata)
            return response
        except grpc.RpcError as e:
            logger.error(f"gRPC error getting stats: {e}")
            raise

# 全局gRPC客户端实例
grpc_client = GRPCClient()