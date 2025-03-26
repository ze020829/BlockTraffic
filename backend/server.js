import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { Wallets, Gateway } from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 检查是否在 WSL 环境中运行
function isRunningInWSL() {
    try {
        const release = fs.readFileSync('/proc/version', 'utf8');
        return release.toLowerCase().includes('microsoft');
    } catch (error) {
        return false;
    }
}

// 修复证书路径
function fixCertificatePaths(ccpJson) {
    // 如果是 Windows 环境，尝试转换 WSL 路径
    if (!isRunningInWSL()) {
        try {
            // 深拷贝对象
            const ccp = JSON.parse(JSON.stringify(ccpJson));
            
            // 使用模拟数据标记
            ccp.usingMockData = true;
            
            console.log('在 Windows 环境中运行，无法直接访问 WSL 证书路径');
            console.log('将使用模拟数据模式运行应用');
            
            return ccp;
        } catch (error) {
            console.error('修复证书路径时出错:', error);
            return ccpJson;
        }
    }
    return ccpJson;
}

// 从文件读取或创建默认连接配置
function getConnectionProfile() {
    const ccpPath = path.resolve(__dirname, 'config', 'connection-org1.json');
    
    try {
        if (fs.existsSync(ccpPath)) {
            const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
            const ccp = JSON.parse(ccpJSON);
            console.log('已从文件加载连接配置');
            return fixCertificatePaths(ccp);
        }
    } catch (error) {
        console.error('读取连接配置文件失败:', error);
    }
    
    // 创建默认配置
    console.log('创建默认连接配置');
    const defaultCCP = {
        name: "fabric-network",
        version: "1.0.0",
        client: {
            organization: "Org1MSP",
            connection: { timeout: { peer: { endorser: "300" } } }
        },
        channels: {
            mychannel: {
                orderers: ["orderer.example.com"],
                peers: { "peer0.org1.example.com": {} }
            }
        },
        organizations: {
            Org1MSP: {
                mspid: "Org1MSP",
                peers: ["peer0.org1.example.com"],
                certificateAuthorities: ["ca.org1.example.com"]
            }
        },
        orderers: {
            "orderer.example.com": {
                url: "grpcs://localhost:7050",
                grpcOptions: { "ssl-target-name-override": "orderer.example.com" }
            }
        },
        peers: {
            "peer0.org1.example.com": {
                url: "grpcs://localhost:7051",
                grpcOptions: { "ssl-target-name-override": "peer0.org1.example.com" }
            }
        },
        certificateAuthorities: {
            "ca.org1.example.com": {
                url: process.env.FABRIC_CA_SERVER || "https://localhost:7054",
                caName: "ca-org1",
                httpOptions: { verify: false }
            }
        }
    };
    
    return fixCertificatePaths(defaultCCP);
}

// 初始化钱包
const walletPath = path.join(__dirname, 'wallet');
if (!fs.existsSync(walletPath)) {
    fs.mkdirSync(walletPath, { recursive: true });
}
// 使用新的 Wallets 类初始化文件系统钱包
const wallet = await Wallets.newFileSystemWallet(walletPath);

// 配置 CA 客户端
const ccp = getConnectionProfile();

// 路由
import trafficRoutes from './routes/traffic.js';
import userRoutes from './routes/user.js';

app.use('/api/traffic', trafficRoutes);
app.use('/api/user', userRoutes);

// 确保使用正确的 CA 管理员凭证
async function enrollAdmin() {
  try {
    // 检查管理员是否已经存在于钱包中
    const identity = await wallet.get('admin');
    if (identity) {
      console.log('管理员身份已存在于钱包中');
      return;
    }

    // 设置 CA 客户端连接
    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    const caClient = new FabricCAServices(caInfo.url, { verify: false }, caInfo.caName);

    // 登记管理员
    const enrollment = await caClient.enroll({
      enrollmentID: process.env.FABRIC_CA_ADMIN_ID || 'admin',
      enrollmentSecret: process.env.FABRIC_CA_ADMIN_SECRET || 'adminpw'
    });
    
    // 创建身份对象
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: process.env.ORGANIZATION_MSP_ID || 'Org1MSP',
      type: 'X.509',
    };

    // 将管理员身份保存到钱包
    await wallet.put('admin', x509Identity);
    console.log('管理员登记成功');
    return caClient;
  } catch (error) {
    console.error('管理员登记失败:', error);
    throw error;
  }
}

