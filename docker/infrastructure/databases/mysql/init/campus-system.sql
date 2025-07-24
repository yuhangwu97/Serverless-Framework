-- 校园管理系统数据库结构
-- Campus Management System Database Schema

CREATE DATABASE IF NOT EXISTS campus_management;
USE campus_management;

-- 注意：用户基础信息存储在MongoDB中，这里不需要users表

-- 学院表 (Colleges/Departments)
CREATE TABLE IF NOT EXISTS colleges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    dean_id VARCHAR(20),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    address TEXT,
    established_year YEAR,
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (code)
);

-- 专业表 (Majors/Programs)
CREATE TABLE IF NOT EXISTS majors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    college_id INT NOT NULL,
    degree_type ENUM('bachelor', 'master', 'phd') NOT NULL,
    duration_years INT DEFAULT 4,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (college_id) REFERENCES colleges(id),
    INDEX idx_college_id (college_id),
    INDEX idx_code (code)
);

-- 注意：学生和教师信息也存储在MongoDB中，这里不需要相关表

-- 课程表 (Courses)
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    college_id INT NOT NULL,
    major_id INT,
    credits DECIMAL(3,1) NOT NULL,
    course_type ENUM('required', 'elective', 'general_education') NOT NULL,
    semester_type ENUM('fall', 'spring', 'summer') NOT NULL,
    total_hours INT NOT NULL,
    theory_hours INT DEFAULT 0,
    practice_hours INT DEFAULT 0,
    lab_hours INT DEFAULT 0,
    description TEXT,
    prerequisites TEXT, -- JSON array of prerequisite course codes
    syllabus TEXT,
    textbook TEXT,
    assessment_method TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (college_id) REFERENCES colleges(id),
    FOREIGN KEY (major_id) REFERENCES majors(id),
    INDEX idx_course_code (course_code),
    INDEX idx_college_major (college_id, major_id),
    INDEX idx_type (course_type)
);

-- 课程班级/教学班表 (Course Classes)
CREATE TABLE IF NOT EXISTS course_classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    class_code VARCHAR(20) NOT NULL,
    teacher_id VARCHAR(20) NOT NULL,
    semester VARCHAR(20) NOT NULL, -- 2024-fall
    year YEAR NOT NULL,
    max_students INT DEFAULT 50,
    enrolled_students INT DEFAULT 0,
    classroom VARCHAR(100),
    schedule JSON, -- 上课时间安排 JSON格式
    status ENUM('planning', 'enrolling', 'ongoing', 'completed', 'cancelled') DEFAULT 'planning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    UNIQUE KEY uk_class_semester (class_code, semester, year),
    INDEX idx_course_teacher (course_id, teacher_id),
    INDEX idx_semester (semester, year)
);

-- 选课表 (Course Enrollments)
CREATE TABLE IF NOT EXISTS course_enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    course_class_id INT NOT NULL,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('enrolled', 'dropped', 'completed') DEFAULT 'enrolled',
    final_grade DECIMAL(4,1) NULL, -- 最终成绩 0-100
    gpa_points DECIMAL(3,2) NULL, -- GPA积点
    is_retake BOOLEAN DEFAULT FALSE,
    notes TEXT,
    FOREIGN KEY (course_class_id) REFERENCES course_classes(id),
    UNIQUE KEY uk_student_class (student_id, course_class_id),
    INDEX idx_student_id (student_id),
    INDEX idx_course_class_id (course_class_id),
    INDEX idx_status (status)
);

-- 成绩记录表 (Grade Records)
CREATE TABLE IF NOT EXISTS grade_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT NOT NULL,
    exam_type ENUM('quiz', 'midterm', 'final', 'assignment', 'project', 'attendance') NOT NULL,
    exam_name VARCHAR(100),
    score DECIMAL(4,1) NOT NULL,
    max_score DECIMAL(4,1) DEFAULT 100,
    weight DECIMAL(3,2) DEFAULT 1.0, -- 权重
    exam_date DATE,
    notes TEXT,
    created_by VARCHAR(20) NOT NULL, -- 登分教师
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(id),
    INDEX idx_enrollment_id (enrollment_id),
    INDEX idx_exam_type (exam_type),
    INDEX idx_exam_date (exam_date)
);

-- 宿舍楼表 (Dormitory Buildings)
CREATE TABLE IF NOT EXISTS dormitory_buildings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    type ENUM('male', 'female', 'mixed') NOT NULL,
    floors INT NOT NULL,
    rooms_per_floor INT NOT NULL,
    manager_name VARCHAR(50),
    manager_phone VARCHAR(20),
    address TEXT,
    facilities JSON, -- 设施信息
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 宿舍房间表 (Dormitory Rooms)
CREATE TABLE IF NOT EXISTS dormitory_rooms (
    id VARCHAR(20) PRIMARY KEY, -- 房间号
    building_id INT NOT NULL,
    floor INT NOT NULL,
    room_number VARCHAR(10) NOT NULL,
    capacity INT DEFAULT 4,
    occupied INT DEFAULT 0,
    room_type ENUM('standard', 'suite', 'apartment') DEFAULT 'standard',
    facilities JSON,
    rent_fee DECIMAL(8,2) DEFAULT 0,
    status ENUM('available', 'full', 'maintenance', 'reserved') DEFAULT 'available',
    FOREIGN KEY (building_id) REFERENCES dormitory_buildings(id),
    INDEX idx_building_floor (building_id, floor),
    INDEX idx_status (status)
);

