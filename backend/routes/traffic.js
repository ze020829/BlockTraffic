import express from 'express'
import FabricUtils from '../utils/fabric-utils.js'
import path from 'path'
import { Wallets } from 'fabric-network'

const router = express.Router()

// 初始化Fabric工具类
let initialized = false
async function initializeFabric() {
    if (!initialized) {
        try {
            await FabricUtils.initialize()
            initialized = true
            console.log('Fabric工具类初始化成功')
        } catch (error) {
            console.error('Fabric工具类初始化失败:', error)
            throw error
        }
    }
}

// 模拟存储空间
const mockTrafficData = {
    pending: [],  // 待确认的路况
    verified: []  // 已确认的路况
}

// 生成模拟的交通数据
function generateMockTrafficData() {
    const types = ['congestion', 'construction', 'accident', 'normal']
    const descriptions = [
        '道路拥堵，车辆缓慢行驶',
        '前方正在进行道路施工，请绕行',
        '发生交通事故，请谨慎驾驶',
        '道路畅通，可以正常行驶',
        '临时交通管制，请按指示行驶',
        '前方发生车辆故障，占用一条车道',
        '道路积水，请减速慢行',
        '道路结冰，请注意安全'
    ]
    
    const locations = [
        {
            name: '成都市武侯区天府大道',
            position: { lng: 104.0668, lat: 30.5728 }
        },
        {
            name: '成都市锦江区春熙路',
            position: { lng: 104.0817, lat: 30.6571 }
        },
        {
            name: '成都市青羊区人民中路',
            position: { lng: 104.0638, lat: 30.6726 }
        },
        {
            name: '成都市高新区天府软件园',
            position: { lng: 104.0668, lat: 30.5369 }
        },
        {
            name: '成都市双流区双流国际机场',
            position: { lng: 103.9474, lat: 30.5784 }
        }
    ]
    
    // 生成已验证的交通信息
    for (let i = 0; i < 5; i++) {
        const type = types[Math.floor(Math.random() * types.length)]
        const description = descriptions[Math.floor(Math.random() * descriptions.length)]
        const locationData = locations[Math.floor(Math.random() * locations.length)]
        const now = Date.now()
        const timestamp = now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000) // 过去7天内
        
        mockTrafficData.verified.push({
            id: `traffic_${i}`,
            type,
            description,
            location: locationData.name,
            position: locationData.position,
            timestamp,
            status: 'verified',
            verifications: 5,
            verifiedBy: ['user1', 'user2', 'user3', 'user4', 'user5'].slice(0, 5),
            images: [
                {
                name: 'image1.jpg',
                url: 'https://picsum.photos/300/200?random=' + i
                }
            ]
        })
    }
    
    // 生成待验证的交通信息
    for (let i = 0; i < 5; i++) {
        const type = types[Math.floor(Math.random() * types.length)]
        const description = descriptions[Math.floor(Math.random() * descriptions.length)]
        const locationData = locations[Math.floor(Math.random() * locations.length)]
        const now = Date.now()
        const timestamp = now - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000) // 过去3天内
        const verifications = Math.floor(Math.random() * 4) + 1 // 1-4次验证
        
        // 随机选择已验证的用户
        const verifiedUsers = []
        const allUsers = ['user1', 'user2', 'user3', 'user4', 'user5']
        for (let j = 0; j < verifications; j++) {
            const randomIndex = Math.floor(Math.random() * allUsers.length)
            verifiedUsers.push(allUsers[randomIndex])
            allUsers.splice(randomIndex, 1)
        }
        
        mockTrafficData.pending.push({
            id: `pending_${i}`,
            type,
            description,
            location: locationData.name,
            position: locationData.position,
            timestamp,
            status: 'pending',
            verifications,
            verifiedBy: verifiedUsers,
            images: [
                {
                    name: 'image1.jpg',
                    url: 'https://picsum.photos/300/200?random=' + (i + 10)
                }
            ]
        })
    }
}

// 初始化模拟数据
generateMockTrafficData()

