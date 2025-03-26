#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Gateway, Wallets } from 'fabric-network';
import net from 'net';
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

// 辅助函数：检查端口是否可访问
async function checkPortOpen(host, port, timeout = 1000) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        
        // 设置超时
        socket.setTimeout(timeout);
        
        // 尝试连接
        socket.connect(port, host, () => {
            socket.end();
            resolve(true);
        });
        
        // 处理错误
        socket.on('error', () => {
            resolve(false);
        });
        
        // 处理超时
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
    });
}

// 主函数
async function main() {
    try {
        console.log(`${colors.cyan}正在检查 Fabric 网络连接...${colors.reset}\n`);
        
        // 步骤1: 检查连接配置文件
        const ccpPath = path.resolve(__dirname, '..', 'config', 'connection-org1.json');
        console.log(`${colors.blue}步骤 1: 检查连接配置${colors.reset}`);
        console.log(`配置文件路径: ${ccpPath}`);
        
        let ccp;
        try {
            if (!fs.existsSync(ccpPath)) {
                console.log(`${colors.red}错误: 连接配置文件不存在${colors.reset}`);
                return;
            }
            
            ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
            console.log(`${colors.green}成功: 连接配置文件存在并且格式正确${colors.reset}\n`);
        } catch (error) {
            console.log(`${colors.red}错误: 无法解析连接配置文件: ${error.message}${colors.reset}\n`);
            return;
        }
        
        // 步骤2: 检查网络端点可访问性
        console.log(`${colors.blue}步骤 2: 检查网络端点可访问性${colors.reset}`);
        
        // 检查 Peer 端点
        const peerUrl = new URL(ccp.peers['peer0.org1.example.com'].url);
        const peerHost = peerUrl.hostname;
        const peerPort = parseInt(peerUrl.port);
        
        console.log(`Peer 端点: ${peerUrl.toString()}`);
        const peerAccessible = await checkPortOpen(peerHost, peerPort);
        
        if (peerAccessible) {
            console.log(`${colors.green}成功: Peer 端点可访问${colors.reset}`);
        } else {
            console.log(`${colors.red}错误: Peer 端点不可访问${colors.reset}`);
            console.log(`${colors.yellow}可能原因:${colors.reset}`);
            console.log(`1. Fabric 网络没有启动`);
            console.log(`2. 端口 ${peerPort} 被防火墙阻止`);
            console.log(`3. Peer 主机名解析错误 (检查 /etc/hosts)\n`);
        }
        
        // 检查 Orderer 端点
        const ordererUrl = new URL(ccp.orderers['orderer.example.com'].url);
        const ordererHost = ordererUrl.hostname;
        const ordererPort = parseInt(ordererUrl.port);
        
        console.log(`Orderer 端点: ${ordererUrl.toString()}`);
        const ordererAccessible = await checkPortOpen(ordererHost, ordererPort);
        
        if (ordererAccessible) {
            console.log(`${colors.green}成功: Orderer 端点可访问${colors.reset}\n`);
        } else {
            console.log(`${colors.red}错误: Orderer 端点不可访问${colors.reset}`);
            console.log(`${colors.yellow}可能原因:${colors.reset}`);
            console.log(`1. Fabric 网络没有启动`);
            console.log(`2. 端口 ${ordererPort} 被防火墙阻止`);
            console.log(`3. Orderer 主机名解析错误 (检查 /etc/hosts)\n`);
        }
        
        // 步骤3: 检查钱包和身份
        console.log(`${colors.blue}步骤 3: 检查钱包和身份${colors.reset}`);
        const walletPath = path.join(__dirname, '..', 'wallet');
        console.log(`钱包路径: ${walletPath}`);
        
        // 检查钱包目录
        if (!fs.existsSync(walletPath)) {
            console.log(`${colors.yellow}警告: 钱包目录不存在, 正在创建${colors.reset}`);
            fs.mkdirSync(walletPath, { recursive: true });
        }
        
        // 检查钱包中的身份
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const adminIdentity = await wallet.get('admin');
        
        if (adminIdentity) {
            console.log(`${colors.green}成功: 管理员身份存在${colors.reset}\n`);
        } else {
            console.log(`${colors.yellow}警告: 管理员身份不存在, 需要先注册管理员${colors.reset}\n`);
        }
        
        // 步骤4: 如果以上检查通过，尝试连接网络
        if (peerAccessible && ordererAccessible) {
            console.log(`${colors.blue}步骤 4: 尝试连接 Fabric 网络${colors.reset}`);
            
            try {
                // 如果没有管理员身份，则不能继续连接测试
                if (!adminIdentity) {
                    console.log(`${colors.yellow}跳过: 由于没有管理员身份, 无法测试连接${colors.reset}`);
                    return;
                }
                
                // 创建网关连接
                const gateway = new Gateway();
                await gateway.connect(ccp, {
                    wallet,
                    identity: 'admin',
                    discovery: { enabled: true, asLocalhost: true }
                });
                
                // 获取网络
                const network = await gateway.getNetwork('mychannel');
                console.log(`${colors.green}成功: 已连接到 mychannel 通道${colors.reset}`);
                
                // 获取合约
                const contract = network.getContract('blocktraffic');
                console.log(`${colors.green}成功: 已获取 blocktraffic 合约${colors.reset}`);
                
                // 断开连接
                gateway.disconnect();
                console.log(`${colors.green}成功: 测试完成并成功断开连接${colors.reset}\n`);
            } catch (error) {
                console.log(`${colors.red}错误: 连接 Fabric 网络失败: ${error.message}${colors.reset}\n`);
            }
        } else {
            console.log(`${colors.yellow}跳过 Fabric 网络连接测试: 端点不可访问${colors.reset}\n`);
        }
        
        // 总结
        console.log(`${colors.cyan}诊断总结:${colors.reset}`);
        
        if (!peerAccessible || !ordererAccessible) {
            console.log(`${colors.red}Fabric 网络连接失败: 端点不可访问${colors.reset}`);
            console.log(`${colors.yellow}建议:${colors.reset}`);
            console.log(`1. 确保 Fabric 测试网络已启动`);
            console.log(`2. 检查 /etc/hosts 文件中是否有正确的主机名映射`);
            console.log(`3. 检查防火墙设置`);
            console.log(`4. 如果在 Docker 中运行，确保网络设置正确\n`);
        } else if (!adminIdentity) {
            console.log(`${colors.yellow}Fabric 网络可能可访问，但缺少管理员身份${colors.reset}`);
            console.log(`${colors.yellow}建议:${colors.reset}`);
            console.log(`1. 运行注册管理员脚本: node scripts/registerUser.js admin\n`);
        } else {
            console.log(`${colors.green}Fabric 网络诊断完成，所有检查通过${colors.reset}\n`);
        }
        
    } catch (error) {
        console.log(`${colors.red}发生错误: ${error.message}${colors.reset}`);
        console.log(error.stack);
    }
}

// 执行主函数
main(); 