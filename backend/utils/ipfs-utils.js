import { create } from 'ipfs-http-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 在 ES 模块中定义 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class IPFSUtils {
    constructor() {
        this.ipfsApiUrl = process.env.IPFS_API_URL || 'http://127.0.0.1:5001';
        this.ipfsGateway = process.env.IPFS_GATEWAY || 'http://127.0.0.1:8080';
        this.cacheDir = path.join(__dirname, '..', 'data', 'ipfs-cache');
        
        // 确保缓存目录存在
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
        
        // 初始化 IPFS 客户端
        try {
            console.log(`初始化 IPFS 客户端，API URL: ${this.ipfsApiUrl}`);
            this.ipfs = create({
                url: this.ipfsApiUrl
            });
            
            // 测试IPFS连接 - 添加一个简单测试
            this.testConnection();
        } catch (error) {
            console.error('初始化 IPFS 客户端失败:', error);
            this.ipfs = null;
        }
    }
    
    // 测试IPFS连接
    async testConnection() {
        try {
            const { cid } = await this.ipfs.add('IPFS连接测试');
            console.log(`IPFS 连接测试成功: ${cid}`);
            return true;
        } catch (error) {
            console.error('IPFS 连接测试失败:', error);
            return false;
        }
    }

    // 上传文件到IPFS
    async uploadFile(file) {
        try {
            const result = await this.ipfs.add(file);
            
            // 保存到本地缓存
            const cachePath = path.join(this.cacheDir, result.path);
            fs.writeFileSync(cachePath, file);
            
            return {
                success: true,
                hash: result.path,
                size: result.size
            };
        } catch (error) {
            console.error('上传文件到IPFS失败:', error);
            
            // 如果IPFS连接失败，仍将文件保存到本地
            const hash = `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const cachePath = path.join(this.cacheDir, hash);
            
            try {
                fs.writeFileSync(cachePath, file);
                
                return {
                    success: true,
                    hash,
                    size: file.length,
                    localOnly: true
                };
            } catch (localError) {
                console.error('保存到本地也失败:', localError);
                return {
                    success: false,
                    error: error.message,
                    localError: localError.message
                };
            }
        }
    }

    // 上传JSON数据到IPFS
    async uploadJSON(jsonData) {
        try {
            const buffer = Buffer.from(JSON.stringify(jsonData));
            const result = await this.ipfs.add(buffer);
            
            // 保存到本地缓存
            const cachePath = path.join(this.cacheDir, result.path);
            fs.writeFileSync(cachePath, buffer);
            
            return {
                success: true,
                hash: result.path,
                size: result.size
            };
        } catch (error) {
            console.error('上传JSON到IPFS失败:', error);
            
            // 如果IPFS连接失败，仍将JSON保存到本地
            const hash = `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const cachePath = path.join(this.cacheDir, hash);
            
            try {
                const buffer = Buffer.from(JSON.stringify(jsonData));
                fs.writeFileSync(cachePath, buffer);
                
                return {
                    success: true,
                    hash,
                    size: buffer.length,
                    localOnly: true
                };
            } catch (localError) {
                console.error('保存到本地也失败:', localError);
                return {
                    success: false,
                    error: error.message,
                    localError: localError.message
                };
            }
        }
    }

    // 从IPFS获取文件
    async getFile(hash) {
        try {
            // 首先检查本地缓存
            const cachePath = path.join(this.cacheDir, hash);
            if (fs.existsSync(cachePath)) {
                const data = fs.readFileSync(cachePath);
                return {
                    success: true,
                    data,
                    fromCache: true
                };
            }
            
            // 如果是本地文件，直接返回
            if (hash.startsWith('local_')) {
                if (fs.existsSync(cachePath)) {
                    const data = fs.readFileSync(cachePath);
                    return {
                        success: true,
                        data,
                        localOnly: true
                    };
                } else {
                    throw new Error('本地文件未找到');
                }
            }
            
            // 从IPFS获取
            const chunks = [];
            for await (const chunk of this.ipfs.cat(hash)) {
                chunks.push(chunk);
            }
            const data = Buffer.concat(chunks);
            
            // 保存到本地缓存
            fs.writeFileSync(cachePath, data);
            
            return {
                success: true,
                data
            };
        } catch (error) {
            console.error('从IPFS获取文件失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 从IPFS获取JSON数据
    async getJSON(hash) {
        try {
            const result = await this.getFile(hash);
            if (!result.success) {
                return result;
            }
            const jsonData = JSON.parse(result.data.toString());
            return {
                success: true,
                data: jsonData,
                fromCache: result.fromCache,
                localOnly: result.localOnly
            };
        } catch (error) {
            console.error('从IPFS获取JSON失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 上传交通信息（包含图片）
    async uploadTrafficInfo(trafficInfo) {
        try {
            const { userId, type, description, location, image, timestamp, position } = trafficInfo;
            
            // 准备数据对象
            const data = {
                userId,
                type,
                description,
                location,
                position,
                timestamp: timestamp || Date.now()
            };
            
            // 上传图片（如果有）
            let imageHash = null;
            if (image) {
                const imageResult = await this.uploadFile(image);
                if (imageResult.success) {
                    imageHash = imageResult.hash;
                    // 添加图片哈希到数据
                    data.imageHash = imageHash;
                }
            }
            
            // 上传JSON数据
            const result = await this.uploadJSON(data);
            
            if (!result.success) {
                throw new Error(`上传交通信息JSON数据失败: ${result.error}`);
            }
            
            return {
                success: true,
                hash: result.hash,
                imageHash,
                timestamp: data.timestamp
            };
        } catch (error) {
            console.error('上传交通信息失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 获取交通信息
    async getTrafficInfo(hash) {
        try {
            // 从IPFS获取JSON数据
            const result = await this.getJSON(hash);
            
            if (!result.success) {
                throw new Error(`获取交通信息JSON数据失败: ${result.error}`);
            }
            
            const data = result.data;
            
            // 如果有图片哈希，尝试获取图片
            if (data.imageHash) {
                try {
                    const cacheFilePath = path.join(this.cacheDir, `${data.imageHash}`);
                    
                    // 检查缓存
                    if (fs.existsSync(cacheFilePath)) {
                        data.imageData = fs.readFileSync(cacheFilePath);
                        data.imageUrl = `${this.ipfsGateway}/ipfs/${data.imageHash}`;
                    } else {
                        // 从IPFS获取图片
                        const imageResult = await this.getFile(data.imageHash);
                        
                        if (imageResult.success) {
                            data.imageData = imageResult.data;
                            data.imageUrl = `${this.ipfsGateway}/ipfs/${data.imageHash}`;
                        }
                    }
                } catch (imageError) {
                    console.error(`获取图片失败: ${imageError.message}`);
                    // 如果获取图片失败，不会阻止返回其他数据
                }
            }
            
            return {
                success: true,
                data,
                fromCache: result.fromCache,
                localOnly: result.localOnly
            };
        } catch (error) {
            console.error('获取交通信息失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 创建单例
const ipfsUtils = new IPFSUtils();

// 导出单例
export default ipfsUtils;