// 获取附近的交通信息
router.get('/nearby', async (req, res) => {
    try {
        // 从区块链获取已确认的路况信息
        await initializeFabric()
        
        try {
            const contract = await FabricUtils.getContract()
            
            // 调用链码获取已确认的路况信息
            const result = await contract.evaluateTransaction('GetVerifiedTrafficInfo')
            const trafficInfo = JSON.parse(result.toString())
            
            // 将区块链数据转换为前端格式
            const formattedTraffic = trafficInfo.map(item => ({
                id: item.trafficId,
                type: item.trafficType,
                description: item.description,
                location: item.location,
                position: item.position || { lng: 104.0668, lat: 30.5728 }, // 默认位置
                timestamp: new Date(item.timestamp || item.createdAt).getTime(),
                status: item.status,
                verifications: item.verifications,
                verifiedBy: item.verifiedBy || [],
                images: item.imageHash ? [
                    {
                        name: 'image.jpg',
                        url: `https://ipfs.io/ipfs/${item.imageHash}`
                    }
                ] : [
                    {
                        name: 'image.jpg',
                        url: 'https://picsum.photos/300/200?random=' + Math.floor(Math.random() * 100)
                    }
                ]
            }))
            
            res.json(formattedTraffic)
        } catch (error) {
            console.error('从区块链获取路况信息失败:', error)
            // 如果区块链获取失败，使用模拟数据
            res.json(mockTrafficData.verified)
        }
    } catch (error) {
        console.error('获取附近路况信息失败:', error)
        res.status(500).json({ error: error.message })
    }
})

// 获取待确认的交通信息
router.get('/pending', async (req, res) => {
    try {
        // 从区块链获取待确认的路况信息
        await initializeFabric()
        
        try {
            const contract = await FabricUtils.getContract()
            
            // 调用链码获取待确认的路况信息
            const result = await contract.evaluateTransaction('GetPendingTrafficInfo')
            const trafficInfo = JSON.parse(result.toString())
            
            // 将区块链数据转换为前端格式
            const formattedTraffic = trafficInfo.map(item => ({
                id: item.trafficId,
                type: item.trafficType,
                description: item.description,
                location: item.location,
                position: item.position || { lng: 104.0668, lat: 30.5728 }, // 默认位置
                timestamp: new Date(item.timestamp || item.createdAt).getTime(),
                status: item.status,
                verifications: item.verifications,
                verifiedBy: item.verifiedBy || [],
                images: item.imageHash ? [
                    {
                        name: 'image.jpg',
                        url: `https://ipfs.io/ipfs/${item.imageHash}`
                    }
                ] : [
                    {
                        name: 'image.jpg',
                        url: 'https://picsum.photos/300/200?random=' + Math.floor(Math.random() * 100)
                    }
                ]
            }))
            
            res.json(formattedTraffic)
        } catch (error) {
            console.error('从区块链获取待确认路况信息失败:', error)
            // 如果区块链获取失败，使用模拟数据
            res.json(mockTrafficData.pending)
        }
    } catch (error) {
        console.error('获取待确认路况信息失败:', error)
        res.status(500).json({ error: error.message })
    }
})

// 提交新的交通信息
router.post('/submit', async (req, res) => {
    try {
        const { userId, type, description, location, position, image } = req.body
        
        if (!userId || !type || !description || !location) {
            return res.status(400).json({ error: '缺少必要参数' })
        }
        
        // 生成唯一ID
        const trafficId = `traffic_${Date.now()}_${Math.floor(Math.random() * 1000)}`
        
        // 将路况信息提交到区块链
        await initializeFabric()
        
        try {
            const contract = await FabricUtils.getContract()
            
            // 检查用户身份
            const walletPath = path.join(process.cwd(), 'wallet')
            const wallet = await Wallets.newFileSystemWallet(walletPath)
            const identity = await wallet.get(userId)
            
            if (!identity) {
                throw new Error(`用户 ${userId} 没有有效的区块链身份`)
            }
            
            // 调用链码提交路况信息
            const imageHash = image ? 'QmExample123456789' : '' // 实际应用中应使用IPFS上传并获取哈希
            const timestamp = Date.now()
            
            const result = await contract.submitTransaction(
                'SubmitTrafficInfo',
                trafficId,
                userId,
                type,
                location,
                description,
                timestamp.toString(),
                imageHash
            )
            
            const trafficInfo = JSON.parse(result.toString())
            
            // 将区块链数据转换为前端格式
            const formattedTraffic = {
                id: trafficInfo.trafficId,
                type: trafficInfo.trafficType,
                description: trafficInfo.description,
                location: trafficInfo.location,
                position: position || { lng: 104.0668, lat: 30.5728 },
                timestamp: timestamp,
                status: trafficInfo.status,
                verifications: trafficInfo.verifications,
                verifiedBy: trafficInfo.verifiedBy || [],
                images: imageHash ? [
                    {
                        name: 'image.jpg',
                        url: `https://ipfs.io/ipfs/${imageHash}`
                    }
                ] : []
            }
            
            // 添加到本地缓存
            mockTrafficData.pending.push(formattedTraffic)
            
            res.status(201).json({
                message: '路况信息提交成功',
                trafficInfo: formattedTraffic,
                blockchainSync: true
            })
        } catch (error) {
            console.error('提交路况信息到区块链失败:', error)
            
            // 如果区块链提交失败，仍创建本地记录
            const newTraffic = {
                id: trafficId,
                type,
                description,
                location,
                position: position || { lng: 104.0668, lat: 30.5728 },
                timestamp: Date.now(),
                status: 'pending',
                verifications: 0,
                verifiedBy: [],
                images: image ? [
                    {
                        name: 'image.jpg',
                        url: image
                    }
                ] : []
            }
            
            // 添加到本地缓存
            mockTrafficData.pending.push(newTraffic)
            
            res.json({
                message: '路况信息已本地保存，但未能同步到区块链',
                trafficInfo: newTraffic,
                blockchainSync: false,
                blockchainError: error.message
            })
        }
    } catch (error) {
        console.error('提交路况信息失败:', error)
        res.status(500).json({ error: error.message })
    }
})

