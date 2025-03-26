#!/bin/bash

# 设置颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}开始Fabric CA连接测试...${NC}"

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js未安装，请先安装Node.js${NC}"
    exit 1
fi

# 检查依赖
echo -e "${YELLOW}检查依赖...${NC}"
MISSING_DEPS=0
for pkg in fabric-ca-client fabric-network dotenv; do
    if ! npm list $pkg --silent 2>/dev/null | grep -q $pkg; then
        echo -e "${YELLOW}安装缺失的依赖: $pkg${NC}"
        npm install $pkg
    fi
done

# 创建.env文件
if [ ! -f "../.env" ]; then
    echo -e "${YELLOW}创建.env文件...${NC}"
    cat > ../.env << 'EOL'
# Fabric 网络配置
FABRIC_CA_CLIENT_HOME=/tmp/fabric-ca-client
FABRIC_CA_SERVER=https://localhost:7054
FABRIC_CA_ADMIN_ID=admin
FABRIC_CA_ADMIN_SECRET=adminpw
ORGANIZATION_MSP_ID=Org1MSP
PORT=3000
EOL
    echo -e "${GREEN}.env文件已创建${NC}"
else
    echo -e "${GREEN}.env文件已存在${NC}"
fi

# 确保wallet目录存在
if [ ! -d "../wallet" ]; then
    echo -e "${YELLOW}创建wallet目录...${NC}"
    mkdir -p ../wallet
    echo -e "${GREEN}wallet目录已创建${NC}"
fi

# 运行注册管理员脚本
echo -e "${YELLOW}注册管理员...${NC}"
node registerUser.js --admin
if [ $? -eq 0 ]; then
    echo -e "${GREEN}管理员注册成功${NC}"
else
    echo -e "${RED}管理员注册失败${NC}"
    
    # 调试信息
    echo -e "${YELLOW}检查Fabric CA服务状态...${NC}"
    docker ps | grep fabric-ca
    
    echo -e "${YELLOW}检查Fabric CA服务日志...${NC}"
    docker logs $(docker ps -q --filter name=ca_org1) 2>&1 | tail -n 20
    
    echo -e "${YELLOW}检查网络连接...${NC}"
    curl -k https://localhost:7054/cainfo 2>/dev/null || echo -e "${RED}无法连接到Fabric CA服务${NC}"
    
    echo -e "${YELLOW}可能的解决方案:${NC}"
    echo "1. 确保Fabric测试网络正在运行"
    echo "2. 检查CA服务地址是否正确 (默认: https://localhost:7054)"
    echo "3. 确保管理员凭证正确 (默认: admin/adminpw)"
    echo "4. 尝试重新启动Fabric网络: cd fabric-samples/test-network && ./network.sh down && ./network.sh up createChannel -ca"
    exit 1
fi

# 测试用户注册
echo -e "${YELLOW}测试用户注册...${NC}"
node registerUser.js user1 user1pw --force
if [ $? -eq 0 ]; then
    echo -e "${GREEN}用户注册测试成功${NC}"
else
    echo -e "${RED}用户注册测试失败${NC}"
    exit 1
fi

echo -e "${GREEN}所有测试完成，Fabric CA连接正常${NC}"
echo -e "${YELLOW}可以开始运行应用: cd .. && npm run dev${NC}"

exit 0 