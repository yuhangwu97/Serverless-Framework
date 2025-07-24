import mongoose, { Document, Schema } from 'mongoose';

// 用户基础信息接口
export interface IUser extends Document {
  id: string; // 用户ID (学号/工号)
  password: string; // 密码哈希
  name: string; // 姓名
  email: string; // 邮箱
  phone?: string; // 电话
  idCard?: string; // 身份证号
  role: 'student' | 'teacher' | 'admin'; // 角色
  status: 'active' | 'inactive' | 'graduated' | 'suspended'; // 状态
  avatarUrl?: string; // 头像URL
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

// 学生信息接口
export interface IStudent extends Document {
  userId: string; // 关联用户ID
  studentId: string; // 学号
  collegeId: number; // 学院ID
  majorId: number; // 专业ID
  className?: string; // 班级名称
  grade: number; // 年级
  enrollmentYear: number; // 入学年份
  graduationYear?: number; // 毕业年份
  advisorId?: string; // 导师/班主任ID
  dormitoryId?: string; // 宿舍ID
  scholarshipLevel: 'none' | 'first' | 'second' | 'third' | 'national'; // 奖学金等级
  politicalStatus: 'masses' | 'party_member' | 'preparatory_party_member' | 'league_member'; // 政治面貌
  hometown?: string; // 籍贯
  emergencyContactName?: string; // 紧急联系人姓名
  emergencyContactPhone?: string; // 紧急联系人电话
  createdAt: Date;
  updatedAt: Date;
}

// 教师信息接口
export interface ITeacher extends Document {
  userId: string; // 关联用户ID
  teacherId: string; // 工号
  collegeId: number; // 学院ID
  title: 'assistant' | 'lecturer' | 'associate_professor' | 'professor'; // 职称
  researchArea?: string; // 研究领域
  officeLocation?: string; // 办公室位置
  officeHours?: string; // 办公时间
  hireDate?: Date; // 入职日期
  educationBackground?: string; // 教育背景
  awards?: string; // 获奖情况
  createdAt: Date;
  updatedAt: Date;
}

// 用户基础信息模式
const UserSchema: Schema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  phone: {
    type: String,
    sparse: true
  },
  idCard: {
    type: String,
    sparse: true
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'graduated', 'suspended'],
    default: 'active',
    index: true
  },
  avatarUrl: {
    type: String
  },
  lastLoginAt: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'users'
});

// 学生信息模式
const StudentSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  studentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  collegeId: {
    type: Number,
    required: true,
    index: true
  },
  majorId: {
    type: Number,
    required: true,
    index: true
  },
  className: {
    type: String,
    index: true
  },
  grade: {
    type: Number,
    required: true,
    index: true
  },
  enrollmentYear: {
    type: Number,
    required: true,
    index: true
  },
  graduationYear: {
    type: Number
  },
  advisorId: {
    type: String,
    index: true
  },
  dormitoryId: {
    type: String
  },
  scholarshipLevel: {
    type: String,
    enum: ['none', 'first', 'second', 'third', 'national'],
    default: 'none'
  },
  politicalStatus: {
    type: String,
    enum: ['masses', 'party_member', 'preparatory_party_member', 'league_member'],
    default: 'masses'
  },
  hometown: {
    type: String
  },
  emergencyContactName: {
    type: String
  },
  emergencyContactPhone: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'students'
});

// 教师信息模式
const TeacherSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  teacherId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  collegeId: {
    type: Number,
    required: true,
    index: true
  },
  title: {
    type: String,
    enum: ['assistant', 'lecturer', 'associate_professor', 'professor'],
    required: true,
    index: true
  },
  researchArea: {
    type: String
  },
  officeLocation: {
    type: String
  },
  officeHours: {
    type: String
  },
  hireDate: {
    type: Date
  },
  educationBackground: {
    type: String
  },
  awards: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'teachers'
});

// 导出模型
export const User = mongoose.model<IUser>('User', UserSchema);
export const Student = mongoose.model<IStudent>('Student', StudentSchema);
export const Teacher = mongoose.model<ITeacher>('Teacher', TeacherSchema);