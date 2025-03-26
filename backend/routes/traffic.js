import express from 'express'
import FabricUtils from '../utils/fabric-utils.js'
import IPFSUtils from '../utils/ipfs-utils.js'
import path from 'path'
import fs from 'fs'
import { Wallets } from 'fabric-network'
import { fileURLToPath } from 'url'
import multer from 'multer'

// 在 ES 模块中定义 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router()

// 设置路由前缀
router.prefix = '/traffic'

// 配置文件上传
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
});

// 获取模拟数据
function getMockData() {
    try {
        const mockDataPath = path.join(__dirname, '..', 'data', 'traffic.json');
        if (fs.existsSync(mockDataPath)) {
            const data = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
            return data;
        }
        // 如果文件不存在，返回空数据结构
        console.log('找不到路况数据文件，返回空的路况数据结构');
        return { verified: [], pending: [] };
    } catch (error) {
        console.error('获取数据失败:', error);
        return { verified: [], pending: [] };
    }
}

// 保存模拟数据
function saveMockData(data) {
    try {
        const mockDataPath = path.join(__dirname, '..', 'data', 'traffic.json');
        const dataDir = path.dirname(mockDataPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(mockDataPath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('保存数据失败:', error);
        return false;
    }
}

// 初始化数据
let mockTrafficData = getMockData();

// 初始化Fabric工具类
let initialized = false
async function initializeFabric() {
    if (!initialized) {
        try {
            await FabricUtils.retryInitialize()
            initialized = true
            console.log('Fabric工具类初始化成功')
            return true
        } catch (error) {
            console.error('Fabric工具类初始化失败:', error)
            // 不抛出错误，避免影响其他功能
            return false
        }
    }
    return initialized
}

// 首页路由
router.get('/', async (req, res) => {
    const trafficDb = getMockData();
    return res.json({
        verified: trafficDb.verified,
        pending: trafficDb.pending
    });
});

// 获取待确认的交通信息
router.get('/pending', async (req, res) => {
    try {
        // 从本地缓存获取数据
        const trafficData = getMockData();
        
        // 返回所有待验证的路况信息
        res.json({
            success: true, 
            data: trafficData.pending,
            message: '获取待确认路况信息成功'
        });
    } catch (error) {
        console.error('获取待确认路况信息失败:', error);
        res.status(500).json({ 
            error: '获取待确认路况信息失败', 
            message: error.message,
            success: false
        });
    }
});

// 获取附近的路况信息
router.get('/nearby', async (req, res) => {
    const { lat, lng, radius = 10 } = req.query;
    
    if (!lat || !lng) {
        return res.status(400).json({ success: false, error: '缺少位置参数' });
    }
    
    try {
        const userPosition = { lat: parseFloat(lat), lng: parseFloat(lng) };
        const trafficDb = getMockData();
        
        // 简单的距离过滤，未来可以使用更复杂的地理位置查询
        const nearbyTraffic = [...trafficDb.verified, ...trafficDb.pending].filter(item => {
            if (!item.position) return false;
            
            // 简单的距离计算，未来可以改进
            const distance = Math.sqrt(
                Math.pow(userPosition.lat - item.position.lat, 2) + 
                Math.pow(userPosition.lng - item.position.lng, 2)
            ) * 111; // 粗略的公里换算
            
            return distance <= radius;
        });
        
        return res.json({
            success: true,
            data: nearbyTraffic
        });
    } catch (error) {
        console.error('获取附近路况信息失败:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 验证路况信息
router.post('/verify', async (req, res) => {
    console.log('收到验证路况信息请求:', req.body);
    const { hash, userId, verified = true } = req.body;
    
    if (!hash || !userId) {
        console.log('验证请求缺少必要参数:', { hash, userId });
        return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    try {
        // 从本地数据中查找
        const trafficDb = getMockData();
        const pendingIndex = trafficDb.pending.findIndex(item => item.hash === hash);
        
        if (pendingIndex === -1) {
            console.log(`未找到hash为${hash}的待验证路况信息`);
            return res.status(404).json({ success: false, error: '未找到待验证的路况信息' });
        }
        
        const trafficInfo = trafficDb.pending[pendingIndex];
        console.log('找到待验证路况信息:', { id: trafficInfo.id, hash: trafficInfo.hash });
        
        // 模拟用户奖励逻辑（不再尝试区块链记录）
        console.log(`用户 ${userId} 验证了路况信息 ${hash}, 验证结果: ${verified}`);
        
        if (verified) {
            // 初始化或更新验证用户列表
            if (!trafficInfo.verifiedBy) {
                trafficInfo.verifiedBy = [];
            }
            
            // 检查用户是否已经验证过
            if (trafficInfo.verifiedBy.includes(userId)) {
                console.log(`用户 ${userId} 已经验证过路况信息 ${hash}`);
                return res.json({
                    success: true,
                    message: '您已经验证过该路况信息',
                    data: {
                        hash,
                        verifiedBy: trafficInfo.verifiedBy,
                        verificationCount: trafficInfo.verifiedBy.length
                    }
                });
            }
            
            // 添加到验证用户列表
            trafficInfo.verifiedBy.push(userId);
            console.log(`路况信息 ${hash} 当前验证人数: ${trafficInfo.verifiedBy.length}`);
            
            // 验证人数达到5人，移至已验证列表
            if (trafficInfo.verifiedBy.length >= 5) {
                console.log(`路况信息 ${hash} 已达到5人验证，移至已验证列表`);
                // 从pending移除
                trafficDb.pending.splice(pendingIndex, 1);
                
                // 添加到verified列表
                trafficDb.verified.push({
                    ...trafficInfo,
                    status: 'verified',
                    verifiedAt: Date.now()
                });
                
                saveMockData(trafficDb);
                console.log(`路况信息 ${hash} 已成功验证并移至已验证列表`);
                
                return res.json({
                    success: true,
                    message: '路况信息已成功验证，感谢您的参与',
                    data: {
                        hash,
                        verifiedBy: trafficInfo.verifiedBy,
                        verificationCount: trafficInfo.verifiedBy.length,
                        verified: true,
                        verifiedAt: Date.now(),
                        reward: {
                            tokens: 2,
                            reputation: 1
                        }
                    }
                });
            } else {
                // 未达到5人验证，更新pending列表中的记录
                trafficDb.pending[pendingIndex] = trafficInfo;
                saveMockData(trafficDb);
                console.log(`路况信息 ${hash} 已收到用户 ${userId} 的验证，当前验证人数: ${trafficInfo.verifiedBy.length}`);
                
                return res.json({
                    success: true,
                    message: `感谢您的验证，当前已有 ${trafficInfo.verifiedBy.length} 人验证，需要5人验证才能最终确认`,
                    data: {
                        hash,
                        verifiedBy: trafficInfo.verifiedBy,
                        verificationCount: trafficInfo.verifiedBy.length,
                        reward: {
                            tokens: 1,
                            reputation: 0.5
                        }
                    }
                });
            }
        } else {
            // 用户否决该路况信息
            // 仅从pending移除，不添加到verified
            trafficDb.pending.splice(pendingIndex, 1);
            saveMockData(trafficDb);
            console.log(`路况信息 ${hash} 被用户 ${userId} 否决并从待验证列表移除`);
            
            return res.json({
                success: true,
                message: '路况信息已被否决',
                data: { hash }
            });
        }
    } catch (error) {
        console.error('验证路况信息失败:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 创建测试路由
router.post('/test', async (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({ success: false, error: '缺少用户ID' });
    }
    
    try {
        // 创建测试数据
        const testData = {
            userId,
            type: 'test',
            description: '这是一条测试数据',
            location: '测试位置',
            position: { lat: 30.5728, lng: 104.0668 },
            timestamp: Date.now()
        };
        
        // 上传到IPFS
        const result = await IPFSUtils.uploadJSON(testData);
        
        if (!result.success) {
            return res.status(500).json({ success: false, error: `上传到IPFS失败: ${result.error}` });
        }
        
        // 保存到本地数据
        const trafficDb = getMockData();
        trafficDb.pending.push({
            hash: result.hash,
            userId,
            type: 'test',
            location: '测试位置',
            position: { lat: 30.5728, lng: 104.0668 },
            timestamp: Date.now()
        });
        saveMockData(trafficDb);
        
        return res.json({
            success: true,
            message: '测试数据已保存到IPFS',
            data: {
                hash: result.hash,
                url: `/api/traffic/${result.hash}`
            }
        });
    } catch (error) {
        console.error('创建测试数据失败:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 上传路况信息
router.post('/upload', upload.single('image'), async (req, res) => {
    console.log('收到交通信息上传请求');
    console.log('文件:', req.file ? '已上传图片' : '无图片');
    console.log('请求体:', req.body);
    
    // 检查必要参数
    const { location, type, userId } = req.body;
    if (!location || !type || !userId) {
        console.log('缺少必要参数:', { location, type, userId });
        return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    // 处理position参数，支持字符串和对象格式
    let position = req.body.position;
    if (position && typeof position === 'string') {
        try {
            position = JSON.parse(position);
        } catch (e) {
            console.log('position参数解析失败:', position);
        }
    }
    
    // 准备要上传的数据
    const trafficData = {
        userId,
        type,
        description: req.body.description || '',
        location,
        position,
        timestamp: Date.now()
    };
    
    // 如果有图片文件，添加到数据中
    if (req.file) {
        console.log(`添加图片数据，大小: ${req.file.size} 字节`);
        trafficData.image = req.file.buffer;
    }
    
    console.log('准备上传到IPFS的数据:', { ...trafficData, image: trafficData.image ? '图片数据...' : undefined });
    
    try {
        // 上传到IPFS
        const ipfsResult = await IPFSUtils.uploadTrafficInfo(trafficData);
        
        if (!ipfsResult.success) {
            console.log('IPFS上传失败:', ipfsResult.error);
            return res.status(500).json({ success: false, error: `IPFS上传失败: ${ipfsResult.error}` });
        }
        
        console.log('IPFS上传成功:', { hash: ipfsResult.hash, imageHash: ipfsResult.imageHash });
        
        // 保存到本地数据 (可选，用于缓存和快速访问)
        const localData = {
            id: ipfsResult.hash, // 添加id字段，使用hash作为id
            hash: ipfsResult.hash,
            userId,
            type,
            location,
            position,
            timestamp: Date.now(),
            imageHash: ipfsResult.imageHash
        };
        
        // 保存到本地数据存储
        const trafficDb = getMockData();
        trafficDb.pending.push(localData);
        saveMockData(trafficDb);
        console.log(`路况信息已保存到本地数据, id/hash: ${localData.hash}`);
        
        // 返回成功响应
        return res.json({
            success: true,
            message: '交通信息已成功保存到IPFS',
            data: {
                id: ipfsResult.hash, // 添加id字段
                hash: ipfsResult.hash,
                url: `/api/traffic/${ipfsResult.hash}`
            }
        });
    } catch (error) {
        console.error('处理上传时发生错误:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 获取用户路况信息历史
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: '缺少用户ID'
            });
        }
        
        // 从本地数据获取用户路况信息
        const trafficDb = getMockData();
        const userTraffic = [
            ...trafficDb.pending.filter(item => item.userId === userId),
            ...trafficDb.verified.filter(item => item.userId === userId)
        ];
        
        if (userTraffic.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: '未找到用户提交的路况信息'
            });
        }
        
        return res.json({
            success: true,
            data: userTraffic
        });
    } catch (error) {
        console.error('获取用户路况信息历史失败:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 管理员直接确认路况信息
router.post('/admin-verify', async (req, res) => {
    console.log('收到管理员确认路况信息请求:', req.body);
    try {
        const { hash, adminId } = req.body;
        
        if (!hash || !adminId) {
            console.log('管理员确认请求缺少必要参数:', { hash, adminId });
            return res.status(400).json({ success: false, error: '缺少必要参数' });
        }
        
        // 确认管理员身份
        if (adminId !== 'admin') {
            console.log(`用户 ${adminId} 尝试进行管理员操作但不是管理员`);
            return res.status(403).json({ success: false, error: '只有管理员可以执行此操作' });
        }
        
        // 从本地数据中查找
        const trafficDb = getMockData();
        const pendingIndex = trafficDb.pending.findIndex(item => item.hash === hash);
        
        if (pendingIndex === -1) {
            console.log(`未找到hash为${hash}的待验证路况信息`);
            return res.status(404).json({ success: false, error: '未找到待验证的路况信息' });
        }
        
        const trafficInfo = trafficDb.pending[pendingIndex];
        console.log('找到待验证路况信息:', { id: trafficInfo.id, hash: trafficInfo.hash });
        
        // 初始化verifiedBy数组（如果不存在）
        if (!trafficInfo.verifiedBy) {
            trafficInfo.verifiedBy = [];
        }
        
        // 确保管理员ID在verifiedBy列表中
        if (!trafficInfo.verifiedBy.includes(adminId)) {
            trafficInfo.verifiedBy.push(adminId);
        }
        
        // 从pending移到verified
        trafficDb.pending.splice(pendingIndex, 1);
        trafficDb.verified.push({
            ...trafficInfo,
            status: 'verified',
            verifiedBy: trafficInfo.verifiedBy,
            verifiedAt: Date.now(),
            adminVerified: true
        });
        
        // 保存更新的数据
        saveMockData(trafficDb);
        console.log(`路况信息 ${hash} 被管理员 ${adminId} 直接确认并移至已验证列表`);
        
        return res.json({
            success: true,
            message: '管理员已直接确认路况信息',
            data: {
                hash,
                verifiedBy: trafficInfo.verifiedBy,
                verificationCount: trafficInfo.verifiedBy.length,
                verifiedAt: Date.now(),
                adminVerified: true
            }
        });
    } catch (error) {
        console.error('管理员确认路况信息失败:', error);
        return res.status(500).json({ 
            success: false,
            error: error.message
        });
    }
});

// 获取指定哈希的路况信息 - 必须放在最后，否则会拦截其他路由
router.get('/:hash', async (req, res) => {
    const { hash } = req.params;
    
    if (!hash) {
        return res.status(400).json({ success: false, error: '缺少哈希参数' });
    }
    
    try {
        // 从IPFS获取数据
        const result = await IPFSUtils.getTrafficInfo(hash);
        
        if (!result.success) {
            return res.status(404).json({ success: false, error: `未找到指定的路况信息: ${result.error}` });
        }
        
        // 不返回图片数据，而是提供URL
        const { imageData, ...trafficInfo } = result.data;
        
        return res.json({
            success: true,
            data: {
                ...trafficInfo,
                imageUrl: imageData ? `/api/traffic/${hash}/image` : null
            }
        });
    } catch (error) {
        console.error('获取路况信息失败:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 获取指定哈希的路况图片
router.get('/:hash/image', async (req, res) => {
    const { hash } = req.params;
    
    if (!hash) {
        return res.status(400).json({ success: false, error: '缺少哈希参数' });
    }
    
    try {
        // 从IPFS获取完整数据
        const result = await IPFSUtils.getTrafficInfo(hash);
        
        if (!result.success || !result.data.imageData) {
            return res.status(404).json({ success: false, error: '未找到指定的图片' });
        }
        
        // 设置正确的内容类型并返回图片
        res.setHeader('Content-Type', 'image/jpeg');
        return res.send(result.data.imageData);
    } catch (error) {
        console.error('获取路况图片失败:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router

// 重要说明：路由顺序非常关键
// 具体路由 (如 '/verify', '/pending') 必须在通配符路由 (如 '/:hash') 之前定义
// 否则，通配符路由会捕获所有请求，导致具体路由无法访问
