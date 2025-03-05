import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 路由
import trafficRoutes from './routes/traffic.js';
import userRoutes from './routes/user.js';

app.use('/api/traffic', trafficRoutes);
app.use('/api/user', userRoutes);

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
