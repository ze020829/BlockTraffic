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

// 生成随机 ID
function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

// 生成交通数据
function generateTrafficData() {
    console.log(`${colors.blue}生成模拟交通数据...${colors.reset}`);
    
    const types = ['congestion', 'construction', 'accident', 'normal'];
    const descriptions = [
        '道路拥堵，车辆缓慢行驶',
        '前方正在进行道路施工，请绕行',
        '交通事故，请谨慎驾驶',
        '道路畅通，可以正常行驶',
        '临时交通管制，请按指示行驶',
        '前方发生车辆故障，占用一条车道',
        '道路积水，请减速慢行',
        '道路结冰，请注意安全'
    ];
    
    const locations = [
        {
            name: '成都市武侯区天府大道',
            position: { lng: 104.0668, lat: 30.5728 }
        },
        {
            name: '成都市锦江区春熙路',
            position: { lng: 104.0817, lat: 30.6571 }
        },
        {
            name: '成都市青羊区人民中路',
            position: { lng: 104.0638, lat: 30.6726 }
        },
        {
            name: '成都市高新区天府软件园',
            position: { lng: 104.0668, lat: 30.5369 }
        },
        {
            name: '成都市双流区双流国际机场',
            position: { lng: 103.9474, lat: 30.5784 }
        }
    ];
    
    const mockTrafficData = {
        pending: [],  // 待确认的路况
        verified: []  // 已确认的路况
    };
    
    // 生成已验证的交通信息
    for (let i = 0; i < 10; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];
        const locationData = locations[Math.floor(Math.random() * locations.length)];
        const now = Date.now();
        const timestamp = now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000); // 过去7天内
        
        mockTrafficData.verified.push({
            id: generateId('traffic'),
            type,
            description,
            location: locationData.name,
            position: locationData.position,
            timestamp,
            status: 'verified',
            verifications: 5,
            verifiedBy: ['user1', 'user2', 'user3', 'user4', 'user5'].slice(0, 5),
            images: [
                {
                    name: 'image1.jpg',
                    url: `https://picsum.photos/300/200?random=${i}`
                }
            ]
        });
    }
    
    // 生成待验证的交通信息
    for (let i = 0; i < 8; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];
        const locationData = locations[Math.floor(Math.random() * locations.length)];
        const now = Date.now();
        const timestamp = now - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000); // 过去3天内
        const verifications = Math.floor(Math.random() * 4) + 1; // 1-4次验证
        
        // 随机选择已验证的用户
        const verifiedUsers = [];
        const allUsers = ['user1', 'user2', 'user3', 'user4', 'user5'];
        for (let j = 0; j < verifications; j++) {
            const randomIndex = Math.floor(Math.random() * allUsers.length);
            verifiedUsers.push(allUsers[randomIndex]);
            allUsers.splice(randomIndex, 1);
        }
        
        mockTrafficData.pending.push({
            id: generateId('pending'),
            type,
            description,
            location: locationData.name,
            position: locationData.position,
            timestamp,
            status: 'pending',
            verifications,
            verifiedBy: verifiedUsers,
            images: [
                {
                    name: 'image1.jpg',
                    url: `https://picsum.photos/300/200?random=${i + 20}`
                }
            ]
        });
    }
    
    // 保存到文件
    const mockDataPath = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(mockDataPath)) {
        fs.mkdirSync(mockDataPath, { recursive: true });
    }
    
    const trafficDataPath = path.join(mockDataPath, 'traffic.json');
    fs.writeFileSync(trafficDataPath, JSON.stringify(mockTrafficData, null, 2));
    
    console.log(`${colors.green}已生成 ${mockTrafficData.verified.length} 条已验证交通数据和 ${mockTrafficData.pending.length} 条待验证交通数据${colors.reset}`);
    console.log(`${colors.green}数据已保存到: ${trafficDataPath}${colors.reset}\n`);
    
    return mockTrafficData;
}

// 生成用户数据
function generateUserData() {
    console.log(`${colors.blue}生成模拟用户数据...${colors.reset}`);
    
    const mockUsers = {
        admin: {
            id: 'admin',
            username: 'admin',
            password: 'adminpw',  // 仅用于演示，实际应用中应加密
            role: 'admin',
            credits: 1000,
            reputation: 100,
            createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,  // 30天前
            lastLogin: Date.now() - 2 * 24 * 60 * 60 * 1000  // 2天前
        }
    };
    
    // 生成普通用户
    const firstNames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴'];
    const lastNames = ['伟', '芳', '娜', '秀英', '敏', '静', '强', '磊', '洋', '艳'];
    
    for (let i = 1; i <= 5; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const username = `${firstName}${lastName}`;
        
        mockUsers[`user${i}`] = {
            id: `user${i}`,
            username,
            password: `password${i}`,  // 仅用于演示，实际应用中应加密
            role: 'user',
            credits: Math.floor(Math.random() * 500) + 100,
            reputation: Math.floor(Math.random() * 50) + 10,
            createdAt: Date.now() - Math.floor(Math.random() * 20) * 24 * 60 * 60 * 1000,
            lastLogin: Date.now() - Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000
        };
    }
    
    // 保存到文件
    const mockDataPath = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(mockDataPath)) {
        fs.mkdirSync(mockDataPath, { recursive: true });
    }
    
    const usersDataPath = path.join(mockDataPath, 'users.json');
    fs.writeFileSync(usersDataPath, JSON.stringify(mockUsers, null, 2));
    
    console.log(`${colors.green}已生成 ${Object.keys(mockUsers).length} 个用户数据${colors.reset}`);
    console.log(`${colors.green}数据已保存到: ${usersDataPath}${colors.reset}\n`);
    
    return mockUsers;
}

// 主函数
function main() {
    try {
        console.log(`${colors.cyan}开始生成模拟数据...${colors.reset}\n`);
        
        const trafficData = generateTrafficData();
        const userData = generateUserData();
        
        console.log(`${colors.cyan}模拟数据生成完成！${colors.reset}`);
        console.log(`${colors.yellow}提示: 在 Fabric 网络不可用时，可以使用这些模拟数据进行开发和测试${colors.reset}`);
        
    } catch (error) {
        console.log(`${colors.red}生成模拟数据时出错: ${error.message}${colors.reset}`);
        console.log(error.stack);
    }
}

// 执行主函数
main(); 