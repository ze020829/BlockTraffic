import { Gateway, Wallets } from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import wslBridge from './wsl-bridge.js';

// 加载环境变量
dotenv.config();

// 在 ES 模块中定义 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从环境变量获取配置
const channelName = process.env.CHANNEL_NAME || 'mychannel';
const chaincodeName = process.env.CHAINCODE_ID || 'basic';
const orgMspId = process.env.ORGANIZATION_MSP_ID || 'Org1MSP';

// 获取钱包路径
const getWalletPath = () => {
    return path.join(__dirname, '..', 'wallet');
};

class FabricUtils {
    constructor() {
        this.initialized = false;
        this.gateway = null;
        this.wallet = null;
        this.network = null;
        this.contract = null;
        
        // 默认配置
        this.channelName = channelName;
        this.chaincodeId = chaincodeName;
        this.mspId = orgMspId;
        this.user = 'admin';
        
        // 初始化配置
        this.initConfig();
    }
    
    // 初始化配置
    initConfig() {
        // 从环境变量或配置文件中读取配置
        this.channelName = process.env.CHANNEL_NAME || this.channelName;
        this.chaincodeId = process.env.CHAINCODE_ID || this.chaincodeId;
        this.mspId = process.env.MSP_ID || this.mspId;
        this.user = process.env.FABRIC_USER || this.user;
    }
    
    // 获取连接配置
    getConnectionProfile() {
        try {
            return wslBridge.getConnectionProfile();
        } catch (error) {
            console.error('获取连接配置失败:', error);
            throw error;
        }
    }
    
    // 初始化
    async initialize(user = this.user) {
        if (this.initialized) {
            return;
        }
        
        // 用户参数
        this.user = user;
        
        try {
            console.log(`正在初始化 Fabric 连接，用户: ${this.user}`);
            
            // 创建一个新的文件系统钱包
            const walletPath = getWalletPath();
            
            // 确保钱包目录存在
            if (!fs.existsSync(walletPath)) {
                fs.mkdirSync(walletPath, { recursive: true });
            }
            
            this.wallet = await Wallets.newFileSystemWallet(walletPath);
            console.log('钱包初始化完成');
            
            // 检查用户身份是否存在
            const identity = await this.wallet.get(this.user);
            if (!identity) {
                console.warn(`用户 ${this.user} 的身份不存在于钱包中，将尝试使用 admin 身份`);
                
                // 检查管理员身份
                const adminIdentity = await this.wallet.get('admin');
                if (!adminIdentity) {
                    console.error('管理员身份不存在于钱包中');
                    console.error('请先运行 node backend/scripts/register-all-users.js 以注册管理员和用户');
                    throw new Error(`用户 ${this.user} 和管理员身份都不存在于钱包中`);
                }
                
                // 使用管理员身份
                this.user = 'admin';
                console.log('已切换到管理员身份');
            } else {
                console.log(`找到用户 ${this.user} 的身份`);
            }
            
            // 获取连接配置文件
            const ccp = this.getConnectionProfile();
            
            // 创建一个新的网关连接
            this.gateway = new Gateway();
            
            // 使用身份连接到网关
            await this.gateway.connect(ccp, {
                wallet: this.wallet,
                identity: this.user,
                discovery: { enabled: true, asLocalhost: true }
            });
            
            // 访问网络
            this.network = await this.gateway.getNetwork(this.channelName);
            
            // 获取合约
            this.contract = this.network.getContract(this.chaincodeId);
            
            this.initialized = true;
            console.log('Fabric 连接已成功初始化');
            return true;
        } catch (error) {
            console.error('初始化 Fabric 连接失败:', error);
            
            // 清理连接
            if (this.gateway) {
                this.gateway.disconnect();
                this.gateway = null;
            }
            
            this.network = null;
            this.contract = null;
            this.initialized = false;
            
            // 重新抛出错误
            throw error;
        }
    }
    
