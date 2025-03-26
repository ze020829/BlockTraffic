#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Wallets, Gateway } from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import wslBridge from '../utils/wsl-bridge.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 在 ES 模块中定义 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 控制台颜色
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// 配置
const adminId = process.env.FABRIC_CA_ADMIN_ID || 'admin';
const userIds = ['user1', 'user2', 'user3', 'user4', 'user5'];
const mspId = process.env.ORGANIZATION_MSP_ID || 'Org1MSP';
const caName = 'ca-org1';

// 初始化钱包
async function initializeWallet() {
    try {
        const walletPath = path.join(__dirname, '..', 'wallet');
        if (!fs.existsSync(walletPath)) {
            fs.mkdirSync(walletPath, { recursive: true });
        }
        
        return await Wallets.newFileSystemWallet(walletPath);
    } catch (error) {
        console.error(`${colors.red}初始化钱包失败: ${error}${colors.reset}`);
        throw error;
    }
}

// 注册管理员
async function enrollAdmin(caClient, wallet) {
    try {
        // 检查管理员是否已存在
        const identity = await wallet.get(adminId);
        if (identity) {
            console.log(`${colors.green}管理员身份 ${adminId} 已存在，无需重新注册${colors.reset}`);
            
            // 即使存在也删除再重新注册
            console.log(`${colors.yellow}删除现有管理员身份并重新注册...${colors.reset}`);
            await wallet.remove(adminId);
        }
        
        // 登记管理员
        console.log(`${colors.blue}正在登记管理员，使用ID: admin, Secret: adminpw${colors.reset}`);
        const enrollment = await caClient.enroll({
            enrollmentID: 'admin',
            enrollmentSecret: 'adminpw'
        });
        
        // 创建身份对象
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes()
            },
            mspId,
            type: 'X.509'
        };
        
        // 保存管理员身份
        await wallet.put(adminId, x509Identity);
        console.log(`${colors.green}管理员 ${adminId} 注册并保存到钱包成功${colors.reset}`);
    } catch (error) {
        console.error(`${colors.red}注册管理员失败: ${error}${colors.reset}`);
        throw error;
    }
}

// 注册新用户
async function registerUser(caClient, wallet, userId) {
    try {
        // 检查用户是否已存在于钱包中
        const userIdentity = await wallet.get(userId);
        if (userIdentity) {
            console.log(`${colors.green}用户 ${userId} 已存在于钱包中，无需重新注册${colors.reset}`);
            return;
        }
        
        // 确保管理员已注册
        const adminIdentity = await wallet.get(adminId);
        if (!adminIdentity) {
            throw new Error(`管理员身份 ${adminId} 不存在，请先注册管理员`);
        }
        
        // 获取管理员对象
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, adminId);
        
        // 尝试注册用户
        let secret;
        try {
            // 注册用户
            secret = await caClient.register(
                {
                    affiliation: 'org1.department1',
                    enrollmentID: userId,
                    role: 'client',
                    attrs: [
                        { name: 'credits', value: '100', ecert: true },
                        { name: 'reputation', value: '10', ecert: true }
                    ]
                },
                adminUser
            );
            console.log(`${colors.green}用户 ${userId} 注册成功${colors.reset}`);
        } catch (registerError) {
            // 如果错误是因为用户已注册，我们可以继续使用默认密码登记
            if (registerError.message && registerError.message.includes("is already registered")) {
                console.log(`${colors.yellow}用户 ${userId} 已在CA中注册，将直接进行登记${colors.reset}`);
                // 使用默认密码格式
                secret = `${userId}pw`;
            } else {
                // 其它错误则抛出
                throw registerError;
            }
        }
        
        // 登记用户
        console.log(`${colors.blue}正在登记用户 ${userId}，使用密码 ${secret}${colors.reset}`);
        const enrollment = await caClient.enroll({
            enrollmentID: userId,
            enrollmentSecret: secret
        });
        
        // 创建身份对象
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes()
            },
            mspId,
            type: 'X.509'
        };
        
        // 保存用户身份
        await wallet.put(userId, x509Identity);
        console.log(`${colors.green}用户 ${userId} 登记并保存到钱包成功${colors.reset}`);
    } catch (error) {
        console.error(`${colors.red}注册用户 ${userId} 失败: ${error}${colors.reset}`);
        throw error;
    }
}

// 主函数
async function main() {
    try {
        console.log(`${colors.cyan}开始注册管理员和用户...${colors.reset}`);
        
        // 创建钱包
        const wallet = await initializeWallet();
        console.log(`${colors.green}钱包初始化成功${colors.reset}`);
        
        // 获取连接配置
        const ccp = wslBridge.getConnectionProfile();
        console.log(`${colors.green}连接配置获取成功${colors.reset}`);
        
        // 创建 CA 客户端
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caURL = caInfo.url;
        const caClient = new FabricCAServices(caURL, { verify: false }, caInfo.caName);
        console.log(`${colors.green}CA 客户端创建成功: ${caURL}${colors.reset}`);
        
        // 注册管理员
        await enrollAdmin(caClient, wallet);
        
        // 注册所有用户
        for (const userId of userIds) {
            await registerUser(caClient, wallet, userId);
        }
        
        console.log(`\n${colors.green}所有用户注册成功!${colors.reset}`);
        console.log(`${colors.cyan}管理员: ${adminId}${colors.reset}`);
        console.log(`${colors.cyan}用户: ${userIds.join(', ')}${colors.reset}\n`);
        
        // 显示在 WSL 中需要执行的命令
        console.log(`${colors.yellow}在 WSL 中需要执行以下命令来确保连接:${colors.reset}`);
        const commands = wslBridge.generateRegistrationCommands(adminId, userIds);
        commands.forEach((cmd, i) => {
            console.log(`${colors.magenta}命令 ${i+1}:${colors.reset}`);
            console.log(cmd);
            console.log();
        });
        
        // 复制证书
        console.log(`${colors.yellow}最后，需要复制证书:${colors.reset}`);
        wslBridge.copyCertificatesToWindows();
        
    } catch (error) {
        console.error(`${colors.red}发生错误: ${error}${colors.reset}`);
        console.error(error.stack);
    }
}

// 执行
main(); 