#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    console.log(`${colors.cyan}开始准备测试数据...${colors.reset}`);
    
    // 创建数据目录
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`${colors.green}数据目录创建成功: ${dataDir}${colors.reset}`);
    } else {
        console.log(`${colors.yellow}数据目录已存在: ${dataDir}${colors.reset}`);
    }
    
    // 准备测试图片
    const testImagePath = path.join(dataDir, 'test-traffic.jpg');
    if (!fs.existsSync(testImagePath)) {
        console.log(`${colors.blue}开始复制测试图片...${colors.reset}`);
        
        // 从本地目录复制图片
        const sourceDir = 'G:/finalwork/image';
        if (fs.existsSync(sourceDir)) {
            // 获取目录中的第一张图片
            const files = fs.readdirSync(sourceDir);
            const imageFiles = files.filter(file => 
                file.endsWith('.jpg') || file.endsWith('.jpeg') || 
                file.endsWith('.png') || file.endsWith('.gif')
            );
            
            if (imageFiles.length > 0) {
                const sourceImage = path.join(sourceDir, imageFiles[0]);
                fs.copyFileSync(sourceImage, testImagePath);
                console.log(`${colors.green}测试图片复制成功: 从 ${sourceImage} 到 ${testImagePath}${colors.reset}`);
            } else {
                console.log(`${colors.red}在 ${sourceDir} 中未找到图片文件${colors.reset}`);
            }
        } else {
            console.log(`${colors.red}源目录 ${sourceDir} 不存在${colors.reset}`);
        }
    } else {
        console.log(`${colors.yellow}测试图片已存在: ${testImagePath}${colors.reset}`);
    }
    
    // 创建默认的空流量数据文件
    const trafficDataPath = path.join(dataDir, 'traffic.json');
    if (!fs.existsSync(trafficDataPath)) {
        const defaultTrafficData = {
            pending: [],
            verified: []
        };
        
        fs.writeFileSync(trafficDataPath, JSON.stringify(defaultTrafficData, null, 2));
        console.log(`${colors.green}默认流量数据创建成功: ${trafficDataPath}${colors.reset}`);
    } else {
        console.log(`${colors.yellow}流量数据文件已存在: ${trafficDataPath}${colors.reset}`);
    }
    
    // 创建 IPFS 缓存目录
    const ipfsCacheDir = path.join(dataDir, 'ipfs-cache');
    if (!fs.existsSync(ipfsCacheDir)) {
        fs.mkdirSync(ipfsCacheDir, { recursive: true });
        console.log(`${colors.green}IPFS 缓存目录创建成功: ${ipfsCacheDir}${colors.reset}`);
    } else {
        console.log(`${colors.yellow}IPFS 缓存目录已存在: ${ipfsCacheDir}${colors.reset}`);
    }
    
    console.log(`${colors.cyan}测试数据准备完成!${colors.reset}`);
}

// 执行主函数
main().catch(err => {
    console.error(`${colors.red}发生错误: ${err}${colors.reset}`);
    process.exit(1);
}); 