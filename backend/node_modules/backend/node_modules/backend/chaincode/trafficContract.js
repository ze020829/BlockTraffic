/*
 * 交通信息区块链智能合约
 * 实现用户注册、路况提交、路况确认和代币管理功能
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class TrafficContract extends Contract {
    
    // 初始化账本
    async InitLedger(ctx) {
        console.info('============ 初始化交通信息账本 ============');
        
        // 预定义用户
        const users = [
            {
                userId: 'admin',
                publicKey: '',  // 将从CA证书中获取
                credits: 1000,  // 初始代币
                reputation: 95, // 初始信誉度
                registeredAt: new Date().toISOString()
            },
            {
                userId: 'user1',
                publicKey: '',
                credits: 100,
                reputation: 80,
                registeredAt: new Date().toISOString()
            }
        ];
        
        // 将用户写入账本
        for (const user of users) {
            await ctx.stub.putState(`USER_${user.userId}`, Buffer.from(JSON.stringify(user)));
            console.info(`已初始化用户 ${user.userId}`);
        }
        
        console.info('============ 账本初始化完成 ============');
    }
    
    // 注册新用户
    async RegisterUser(ctx, userId, publicKey) {
        console.info('============ 注册新用户 ============');
        
        // 检查用户是否已存在
        const userKey = `USER_${userId}`;
        const userExists = await ctx.stub.getState(userKey);
        if (userExists && userExists.length > 0) {
            throw new Error(`用户 ${userId} 已存在`);
        }
        
        // 创建新用户
        const newUser = {
            userId,
            publicKey,
            credits: 50,       // 初始代币
            reputation: 70,    // 初始信誉度
            registeredAt: new Date().toISOString()
        };
        
        // 将用户写入账本
        await ctx.stub.putState(userKey, Buffer.from(JSON.stringify(newUser)));
        
        return JSON.stringify(newUser);
    }
    
    // 获取用户信息
    async GetUser(ctx, userId) {
        console.info('============ 获取用户信息 ============');
        
        const userKey = `USER_${userId}`;
        const userJSON = await ctx.stub.getState(userKey);
        if (!userJSON || userJSON.length === 0) {
            throw new Error(`用户 ${userId} 不存在`);
        }
        
        return userJSON.toString();
    }
    
    // 获取用户凭证信息（只返回信誉度和代币）
    async GetUserCredentials(ctx, userId) {
        console.info('============ 获取用户凭证信息 ============');
        
        const userKey = `USER_${userId}`;
        const userJSON = await ctx.stub.getState(userKey);
        if (!userJSON || userJSON.length === 0) {
            throw new Error(`用户 ${userId} 不存在`);
        }
        
        const user = JSON.parse(userJSON.toString());
        
        // 只返回关键信息
        return JSON.stringify({
            userId: user.userId,
            reputation: user.reputation,
            tokens: user.credits
        });
    }
    
    // 更新用户凭证信息
    async UpdateUserCredentials(ctx, userId, reputation, tokens) {
        console.info('============ 更新用户凭证信息 ============');
        
        const userKey = `USER_${userId}`;
        const userJSON = await ctx.stub.getState(userKey);
        if (!userJSON || userJSON.length === 0) {
            throw new Error(`用户 ${userId} 不存在`);
        }
        
        const user = JSON.parse(userJSON.toString());
        
        // 更新信誉度和代币
        user.reputation = parseInt(reputation);
        user.credits = parseInt(tokens);
        
        // 将更新后的用户信息写入账本
        await ctx.stub.putState(userKey, Buffer.from(JSON.stringify(user)));
        
        return JSON.stringify({
            userId: user.userId,
            reputation: user.reputation,
            tokens: user.credits
        });
    }
    
    // 获取所有用户凭证信息
    async GetAllUserCredentials(ctx) {
        console.info('============ 获取所有用户凭证信息 ============');
        
        const startKey = 'USER_';
        const endKey = 'USER_~';
        
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        const results = [];
        
        for await (const result of iterator) {
            const user = JSON.parse(result.value.toString());
            
            // 只返回关键信息
            results.push({
                userId: user.userId,
                reputation: user.reputation,
                tokens: user.credits
            });
        }
        
        return JSON.stringify(results);
    }
    
    // 提交路况信息
    async SubmitTrafficInfo(ctx, trafficId, userId, trafficType, location, description, timestamp, imageHash) {
        console.info('============ 提交路况信息 ============');
        
        // 检查用户是否存在
        const userKey = `USER_${userId}`;
        const userJSON = await ctx.stub.getState(userKey);
        if (!userJSON || userJSON.length === 0) {
            throw new Error(`用户 ${userId} 不存在`);
        }
        
        // 创建新的路况信息
        const newTraffic = {
            trafficId,
            userId,
            trafficType,
            location,
            description,
            timestamp,
            imageHash,
            status: 'pending',  // 初始状态为待确认
            verifications: 0,   // 初始确认次数为0
            verifiedBy: [],     // 已确认的用户列表
            createdAt: new Date().toISOString()
        };
        
        // 将路况信息写入账本
        await ctx.stub.putState(`TRAFFIC_${trafficId}`, Buffer.from(JSON.stringify(newTraffic)));
        
        // 给提交用户发放奖励
        const user = JSON.parse(userJSON.toString());
        user.credits += 10;  // 提交奖励10代币
        
        // 将更新后的用户信息写入账本
        await ctx.stub.putState(userKey, Buffer.from(JSON.stringify(user)));
        
        return JSON.stringify(newTraffic);
    }
    
    // 确认路况信息
    async VerifyTrafficInfo(ctx, trafficId, userId) {
        console.info('============ 确认路况信息 ============');
        
        // 检查用户是否存在
        const userKey = `USER_${userId}`;
        const userJSON = await ctx.stub.getState(userKey);
        if (!userJSON || userJSON.length === 0) {
            throw new Error(`用户 ${userId} 不存在`);
        }
        
        // 检查路况信息是否存在
        const trafficKey = `TRAFFIC_${trafficId}`;
        const trafficJSON = await ctx.stub.getState(trafficKey);
        if (!trafficJSON || trafficJSON.length === 0) {
            throw new Error(`路况信息 ${trafficId} 不存在`);
        }
        
        const traffic = JSON.parse(trafficJSON.toString());
        
        // 检查用户是否已经确认过
        if (traffic.verifiedBy.includes(userId)) {
            throw new Error(`用户 ${userId} 已经确认过此路况信息`);
        }
        
        // 更新路况信息
        traffic.verifications += 1;
        traffic.verifiedBy.push(userId);
        
        // 如果确认次数达到阈值，将状态更新为已确认
        if (traffic.verifications >= 5) {
            traffic.status = 'verified';
            
            // 给所有参与确认的用户发放额外奖励
            for (const verifierId of traffic.verifiedBy) {
                const verifierKey = `USER_${verifierId}`;
                const verifierJSON = await ctx.stub.getState(verifierKey);
                
                if (verifierJSON && verifierJSON.length > 0) {
                    const verifier = JSON.parse(verifierJSON.toString());
                    verifier.credits += 5;  // 确认完成后额外奖励5代币
                    verifier.reputation = Math.min(100, verifier.reputation + 2);  // 提高信誉度
                    
                    // 将更新后的用户信息写入账本
                    await ctx.stub.putState(verifierKey, Buffer.from(JSON.stringify(verifier)));
                }
            }
        }
        
        // 将更新后的路况信息写入账本
        await ctx.stub.putState(trafficKey, Buffer.from(JSON.stringify(traffic)));
        
        // 给确认用户发放基础奖励
        const user = JSON.parse(userJSON.toString());
        user.credits += 2;  // 基础确认奖励2代币
        user.reputation = Math.min(100, user.reputation + 1);  // 提高信誉度
        
        // 将更新后的用户信息写入账本
        await ctx.stub.putState(userKey, Buffer.from(JSON.stringify(user)));
        
        return JSON.stringify(traffic);
    }
    
    // 管理员直接确认路况信息
    async AdminVerifyTrafficInfo(ctx, trafficId, adminId) {
        console.info('============ 管理员确认路况信息 ============');
        
        // 检查管理员是否存在且是admin角色
        const adminKey = `USER_${adminId}`;
        const adminJSON = await ctx.stub.getState(adminKey);
        if (!adminJSON || adminJSON.length === 0) {
            throw new Error(`管理员 ${adminId} 不存在`);
        }
        
        // 检查路况信息是否存在
        const trafficKey = `TRAFFIC_${trafficId}`;
        const trafficJSON = await ctx.stub.getState(trafficKey);
        if (!trafficJSON || trafficJSON.length === 0) {
            throw new Error(`路况信息 ${trafficId} 不存在`);
        }
        
        const traffic = JSON.parse(trafficJSON.toString());
        
        // 管理员直接将状态更新为已确认
        traffic.status = 'verified';
        traffic.verifiedBy.push(adminId);
        traffic.verifications = 5;  // 设置为满足确认条件
        
        // 将更新后的路况信息写入账本
        await ctx.stub.putState(trafficKey, Buffer.from(JSON.stringify(traffic)));
        
        return JSON.stringify(traffic);
    }
    
    // 获取所有待确认的路况信息
    async GetPendingTrafficInfo(ctx) {
        console.info('============ 获取所有待确认的路况信息 ============');
        
        const startKey = 'TRAFFIC_';
        const endKey = 'TRAFFIC_~';
        
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        const results = [];
        
        for await (const result of iterator) {
            const traffic = JSON.parse(result.value.toString());
            
            // 只返回待确认的路况信息
            if (traffic.status === 'pending') {
                results.push(traffic);
            }
        }
        
        return JSON.stringify(results);
    }
    
    // 获取所有已确认的路况信息
    async GetVerifiedTrafficInfo(ctx) {
        console.info('============ 获取所有已确认的路况信息 ============');
        
        const startKey = 'TRAFFIC_';
        const endKey = 'TRAFFIC_~';
        
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        const results = [];
        
        for await (const result of iterator) {
            const traffic = JSON.parse(result.value.toString());
            
            // 只返回已确认的路况信息
            if (traffic.status === 'verified') {
                results.push(traffic);
            }
        }
        
        return JSON.stringify(results);
    }
    
    // 获取单个路况信息
    async GetTrafficInfo(ctx, trafficId) {
        console.info('============ 获取单个路况信息 ============');
        
        const trafficKey = `TRAFFIC_${trafficId}`;
        const trafficJSON = await ctx.stub.getState(trafficKey);
        if (!trafficJSON || trafficJSON.length === 0) {
            throw new Error(`路况信息 ${trafficId} 不存在`);
        }
        
        return trafficJSON.toString();
    }
    
    // 转移代币（用户之间）
    async TransferTokens(ctx, fromUserId, toUserId, amount) {
        console.info('============ 转移代币 ============');
        
        // 检查转出用户是否存在
        const fromUserKey = `USER_${fromUserId}`;
        const fromUserJSON = await ctx.stub.getState(fromUserKey);
        if (!fromUserJSON || fromUserJSON.length === 0) {
            throw new Error(`转出用户 ${fromUserId} 不存在`);
        }
        
        // 检查转入用户是否存在
        const toUserKey = `USER_${toUserId}`;
        const toUserJSON = await ctx.stub.getState(toUserKey);
        if (!toUserJSON || toUserJSON.length === 0) {
            throw new Error(`转入用户 ${toUserId} 不存在`);
        }
        
        // 解析用户数据
        const fromUser = JSON.parse(fromUserJSON.toString());
        const toUser = JSON.parse(toUserJSON.toString());
        
        // 检查转出用户代币是否足够
        const tokenAmount = parseInt(amount);
        if (fromUser.credits < tokenAmount) {
            throw new Error(`用户 ${fromUserId} 的代币不足`);
        }
        
        // 执行转账
        fromUser.credits -= tokenAmount;
        toUser.credits += tokenAmount;
        
        // 将更新后的用户信息写入账本
        await ctx.stub.putState(fromUserKey, Buffer.from(JSON.stringify(fromUser)));
        await ctx.stub.putState(toUserKey, Buffer.from(JSON.stringify(toUser)));
        
        // 返回转账结果
        return JSON.stringify({
            fromUser: {
                userId: fromUser.userId,
                tokens: fromUser.credits
            },
            toUser: {
                userId: toUser.userId,
                tokens: toUser.credits
            },
            amount: tokenAmount
        });
    }
    
    // 删除用户
    async DeleteUser(ctx, userId) {
        console.info('============ 删除用户 ============');
        
        const userKey = `USER_${userId}`;
        const userJSON = await ctx.stub.getState(userKey);
        
        if (!userJSON || userJSON.length === 0) {
            throw new Error(`用户 ${userId} 不存在`);
        }
        
        // 删除用户数据
        await ctx.stub.deleteState(userKey);
        console.info(`用户 ${userId} 已删除`);
        
        return JSON.stringify({ message: `用户 ${userId} 已成功删除` });
    }
}

module.exports = TrafficContract; 