    // 切换用户
    async switchUser(newUser) {
        if (this.user === newUser && this.initialized) {
            console.log(`已经以 ${newUser} 身份登录`);
            return;
        }
        
        // 断开现有连接
        if (this.gateway) {
            this.gateway.disconnect();
            this.gateway = null;
        }
        
        this.network = null;
        this.contract = null;
        this.initialized = false;
        
        // 重新初始化
        return this.initialize(newUser);
    }
    
    // 执行查询
    async query(funcName, ...args) {
        try {
            // 确保已初始化
            if (!this.initialized) {
                await this.initialize();
            }
            
            // 执行查询
            const result = await this.contract.evaluateTransaction(funcName, ...args);
            return result.toString();
        } catch (error) {
            console.error(`查询 ${funcName} 失败:`, error);
            throw error;
        }
    }
    
    // 执行交易
    async invoke(funcName, ...args) {
        try {
            // 确保已初始化
            if (!this.initialized) {
                await this.initialize();
            }
            
            // 执行交易
            const result = await this.contract.submitTransaction(funcName, ...args);
            return result.toString();
        } catch (error) {
            console.error(`执行交易 ${funcName} 失败:`, error);
            throw error;
        }
    }
    
    // 带重试功能的初始化
    async retryInitialize(maxRetries = 3, delay = 2000) {
        let retries = 0;
        
        while (retries < maxRetries) {
            try {
                await this.initialize();
                return true;
            } catch (error) {
                retries++;
                console.warn(`初始化失败，第 ${retries} 次重试（最多 ${maxRetries} 次）...`);
                
                if (retries >= maxRetries) {
                    console.error('达到最大重试次数，初始化失败');
                    throw error;
                }
                
                // 等待一段时间后重试
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // 断开连接
    disconnect() {
        if (this.gateway) {
            this.gateway.disconnect();
            this.gateway = null;
            this.network = null;
            this.contract = null;
            this.initialized = false;
            console.log('已断开与 Fabric 网络的连接');
        }
    }
    
    // 查询已注册用户
    async getRegisteredUsers() {
        try {
            const walletPath = getWalletPath();
            this.wallet = await Wallets.newFileSystemWallet(walletPath);
            
            // 列出钱包中的所有身份
            const identities = await this.wallet.list();
            return identities;
        } catch (error) {
            console.error('获取已注册用户失败:', error);
            return [];
        }
    }
    
    // 更新用户信誉度
    async updateUserReputation(userId, reputation) {
        try {
            await this.initialize('admin'); // 使用管理员身份更新信誉度
            const result = await this.invoke('UpdateUserReputation', userId, reputation.toString());
            return { success: true, result };
        } catch (error) {
            console.error(`更新用户 ${userId} 信誉度失败:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // 更新用户代币数量
    async updateUserCredits(userId, credits) {
        try {
            await this.initialize('admin'); // 使用管理员身份更新代币
            const result = await this.invoke('UpdateUserCredits', userId, credits.toString());
            return { success: true, result };
        } catch (error) {
            console.error(`更新用户 ${userId} 代币数量失败:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // 检查用户信息
    async checkUserInfo(userId) {
        try {
            await this.initialize('admin'); // 使用管理员身份查询
            const result = await this.query('GetUserInfo', userId);
            return { success: true, result: JSON.parse(result) };
        } catch (error) {
            console.error(`获取用户 ${userId} 信息失败:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // 记录路况信息
    async recordTrafficInfo(userId, trafficHash, location, timestamp) {
        try {
            await this.switchUser(userId); // 使用特定用户身份记录
            const result = await this.invoke('RecordTrafficInfo', trafficHash, location, timestamp.toString());
            return { success: true, result };
        } catch (error) {
            console.error(`记录路况信息失败:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // 获取用户提交的路况信息
    async getUserTrafficInfo(userId) {
        try {
            await this.initialize('admin'); // 使用管理员身份查询
            const result = await this.query('GetUserTrafficInfo', userId);
            return { success: true, result: JSON.parse(result) };
        } catch (error) {
            console.error(`获取用户 ${userId} 路况信息失败:`, error);
            return { success: false, error: error.message };
        }
    }
}

export default new FabricUtils();