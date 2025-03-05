import express from 'express'
const router = express.Router()

// 获取用户信息
router.get('/info', (req, res) => {
  res.json({
    reputation: 80,
    tokens: 100
  })
})

// 获取提交历史
router.get('/submissions', (req, res) => {
  res.json([
    {
      id: 1,
      type: 'congestion',
      location: '北京市海淀区中关村大街',
      status: 'success',
      reward: 10,
      timestamp: Date.now() - 86400000
    }
  ])
})

// 获取确认历史
router.get('/verifications', (req, res) => {
  res.json([
    {
      id: 1,
      type: 'accident',
      location: '北京市朝阳区建国路',
      result: 'correct',
      reputation: 5,
      timestamp: Date.now() - 43200000
    }
  ])
})

export default router
