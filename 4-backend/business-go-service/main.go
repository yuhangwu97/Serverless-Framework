package main

import (
	"log"
	"net"
	"os"

	"google.golang.org/grpc"
	"gorm.io/gorm"
	"golang-business-service/config"
	grpcServer "golang-business-service/grpc"
	pb "golang-business-service/proto"
)

func main() {
	db := config.InitDB()

	// Only start gRPC server - remove REST API
	startGRPCServer(db)
}

func startGRPCServer(db interface{}) {
	grpcPort := os.Getenv("GRPC_PORT")
	if grpcPort == "" {
		grpcPort = "9090"
	}

	lis, err := net.Listen("tcp", ":"+grpcPort)
	if err != nil {
		log.Fatalf("Failed to listen on port %s: %v", grpcPort, err)
	}

	// Remove JWT interceptor as authentication is handled by Kong
	s := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			grpcServer.LoggingInterceptor,
			grpcServer.KongTrustInterceptor, // Trust Kong headers
		),
	)

	businessServer := grpcServer.NewBusinessServer(db.(*gorm.DB))
	pb.RegisterBusinessServiceServer(s, businessServer)

	log.Printf("Starting gRPC server on port %s", grpcPort)
	log.Printf("Authentication handled by Kong - trusting all requests")
	if err := s.Serve(lis); err != nil {
		log.Fatalf("Failed to serve gRPC: %v", err)
	}
}