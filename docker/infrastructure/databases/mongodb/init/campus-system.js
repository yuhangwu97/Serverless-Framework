// 校园管理系统 MongoDB 初始化脚本
// Campus Management System MongoDB Initialization

// 创建认证数据库
db = db.getSiblingDB('campus_auth');

// 用户基础信息集合
db.createCollection('users');
db.users.createIndex({ "id": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "status": 1 });
db.users.createIndex({ "name": 1 });

// 学生信息集合
db.createCollection('students');
db.students.createIndex({ "userId": 1 }, { unique: true });
db.students.createIndex({ "studentId": 1 }, { unique: true });
db.students.createIndex({ "collegeId": 1 });
db.students.createIndex({ "majorId": 1 });
db.students.createIndex({ "grade": 1 });
db.students.createIndex({ "enrollmentYear": 1 });

// 教师信息集合
db.createCollection('teachers');
db.teachers.createIndex({ "userId": 1 }, { unique: true });
db.teachers.createIndex({ "teacherId": 1 }, { unique: true });
db.teachers.createIndex({ "collegeId": 1 });
db.teachers.createIndex({ "title": 1 });

// 用户会话集合
db.createCollection('user_sessions');
db.user_sessions.createIndex({ "userId": 1 });
db.user_sessions.createIndex({ "expires": 1 }, { expireAfterSeconds: 0 });
db.user_sessions.createIndex({ "sessionId": 1 }, { unique: true });

// 登录日志集合
db.createCollection('login_logs');
db.login_logs.createIndex({ "userId": 1 });
db.login_logs.createIndex({ "loginTime": 1 });
db.login_logs.createIndex({ "ipAddress": 1 });
db.login_logs.createIndex({ "userAgent": 1 });

// 操作日志集合
db.createCollection('operation_logs');
db.operation_logs.createIndex({ "userId": 1 });
db.operation_logs.createIndex({ "timestamp": 1 });
db.operation_logs.createIndex({ "module": 1 });
db.operation_logs.createIndex({ "action": 1 });

// 通知消息集合
db.createCollection('notifications');
db.notifications.createIndex({ "userId": 1 });
db.notifications.createIndex({ "type": 1 });
db.notifications.createIndex({ "isRead": 1 });
db.notifications.createIndex({ "createdAt": 1 });

print('Campus authentication database initialized');

// 切换到数据分析数据库
db = db.getSiblingDB('campus_analytics');

// 学生行为分析集合
db.createCollection('student_activities');
db.student_activities.createIndex({ "studentId": 1 });
db.student_activities.createIndex({ "activityType": 1 });
db.student_activities.createIndex({ "timestamp": 1 });
db.student_activities.createIndex({ "courseId": 1 });

// 课程统计数据集合
db.createCollection('course_statistics');
db.course_statistics.createIndex({ "courseId": 1 });
db.course_statistics.createIndex({ "semester": 1 });
db.course_statistics.createIndex({ "statisticsDate": 1 });

// 系统使用统计集合
db.createCollection('system_usage');
db.system_usage.createIndex({ "date": 1 });
db.system_usage.createIndex({ "module": 1 });
db.system_usage.createIndex({ "userType": 1 });

// 成绩分析数据集合
db.createCollection('grade_analytics');
db.grade_analytics.createIndex({ "courseId": 1 });
db.grade_analytics.createIndex({ "semester": 1 });
db.grade_analytics.createIndex({ "majorId": 1 });
db.grade_analytics.createIndex({ "analysisDate": 1 });

// 图书馆使用统计集合
db.createCollection('library_usage');
db.library_usage.createIndex({ "userId": 1 });
db.library_usage.createIndex({ "bookCategory": 1 });
db.library_usage.createIndex({ "date": 1 });

// 宿舍管理数据集合
db.createCollection('dormitory_logs');
db.dormitory_logs.createIndex({ "studentId": 1 });
db.dormitory_logs.createIndex({ "roomId": 1 });
db.dormitory_logs.createIndex({ "logType": 1 });
db.dormitory_logs.createIndex({ "timestamp": 1 });

print('Campus analytics database initialized');

// 插入示例会话数据
db = db.getSiblingDB('campus_auth');

// 插入示例通知
const sampleNotifications = [
    {
        userId: "S2024001",
        type: "course",
        title: "选课提醒",
        content: "2024年春季学期选课即将开始，请及时登录选课系统进行选课。",
        isRead: false,
        createdAt: new Date(),
        priority: "high"
    },
    {
        userId: "S2024001",
        type: "library",
        title: "图书到期提醒",
        content: "您借阅的《算法导论》将于3天后到期，请及时归还。",
        isRead: false,
        createdAt: new Date(),
        priority: "medium"
    },
    {
        userId: "T2024001",
        type: "course",
        title: "成绩录入提醒",
        content: "请及时录入《程序设计基础》课程的期末成绩。",
        isRead: false,
        createdAt: new Date(),
        priority: "high"
    }
];

db.notifications.insertMany(sampleNotifications);

