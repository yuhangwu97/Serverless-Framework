-- MySQL initialization script
CREATE DATABASE IF NOT EXISTS business_db;
USE business_db;

-- Create business_records table
CREATE TABLE IF NOT EXISTS business_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    priority INT DEFAULT 1,
    user_id VARCHAR(100) NOT NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at)
);

-- Create business_categories table
CREATE TABLE IF NOT EXISTS business_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#000000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO business_categories (name, description, color) VALUES
('General', 'General business records', '#6B7280'),
('Sales', 'Sales related records', '#10B981'),
('Marketing', 'Marketing activities', '#8B5CF6'),
('Support', 'Customer support tickets', '#F59E0B'),
('Development', 'Development tasks', '#3B82F6'),
('Finance', 'Financial records', '#EF4444');

-- Create business_tags table
CREATE TABLE IF NOT EXISTS business_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    record_id INT NOT NULL,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (record_id) REFERENCES business_records(id) ON DELETE CASCADE,
    INDEX idx_record_id (record_id),
    INDEX idx_tag (tag)
);

-- Insert sample business records
INSERT INTO business_records (title, description, category, status, priority, user_id, metadata) VALUES
('Setup API Gateway', 'Configure Kong API Gateway for microservices routing', 'Development', 'active', 1, 'admin', JSON_OBJECT('estimated_hours', 4, 'complexity', 'medium')),
('Database Migration', 'Migrate legacy data to new schema', 'Development', 'pending', 2, 'admin', JSON_OBJECT('estimated_hours', 8, 'complexity', 'high')),
('Customer Onboarding', 'Implement new customer onboarding flow', 'Sales', 'in_progress', 1, 'admin', JSON_OBJECT('estimated_hours', 6, 'complexity', 'medium'));

-- Create user for the application
CREATE USER IF NOT EXISTS 'appuser'@'%' IDENTIFIED BY 'apppassword';
GRANT SELECT, INSERT, UPDATE, DELETE ON business_db.* TO 'appuser'@'%';
FLUSH PRIVILEGES;

-- Create procedure for analytics
DELIMITER //
CREATE PROCEDURE GetBusinessAnalytics(IN user_id VARCHAR(100))
BEGIN
    SELECT 
        category,
        COUNT(*) as total_records,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        AVG(priority) as avg_priority
    FROM business_records 
    WHERE user_id = user_id AND deleted_at IS NULL
    GROUP BY category
    ORDER BY total_records DESC;
END //
DELIMITER ;