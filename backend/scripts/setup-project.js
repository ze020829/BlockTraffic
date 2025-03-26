#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import wslBridge from '../utils/wsl-bridge.js';

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
        console.log(`${colors.cyan}===========================================${colors.reset}`);
        console.log(`${colors.cyan}   区块链交通信息系统 - 项目初始化脚本   ${colors.reset}`);
        console.log(`${colors.cyan}===========================================${colors.reset}`);
        
        // 1. 创建必要的目录
        console.log(`\n${colors.blue}[1/5] 创建必要的目录...${colors.reset}`);
        const dirs = [
            path.join(__dirname, '..', 'config'),
            path.join(__dirname, '..', 'wallet'),
            path.join(__dirname, '..', 'certificates'),
            path.join(__dirname, '..', 'data', 'ipfs-cache')
        ];
        
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`${colors.green}创建目录: ${dir}${colors.reset}`);
            } else {
                console.log(`${colors.yellow}目录已存在: ${dir}${colors.reset}`);
            }
        }
        
        // 2. 创建连接配置文件
        console.log(`\n${colors.blue}[2/5] 创建连接配置文件...${colors.reset}`);
        const connectionProfile = wslBridge.createConnectionProfile();
        console.log(`${colors.green}连接配置文件创建成功${colors.reset}`);
        
        // 3. 检查环境变量
        console.log(`\n${colors.blue}[3/5] 检查环境变量...${colors.reset}`);
        const envVars = [
            'CHANNEL_NAME',
            'CHAINCODE_ID',
            'ORGANIZATION_MSP_ID',
            'FABRIC_CA_SERVER',
            'IPFS_API_URL',
            'IPFS_GATEWAY'
        ];
        
        for (const envVar of envVars) {
            if (process.env[envVar]) {
                console.log(`${colors.green}${envVar}: ${process.env[envVar]}${colors.reset}`);
            } else {
                console.log(`${colors.yellow}警告: ${envVar} 未设置${colors.reset}`);
            }
        }
        
        // 4. 提供WSL命令
        console.log(`\n${colors.blue}[4/5] WSL环境配置命令...${colors.reset}`);
        console.log(`${colors.yellow}在WSL中运行以下命令以验证Fabric网络:${colors.reset}`);
        console.log(`
cd ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network
export PATH=\$PWD/../bin:\$PATH
export FABRIC_CFG_PATH=\$PWD/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=\$PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=\$PWD/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}'
`);

        // 5. 复制证书指南
        console.log(`\n${colors.blue}[5/5] 证书复制指南...${colors.reset}`);
        console.log(`${colors.yellow}在WSL中运行以下命令以复制证书到Windows:${colors.reset}`);
        console.log(`
mkdir -p /mnt/g/finalwork/BlockTraffic/BlockTraffic/backend/certificates
cp ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem /mnt/g/finalwork/BlockTraffic/BlockTraffic/backend/certificates/
cp ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem /mnt/g/finalwork/BlockTraffic/BlockTraffic/backend/certificates/
`);

        console.log(`\n${colors.green}项目初始化脚本执行完成!${colors.reset}`);
        console.log(`${colors.cyan}接下来运行以下命令注册用户:${colors.reset}`);
        console.log(`${colors.yellow}node scripts/register-all-users.js${colors.reset}`);
        
    } catch (error) {
        console.error(`${colors.red}初始化过程中发生错误: ${error}${colors.reset}`);
        console.error(error.stack);
    }
}

// 执行主函数
main(); 