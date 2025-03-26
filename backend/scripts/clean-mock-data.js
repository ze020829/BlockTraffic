#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
        console.log(`${colors.cyan}清理路况数据...${colors.reset}`);
        
        // 清理路况数据
        const trafficDataPath = path.join(__dirname, '..', 'data', 'traffic.json');
        if (fs.existsSync(trafficDataPath)) {
            // 清空数据但保留文件结构
            const emptyTrafficData = {
                pending: [],
                verified: []
            };
            fs.writeFileSync(trafficDataPath, JSON.stringify(emptyTrafficData, null, 2));
            console.log(`${colors.green}路况数据已清空: ${trafficDataPath}${colors.reset}`);
        } else {
            console.log(`${colors.yellow}路况数据文件不存在，创建新的空文件${colors.reset}`);
            
            // 确保data目录存在
            const dataDir = path.join(__dirname, '..', 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            // 创建空的路况数据文件
            const emptyTrafficData = {
                pending: [],
                verified: []
            };
            fs.writeFileSync(trafficDataPath, JSON.stringify(emptyTrafficData, null, 2));
            console.log(`${colors.green}已创建空的路况数据文件: ${trafficDataPath}${colors.reset}`);
        }
        
        // 清理IPFS缓存目录
        const ipfsCacheDir = path.join(__dirname, '..', 'data', 'ipfs-cache');
        if (fs.existsSync(ipfsCacheDir)) {
            // 读取目录中的所有文件
            const files = fs.readdirSync(ipfsCacheDir);
            
            // 删除所有缓存文件
            let deletedCount = 0;
            for (const file of files) {
                const filePath = path.join(ipfsCacheDir, file);
                fs.unlinkSync(filePath);
                deletedCount++;
            }
            
            console.log(`${colors.green}已清理IPFS缓存目录，删除了 ${deletedCount} 个文件${colors.reset}`);
        } else {
            console.log(`${colors.yellow}IPFS缓存目录不存在，创建新目录${colors.reset}`);
            fs.mkdirSync(ipfsCacheDir, { recursive: true });
            console.log(`${colors.green}已创建IPFS缓存目录: ${ipfsCacheDir}${colors.reset}`);
        }
        
        console.log(`${colors.cyan}清理完成! 您现在可以上传新的路况数据。${colors.reset}`);
        
    } catch (error) {
        console.error(`${colors.red}清理过程中发生错误: ${error}${colors.reset}`);
        console.error(error.stack);
    }
}

// 执行主函数
main(); 