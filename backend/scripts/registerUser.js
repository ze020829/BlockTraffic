import pkg from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Wallets } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 删除用户身份
async function deleteUserIdentity(ca, adminUser, userId) {
    try {
        // 先获取用户身份信息
        const userInfo = await ca.getOne(userId, adminUser);
        if (userInfo) {
            // 使用remove方法删除用户身份
            await ca.remove({
                enrollmentID: userId,
                aki: userInfo.aki,
                serial: userInfo.serial
            }, adminUser);
            console.log(`用户 ${userId} 身份已从Fabric CA中删除`);
        }
    } catch (error) {
        if (error.message && error.message.includes('Identity does not exist')) {
            console.log(`用户 ${userId} 在Fabric CA中不存在`);
        } else {
            console.error(`删除用户身份失败: ${error}`);
            throw error;
        }
    }
}

// 获取连接配置
function getConnectionConfig(orgName) {
    try {
        // 尝试读取连接配置文件
        const ccpPath = path.resolve(__dirname, '..', 'config', `connection-${orgName}.json`);
        if (fs.existsSync(ccpPath)) {
            return JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        }

        // 如果文件不存在，创建一个默认配置
        console.log(`连接配置文件不存在，使用默认配置`);
        return {
            peers: {
                [`peer0.${orgName}.example.com`]: {
                    url: 'grpcs://localhost:7051'
                }
            },
            certificateAuthorities: {
                [`ca.${orgName}.example.com`]: {
                    url: process.env.FABRIC_CA_SERVER || 'https://localhost:7054',
                    caName: `ca-${orgName}`,
                    httpOptions: {
                        verify: false
                    },
                    tlsCACerts: {
                        pem: ''
                    }
                }
            },
            organizations: {
                [`${orgName}MSP`]: {
                    mspid: `${orgName}MSP`,
                    certificateAuthorities: [`ca.${orgName}.example.com`],
                    peers: [`peer0.${orgName}.example.com`]
                }
            }
        };
    } catch (error) {
        console.error(`获取连接配置失败: ${error}`);
        throw error;
    }
}

// 注册新用户
async function registerUser(userId, userSecret, orgName, force = false) {
    try {
        // 获取连接配置
        const ccp = getConnectionConfig(orgName);

        // 创建CA客户端
        const caInfo = ccp.certificateAuthorities[`ca.${orgName}.example.com`];
        const ca = new FabricCAServices(caInfo.url, { verify: false }, caInfo.caName);

        // 创建钱包
        const walletPath = path.join(__dirname, '..', 'wallet');
        if (!fs.existsSync(walletPath)) {
            fs.mkdirSync(walletPath, { recursive: true });
        }
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // 检查管理员是否已经注册
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.log('管理员身份不存在，正在注册管理员...');
            await registerAdmin(orgName);
        }

        // 获取管理员身份
        const updatedAdminIdentity = await wallet.get('admin');
        if (!updatedAdminIdentity) {
            throw new Error('管理员注册失败，无法继续注册用户');
        }

        // 获取管理员用户上下文
        const provider = wallet.getProviderRegistry().getProvider(updatedAdminIdentity.type);
        const adminUser = await provider.getUserContext(updatedAdminIdentity, 'admin');

        // 如果强制重新注册，先删除现有身份
        if (force) {
            // 从钱包中删除现有身份
            const userIdentity = await wallet.get(userId);
            if (userIdentity) {
                console.log(`用户 ${userId} 已存在，将重新注册`);
                await wallet.delete(userId);
            }
            
            // 从Fabric CA中删除用户身份
            await deleteUserIdentity(ca, adminUser, userId);
        } else {
            // 检查用户是否已经注册
            const userIdentity = await wallet.get(userId);
            if (userIdentity) {
                console.log(`用户 ${userId} 已经注册`);
                return;
            }
        }

        // 注册用户
        console.log(`正在注册用户 ${userId}...`);
        let secret = userSecret;
        if (!secret) {
            // 如果没有提供密码，则生成一个
            secret = await ca.register({
                affiliation: `${orgName}.department1`,
                enrollmentID: userId,
                role: 'client'
            }, adminUser);
        } else {
            // 使用提供的密码注册
            await ca.register({
                affiliation: `${orgName}.department1`,
                enrollmentID: userId,
                enrollmentSecret: userSecret,
                role: 'client'
            }, adminUser);
        }

        console.log(`用户 ${userId} 注册成功，正在进行登记...`);

        // 注册成功后进行登记
        const enrollment = await ca.enroll({
            enrollmentID: userId,
            enrollmentSecret: secret
        });

        // 创建用户身份
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: `${orgName}MSP`,
            type: 'X.509',
        };

        // 将用户身份保存到钱包
        await wallet.put(userId, x509Identity);

        console.log(`用户 ${userId} 登记成功并保存到钱包`);
        return true;
    } catch (error) {
        console.error(`注册用户失败: ${error.message || error}`);
        if (error.errors && error.errors.length > 0) {
            console.error('详细错误信息:', error.errors);
        }
        throw error;
    }
}

// 注册管理员
async function registerAdmin(orgName) {
    try {
        // 获取连接配置
        const ccp = getConnectionConfig(orgName);

        // 创建CA客户端
        const caInfo = ccp.certificateAuthorities[`ca.${orgName}.example.com`];
        const ca = new FabricCAServices(caInfo.url, { verify: false }, caInfo.caName);

        // 创建钱包
        const walletPath = path.join(__dirname, '..', 'wallet');
        if (!fs.existsSync(walletPath)) {
            fs.mkdirSync(walletPath, { recursive: true });
        }
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // 检查管理员是否已经注册
        const adminIdentity = await wallet.get('admin');
        if (adminIdentity) {
            console.log('管理员身份已存在');
            return true;
        }

        // 登记管理员（不是注册，管理员身份已经在CA服务器上预先配置）
        console.log('正在登记管理员...');
        const enrollment = await ca.enroll({
            enrollmentID: process.env.FABRIC_CA_ADMIN_ID || 'admin',
            enrollmentSecret: process.env.FABRIC_CA_ADMIN_SECRET || 'adminpw'
        });

        // 创建管理员身份
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: `${orgName}MSP`,
            type: 'X.509',
        };

        // 将管理员身份保存到钱包
        await wallet.put('admin', x509Identity);

        console.log('管理员身份登记成功并保存到钱包');
        return true;
    } catch (error) {
        console.error(`登记管理员失败: ${error.message || error}`);
        if (error.errors && error.errors.length > 0) {
            console.error('详细错误信息:', error.errors);
        }
        throw error;
    }
}

// 使用示例
async function main() {
    try {
        // 获取命令行参数
        const args = process.argv.slice(2);
        const force = args.includes('--force');
        const isAdmin = args.includes('--admin');

        if (isAdmin) {
            // 注册管理员
            await registerAdmin('org1');
            console.log('管理员注册完成');
        } else {
            // 注册普通用户
            const userId = args[0] || 'user1';
            const userSecret = args[1] || 'user1pw';
            await registerUser(userId, userSecret, 'org1', force);
            console.log('用户注册完成');
        }
    } catch (error) {
        console.error('注册过程出错:', error);
    }
}

// 如果直接运行脚本则执行main
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { registerUser, registerAdmin };