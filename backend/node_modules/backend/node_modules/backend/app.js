import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import trafficRoutes from './routes/traffic.js';
import userRoutes from './routes/user.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/traffic', trafficRoutes);
app.use('/api/users', userRoutes);

// 根路由
app.get('/', (req, res) => {
    res.json({ message: '欢迎使用区块链API' });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({ error: '请求的资源不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});

export default app;