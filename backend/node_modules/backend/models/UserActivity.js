import mongoose from 'mongoose';

/**
 * 用户活动模型
 */
const userActivitySchema = new mongoose.Schema({
  // 用户ID
  userId: { 
    type: String, 
    required: true 
  },
  // 活动类型: submission, verification
  activityType: { 
    type: String, 
    enum: ['submission', 'verification'],
    required: true 
  },
  // 相关交通信息ID
  trafficId: { 
    type: String, 
    required: true 
  },
  // 活动时间
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  // 活动详情
  details: {
    type: {
      // 交通类型(针对提交)或验证结果
      type: String,
      required: true
    },
    // 位置名称
    location: {
      type: String,
      required: true
    },
    // 状态(针对提交)
    status: {
      type: String,
      required: true
    },
    // 获得的奖励(如果有)
    reward: {
      tokens: {
        type: Number,
        required: true
      },
      reputation: {
        type: Number,
        required: true
      }
    }
  }
}, {
  timestamps: { 
    createdAt: 'timestamp' 
  }
});

// 创建索引
userActivitySchema.index({ userId: 1 });
userActivitySchema.index({ activityType: 1 });
userActivitySchema.index({ timestamp: -1 });
userActivitySchema.index({ userId: 1, activityType: 1 });

// 创建模型
const UserActivity = mongoose.model('UserActivity', userActivitySchema);

export default UserActivity; 