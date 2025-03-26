import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const channelName = process.env.CHANNEL_NAME || 'mychannel';
const chaincodeName = process.env.CHAINCODE_ID || 'basic';
const orgMspId = process.env.ORGANIZATION_MSP_ID || 'Org1MSP';

// WSL 与 Windows 之间的路径转换
export function wslPathToWindows(wslPath) {
    try {
        // 使用 wslpath 命令将 WSL 路径转换为 Windows 路径
        // 注意: 这需要在 WSL 中执行，所以我们需要用户在 WSL 中执行命令
        return wslPath.replace(/^\/mnt\/([a-z])\//, '$1:/').replace(/\//g, '\\');
    } catch (error) {
        console.error('转换 WSL 路径失败:', error);
        return wslPath;
    }
}

export function windowsPathToWsl(windowsPath) {
    try {
        // 将 Windows 路径转换为 WSL 路径
        return windowsPath.replace(/^([A-Za-z]):/, '/mnt/$1').replace(/\\/g, '/').toLowerCase();
    } catch (error) {
        console.error('转换 Windows 路径失败:', error);
        return windowsPath;
    }
}

// 创建配置文件
export function createConnectionProfile() {
    const ccpPath = path.join(__dirname, '..', 'config', 'connection-org1.json');
    
    // 基本配置
    const connectionProfile = {
        "name": "test-network-org1",
        "version": "1.0.0",
        "client": {
            "organization": "Org1",
            "connection": {
                "timeout": {
                    "peer": {
                        "endorser": "300"
                    }
                }
            }
        },
        "organizations": {
            "Org1": {
                "mspid": "Org1MSP",
                "peers": [
                    "peer0.org1.example.com"
                ],
                "certificateAuthorities": [
                    "ca.org1.example.com"
                ]
            }
        },
        "peers": {
            "peer0.org1.example.com": {
                "url": "grpcs://localhost:7051",
                "tlsCACerts": {
                    "path": ""
                },
                "grpcOptions": {
                    "ssl-target-name-override": "peer0.org1.example.com",
                    "hostnameOverride": "peer0.org1.example.com"
                }
            }
        },
        "orderers": {
            "orderer.example.com": {
                "url": "grpcs://localhost:7050",
                "tlsCACerts": {
                    "path": ""
                },
                "grpcOptions": {
                    "ssl-target-name-override": "orderer.example.com",
                    "hostnameOverride": "orderer.example.com"
                }
            }
        },
        "certificateAuthorities": {
            "ca.org1.example.com": {
                "url": "https://localhost:7054",
                "caName": "ca-org1",
                "httpOptions": {
                    "verify": false
                },
                "tlsCACerts": {
                    "path": ""
                },
                "registrar": {
                    "enrollId": "admin",
                    "enrollSecret": "adminpw"
                }
            }
        }
    };
    
    // 添加证书内容而不是路径
    try {
        const certDir = path.resolve(__dirname, '..', 'certificates');
        if (fs.existsSync(certDir)) {
            // 添加TLS证书内容
            const tlsCertPath = path.join(certDir, 'tlsca.org1.example.com-cert.pem');
            const caCertPath = path.join(certDir, 'ca.org1.example.com-cert.pem');
            const ordererCertPath = path.join(certDir, 'orderer-ca.crt');
            
            if (fs.existsSync(ordererCertPath)) {
                const ordererCert = fs.readFileSync(ordererCertPath, 'utf8');
                connectionProfile.orderers['orderer.example.com'].tlsCACerts.pem = ordererCert;
                delete connectionProfile.orderers['orderer.example.com'].tlsCACerts.path;
                console.log('已添加Orderer证书内容');
            } else {
                console.warn('找不到Orderer证书文件');
            }
            
            if (fs.existsSync(tlsCertPath)) {
                const peerCert = fs.readFileSync(tlsCertPath, 'utf8');
                connectionProfile.peers['peer0.org1.example.com'].tlsCACerts.pem = peerCert;
                delete connectionProfile.peers['peer0.org1.example.com'].tlsCACerts.path;
                console.log('已添加Peer证书内容');
            } else {
                console.warn('找不到Peer TLS证书文件');
            }
            
            if (fs.existsSync(caCertPath)) {
                const caCert = fs.readFileSync(caCertPath, 'utf8');
                connectionProfile.certificateAuthorities['ca.org1.example.com'].tlsCACerts.pem = caCert;
                delete connectionProfile.certificateAuthorities['ca.org1.example.com'].tlsCACerts.path;
                console.log('已添加CA证书内容');
            } else {
                console.warn('找不到CA证书文件');
            }
        } else {
            console.warn('证书目录不存在:', certDir);
            console.warn('将使用空的证书路径');
        }
    } catch (error) {
        console.error('添加证书内容失败:', error);
    }
    
    fs.writeFileSync(ccpPath, JSON.stringify(connectionProfile, null, 2));
    console.log(`连接配置文件已创建: ${ccpPath}`);
    return connectionProfile;
}

// 复制证书到Windows
export function copyCertificatesToWindows() {
    try {
        const certDir = path.join(__dirname, '..', 'certificates');
        
        // 确保目录存在
        if (!fs.existsSync(certDir)) {
            fs.mkdirSync(certDir, { recursive: true });
        }
        
        console.log(`证书目录: ${certDir}`);
        
        // 显示WSL命令用于复制证书
        const wslCommand = `
mkdir -p /mnt/g/finalwork/BlockTraffic/BlockTraffic/backend/certificates
cp ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem /mnt/g/finalwork/BlockTraffic/BlockTraffic/backend/certificates/
cp ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem /mnt/g/finalwork/BlockTraffic/BlockTraffic/backend/certificates/
cp ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt /mnt/g/finalwork/BlockTraffic/BlockTraffic/backend/certificates/orderer-ca.crt
`;
        
        console.log('请在WSL中运行以下命令复制证书:');
        console.log(wslCommand);
        
        return { 
            success: true, 
            certDir,
            hasCertificates: fs.existsSync(path.join(certDir, 'ca.org1.example.com-cert.pem')) && 
                            fs.existsSync(path.join(certDir, 'tlsca.org1.example.com-cert.pem'))
        };
    } catch (error) {
        console.error('复制证书失败:', error);
        return { success: false, error: error.message };
    }
}

// 检查证书是否存在
export function checkCertificates() {
    const certDir = path.join(__dirname, '..', 'certificates');
    const caCertPath = path.join(certDir, 'ca.org1.example.com-cert.pem');
    const tlsCertPath = path.join(certDir, 'tlsca.org1.example.com-cert.pem');
    const ordererCertPath = path.join(certDir, 'orderer-ca.crt');
    
    const hasCaCert = fs.existsSync(caCertPath);
    const hasTlsCert = fs.existsSync(tlsCertPath);
    const hasOrdererCert = fs.existsSync(ordererCertPath);
    
    return {
        success: hasCaCert && hasTlsCert && hasOrdererCert,
        caCert: {path: caCertPath, exists: hasCaCert},
        tlsCert: {path: tlsCertPath, exists: hasTlsCert},
        ordererCert: {path: ordererCertPath, exists: hasOrdererCert}
    };
}

// 获取连接配置文件
export function getConnectionProfile() {
    // 首先尝试从配置目录读取
    const configPath = path.join(__dirname, '..', 'config', 'connection-org1.json');
    
    // 检查证书
    const certStatus = checkCertificates();
    
    try {
        if (fs.existsSync(configPath)) {
            // 从配置文件读取
            const configJson = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log('已从文件加载连接配置');
            
            // 检查并更新证书路径
            if (!certStatus.success) {
                console.log('在 Windows 环境中运行，无法直接访问 WSL 证书路径');
                console.log('请确保已复制证书到 backend/certificates 目录');
                console.log('将使用模拟数据模式运行应用');
            } else {
                console.log('已找到Windows环境下的证书文件，将使用本地证书路径');
                
                try {
                    // 读取证书内容而不是使用路径
                    const caCertContent = fs.readFileSync(certStatus.caCert.path, 'utf8');
                    const tlsCertContent = fs.readFileSync(certStatus.tlsCert.path, 'utf8');
                    const ordererCertContent = fs.readFileSync(certStatus.ordererCert.path, 'utf8');
                    
                    // 更新CA证书内容
                    if (configJson.certificateAuthorities && 
                        configJson.certificateAuthorities['ca.org1.example.com']) {
                        if (!configJson.certificateAuthorities['ca.org1.example.com'].tlsCACerts) {
                            configJson.certificateAuthorities['ca.org1.example.com'].tlsCACerts = {};
                        }
                        configJson.certificateAuthorities['ca.org1.example.com'].tlsCACerts.pem = caCertContent;
                        delete configJson.certificateAuthorities['ca.org1.example.com'].tlsCACerts.path;
                    }
                    
                    // 更新Peer TLS证书内容
                    if (configJson.peers && configJson.peers['peer0.org1.example.com']) {
                        if (!configJson.peers['peer0.org1.example.com'].tlsCACerts) {
                            configJson.peers['peer0.org1.example.com'].tlsCACerts = {};
                        }
                        configJson.peers['peer0.org1.example.com'].tlsCACerts.pem = tlsCertContent;
                        delete configJson.peers['peer0.org1.example.com'].tlsCACerts.path;
                    }
                    
                    // 更新Orderer TLS证书内容
                    if (configJson.orderers && configJson.orderers['orderer.example.com']) {
                        if (!configJson.orderers['orderer.example.com'].tlsCACerts) {
                            configJson.orderers['orderer.example.com'].tlsCACerts = {};
                        }
                        configJson.orderers['orderer.example.com'].tlsCACerts.pem = ordererCertContent;
                        delete configJson.orderers['orderer.example.com'].tlsCACerts.path;
                    }
                    
                    console.log('所有证书已成功加载到连接配置中');
                } catch (certError) {
                    console.error('读取证书文件失败:', certError);
                    console.log('将使用证书路径而不是内容');
                    
                    // 更新CA证书路径
                    if (configJson.certificateAuthorities && 
                        configJson.certificateAuthorities['ca.org1.example.com']) {
                        configJson.certificateAuthorities['ca.org1.example.com'].tlsCACerts.path = 
                            certStatus.caCert.path;
                    }
                    
                    // 更新Peer TLS证书路径
                    if (configJson.peers && configJson.peers['peer0.org1.example.com']) {
                        configJson.peers['peer0.org1.example.com'].tlsCACerts.path = 
                            certStatus.tlsCert.path;
                    }
                    
                    // 更新Orderer TLS证书路径
                    if (configJson.orderers && configJson.orderers['orderer.example.com']) {
                        configJson.orderers['orderer.example.com'].tlsCACerts.path = 
                            certStatus.ordererCert.path;
                    }
                }
            }
            
            return configJson;
        } else {
            // 如果文件不存在，创建一个
            console.log('连接配置文件不存在，将创建一个新的配置文件');
            const configJson = createConnectionProfile();
            
            // 保存到文件
            fs.writeFileSync(configPath, JSON.stringify(configJson, null, 2));
            
            return configJson;
        }
    } catch (error) {
        console.error('获取连接配置失败:', error);
        // 创建一个新的
        console.log('将创建一个新的连接配置');
        const configJson = createConnectionProfile();
        
        // 保存到文件
        try {
            fs.writeFileSync(configPath, JSON.stringify(configJson, null, 2));
        } catch (saveError) {
            console.error('保存连接配置失败:', saveError);
        }
        
        return configJson;
    }
}

// 构建管理员和用户注册函数
export function generateRegistrationCommands(adminId, userIds, orgName = 'org1') {
    const commands = [];
    
    // 管理员登记命令
    commands.push(`cd ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network && 
      export FABRIC_CA_CLIENT_HOME=~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network/organizations/peerOrganizations/${orgName}.example.com/ && 
      fabric-ca-client enroll -u https://admin:adminpw@localhost:7054 --caname ca-${orgName} --tls.certfiles ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network/organizations/fabric-ca/${orgName}/tls-cert.pem`);

    // 用户注册命令
    for (const userId of userIds) {
        commands.push(`cd ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network && 
          export FABRIC_CA_CLIENT_HOME=~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network/organizations/peerOrganizations/${orgName}.example.com/ && 
          fabric-ca-client register --caname ca-${orgName} --id.name ${userId} --id.secret ${userId}pw --id.type client --tls.certfiles ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network/organizations/fabric-ca/${orgName}/tls-cert.pem`);
    }
    
    return commands;
}

// 导出所有函数
export default {
    wslPathToWindows,
    windowsPathToWsl,
    createConnectionProfile,
    getConnectionProfile,
    generateRegistrationCommands,
    copyCertificatesToWindows
}; 