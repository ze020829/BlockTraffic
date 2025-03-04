const express = require('express')
const router = express.Router()

// 获取周边路况
router.get('/nearby', (req, res) => {
  // 暂时返回模拟数据
  const mockData = [
    {
      id: 1,
      type: 'congestion',
      location: '北京市海淀区中关村大街',
      description: '早高峰拥堵',
      position: { lng: 116.404, lat: 39.915 },
      status: 'verified',
      timestamp: Date.now() - 3600000
    }
  ]
  res.json(mockData)
})

// 提交路况信息
router.post('/', (req, res) => {
  const trafficInfo = {
    id: Date.now(),
    ...req.body,
    status: 'pending'
  }
  res.json(trafficInfo)
})

// 验证路况信息
router.post('/:id/verify', (req, res) => {
  res.json({ success: true })
})

module.exports = router 