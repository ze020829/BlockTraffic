#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import IPFSUtils from '../utils/ipfs-utils.js';
import axios from 'axios';
import FormData from 'form-data';

// 在 ES 模块中定义 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 颜色定义
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
        console.log(`${colors.cyan}测试直接使用IPFS工具类上传...${colors.reset}`);
        
        // 准备测试数据
        const testImagePath = path.join(__dirname, '..', 'data', 'test-traffic.jpg');
        let imageFile = null;
        
        if (fs.existsSync(testImagePath)) {
            imageFile = fs.readFileSync(testImagePath);
            console.log(`${colors.green}已读取测试图片: ${testImagePath} (${imageFile.length} 字节)${colors.reset}`);
        } else {
            console.log(`${colors.yellow}测试图片不存在，将只测试文本数据${colors.reset}`);
        }
        
        // 创建测试对象
        const testTrafficInfo = {
            userId: 'test-user',
            type: 'congestion',
            description: '道路拥堵测试',
            location: '测试地点',
            position: { lng: 104.0668, lat: 30.5728 },
            timestamp: Date.now()
        };
        
        if (imageFile) {
            testTrafficInfo.image = imageFile;
        }
        
        // 使用IPFS工具类直接上传
        console.log(`${colors.blue}直接使用IPFS工具类上传中...${colors.reset}`);
        const ipfsResult = await IPFSUtils.uploadTrafficInfo(testTrafficInfo);
        
        if (ipfsResult.success) {
            console.log(`${colors.green}IPFS工具类上传成功:${colors.reset}`);
            console.log(`Hash: ${ipfsResult.hash}`);
            if (ipfsResult.imageHash) {
                console.log(`图片Hash: ${ipfsResult.imageHash}`);
            }
            console.log();
        } else {
            console.log(`${colors.red}IPFS工具类上传失败: ${ipfsResult.error}${colors.reset}`);
            console.log();
        }
        
        // 测试通过HTTP API上传
        console.log(`${colors.cyan}测试通过HTTP API上传...${colors.reset}`);
        
        try {
            // 准备表单数据
            const formData = new FormData();
            formData.append('userId', 'test-user');
            formData.append('type', 'congestion');
            formData.append('description', '道路拥堵测试');
            formData.append('location', '测试地点');
            formData.append('position', JSON.stringify({ lng: 104.0668, lat: 30.5728 }));
            
            if (imageFile) {
                formData.append('image', imageFile, {
                    filename: 'test-traffic.jpg',
                    contentType: 'image/jpeg'
                });
            }
            
            // 使用axios发送请求
            console.log(`${colors.blue}通过HTTP API上传中...${colors.reset}`);
            const response = await axios.post('http://localhost:3000/api/traffic/upload', formData, {
                headers: {
                    ...formData.getHeaders()
                }
            });
            
            console.log(`${colors.green}HTTP API上传结果:${colors.reset}`);
            console.log(response.data);
            console.log();
            
            // 如果上传成功，尝试获取上传的交通信息
            if (response.data.success && response.data.data.hash) {
                console.log(`${colors.blue}尝试获取上传的交通信息...${colors.reset}`);
                try {
                    const getResponse = await axios.get(`http://localhost:3000/api/traffic/${response.data.data.hash}`);
                    console.log(`${colors.green}获取交通信息成功:${colors.reset}`);
                    console.log(getResponse.data);
                    console.log();
                } catch (getError) {
                    console.log(`${colors.red}获取交通信息失败: ${getError.message}${colors.reset}`);
                    console.log();
                }
            }
        } catch (error) {
            console.log(`${colors.red}HTTP API上传失败: ${error.message}${colors.reset}`);
            if (error.response) {
                console.log(`状态码: ${error.response.status}`);
                console.log(`响应内容: `, error.response.data);
            }
            console.log();
        }
        
        // 测试使用测试API
        console.log(`${colors.cyan}测试使用测试API...${colors.reset}`);
        
        try {
            // 使用axios发送请求
            console.log(`${colors.blue}通过测试API上传中...${colors.reset}`);
            const response = await axios.post('http://localhost:3000/api/traffic/test', {
                userId: 'test-user'
            });
            
            console.log(`${colors.green}测试API结果:${colors.reset}`);
            console.log(response.data);
        } catch (error) {
            console.log(`${colors.red}测试API失败: ${error.message}${colors.reset}`);
            if (error.response) {
                console.log(`状态码: ${error.response.status}`);
                console.log(`响应内容: `, error.response.data);
            }
        }
        
    } catch (error) {
        console.error(`${colors.red}测试过程中发生错误: ${error}${colors.reset}`);
        console.error(error.stack);
    }
}

// 执行
main(); 