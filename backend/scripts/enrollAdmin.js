import { Wallets, Gateway } from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import path from 'path';
import fs from 'fs';

// 注册管理员
async function enrollAdmin() {
    try {
        // 加载连接配置文件
        const ccpPath = path.resolve(process.cwd(), 'config', 'connection-org1.json');
        const fileExists = fs.existsSync(ccpPath);
        if (!fileExists) {
            throw new Error(`找不到连接配置文件: ${ccpPath}`);
        }
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // 创建CA客户端
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // 创建钱包实例
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // 检查管理员是否已存在
        const identity = await wallet.get('admin');
        if (identity) {
            console.log('管理员身份已存在');
            return;
        }

        // 登记管理员
        const enrollment = await ca.enroll({
            enrollmentID: 'admin',
            enrollmentSecret: 'adminpw'
        });

        // 创建身份对象
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        // 导入管理员身份到钱包
        await wallet.put('admin', x509Identity);
        console.log('管理员身份注册成功');

    } catch (error) {
        console.error(`注册管理员失败: ${error}`);
        process.exit(1);
    }
}

enrollAdmin();