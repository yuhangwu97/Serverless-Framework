// MongoDB initialization script
db = db.getSiblingDB('microservice-auth');

// Create users collection with indexes
db.createCollection('users');
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });

// Create sessions collection with TTL index
db.createCollection('sessions');
db.sessions.createIndex({ "expires": 1 }, { expireAfterSeconds: 0 });

// Switch to data service database
db = db.getSiblingDB('data_service');

// Create events collection with indexes
db.createCollection('events');
db.events.createIndex({ "user_id": 1 });
db.events.createIndex({ "event_type": 1 });
db.events.createIndex({ "timestamp": 1 });
db.events.createIndex({ "processed": 1 });

// Create analytics collection
db.createCollection('analytics');
db.analytics.createIndex({ "user_id": 1 });
db.analytics.createIndex({ "date": 1 });

print('MongoDB initialization completed');

// Insert sample user (password: password123)
db = db.getSiblingDB('microservice-auth');
db.users.insertOne({
  username: "admin",
  email: "admin@example.com",
  password: "$2a$12$8K1p/a0dURRdUzAQ.Kd6EOPpiE7aWN5zAGI7w6r1ZXPLJq0jI.U3u",
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Sample user created (username: admin, password: password123)');