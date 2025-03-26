#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Wallets, Gateway } from 'fabric-network';
import fabricUtils from '../utils/fabric-utils.js';
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

// 测试链码函数
async function testChaincode() {
    try {
        console.log(`${colors.cyan}开始测试区块链服务...${colors.reset}`);
        console.log(`${colors.yellow}通道: ${process.env.CHANNEL_NAME || 'mychannel'}${colors.reset}`);
        console.log(`${colors.yellow}链码: ${process.env.CHAINCODE_ID || 'basic'}${colors.reset}`);
        
        // 初始化Fabric连接
        await fabricUtils.initialize('admin');
        console.log(`${colors.green}成功连接到Fabric网络${colors.reset}`);
        
        // 检查链码是否可以调用 - 使用简单查询
        try {
            console.log(`${colors.yellow}测试1: 尝试初始化或获取所有资产${colors.reset}`);
            // 尝试调用链码的GetAllAssets函数 (这是asset-transfer-basic示例中的标准函数)
            const result = await fabricUtils.query('GetAllAssets');
            console.log(`${colors.green}查询成功，结果: ${result}${colors.reset}`);
        } catch (error) {
            console.log(`${colors.red}查询失败: ${error.message}${colors.reset}`);
            
            // 如果失败，尝试初始化账本
            try {
                console.log(`${colors.yellow}尝试初始化账本...${colors.reset}`);
                const initResult = await fabricUtils.invoke('InitLedger');
                console.log(`${colors.green}账本初始化成功: ${initResult}${colors.reset}`);
                
                // 再次尝试查询
                const result = await fabricUtils.query('GetAllAssets');
                console.log(`${colors.green}初始化后查询成功，结果: ${result}${colors.reset}`);
            } catch (initError) {
                console.log(`${colors.red}初始化账本失败: ${initError.message}${colors.reset}`);
            }
        }
        
        // 测试创建资产
        try {
            console.log(`${colors.yellow}测试2: 创建新资产${colors.reset}`);
            const assetId = `asset${Date.now()}`;
            const result = await fabricUtils.invoke('CreateAsset', 
                assetId, 'blue', '5', 'tom', '300');
            console.log(`${colors.green}创建资产成功，资产ID: ${assetId}${colors.reset}`);
            
            // 查询创建的资产
            const queryResult = await fabricUtils.query('ReadAsset', assetId);
            console.log(`${colors.green}查询新资产成功，结果: ${queryResult}${colors.reset}`);
        } catch (error) {
            console.log(`${colors.red}创建资产测试失败: ${error.message}${colors.reset}`);
        }
        
        // 测试用户相关功能 - 如果区块链包含用户管理功能
        try {
            console.log(`${colors.yellow}测试3: 尝试用户相关功能${colors.reset}`);
            
            // 测试创建或更新用户 - 假设链码中有这样的函数
            const userId = 'testuser1';
            try {
                const result = await fabricUtils.invoke('UpdateUserCredits', userId, '100');
                console.log(`${colors.green}更新用户代币成功: ${result}${colors.reset}`);
            } catch (error) {
                console.log(`${colors.red}更新用户代币失败: ${error.message}${colors.reset}`);
                console.log(`${colors.yellow}这可能是因为链码中没有此功能，或函数名不匹配${colors.reset}`);
            }
            
            try {
                const result = await fabricUtils.invoke('UpdateUserReputation', userId, '10');
                console.log(`${colors.green}更新用户信誉度成功: ${result}${colors.reset}`);
            } catch (error) {
                console.log(`${colors.red}更新用户信誉度失败: ${error.message}${colors.reset}`);
                console.log(`${colors.yellow}这可能是因为链码中没有此功能，或函数名不匹配${colors.reset}`);
            }
        } catch (error) {
            console.log(`${colors.red}用户测试功能失败: ${error.message}${colors.reset}`);
        }
        
        // 断开连接
        fabricUtils.disconnect();
        console.log(`${colors.cyan}链码测试完成${colors.reset}`);
        
    } catch (error) {
        console.error(`${colors.red}测试过程中发生错误: ${error}${colors.reset}`);
        console.error(error.stack);
    }
}

// 执行测试
testChaincode(); 