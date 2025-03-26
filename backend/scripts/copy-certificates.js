#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkCertificates, copyCertificatesToWindows } from '../utils/wsl-bridge.js';

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
        console.log(`${colors.cyan}检查证书状态...${colors.reset}\n`);
        
        // 检查证书状态
        const certStatus = checkCertificates();
        
        // 显示证书状态
        console.log(`${colors.blue}证书检查结果:${colors.reset}`);
        console.log(`CA证书: ${certStatus.caCert.exists ? colors.green + '存在' : colors.red + '不存在'} (${certStatus.caCert.path})${colors.reset}`);
        console.log(`TLS证书: ${certStatus.tlsCert.exists ? colors.green + '存在' : colors.red + '不存在'} (${certStatus.tlsCert.path})${colors.reset}`);
        console.log(`Orderer证书: ${certStatus.ordererCert.exists ? colors.green + '存在' : colors.red + '不存在'} (${certStatus.ordererCert.path})${colors.reset}\n`);
        
        // 显示复制命令
        console.log(`${colors.magenta}证书复制指南:${colors.reset}`);
        const copyResult = copyCertificatesToWindows();
        
        // 总结
        if (certStatus.success) {
            console.log(`\n${colors.green}所有证书已找到，系统可以连接到Fabric网络。${colors.reset}`);
        } else {
            console.log(`\n${colors.yellow}缺少部分或全部证书，无法正常连接到Fabric网络。${colors.reset}`);
            console.log(`${colors.yellow}请先确保WSL中的Fabric网络正在运行，然后执行上述命令复制证书。${colors.reset}`);
            
            console.log(`\n${colors.blue}在WSL中检查Fabric网络状态的命令:${colors.reset}`);
            console.log(`cd ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network && docker ps | grep peer0.org1`);
            
            console.log(`\n${colors.blue}如果Fabric网络未启动，请在WSL中运行:${colors.reset}`);
            console.log(`cd ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network`);
            console.log(`./network.sh down`);
            console.log(`./network.sh up createChannel -ca`);
            console.log(`./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-go -ccl go`);
        }
        
    } catch (error) {
        console.error(`${colors.red}检查证书状态时发生错误: ${error.message}${colors.reset}`);
        console.error(error.stack);
    }
}

// 执行
main(); 