// 确认路况信息
router.post('/verify', async (req, res) => {
    try {
        const { trafficId, userId } = req.body
        
        if (!trafficId || !userId) {
            return res.status(400).json({ error: '缺少必要参数' })
        }
        
        // 将确认信息提交到区块链
        await initializeFabric()
        
        try {
            const contract = await FabricUtils.getContract()
            
            // 检查用户身份
            const walletPath = path.join(process.cwd(), 'wallet')
            const wallet = await Wallets.newFileSystemWallet(walletPath)
            const identity = await wallet.get(userId)
            
            if (!identity) {
                throw new Error(`用户 ${userId} 没有有效的区块链身份`)
            }
            
            // 调用链码确认路况信息
            const result = await contract.submitTransaction(
                'VerifyTrafficInfo',
                trafficId,
                userId
            )
            
            const trafficInfo = JSON.parse(result.toString())
            
            // 将区块链数据转换为前端格式
            const formattedTraffic = {
                id: trafficInfo.trafficId,
                type: trafficInfo.trafficType,
                description: trafficInfo.description,
                location: trafficInfo.location,
                timestamp: new Date(trafficInfo.timestamp || trafficInfo.createdAt).getTime(),
                status: trafficInfo.status,
                verifications: trafficInfo.verifications,
                verifiedBy: trafficInfo.verifiedBy || []
            }
            
            // 更新本地缓存
            const pendingIndex = mockTrafficData.pending.findIndex(item => item.id === trafficId)
            
            if (pendingIndex !== -1) {
                // 如果状态变为已确认，移动到已确认列表
                if (trafficInfo.status === 'verified') {
                    const verifiedTraffic = mockTrafficData.pending.splice(pendingIndex, 1)[0]
                    verifiedTraffic.status = 'verified'
                    verifiedTraffic.verifications = trafficInfo.verifications
                    verifiedTraffic.verifiedBy = trafficInfo.verifiedBy
                    mockTrafficData.verified.push(verifiedTraffic)
                } else {
                    // 否则更新待确认列表
                    mockTrafficData.pending[pendingIndex].verifications = trafficInfo.verifications
                    mockTrafficData.pending[pendingIndex].verifiedBy = trafficInfo.verifiedBy
                }
            }
            
            res.json({
                message: trafficInfo.status === 'verified' ? '路况信息已完成确认' : '路况信息确认成功',
                trafficInfo: formattedTraffic,
                reward: {
                    tokens: trafficInfo.status === 'verified' ? 5 : 2,
                    reputation: trafficInfo.status === 'verified' ? 2 : 1
                },
                blockchainSync: true
            })
        } catch (error) {
            console.error('确认路况信息到区块链失败:', error)
            
            // 如果区块链确认失败，仍更新本地记录
            const pendingIndex = mockTrafficData.pending.findIndex(item => item.id === trafficId)
            
            if (pendingIndex === -1) {
                return res.status(404).json({ error: '未找到待确认的路况信息' })
            }
            
            // 检查用户是否已确认
            if (mockTrafficData.pending[pendingIndex].verifiedBy.includes(userId)) {
                return res.status(400).json({ error: '您已经确认过此路况信息' })
            }
            
            // 更新本地确认信息
            mockTrafficData.pending[pendingIndex].verifications += 1
            mockTrafficData.pending[pendingIndex].verifiedBy.push(userId)
            
            // 如果确认次数达到5，移动到已确认列表
            if (mockTrafficData.pending[pendingIndex].verifications >= 5) {
                const verifiedTraffic = mockTrafficData.pending.splice(pendingIndex, 1)[0]
                verifiedTraffic.status = 'verified'
                mockTrafficData.verified.push(verifiedTraffic)
                
                res.json({
                    message: '路况信息已完成确认（仅本地记录）',
                    trafficInfo: verifiedTraffic,
                    reward: {
                        tokens: 5,
                        reputation: 2
                    },
                    blockchainSync: false,
                    blockchainError: error.message
                })
            } else {
                res.json({
                    message: '路况信息确认成功（仅本地记录）',
                    trafficInfo: mockTrafficData.pending[pendingIndex],
                    reward: {
                        tokens: 2,
                        reputation: 1
                    },
                    blockchainSync: false,
                    blockchainError: error.message
                })
            }
        }
    } catch (error) {
        console.error('确认路况信息失败:', error)
        res.status(500).json({ error: error.message })
    }
})

