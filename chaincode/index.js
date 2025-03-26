'use strict';

const { Contract } = require('fabric-contract-api');

class BlockTrafficContract extends Contract {
    async initLedger(ctx) {
        console.log('初始化账本');
    }

    // 创建用户
    async createUser(ctx, userId, initialTokens) {
        const user = {
            userId: userId,
            tokens: parseInt(initialTokens),
            reputation: 100, // 初始信誉度
            submittedTraffic: [], // 提交的路况信息ID列表
            confirmedTraffic: [], // 确认的路况信息ID列表
            docType: 'user'
        };

        await ctx.stub.putState(userId, Buffer.from(JSON.stringify(user)));
        return JSON.stringify(user);
    }

    // 获取用户信息
    async getUser(ctx, userId) {
        const userJSON = await ctx.stub.getState(userId);
        if (!userJSON || userJSON.length === 0) {
            throw new Error(`用户 ${userId} 不存在`);
        }
        return userJSON.toString();
    }

    // 提交路况信息
    async submitTrafficInfo(ctx, trafficId, userId, ipfsHash) {
        // 检查用户是否存在
        const userJSON = await ctx.stub.getState(userId);
        if (!userJSON || userJSON.length === 0) {
            throw new Error(`用户 ${userId} 不存在`);
        }

        const user = JSON.parse(userJSON.toString());

        // 创建路况信息记录
        const trafficInfo = {
            trafficId: trafficId,
            submitterId: userId,
            ipfsHash: ipfsHash,
            status: 'pending',
            confirmations: [],
            submitTime: new Date().toISOString(),
            docType: 'traffic'
        };

        // 更新用户提交的路况信息列表
        user.submittedTraffic.push(trafficId);

        // 保存路况信息和更新后的用户信息
        await ctx.stub.putState(trafficId, Buffer.from(JSON.stringify(trafficInfo)));
        await ctx.stub.putState(userId, Buffer.from(JSON.stringify(user)));

        return JSON.stringify(trafficInfo);
    }

    // 确认路况信息
    async confirmTrafficInfo(ctx, trafficId, confirmerId) {
        // 检查路况信息是否存在
        const trafficJSON = await ctx.stub.getState(trafficId);
        if (!trafficJSON || trafficJSON.length === 0) {
            throw new Error(`路况信息 ${trafficId} 不存在`);
        }

        // 检查确认者是否存在
        const confirmerJSON = await ctx.stub.getState(confirmerId);
        if (!confirmerJSON || confirmerJSON.length === 0) {
            throw new Error(`确认者 ${confirmerId} 不存在`);
        }

        const trafficInfo = JSON.parse(trafficJSON.toString());
        const confirmer = JSON.parse(confirmerJSON.toString());

        // 检查是否已经确认过
        if (trafficInfo.confirmations.includes(confirmerId)) {
            throw new Error(`用户 ${confirmerId} 已经确认过这条路况信息`);
        }

        // 检查确认者是否有足够的代币
        if (confirmer.tokens < 1) {
            throw new Error(`用户 ${confirmerId} 代币不足`);
        }

        // 更新路况信息
        trafficInfo.confirmations.push(confirmerId);
        if (trafficInfo.confirmations.length >= 3) {
            trafficInfo.status = 'confirmed';
        }

        // 更新确认者信息
        confirmer.tokens -= 1;
        confirmer.confirmedTraffic.push(trafficId);

        // 更新提交者信誉度
        const submitterJSON = await ctx.stub.getState(trafficInfo.submitterId);
        const submitter = JSON.parse(submitterJSON.toString());
        submitter.reputation += 10;

        // 保存所有更新
        await ctx.stub.putState(trafficId, Buffer.from(JSON.stringify(trafficInfo)));
        await ctx.stub.putState(confirmerId, Buffer.from(JSON.stringify(confirmer)));
        await ctx.stub.putState(trafficInfo.submitterId, Buffer.from(JSON.stringify(submitter)));

        return JSON.stringify(trafficInfo);
    }

    // 获取用户提交的路况信息列表
    async getUserSubmittedTraffic(ctx, userId) {
        const userJSON = await ctx.stub.getState(userId);
        if (!userJSON || userJSON.length === 0) {
            throw new Error(`用户 ${userId} 不存在`);
        }

        const user = JSON.parse(userJSON.toString());
        const trafficList = [];

        for (const trafficId of user.submittedTraffic) {
            const trafficJSON = await ctx.stub.getState(trafficId);
            if (trafficJSON && trafficJSON.length > 0) {
                trafficList.push(JSON.parse(trafficJSON.toString()));
            }
        }

        return JSON.stringify(trafficList);
    }

    // 获取用户确认的路况信息列表
    async getUserConfirmedTraffic(ctx, userId) {
        const userJSON = await ctx.stub.getState(userId);
        if (!userJSON || userJSON.length === 0) {
            throw new Error(`用户 ${userId} 不存在`);
        }

        const user = JSON.parse(userJSON.toString());
        const trafficList = [];

        for (const trafficId of user.confirmedTraffic) {
            const trafficJSON = await ctx.stub.getState(trafficId);
            if (trafficJSON && trafficJSON.length > 0) {
                trafficList.push(JSON.parse(trafficJSON.toString()));
            }
        }

        return JSON.stringify(trafficList);
    }

    // 获取路况信息详情
    async getTrafficInfo(ctx, trafficId) {
        const trafficJSON = await ctx.stub.getState(trafficId);
        if (!trafficJSON || trafficJSON.length === 0) {
            throw new Error(`路况信息 ${trafficId} 不存在`);
        }
        return trafficJSON.toString();
    }
}

module.exports = BlockTrafficContract; 