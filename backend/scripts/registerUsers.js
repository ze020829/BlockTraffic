import { registerUser } from './registerUser.js';

// 用户列表
const users = [
    { id: 'user1', secret: 'user1pw', org: 'org1' },
    { id: 'user2', secret: 'user2pw', org: 'org1' },
    { id: 'user3', secret: 'user3pw', org: 'org1' },
    { id: 'user4', secret: 'user4pw', org: 'org2' },
    { id: 'user5', secret: 'user5pw', org: 'org2' }
];

async function registerAllUsers(force = false) {
    console.log('开始注册用户...');
    
    for (const user of users) {
        try {
            await registerUser(user.id, user.secret, user.org, force);
            console.log(`用户 ${user.id} 注册成功`);
        } catch (error) {
            console.error(`用户 ${user.id} 注册失败:`, error);
        }
    }
    
    console.log('用户注册完成');
}

// 获取命令行参数
const args = process.argv.slice(2);
const force = args.includes('--force');

// 执行注册
registerAllUsers(force).catch(error => {
    console.error('注册过程出错:', error);
    process.exit(1);
}); 