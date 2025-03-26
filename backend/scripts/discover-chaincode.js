#!/usr/bin/env node

import { Wallets, Gateway } from 'fabric-network';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import wslBridge from '../utils/wsl-bridge.js';

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
const channelName = process.env.CHANNEL_NAME || 'mychannel';
const chaincodeName = process.env.CHAINCODE_ID || 'blocktraffic';
const userId = 'admin';
const mspId = process.env.ORGANIZATION_MSP_ID || 'Org1MSP';

// 获取链码信息
async function discoverChaincode() {
    try {
        console.log(`${colors.cyan}开始发现链码信息...${colors.reset}`);
        console.log(`${colors.yellow}通道: ${channelName}${colors.reset}`);
        console.log(`${colors.yellow}链码: ${chaincodeName}${colors.reset}`);
        
        // 初始化钱包和网关
        const walletPath = path.join(__dirname, '..', 'wallet');
        console.log(`${colors.blue}使用钱包路径: ${walletPath}${colors.reset}`);
        
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const identity = await wallet.get(userId);
        
        if (!identity) {
            console.log(`${colors.red}用户 ${userId} 的身份不存在于钱包中${colors.reset}`);
            console.log(`${colors.yellow}请先运行 register-all-users.js 脚本注册管理员${colors.reset}`);
            return;
        }
        
        // 获取连接配置
        const ccp = wslBridge.getConnectionProfile();
        console.log(`${colors.green}已获取连接配置${colors.reset}`);
        
        // 连接网关
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: userId,
            discovery: { enabled: true, asLocalhost: true }
        });
        console.log(`${colors.green}已连接到网关${colors.reset}`);
        
        // 获取网络和链码
        const network = await gateway.getNetwork(channelName);
        console.log(`${colors.green}已连接到通道 ${channelName}${colors.reset}`);
        
        const contract = network.getContract(chaincodeName);
        console.log(`${colors.green}已获取链码 ${chaincodeName}${colors.reset}`);
        
        // 打印出链码相关信息
        console.log(`${colors.magenta}===== 链码信息 =====${colors.reset}`);
        console.log(`${colors.blue}名称: ${chaincodeName}${colors.reset}`);
        console.log(`${colors.blue}通道: ${channelName}${colors.reset}`);
        
        // 通过尝试调用一些常见函数来探测功能
        console.log(`${colors.magenta}===== 探测链码函数 =====${colors.reset}`);
        
        // 测试函数列表 - 基础资产转移示例中的函数
        const commonFunctions = [
            { name: 'InitLedger', args: [], invokeType: 'invoke' },
            { name: 'GetAllAssets', args: [], invokeType: 'query' },
            { name: 'ReadAsset', args: ['asset1'], invokeType: 'query' },
            { name: 'CreateAsset', args: ['assetTest', 'yellow', '5', 'test', '100'], invokeType: 'invoke' },
            
            // 自定义函数 - 用户相关
            { name: 'GetUserInfo', args: ['admin'], invokeType: 'query' },
            { name: 'UpdateUserCredits', args: ['admin', '100'], invokeType: 'invoke' },
            { name: 'UpdateUserReputation', args: ['admin', '10'], invokeType: 'invoke' },
            
            // 自定义函数 - 交通信息相关
            { name: 'RecordTrafficInfo', args: ['admin', 'hash123', 'location1', '123456789'], invokeType: 'invoke' },
            { name: 'GetUserTrafficInfo', args: ['admin'], invokeType: 'query' }
        ];
        
        // 尝试调用每个函数
        for (const func of commonFunctions) {
            try {
                console.log(`${colors.yellow}尝试调用 ${func.name}...${colors.reset}`);
                let result;
                
                if (func.invokeType === 'query') {
                    result = await contract.evaluateTransaction(func.name, ...func.args);
                } else {
                    // 只模拟交易，不实际提交
                    try {
                        const tx = contract.createTransaction(func.name);
                        const endorsement = await tx.getEndorsementResponse(func.args);
                        result = `[模拟交易成功]`; 
                    } catch (simulateError) {
                        throw simulateError;
                    }
                }
                
                console.log(`${colors.green}函数 ${func.name} 可用，返回结果: ${result}${colors.reset}`);
            } catch (error) {
                if (error.message.includes('function not found')) {
                    console.log(`${colors.red}函数 ${func.name} 不存在${colors.reset}`);
                } else if (error.message.includes('Failed to submit')) {
                    console.log(`${colors.yellow}函数 ${func.name} 可能存在，但调用失败: ${error.message}${colors.reset}`);
                } else {
                    console.log(`${colors.red}调用 ${func.name} 时出错: ${error.message}${colors.reset}`);
                }
            }
        }
        
        // 断开连接
        gateway.disconnect();
        console.log(`${colors.green}已断开与网关的连接${colors.reset}`);
        console.log(`${colors.cyan}发现链码信息完成${colors.reset}`);
    } catch (error) {
        console.error(`${colors.red}发现链码过程中发生错误: ${error.message}${colors.reset}`);
        console.error(error.stack);
    }
}

// 执行
discoverChaincode(); 