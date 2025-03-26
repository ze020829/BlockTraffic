#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # 无颜色

# 检查是否在WSL环境中运行
if ! grep -q Microsoft /proc/version; then
    echo -e "${RED}错误: 此脚本必须在WSL环境中运行${NC}"
    exit 1
fi

# 设置工作目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
WORKSPACE_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FABRIC_SAMPLES_PATH="$HOME/hyperledger-fabric/fabric/scripts/fabric-samples"

echo -e "${CYAN}===========================================${NC}"
echo -e "${CYAN}    区块链交通信息系统 - 网络设置脚本     ${NC}"
echo -e "${CYAN}===========================================${NC}"
echo -e "${YELLOW}工作目录: ${WORKSPACE_DIR}${NC}"

# 检查必要软件
echo -e "\n${MAGENTA}[1/6] 检查必要软件...${NC}"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js 未安装. 请安装 Node.js (推荐 v16 或更高版本)${NC}"
    exit 1
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}Node.js 已安装: ${NODE_VERSION}${NC}"
fi

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker 未安装. 请安装 Docker${NC}"
    exit 1
else
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}Docker 已安装: ${DOCKER_VERSION}${NC}"
fi

# 检查Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose 未安装. 请安装 Docker Compose${NC}"
    exit 1
else
    DOCKER_COMPOSE_VERSION=$(docker-compose --version)
    echo -e "${GREEN}Docker Compose 已安装: ${DOCKER_COMPOSE_VERSION}${NC}"
fi

# 检查Fabric环境
echo -e "\n${MAGENTA}[2/6] 检查Fabric环境...${NC}"

if [ ! -d "$FABRIC_SAMPLES_PATH" ]; then
    echo -e "${YELLOW}Fabric Samples 未找到. 是否要安装? (y/n)${NC}"
    read -r INSTALL_FABRIC
    
    if [[ "$INSTALL_FABRIC" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}正在安装Fabric环境...${NC}"
        
        # 创建安装目录
        mkdir -p "$HOME/hyperledger-fabric/fabric/scripts"
        cd "$HOME/hyperledger-fabric/fabric/scripts"
        
        # 下载安装脚本
        curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/bootstrap.sh > bootstrap.sh
        chmod +x bootstrap.sh
        
        # 安装Fabric环境
        ./bootstrap.sh
        
        echo -e "${GREEN}Fabric环境安装完成${NC}"
    else
        echo -e "${RED}Fabric环境是必需的，无法继续${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Fabric环境已存在: ${FABRIC_SAMPLES_PATH}${NC}"
fi

# 启动测试网络
echo -e "\n${MAGENTA}[3/6] 启动Fabric测试网络...${NC}"

cd "$FABRIC_SAMPLES_PATH/test-network"

# 关闭已有网络
./network.sh down

# 启动网络
echo -e "${BLUE}正在启动网络...${NC}"
./network.sh up createChannel -c mychannel -ca

# 检查网络状态
if [ $? -eq 0 ]; then
    echo -e "${GREEN}网络启动成功${NC}"
else
    echo -e "${RED}网络启动失败${NC}"
    exit 1
fi

# 部署链码
echo -e "\n${MAGENTA}[4/6] 部署智能合约...${NC}"

echo -e "${BLUE}正在部署基础链码...${NC}"
./network.sh deployCC -c mychannel -ccn basic -ccp ../asset-transfer-basic/chaincode-javascript -ccl javascript

if [ $? -eq 0 ]; then
    echo -e "${GREEN}智能合约部署成功${NC}"
else
    echo -e "${RED}智能合约部署失败${NC}"
    exit 1
fi

# 设置配置文件
echo -e "\n${MAGENTA}[5/6] 配置连接文件...${NC}"

# 创建配置目录
WINDOWS_CONFIG_DIR="${WORKSPACE_DIR}/backend/config"
mkdir -p "$WINDOWS_CONFIG_DIR"

# 复制连接配置
cp "$FABRIC_SAMPLES_PATH/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json" "$WINDOWS_CONFIG_DIR/"

# 复制证书
WINDOWS_CERT_DIR="${WORKSPACE_DIR}/backend/certificates"
mkdir -p "$WINDOWS_CERT_DIR"

cp "$FABRIC_SAMPLES_PATH/test-network/organizations/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem" "$WINDOWS_CERT_DIR/"
cp "$FABRIC_SAMPLES_PATH/test-network/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem" "$WINDOWS_CERT_DIR/"

echo -e "${GREEN}配置文件设置完成${NC}"

# 启动IPFS
echo -e "\n${MAGENTA}[6/6] 设置IPFS...${NC}"

# 检查IPFS是否安装
if ! command -v ipfs &> /dev/null; then
    echo -e "${YELLOW}IPFS 未找到. 是否要安装? (y/n)${NC}"
    read -r INSTALL_IPFS
    
    if [[ "$INSTALL_IPFS" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}正在安装IPFS...${NC}"
        
        # 下载IPFS
        wget https://dist.ipfs.tech/kubo/v0.15.0/kubo_v0.15.0_linux-amd64.tar.gz
        tar -xvzf kubo_v0.15.0_linux-amd64.tar.gz
        cd kubo
        sudo bash install.sh
        
        # 初始化IPFS
        ipfs init
        
        echo -e "${GREEN}IPFS安装完成${NC}"
    else
        echo -e "${YELLOW}跳过IPFS安装${NC}"
    fi
else
    echo -e "${GREEN}IPFS已安装${NC}"
fi

# 启动IPFS守护进程
# 检查是否已经运行
if pgrep -x "ipfs" > /dev/null; then
    echo -e "${YELLOW}IPFS守护进程已在运行${NC}"
else
    echo -e "${BLUE}启动IPFS守护进程...${NC}"
    ipfs daemon &
    echo -e "${GREEN}IPFS守护进程已启动${NC}"
fi

# 完成设置
echo -e "\n${GREEN}==================================================${NC}"
echo -e "${GREEN}区块链网络设置完成!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo -e "${CYAN}请在Windows环境中运行以下命令注册管理员和用户:${NC}"
echo -e "${YELLOW}cd ${WORKSPACE_DIR}/backend/scripts${NC}"
echo -e "${YELLOW}node register-all-users.js${NC}"

echo -e "\n${BLUE}您可以使用以下命令查看区块链网络日志:${NC}"
echo -e "${YELLOW}cd $FABRIC_SAMPLES_PATH/test-network${NC}"
echo -e "${YELLOW}docker logs -f peer0.org1.example.com${NC}"

echo -e "\n${CYAN}您可以使用以下命令查看IPFS网关:${NC}"
echo -e "${YELLOW}http://localhost:5001/webui${NC}" 