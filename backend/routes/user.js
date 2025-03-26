import express from 'express'
import FabricUtils from '../utils/fabric-utils.js'
import path from 'path'
import { Wallets } from 'fabric-network'
// 使用server.js中定义的函数而不是单独的脚本
import { enrollAdmin, registerUser, wallet } from '../server.js'

const router = express.Router()

let fabricUtils = null;

// 初始化 Fabric 工具类
async function initializeFabric() {
    if (!fabricUtils) {
        fabricUtils = new FabricUtils();
        try {
            await fabricUtils.retryInitialize();
        } catch (error) {
            console.error('初始化 Fabric 失败:', error);
            throw error;
        }
    }
    return fabricUtils;
}

// 注册管理员
router.post('/enroll-admin', async (req, res) => {
    try {
        // 检查管理员是否已存在
        const adminExists = await wallet.get('admin');
        if (adminExists) {
            return res.json({ 
                success: true, 
                message: '管理员身份已存在',
                alreadyExists: true
            });
        }

        // 注册管理员
        await enrollAdmin();
        res.json({ 
            success: true, 
            message: '管理员注册成功',
            alreadyExists: false
        });
    } catch (error) {
        console.error('注册管理员失败:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// 注册新用户
router.post('/register', async (req, res) => {
    try {
        const { userId, userSecret } = req.body;
        if (!userId) {
            return res.status(400).json({ error: '缺少必要的参数 userId' });
        }

        // 检查管理员是否存在
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            return res.status(400).json({ 
                error: '管理员身份不存在，请先注册管理员',
                adminRequired: true
            });
        }

        // 注册用户
        await registerUser(userId);
        res.json({ 
            success: true,
            message: '用户注册成功' 
        });
    } catch (error) {
        console.error('注册用户失败:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// 获取用户信息
router.get('/info/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const fabric = await initializeFabric();
        
        const result = await fabric.contract.evaluateTransaction('queryUser', userId);
        res.json(JSON.parse(result.toString()));
    } catch (error) {
        console.error('获取用户信息失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 更新用户凭证
router.post('/update-credentials', async (req, res) => {
    try {
        const { userId, newSecret } = req.body;
        if (!userId || !newSecret) {
            return res.status(400).json({ error: '缺少必要的参数' });
        }

        const fabric = await initializeFabric();
        await fabric.contract.submitTransaction('updateUserCredentials', userId, newSecret);
        res.json({ message: '用户凭证更新成功' });
    } catch (error) {
        console.error('更新用户凭证失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 获取所有用户凭证
router.get('/all-credentials', async (req, res) => {
    try {
        const fabric = await initializeFabric();
        const result = await fabric.contract.evaluateTransaction('queryAllUsers');
        res.json(JSON.parse(result.toString()));
    } catch (error) {
        console.error('获取所有用户凭证失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 获取用户身份信息
router.get('/identity/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // 使用共享钱包实例
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
            type: identity.type,
            mspId: identity.mspId
        });
    } catch (error) {
        console.error('获取用户身份信息失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 获取所有钱包中的身份
router.get('/identities', async (req, res) => {
    try {
        const identities = await wallet.list();
        const identitiesWithDetails = [];
        
        for (const id of identities) {
            const identity = await wallet.get(id);
            identitiesWithDetails.push({
                id,
                type: identity.type,
                mspId: identity.mspId
            });
        }
        
        res.json(identitiesWithDetails);
    } catch (error) {
        console.error('获取身份列表失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 获取用户代币余额
router.get('/credits/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const fabric = await initializeFabric();
        
        try {
            // 尝试调用我们自定义的函数
            const result = await fabric.contract.evaluateTransaction('GetUserCredits', userId);
            return res.json({ userId, credits: parseInt(result.toString()) });
        } catch (error) {
            console.warn('自定义函数GetUserCredits不可用，尝试使用模拟数据', error.message);
            
            // 如果没有这个函数，返回模拟数据
            return res.json({ 
                userId, 
                credits: Math.floor(Math.random() * 500) + 100,
                simulated: true 
            });
        }
    } catch (error) {
        console.error('获取用户代币余额失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 获取用户信誉度
router.get('/reputation/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const fabric = await initializeFabric();
        
        try {
            // 尝试调用我们自定义的函数
            const result = await fabric.contract.evaluateTransaction('GetUserReputation', userId);
            return res.json({ userId, reputation: parseInt(result.toString()) });
        } catch (error) {
            console.warn('自定义函数GetUserReputation不可用，尝试使用模拟数据', error.message);
            
            // 如果没有这个函数，返回模拟数据
            return res.json({ 
                userId, 
                reputation: Math.floor(Math.random() * 50) + 50,
                simulated: true 
            });
        }
    } catch (error) {
        console.error('获取用户信誉度失败:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router
