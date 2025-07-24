package grpc

import (
	"context"
	"log"
	"strconv"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	"golang-business-service/models"
	pb "golang-business-service/proto"
)

type BusinessServer struct {
	pb.UnimplementedBusinessServiceServer
	db *gorm.DB
}

func NewBusinessServer(db *gorm.DB) *BusinessServer {
	return &BusinessServer{
		db: db,
	}
}

func (s *BusinessServer) HealthCheck(ctx context.Context, req *pb.HealthCheckRequest) (*pb.HealthCheckResponse, error) {
	return &pb.HealthCheckResponse{
		Status:  "healthy",
		Service: "golang-business-grpc",
	}, nil
}

func (s *BusinessServer) GetBusinessData(ctx context.Context, req *pb.GetBusinessDataRequest) (*pb.GetBusinessDataResponse, error) {
	log.Printf("gRPC GetBusinessData called for user: %s", req.UserId)

	var records []models.BusinessRecord
	query := s.db.Where("user_id = ?", req.UserId)

	if req.Limit > 0 {
		query = query.Limit(int(req.Limit))
	} else {
		query = query.Limit(10)
	}

	if req.Page > 0 {
		offset := (req.Page - 1) * req.Limit
		query = query.Offset(int(offset))
	}

	result := query.Find(&records)
	if result.Error != nil {
		log.Printf("Database error: %v", result.Error)
		return nil, status.Errorf(codes.Internal, "Failed to fetch business data: %v", result.Error)
	}

	// Convert to protobuf format
	var pbRecords []*pb.BusinessRecord
	for _, record := range records {
		pbRecord := &pb.BusinessRecord{
			Id:          uint32(record.ID),
			Title:       record.Title,
			Description: record.Description,
			Category:    record.Category,
			Status:      record.Status,
			Priority:    int32(record.Priority),
			UserId:      record.UserID,
			Metadata:    record.Metadata,
			CreatedAt:   timestamppb.New(record.CreatedAt),
			UpdatedAt:   timestamppb.New(record.UpdatedAt),
		}
		pbRecords = append(pbRecords, pbRecord)
	}

	return &pb.GetBusinessDataResponse{
		Success: true,
		Data:    pbRecords,
		Total:   int32(len(pbRecords)),
		Message: "Data retrieved successfully",
	}, nil
}

func (s *BusinessServer) CreateRecord(ctx context.Context, req *pb.CreateRecordRequest) (*pb.CreateRecordResponse, error) {
	log.Printf("gRPC CreateRecord called for user: %s", req.UserId)

	record := models.BusinessRecord{
		Title:       req.Title,
		Description: req.Description,
		Category:    req.Category,
		Priority:    int(req.Priority),
		UserID:      req.UserId,
		Metadata:    req.Metadata,
		Status:      "active",
	}

	if err := s.db.Create(&record).Error; err != nil {
		log.Printf("Database error: %v", err)
		return nil, status.Errorf(codes.Internal, "Failed to create record: %v", err)
	}

	pbRecord := &pb.BusinessRecord{
		Id:          uint32(record.ID),
		Title:       record.Title,
		Description: record.Description,
		Category:    record.Category,
		Status:      record.Status,
		Priority:    int32(record.Priority),
		UserId:      record.UserID,
		Metadata:    record.Metadata,
		CreatedAt:   timestamppb.New(record.CreatedAt),
		UpdatedAt:   timestamppb.New(record.UpdatedAt),
	}

	return &pb.CreateRecordResponse{
		Success: true,
		Data:    pbRecord,
		Message: "Record created successfully",
	}, nil
}

func (s *BusinessServer) GetRecords(ctx context.Context, req *pb.GetRecordsRequest) (*pb.GetRecordsResponse, error) {
	log.Printf("gRPC GetRecords called for user: %s", req.UserId)

	var records []models.BusinessRecord
	var total int64

	query := s.db.Where("user_id = ?", req.UserId)

	if req.Category != "" {
		query = query.Where("category = ?", req.Category)
	}
	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}

	// Get total count
	s.db.Model(&models.BusinessRecord{}).Where("user_id = ?", req.UserId).Count(&total)

	// Apply pagination
	page := req.Page
	if page == 0 {
		page = 1
	}
	limit := req.Limit
	if limit == 0 {
		limit = 10
	}
	offset := (page - 1) * limit

	result := query.Offset(int(offset)).Limit(int(limit)).Order("created_at DESC").Find(&records)
	if result.Error != nil {
		log.Printf("Database error: %v", result.Error)
		return nil, status.Errorf(codes.Internal, "Failed to fetch records: %v", result.Error)
	}

	// Convert to protobuf format
	var pbRecords []*pb.BusinessRecord
	for _, record := range records {
		pbRecord := &pb.BusinessRecord{
			Id:          uint32(record.ID),
			Title:       record.Title,
			Description: record.Description,
			Category:    record.Category,
			Status:      record.Status,
			Priority:    int32(record.Priority),
			UserId:      record.UserID,
			Metadata:    record.Metadata,
			CreatedAt:   timestamppb.New(record.CreatedAt),
			UpdatedAt:   timestamppb.New(record.UpdatedAt),
		}
		pbRecords = append(pbRecords, pbRecord)
	}

	return &pb.GetRecordsResponse{
		Success: true,
		Data:    pbRecords,
		Total:   total,
		Page:    page,
		Limit:   limit,
	}, nil
}

