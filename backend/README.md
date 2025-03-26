# 区块链交通信息系统 - 后端

本系统是一个基于区块链的交通信息共享平台，用户可以提交和验证交通信息，并获得积分奖励。系统使用 Hyperledger Fabric 作为底层区块链，IPFS 作为分布式存储。

## 系统架构

- **区块链**：Hyperledger Fabric (在WSL中运行)
- **分布式存储**：IPFS (在Windows中运行)
- **后端**：Node.js + Express
- **前端**：React

## 快速开始

### 环境要求
- Windows系统安装WSL2
- WSL中安装Docker和Hyperledger Fabric
- Windows中安装IPFS
- Node.js v16+

### 配置步骤

1. 在WSL中准备Fabric网络
```bash
# 在WSL中执行以下命令
cd ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network
./network.sh down
./network.sh up createChannel -ca
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-go -ccl go
```

2. **复制证书文件（非常重要！）**
```bash
# 在WSL中执行以下命令
mkdir -p /mnt/g/finalwork/BlockTraffic/BlockTraffic/backend/certificates
cp ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem /mnt/g/finalwork/BlockTraffic/BlockTraffic/backend/certificates/
cp ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem /mnt/g/finalwork/BlockTraffic/BlockTraffic/backend/certificates/
cp ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt /mnt/g/finalwork/BlockTraffic/BlockTraffic/backend/certificates/orderer-ca.crt
```

3. 在Windows中启动IPFS
```powershell
# 在Windows中执行以下命令
cd D:/ipfs  # 替换为你的IPFS安装目录
ipfs daemon
```

4. 初始化项目
```bash
# 在Windows终端中执行
cd backend
npm run init
```

5. 检查证书状态
```bash
npm run check-cert
```

6. 注册用户
```bash
npm run register
```

7. 测试IPFS连接
```bash
npm run test-ipfs
```

8. 清理旧数据
```bash
npm run clean-data
```

9. 启动服务
```bash
npm start
```

## 证书管理

系统需要三种证书文件才能正常连接到Fabric网络：

1. **CA证书**: `ca.org1.example.com-cert.pem` - 用于CA服务的TLS连接
2. **TLS证书**: `tlsca.org1.example.com-cert.pem` - 用于Peer节点的TLS连接
3. **Orderer证书**: `orderer-ca.crt` - 用于Orderer节点的TLS连接，**这个证书是最容易被忽略的**

### Orderer证书特别说明

Orderer证书（`orderer-ca.crt`）是从WSL中的`ca.crt`文件复制而来，它对于连接到Fabric网络的Orderer节点至关重要。如果这个证书不存在或内容不正确，系统将无法连接到Orderer节点，导致以下错误：

```
Error: Failed to connect before the deadline on Committer- name: orderer.example.com
```

如果遇到此错误，请检查：
1. 证书文件是否存在（使用`npm run check-cert`）
2. 证书内容是否正确（应包含BEGIN CERTIFICATE和END CERTIFICATE标记）
3. 确保Fabric网络在WSL中正常运行（使用`docker ps | grep orderer`）

### 如何修复Orderer证书问题

如果证书验证失败，请在WSL中执行以下命令重新复制：

```bash
# 在WSL终端中执行
cp ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt /mnt/g/finalwork/BlockTraffic/BlockTraffic/backend/certificates/orderer-ca.crt
```

然后删除连接配置文件，让系统重新创建：

```bash
# 在Windows终端中执行
cd backend
rm -f config/connection-org1.json
```

## API接口

### 用户管理
- `POST /api/user/register`: 注册新用户
- `POST /api/user/enroll-admin`: 注册管理员
- `GET /api/user/identity/:userId`: 获取用户身份信息
- `GET /api/user/credits/:userId`: 获取用户积分
- `GET /api/user/reputation/:userId`: 获取用户信誉度

### 交通信息
- `POST /api/traffic/upload`: 上传交通信息
- `GET /api/traffic/nearby`: 获取附近交通信息
- `GET /api/traffic/pending`: 获取待确认交通信息
- `POST /api/traffic/verify`: 确认交通信息
- `POST /api/traffic/admin-verify`: 管理员确认交通信息
- `GET /api/traffic/:hash`: 获取特定交通信息
- `GET /api/traffic/:hash/image`: 获取交通信息图片

## 目录结构

```
backend/
├── config/          # 配置文件
├── certificates/    # 证书文件
├── data/            # 本地数据
├── routes/          # API路由
├── scripts/         # 工具脚本
├── utils/           # 工具类
├── wallet/          # 身份钱包
├── server.js        # 服务入口
└── .env             # 环境变量
```

## 特别说明

- 系统不再使用模拟数据，所有交通信息都会存储在IPFS和Fabric链码中
- 用户的信誉度和代币数据由链码管理
- IPFS运行在Windows本地环境中，而不是WSL中
- 链码设计简化为仅管理用户信誉度和代币数量

## 常见问题解决

1. **"access denied"错误**
   - 确保已从WSL复制所有必要的证书文件
   - 检查Fabric网络是否正在运行
   - 使用`npm run check-cert`检查证书状态
   - 确保使用的用户身份有权限访问通道

2. **无法连接到Orderer节点**
   - 确保orderer-ca.crt证书已正确复制
   - 确保WSL中的Fabric网络正在运行
   - 检查防火墙设置是否阻止了端口7050
   - 尝试删除config/connection-org1.json文件并重启服务

3. **IPFS连接问题**
   - 确保IPFS守护进程正在Windows中运行
   - 检查.env中的IPFS地址配置是否正确
   - 使用`npm run test-ipfs`测试连接

## 故障排除步骤

如果连接Fabric网络时出现问题，请按照以下步骤操作：

1. 检查WSL中的Fabric网络状态：
```bash
cd ~/hyperledger-fabric/fabric/scripts/fabric-samples/test-network
docker ps | grep peer0.org1
docker ps | grep orderer
```

2. 确认所有证书存在并有效：
```bash
npm run check-cert
```

3. 删除连接配置文件，强制重新生成：
```bash
rm -f config/connection-org1.json
```

4. 重启服务：
```bash
npm run dev
```

5. 查看详细日志以定位问题：
```bash
# 查看错误信息
tail -f logs/error.log
``` 