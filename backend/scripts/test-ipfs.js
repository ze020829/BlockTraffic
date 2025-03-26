#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ipfsUtil from '../utils/ipfs-utils.js';
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

// 主函数
async function main() {
    try {
        // 让初始化消息有机会显示完成后再开始测试
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`${colors.cyan}开始测试 IPFS 连接...${colors.reset}`);
        console.log(`${colors.yellow}IPFS API: ${process.env.IPFS_API_URL || 'http://127.0.0.1:5001/api/v0'}${colors.reset}`);
        console.log(`${colors.yellow}IPFS Gateway: ${process.env.IPFS_GATEWAY || 'http://127.0.0.1:8080'}${colors.reset}\n`);
        
        // 使用导入的IPFS工具类单例
        const ipfsUtils = ipfsUtil;
        
        // 测试连接
        console.log(`${colors.blue}测试1: 测试连接...${colors.reset}`);
        const connectionTest = await ipfsUtils.testConnection();
        if (connectionTest) {
            console.log(`${colors.green}连接测试成功${colors.reset}`);
        } else {
            console.log(`${colors.red}连接测试失败${colors.reset}`);
            return;
        }
        
        // 测试上传文本
        console.log(`${colors.blue}测试2: 上传文本...${colors.reset}`);
        const textResult = await ipfsUtils.uploadJSON({ text: '这是一个测试', timestamp: Date.now() });
        
        if (textResult.success) {
            console.log(`${colors.green}文本上传成功，哈希: ${textResult.hash}${colors.reset}`);
            
            // 测试获取文本
            console.log(`${colors.blue}测试3: 获取文本...${colors.reset}`);
            const getTextResult = await ipfsUtils.getJSON(textResult.hash);
            
            if (getTextResult.success) {
                console.log(`${colors.green}文本获取成功:${colors.reset}`);
                console.log(getTextResult.data);
            } else {
                console.log(`${colors.red}文本获取失败: ${getTextResult.error}${colors.reset}`);
            }
        } else {
            console.log(`${colors.red}文本上传失败: ${textResult.error}${colors.reset}`);
        }
        
        // 测试上传图片
        const testImagePath = path.join(__dirname, '..', 'data', 'test-traffic.jpg');
        if (fs.existsSync(testImagePath)) {
            console.log(`${colors.blue}测试4: 上传图片...${colors.reset}`);
            const imageBuffer = fs.readFileSync(testImagePath);
            const imageResult = await ipfsUtils.uploadFile(imageBuffer);
            
            if (imageResult.success) {
                console.log(`${colors.green}图片上传成功，哈希: ${imageResult.hash}${colors.reset}`);
                console.log(`${colors.green}您可以通过以下链接访问: ${process.env.IPFS_GATEWAY || 'http://127.0.0.1:8080'}/ipfs/${imageResult.hash}${colors.reset}`);
            } else {
                console.log(`${colors.red}图片上传失败: ${imageResult.error}${colors.reset}`);
            }
        } else {
            console.log(`${colors.yellow}跳过图片测试，找不到测试图片: ${testImagePath}${colors.reset}`);
            console.log(`${colors.yellow}您可以先运行 node scripts/prepare-test-data.js 来准备测试数据${colors.reset}`);
        }
        
        // 测试路况信息上传
        console.log(`${colors.blue}测试5: 上传交通信息...${colors.reset}`);
        
        const trafficInfo = {
            userId: 'test-user',
            type: 'congestion',
            description: '道路拥堵测试',
            location: '测试地点',
            position: { lng: 104.0668, lat: 30.5728 },
            timestamp: Date.now()
        };
        
        if (fs.existsSync(testImagePath)) {
            trafficInfo.image = fs.readFileSync(testImagePath);
        }
        
        const trafficResult = await ipfsUtils.uploadTrafficInfo(trafficInfo);
        
        if (trafficResult.success) {
            console.log(`${colors.green}交通信息上传成功，哈希: ${trafficResult.hash}${colors.reset}`);
            
            // 测试获取交通信息
            console.log(`${colors.blue}测试6: 获取交通信息...${colors.reset}`);
            const getTrafficResult = await ipfsUtils.getTrafficInfo(trafficResult.hash);
            
            if (getTrafficResult.success) {
                console.log(`${colors.green}交通信息获取成功:${colors.reset}`);
                // 不打印图片数据，避免大量日志
                const { imageData, ...printableData } = getTrafficResult.data;
                console.log(printableData);
            } else {
                console.log(`${colors.red}交通信息获取失败: ${getTrafficResult.error}${colors.reset}`);
            }
        } else {
            console.log(`${colors.red}交通信息上传失败: ${trafficResult.error}${colors.reset}`);
        }
        
        console.log(`${colors.cyan}测试完成${colors.reset}`);
    } catch (error) {
        console.error(`${colors.red}测试过程中发生错误: ${error}${colors.reset}`);
        console.error(error.stack);
    }
}

// 执行
main(); 