// 管理员直接确认路况信息
router.post('/admin-verify', async (req, res) => {
    try {
        const { trafficId, adminId } = req.body
        
        if (!trafficId || !adminId) {
            return res.status(400).json({ error: '缺少必要参数' })
        }
        
        // 确认管理员身份
        if (adminId !== 'admin') {
            return res.status(403).json({ error: '只有管理员可以执行此操作' })
        }
        
        // 将确认信息提交到区块链
        await initializeFabric()
        
        try {
            const contract = await FabricUtils.getContract()
            
            // 检查管理员身份
            const walletPath = path.join(process.cwd(), 'wallet')
            const wallet = await Wallets.newFileSystemWallet(walletPath)
            const identity = await wallet.get(adminId)
            
            if (!identity) {
                throw new Error(`管理员 ${adminId} 没有有效的区块链身份`)
            }
            
            // 调用链码确认路况信息
            const result = await contract.submitTransaction(
                'AdminVerifyTrafficInfo',
                trafficId,
                adminId
            )
            
            const trafficInfo = JSON.parse(result.toString())
            
            // 将区块链数据转换为前端格式
            const formattedTraffic = {
                id: trafficInfo.trafficId,
                type: trafficInfo.trafficType,
                description: trafficInfo.description,
                location: trafficInfo.location,
                timestamp: new Date(trafficInfo.timestamp || trafficInfo.createdAt).getTime(),
                status: trafficInfo.status,
                verifications: trafficInfo.verifications,
                verifiedBy: trafficInfo.verifiedBy || []
            }
            
            // 更新本地缓存
            const pendingIndex = mockTrafficData.pending.findIndex(item => item.id === trafficId)
            
            if (pendingIndex !== -1) {
                const verifiedTraffic = mockTrafficData.pending.splice(pendingIndex, 1)[0]
                verifiedTraffic.status = 'verified'
                verifiedTraffic.verifications = 5 // 设置为满足条件
                verifiedTraffic.verifiedBy.push(adminId)
                mockTrafficData.verified.push(verifiedTraffic)
            }
            
            res.json({
                message: '管理员已直接确认路况信息',
                trafficInfo: formattedTraffic,
                blockchainSync: true
            })
        } catch (error) {
            console.error('管理员确认路况信息到区块链失败:', error)
            
            // 如果区块链确认失败，仍更新本地记录
            const pendingIndex = mockTrafficData.pending.findIndex(item => item.id === trafficId)
            
            if (pendingIndex === -1) {
                return res.status(404).json({ error: '未找到待确认的路况信息' })
            }
            
            // 更新本地确认信息
            const verifiedTraffic = mockTrafficData.pending.splice(pendingIndex, 1)[0]
            verifiedTraffic.status = 'verified'
            verifiedTraffic.verifications = 5 // 设置为满足条件
            verifiedTraffic.verifiedBy.push(adminId)
            mockTrafficData.verified.push(verifiedTraffic)
            
            res.json({
                message: '管理员已直接确认路况信息（仅本地记录）',
                trafficInfo: verifiedTraffic,
                blockchainSync: false,
                blockchainError: error.message
            })
        }
    } catch (error) {
        console.error('管理员确认路况信息失败:', error)
        res.status(500).json({ error: error.message })
    }
})

export default router