-- 图书馆图书表 (Library Books)
CREATE TABLE IF NOT EXISTS library_books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    isbn VARCHAR(20) UNIQUE,
    title VARCHAR(300) NOT NULL,
    author VARCHAR(200),
    publisher VARCHAR(200),
    publish_year YEAR,
    category VARCHAR(100),
    location VARCHAR(50), -- 书架位置
    total_copies INT DEFAULT 1,
    available_copies INT DEFAULT 1,
    language ENUM('chinese', 'english', 'other') DEFAULT 'chinese',
    description TEXT,
    cover_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_isbn (isbn),
    INDEX idx_title (title),
    INDEX idx_category (category),
    INDEX idx_author (author)
);

-- 图书借阅记录表 (Book Borrowing Records)
CREATE TABLE IF NOT EXISTS book_borrowings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    book_id INT NOT NULL,
    borrow_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE NOT NULL,
    return_date TIMESTAMP NULL,
    status ENUM('borrowed', 'returned', 'overdue', 'lost') DEFAULT 'borrowed',
    fine_amount DECIMAL(8,2) DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (book_id) REFERENCES library_books(id),
    INDEX idx_user_id (user_id),
    INDEX idx_book_id (book_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date)
);

-- 初始化数据
-- 插入学院信息
INSERT INTO colleges (code, name, description, contact_email, established_year) VALUES
('CS', '计算机科学与技术学院', '培养计算机科学与技术领域高级人才', 'cs@university.edu.cn', 1978),
('EE', '电子工程学院', '电子信息工程领域人才培养基地', 'ee@university.edu.cn', 1952),
('MATH', '数学学院', '基础数学与应用数学研究', 'math@university.edu.cn', 1925),
('PHYS', '物理学院', '物理学基础研究与应用', 'physics@university.edu.cn', 1926),
('CHEM', '化学学院', '化学科学研究与教育', 'chemistry@university.edu.cn', 1926);

-- 插入专业信息
INSERT INTO majors (code, name, college_id, degree_type, duration_years) VALUES
('CS01', '计算机科学与技术', 1, 'bachelor', 4),
('CS02', '软件工程', 1, 'bachelor', 4),
('CS03', '人工智能', 1, 'bachelor', 4),
('EE01', '电子信息工程', 2, 'bachelor', 4),
('EE02', '通信工程', 2, 'bachelor', 4),
('MATH01', '数学与应用数学', 3, 'bachelor', 4),
('PHYS01', '物理学', 4, 'bachelor', 4),
('CHEM01', '化学', 5, 'bachelor', 4);

-- 注意：用户信息已迁移到MongoDB，此处不需要插入用户数据

-- 插入示例课程
INSERT INTO courses (course_code, name, college_id, major_id, credits, course_type, semester_type, total_hours, theory_hours, practice_hours) VALUES
('CS101', '程序设计基础', 1, 1, 4.0, 'required', 'fall', 64, 48, 16),
('CS102', '数据结构与算法', 1, 1, 4.0, 'required', 'spring', 64, 48, 16),
('CS201', '操作系统', 1, 1, 3.0, 'required', 'fall', 48, 40, 8),
('MATH101', '高等数学A', 3, NULL, 5.0, 'required', 'fall', 80, 80, 0);

-- 插入宿舍楼
INSERT INTO dormitory_buildings (name, type, floors, rooms_per_floor, manager_name, manager_phone) VALUES
('紫荆公寓1号楼', 'male', 6, 20, '张师傅', '010-62781234'),
('紫荆公寓2号楼', 'female', 6, 20, '李阿姨', '010-62781235'),
('紫荆公寓3号楼', 'male', 8, 25, '王师傅', '010-62781236');

-- 插入部分宿舍房间
INSERT INTO dormitory_rooms (id, building_id, floor, room_number, capacity, occupied, rent_fee) VALUES
('101-101', 1, 1, '101', 4, 2, 1200.00),
('101-102', 1, 1, '102', 4, 4, 1200.00),
('101-201', 1, 2, '201', 4, 1, 1200.00),
('102-101', 2, 1, '101', 4, 3, 1200.00),
('102-102', 2, 1, '102', 4, 4, 1200.00);

-- 创建应用用户并授权
CREATE USER IF NOT EXISTS 'campus_user'@'%' IDENTIFIED BY 'campus_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON campus_management.* TO 'campus_user'@'%';
FLUSH PRIVILEGES;