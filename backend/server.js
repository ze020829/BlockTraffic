const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 路由
const trafficRoutes = require('./routes/traffic');
const userRoutes = require('./routes/user');

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