// 插入示例操作日志
const sampleLogs = [
    {
        userId: "S2024001",
        module: "course",
        action: "view_schedule",
        description: "查看课程表",
        timestamp: new Date(),
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    {
        userId: "S2024001",
        module: "grade",
        action: "view_transcript",
        description: "查看成绩单",
        timestamp: new Date(),
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    {
        userId: "T2024001",
        module: "course",
        action: "input_grade",
        description: "录入学生成绩",
        timestamp: new Date(),
        ipAddress: "192.168.1.101",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }
];

db.operation_logs.insertMany(sampleLogs);

// 插入示例用户数据
const bcrypt = require('bcrypt');
const passwordHash = '$2b$10$rOQ5N1c9dWFMNh2hSvLaYeQDZ5XwGhBbG5zQf7rQP7LCPMSKjzjPC'; // password123

// 插入管理员用户
db.users.insertOne({
  id: "admin001",
  password: passwordHash,
  name: "系统管理员",
  email: "admin@university.edu.cn",
  role: "admin",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
});

// 插入教师用户
const teachers = [
  {
    id: "T2024001",
    password: passwordHash,
    name: "张教授",
    email: "zhang@cs.edu.cn",
    phone: "13800138001",
    role: "teacher",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "T2024002",
    password: passwordHash,
    name: "李老师",
    email: "li@cs.edu.cn",
    phone: "13800138002",
    role: "teacher",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

db.users.insertMany(teachers);

// 插入教师详细信息
db.teachers.insertMany([
  {
    userId: "T2024001",
    teacherId: "T2024001",
    collegeId: 1,
    title: "professor",
    researchArea: "人工智能,机器学习",
    officeLocation: "计算机楼301",
    officeHours: "周一至周五 14:00-17:00",
    hireDate: new Date("2010-09-01"),
    educationBackground: "清华大学计算机科学与技术博士",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    userId: "T2024002",
    teacherId: "T2024002",
    collegeId: 1,
    title: "associate_professor",
    researchArea: "软件工程,数据库系统",
    officeLocation: "计算机楼205",
    officeHours: "周二、周四 15:00-17:00",
    hireDate: new Date("2015-03-01"),
    educationBackground: "北京大学软件工程博士",
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// 插入学生用户
const students = [
  {
    id: "S2024001",
    password: passwordHash,
    name: "王小明",
    email: "wang@student.edu.cn",
    phone: "13900139001",
    role: "student",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "S2024002",
    password: passwordHash,
    name: "李小红",
    email: "li@student.edu.cn",
    phone: "13900139002",
    role: "student",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "S2024003",
    password: passwordHash,
    name: "张小华",
    email: "zhang@student.edu.cn",
    phone: "13900139003",
    role: "student",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

db.users.insertMany(students);

// 插入学生详细信息
db.students.insertMany([
  {
    userId: "S2024001",
    studentId: "2024001001",
    collegeId: 1,
    majorId: 1,
    className: "计科241班",
    grade: 1,
    enrollmentYear: 2024,
    advisorId: "T2024001",
    scholarshipLevel: "none",
    politicalStatus: "league_member",
    hometown: "北京市",
    emergencyContactName: "王父",
    emergencyContactPhone: "13800138888",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    userId: "S2024002",
    studentId: "2024001002",
    collegeId: 1,
    majorId: 2,
    className: "软工241班",
    grade: 1,
    enrollmentYear: 2024,
    advisorId: "T2024002",
    scholarshipLevel: "second",
    politicalStatus: "league_member",
    hometown: "上海市",
    emergencyContactName: "李母",
    emergencyContactPhone: "13800138889",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    userId: "S2024003",
    studentId: "2024001003",
    collegeId: 1,
    majorId: 1,
    className: "计科241班",
    grade: 1,
    enrollmentYear: 2024,
    advisorId: "T2024001",
    scholarshipLevel: "first",
    politicalStatus: "preparatory_party_member",
    hometown: "广东省深圳市",
    emergencyContactName: "张父",
    emergencyContactPhone: "13800138890",
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print('User data inserted into MongoDB');
print('Sample data inserted into campus authentication database');

// 插入分析数据示例
db = db.getSiblingDB('campus_analytics');

// 插入学生活动示例数据
const sampleActivities = [
    {
        studentId: "S2024001",
        activityType: "login",
        timestamp: new Date(),
        metadata: {
            platform: "web",
            duration: 1800 // 30分钟
        }
    },
    {
        studentId: "S2024001",
        activityType: "course_access",
        courseId: 1,
        timestamp: new Date(),
        metadata: {
            action: "view_materials",
            resourceId: "lecture_01.pdf"
        }
    },
    {
        studentId: "S2024002",
        activityType: "library_visit",
        timestamp: new Date(),
        metadata: {
            duration: 7200, // 2小时
            booksViewed: 3,
            booksBorrowed: 1
        }
    }
];

db.student_activities.insertMany(sampleActivities);

// 插入系统使用统计示例
const today = new Date();
const usageStats = [
    {
        date: today,
        module: "authentication",
        userType: "student",
        totalLogins: 156,
        uniqueUsers: 89,
        peakHour: 14,
        averageSessionDuration: 1654
    },
    {
        date: today,
        module: "course_management",
        userType: "teacher",
        totalAccess: 43,
        uniqueUsers: 12,
        peakHour: 10,
        averageSessionDuration: 2341
    },
    {
        date: today,
        module: "grade_management",
        userType: "student",
        totalAccess: 78,
        uniqueUsers: 45,
        peakHour: 20,
        averageSessionDuration: 876
    }
];

db.system_usage.insertMany(usageStats);

print('Sample analytics data inserted');
print('Campus Management System MongoDB initialization completed');