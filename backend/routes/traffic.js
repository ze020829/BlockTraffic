import express from 'express'
const router = express.Router()
import multer from 'multer'
import { create } from 'ipfs-http-client'
import fs from 'fs'
import path from 'path'

// 配置文件上传
const upload = multer({ dest: 'uploads/' })

// 连接到本地 IPFS 节点
const ipfs = create({
  host: 'localhost',
  port: 5001,
  protocol: 'http'
})

// 计算两点间距离（单位：米）
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // 地球半径（米）
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// 上传图片到 IPFS
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' })
    }

    // 读取上传的文件
    const fileData = fs.readFileSync(req.file.path)
    
    // 上传到 IPFS
    const { cid } = await ipfs.add(fileData)
    
    // 记录上传信息
    console.log('文件上传成功：', {
      originalName: req.file.originalname,
      size: req.file.size,
      cid: cid.toString(),
      url: `http://localhost:8080/ipfs/${cid}`
    })
    
    // 删除临时文件
    fs.unlinkSync(req.file.path)
    
    res.json({
      hash: cid.toString(),
      url: `https://ipfs.io/ipfs/${cid}`  // 使用公共网关
    })
  } catch (error) {
    console.error('上传到 IPFS 失败:', error)
    res.status(500).json({ error: '文件上传失败' })
  }
})

// 存储路况信息的 IPFS CID
let trafficCID = null

// 从 IPFS 获取所有路况数据
async function getAllReports() {
  if (!trafficCID) return []
  const chunks = []
  for await (const chunk of ipfs.cat(trafficCID)) {
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString())
}

// 更新 IPFS 中的路况数据
async function updateReports(reports) {
  const { cid } = await ipfs.add(JSON.stringify(reports))
  trafficCID = cid.toString()
  return reports
}

// 获取周边路况（1公里范围内）
router.get('/nearby', async (req, res) => {
  const { lat, lng } = req.query
  
  if (!lat || !lng) {
    return res.status(400).json({ error: '需要提供当前位置坐标' })
  }

  const userLat = parseFloat(lat)
  const userLng = parseFloat(lng)

  try {
    // 从 IPFS 获取所有路况数据
    if (!trafficCID) {
      return res.status(404).json({ error: '尚未存储任何路况数据' });
    }
    
    const chunks = [];
    try {
      for await (const chunk of ipfs.cat(trafficCID)) {
        chunks.push(chunk);
      }
    } catch (error) {
      console.error('IPFS数据获取失败:', error);
      return res.status(500).json({ error: '无法从IPFS获取路况数据' });
    }
    
    const allReports = chunks.length > 0 
      ? JSON.parse(Buffer.concat(chunks).toString())
      : [];

    // 过滤1公里范围内的路况
    const nearbyReports = allReports.filter(report => {
      // 只返回已验证的路况
      if (report.status !== 'verified') return false
      
      // 计算距离
      const [reportLng, reportLat] = report.coordinates
      const distance = calculateDistance(userLat, userLng, reportLat, reportLng)
      
      // 返回1公里范围内的路况
      return distance <= 1000
    })

    res.json(nearbyReports)
  } catch (error) {
    console.error('从 IPFS 获取路况数据失败:', error)
    res.status(500).json({ error: '获取路况数据失败' })
  }
})

// 提交路况信息
router.post('/', async (req, res) => {
  try {
    const trafficInfo = {
      id: Date.now(),
      ...req.body,
      status: 'pending',
      verifications: 0,
      verifiedBy: [],
      createdAt: new Date(),
      imageUrl: req.body.imageUrl,
      location: req.body.location, // 地点名称
      coordinates: req.body.coordinates // [经度, 纬度]
    }

    const existingReports = await getAllReports()
    const updatedReports = await updateReports([...existingReports, trafficInfo])
    
    res.json(trafficInfo)
  } catch (error) {
    console.error('提交路况信息失败:', error)
    res.status(500).json({ error: '提交路况信息失败' })
  }
})

// 获取待验证的路况信息
router.get('/pending', async (req, res) => {
  try {
    const allReports = await getAllReports()
    const pendingReports = allReports.filter(
      report => report.status === 'pending'
    )
    res.json(pendingReports)
  } catch (error) {
    console.error('获取待验证路况失败:', error)
    res.status(500).json({ error: '获取待验证路况失败' })
  }
})

// 验证路况信息
router.post('/:id/verify', async (req, res) => {
  try {
    const { userId } = req.body
    const allReports = await getAllReports()
    const report = allReports.find(r => r.id === Number(req.params.id))
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' })
    }

    // 防止重复验证
    if (report.verifiedBy.includes(userId)) {
      return res.status(400).json({ error: 'Already verified by this user' })
    }

    report.verifications += 1
    report.verifiedBy.push(userId)

    // 如果达到5次验证
    if (report.verifications >= 5) {
      report.status = 'verified'
    }

    // 更新 IPFS 中的数据
    await updateReports(allReports)
    
    res.json(report)
  } catch (error) {
    console.error('验证路况信息失败:', error)
    res.status(500).json({ error: '验证路况信息失败' })
  }
})

export default router
