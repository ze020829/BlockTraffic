import mongoose from 'mongoose';

/**
 * 交通数据模型
 */
const trafficDataSchema = new mongoose.Schema({
  // 交通信息ID，与区块链记录对应
  trafficId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  // 提交用户ID
  userId: { 
    type: String, 
    required: true 
  },
  // 交通类型: congestion, construction, accident, normal
  type: { 
    type: String, 
    enum: ['congestion', 'construction', 'accident', 'normal'],
    required: true 
  },
  // 位置信息
  location: {
    // 位置名称
    name: String,
    // 坐标
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number] // [经度, 纬度]
    },
    // 详细地址
    address: String
  },
  // 详细描述
  description: String,
  // 图片信息
  images: [{
    url: String,     // 图片URL
    ipfsHash: String // IPFS哈希值
  }],
  // 状态: pending, verified, rejected
  status: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending' 
  },
  // 验证记录
  verifications: [{
    userId: String,       // 验证用户ID
    timestamp: Date,      // 验证时间
    result: Boolean       // 验证结果
  }],
  // 已验证用户列表
  verifiedBy: {
    type: [String],
    default: []
  },
  // 验证总数
  verificationCount: { 
    type: Number, 
    default: 0 
  },
  // 区块链交易ID
  blockchainTxId: String,
  // 创建时间
  created: { 
    type: Date, 
    default: Date.now 
  },
  // 更新时间
  updated: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: { 
    createdAt: 'created', 
    updatedAt: 'updated' 
  }
});

// 创建索引
trafficDataSchema.index({ trafficId: 1 }, { unique: true });
trafficDataSchema.index({ userId: 1 });
trafficDataSchema.index({ 'location.coordinates': '2dsphere' });
trafficDataSchema.index({ status: 1 });
trafficDataSchema.index({ created: -1 });

// 创建模型
const TrafficData = mongoose.model('TrafficData', trafficDataSchema);

export default TrafficData; 