#!/usr/bin/env node

import fabricUtils from '../utils/fabric-utils.js';

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

// 初始化链码
async function initLedger() {
    try {
        console.log(`${colors.cyan}开始初始化区块链账本...${colors.reset}`);
        
        // 初始化Fabric连接
        await fabricUtils.initialize('admin');
        console.log(`${colors.green}成功连接到Fabric网络${colors.reset}`);
        
        // 调用InitLedger函数初始化账本
        try {
            console.log(`${colors.yellow}正在调用InitLedger函数...${colors.reset}`);
            const result = await fabricUtils.invoke('InitLedger');
            console.log(`${colors.green}账本初始化成功: ${result}${colors.reset}`);
            
            // 验证初始化结果
            console.log(`${colors.yellow}验证初始化结果，尝试获取所有资产...${colors.reset}`);
            const assets = await fabricUtils.query('GetAllAssets');
            console.log(`${colors.green}获取资产成功，资产列表:${colors.reset}`);
            console.log(assets);
        } catch (error) {
            console.log(`${colors.red}初始化账本失败: ${error.message}${colors.reset}`);
            
            // 如果失败，检查是否支持其他函数
            console.log(`${colors.yellow}尝试检查链码是否支持其他初始化函数...${colors.reset}`);
            
            try {
                // 如果是自定义链码，可能有其他初始化函数
                const result = await fabricUtils.invoke('Initialize');
                console.log(`${colors.green}使用'Initialize'函数初始化成功: ${result}${colors.reset}`);
            } catch (error2) {
                console.log(`${colors.red}备用初始化函数'Initialize'也不可用: ${error2.message}${colors.reset}`);
                console.log(`${colors.yellow}可能需要检查链码的源代码，找到正确的初始化函数${colors.reset}`);
                
                console.log(`${colors.blue}提示: 如果您使用的是asset-transfer-basic示例，可能链码已经在部署时初始化了${colors.reset}`);
                console.log(`${colors.blue}您可以尝试直接调用链码的查询函数，例如GetAllAssets${colors.reset}`);
            }
        }
        
        // 断开连接
        fabricUtils.disconnect();
        console.log(`${colors.cyan}初始化过程完成${colors.reset}`);
        
    } catch (error) {
        console.error(`${colors.red}初始化过程中发生错误: ${error}${colors.reset}`);
        console.error(error.stack);
    }
}

// 执行
initLedger(); 