func (s *BusinessServer) GetRecordById(ctx context.Context, req *pb.GetRecordByIdRequest) (*pb.GetRecordByIdResponse, error) {
	log.Printf("gRPC GetRecordById called for user: %s, record: %d", req.UserId, req.Id)

	var record models.BusinessRecord
	result := s.db.Where("id = ? AND user_id = ?", req.Id, req.UserId).First(&record)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, status.Errorf(codes.NotFound, "Record not found")
		}
		log.Printf("Database error: %v", result.Error)
		return nil, status.Errorf(codes.Internal, "Failed to fetch record: %v", result.Error)
	}

	pbRecord := &pb.BusinessRecord{
		Id:          uint32(record.ID),
		Title:       record.Title,
		Description: record.Description,
		Category:    record.Category,
		Status:      record.Status,
		Priority:    int32(record.Priority),
		UserId:      record.UserID,
		Metadata:    record.Metadata,
		CreatedAt:   timestamppb.New(record.CreatedAt),
		UpdatedAt:   timestamppb.New(record.UpdatedAt),
	}

	return &pb.GetRecordByIdResponse{
		Success: true,
		Data:    pbRecord,
		Message: "Record retrieved successfully",
	}, nil
}

func (s *BusinessServer) UpdateRecord(ctx context.Context, req *pb.UpdateRecordRequest) (*pb.UpdateRecordResponse, error) {
	log.Printf("gRPC UpdateRecord called for user: %s, record: %d", req.UserId, req.Id)

	var record models.BusinessRecord
	result := s.db.Where("id = ? AND user_id = ?", req.Id, req.UserId).First(&record)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, status.Errorf(codes.NotFound, "Record not found")
		}
		log.Printf("Database error: %v", result.Error)
		return nil, status.Errorf(codes.Internal, "Failed to find record: %v", result.Error)
	}

	// Update fields
	updates := map[string]interface{}{}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Category != "" {
		updates["category"] = req.Category
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.Priority > 0 {
		updates["priority"] = req.Priority
	}
	if req.Metadata != "" {
		updates["metadata"] = req.Metadata
	}

	if err := s.db.Model(&record).Updates(updates).Error; err != nil {
		log.Printf("Database error: %v", err)
		return nil, status.Errorf(codes.Internal, "Failed to update record: %v", err)
	}

	pbRecord := &pb.BusinessRecord{
		Id:          uint32(record.ID),
		Title:       record.Title,
		Description: record.Description,
		Category:    record.Category,
		Status:      record.Status,
		Priority:    int32(record.Priority),
		UserId:      record.UserID,
		Metadata:    record.Metadata,
		CreatedAt:   timestamppb.New(record.CreatedAt),
		UpdatedAt:   timestamppb.New(record.UpdatedAt),
	}

	return &pb.UpdateRecordResponse{
		Success: true,
		Data:    pbRecord,
		Message: "Record updated successfully",
	}, nil
}

func (s *BusinessServer) DeleteRecord(ctx context.Context, req *pb.DeleteRecordRequest) (*pb.DeleteRecordResponse, error) {
	log.Printf("gRPC DeleteRecord called for user: %s, record: %d", req.UserId, req.Id)

	result := s.db.Where("id = ? AND user_id = ?", req.Id, req.UserId).Delete(&models.BusinessRecord{})

	if result.Error != nil {
		log.Printf("Database error: %v", result.Error)
		return nil, status.Errorf(codes.Internal, "Failed to delete record: %v", result.Error)
	}

	if result.RowsAffected == 0 {
		return nil, status.Errorf(codes.NotFound, "Record not found")
	}

	return &pb.DeleteRecordResponse{
		Success: true,
		Message: "Record deleted successfully",
	}, nil
}