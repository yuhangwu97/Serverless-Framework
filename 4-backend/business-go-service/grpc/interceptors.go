package grpc

import (
	"context"
	"log"

	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

// KongTrustInterceptor trusts user information from Kong headers
func KongTrustInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		log.Printf("gRPC call %s: No metadata, proceeding without user context", info.FullMethod)
		return handler(ctx, req)
	}

	// Extract user information from Kong headers
	userIDs := md.Get("x-user-id")
	userRoles := md.Get("x-user-role")
	userNames := md.Get("x-user-name")
	userEmails := md.Get("x-user-email")

	if len(userIDs) > 0 {
		// Add user context to the request context
		ctx = context.WithValue(ctx, "user_id", userIDs[0])
		
		if len(userRoles) > 0 {
			ctx = context.WithValue(ctx, "user_role", userRoles[0])
		}
		if len(userNames) > 0 {
			ctx = context.WithValue(ctx, "user_name", userNames[0])
		}
		if len(userEmails) > 0 {
			ctx = context.WithValue(ctx, "user_email", userEmails[0])
		}

		log.Printf("gRPC call %s: User context from Kong - ID: %s, Role: %s", 
			info.FullMethod, userIDs[0], 
			func() string { if len(userRoles) > 0 { return userRoles[0] } else { return "unknown" } }())
	} else {
		log.Printf("gRPC call %s: No user ID from Kong, proceeding without user context", info.FullMethod)
	}

	return handler(ctx, req)
}

// LoggingInterceptor logs gRPC requests
func LoggingInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	log.Printf("gRPC call: %s", info.FullMethod)
	
	resp, err := handler(ctx, req)
	
	if err != nil {
		log.Printf("gRPC call %s failed: %v", info.FullMethod, err)
	} else {
		log.Printf("gRPC call %s completed successfully", info.FullMethod)
	}
	
	return resp, err
}