// 修改用户注册函数
async function registerUser(username) {
  try {
    // 获取 CA 连接信息
    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    const caClient = new FabricCAServices(caInfo.url, { verify: false }, caInfo.caName);
    
    // 检查用户是否已存在
    const userIdentity = await wallet.get(username);
    if (userIdentity) {
      console.log(`用户 ${username} 已存在于钱包中`);
      return;
    }

    // 确保管理员已登记
    await enrollAdmin();

    // 获取管理员身份
    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
      throw new Error('需要先登记管理员身份');
    }

    // 创建管理员用户对象
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    // 注册用户
    console.log(`正在注册用户 ${username}...`);
    const secret = await caClient.register({
      affiliation: 'org1.department1',
      enrollmentID: username,
      role: 'client'
    }, adminUser);

    // 登记用户
    const enrollment = await caClient.enroll({
      enrollmentID: username,
      enrollmentSecret: secret
    });

    // 创建用户身份
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: process.env.ORGANIZATION_MSP_ID || 'Org1MSP',
      type: 'X.509',
    };

    // 保存用户身份到钱包
    await wallet.put(username, x509Identity);
    console.log(`用户 ${username} 注册成功`);
  } catch (error) {
    console.error(`注册用户失败: ${error.message}`);
    console.error(`详细错误信息: ${error.errors || error}`);
    throw new Error(`注册过程出错: ${error.message}`);
  }
}

// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '服务器正常运行' });
});

// 管理员状态检查接口
app.get('/api/admin-status', async (req, res) => {
    try {
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const identity = await wallet.get('admin');
        
        res.json({
            adminExists: !!identity,
            message: identity ? '管理员身份存在' : '管理员身份不存在，请先注册管理员'
        });
    } catch (error) {
        res.status(500).json({
            error: '检查管理员状态失败',
            message: error.message
        });
    }
});

// Fabric 网络状态检查接口
app.get('/api/fabric-status', async (req, res) => {
    try {
        // 读取连接配置
        const ccpPath = path.resolve(__dirname, 'config', 'connection-org1.json');
        let ccp;
        try {
            ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        } catch (error) {
            return res.status(500).json({
                status: 'error',
                connected: false,
                message: '无法读取连接配置文件',
                error: error.message,
                configPath: ccpPath
            });
        }
        
        // 尝试连接到 Fabric 网络的 peer 和 orderer
        const peerUrl = ccp.peers['peer0.org1.example.com'].url;
        const ordererUrl = ccp.orderers['orderer.example.com'].url;
        
        // 构建响应对象
        const response = {
            status: 'checking',
            connected: false,
            peerUrl,
            ordererUrl,
            config: {
                exists: true,
                path: ccpPath
            },
            ports: {
                peer: peerUrl.match(/:(\d+)/)[1],
                orderer: ordererUrl.match(/:(\d+)/)[1]
            }
        };
        
        // 检查钱包状态
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const adminIdentity = await wallet.get('admin');
        
        response.wallet = {
            path: walletPath,
            exists: true,
            adminExists: !!adminIdentity
        };
        
        // 返回包含连接信息的响应
        res.json(response);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            connected: false,
            message: '检查 Fabric 网络状态失败',
            error: error.message
        });
    }
});

// 导出函数供路由使用
export { enrollAdmin, registerUser, wallet };

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器已启动，运行在端口 ${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/api/health`);
  console.log(`管理员状态检查: http://localhost:${PORT}/api/admin-status`);
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
