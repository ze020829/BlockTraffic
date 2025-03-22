import mongoose from 'mongoose';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 连接MongoDB数据库
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/BlockTraffic';
    const connection = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log(`MongoDB数据库连接成功: ${connection.connection.host}`);
    return true;
  } catch (error) {
    console.error(`MongoDB数据库连接失败: ${error.message}`);
    return false;
  }
};

/**
 * 关闭MongoDB连接
 */
const closeDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB数据库连接已关闭');
    return true;
  } catch (error) {
    console.error(`关闭MongoDB连接失败: ${error.message}`);
    return false;
  }
};

export { connectDB, closeDB }; 