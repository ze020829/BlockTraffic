import express from 'express'
import FabricUtils from '../utils/fabric-utils.js'
import { registerUser } from '../scripts/registerUser.js'
import path from 'path'
import { Wallets } from 'fabric-network'

const router = express.Router()

// 初始化Fabric工具类
let initialized = false;
async function initializeFabric() {
    if (!initialized) {
        try {
            await FabricUtils.initialize();
            initialized = true;
            console.log('Fabric工具类初始化成功');
        } catch (error) {
            console.error('Fabric工具类初始化失败:', error);
            throw error;
        }
    }
}

// 注册新用户（通过Fabric CA）
router.post('/register', async (req, res) => {
    try {
        const { userId, userRole = 'user' } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: '缺少用户ID' });
        }
        
        // 调用注册函数
        const result = await registerUser(userId, userRole);
        
        if (result.success) {
            res.status(201).json({
                success: true,
                message: result.message,
                userId,
                role: userRole,
                certificateAvailable: !!result.certificate
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('注册用户失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 获取用户信息（从区块链获取）
router.get('/info/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // 从区块链获取用户信息
        await initializeFabric();
        
        try {
            const contract = await FabricUtils.getContract();
            
            // 调用链码获取用户信息
            const result = await contract.evaluateTransaction('GetUserCredentials', userId);
            const userCredentials = JSON.parse(result.toString());
            
            // 检查用户是否有证书
            const walletPath = path.join(process.cwd(), 'wallet');
            const wallet = await Wallets.newFileSystemWallet(walletPath);
            const identity = await wallet.get(userId);
            
            // 返回用户信息
            res.json({
                ...userCredentials,
                hasIdentity: !!identity,
                role: userId === 'admin' ? 'admin' : 'user'
            });
        } catch (error) {
            console.error('获取用户信息失败:', error);
            res.status(404).json({ 
                error: '用户不存在',
                hasIdentity: false
            });
        }
    } catch (error) {
        console.error('获取用户信息失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 更新用户关键信息（信誉度和代币）
router.post('/update-credentials', async (req, res) => {
    try {
        const { userId, reputation, tokens } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: '缺少用户ID' });
        }
        
        // 更新区块链上的用户关键信息
        await initializeFabric();
        
        try {
            const contract = await FabricUtils.getContract();
            
            // 调用链码更新用户关键信息
            await contract.submitTransaction(
                'UpdateUserCredentials',
                userId,
                reputation.toString(),
                tokens.toString()
            );
            
            res.json({ 
                message: '用户关键信息更新成功',
                userId,
                credentials: {
                    reputation: parseInt(reputation),
                    tokens: parseInt(tokens)
                },
                blockchainSync: true
            });
        } catch (error) {
            console.error('更新用户信息失败:', error);
            res.status(500).json({ 
                error: error.message,
                blockchainSync: false
            });
        }
    } catch (error) {
        console.error('更新用户关键信息失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 获取所有用户关键信息
router.get('/all-credentials', async (req, res) => {
    try {
        // 从区块链获取所有用户关键信息
        await initializeFabric();
        
        try {
            const contract = await FabricUtils.getContract();
            
            // 调用链码获取所有用户关键信息
            const result = await contract.evaluateTransaction('GetAllUserCredentials');
            const usersCredentials = JSON.parse(result.toString());
            
            res.json(usersCredentials);
        } catch (error) {
            console.error('获取所有用户信息失败:', error);
            res.status(500).json({ error: error.message });
        }
    } catch (error) {
        console.error('获取所有用户关键信息失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 获取用户身份信息
router.get('/identity/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // 获取钱包
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        // 获取用户身份
        const identity = await wallet.get(userId);
        
        if (!identity) {
            return res.status(404).json({ 
                error: `用户 ${userId} 的身份不存在`,
                hasIdentity: false
            });
        }
        
        // 返回身份信息
        res.json({
            userId,
            hasIdentity: true,
            certificateAvailable: true,
            certificateSubject: '证书主题信息' // 实际应用中应从证书中提取
        });
    } catch (error) {
        console.error('获取用户身份信息失败:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router
