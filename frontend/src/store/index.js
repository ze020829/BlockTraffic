import { createStore } from 'vuex'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

// 生成模拟的交通数据
const generateMockTrafficData = () => {
  const trafficList = []
  const pendingList = []
  
  const types = ['congestion', 'construction', 'accident', 'normal']
  const descriptions = [
    '道路拥堵，车辆缓慢行驶',
    '前方正在进行道路施工，请绕行',
    '发生交通事故，请谨慎驾驶',
    '道路畅通，可以正常行驶',
    '临时交通管制，请按指示行驶',
    '前方发生车辆故障，占用一条车道',
    '道路积水，请减速慢行',
    '道路结冰，请注意安全'
  ]
  
  const locations = [
    {
      name: '成都市武侯区天府大道',
      position: { lng: 104.0668, lat: 30.5728 }
    },
    {
      name: '成都市锦江区春熙路',
      position: { lng: 104.0817, lat: 30.6571 }
    },
    {
      name: '成都市青羊区人民中路',
      position: { lng: 104.0638, lat: 30.6726 }
    },
    {
      name: '成都市高新区天府软件园',
      position: { lng: 104.0668, lat: 30.5369 }
    },
    {
      name: '成都市双流区双流国际机场',
      position: { lng: 103.9474, lat: 30.5784 }
    }
  ]
  
  // 生成已验证的交通信息
  for (let i = 0; i < 5; i++) {
    const type = types[Math.floor(Math.random() * types.length)]
    const description = descriptions[Math.floor(Math.random() * descriptions.length)]
    const locationData = locations[Math.floor(Math.random() * locations.length)]
    const now = Date.now()
    const timestamp = now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000) // 过去7天内
    
    trafficList.push({
      id: `traffic_${i}`,
      type,
      description,
      location: locationData.name,
      position: locationData.position,
      timestamp,
      status: 'verified',
      verifications: 5,
      verifiedBy: [],
      images: [
        {
          name: 'image1.jpg',
          url: 'https://picsum.photos/300/200?random=' + i
        }
      ]
    })
  }
  
  // 生成待验证的交通信息
  for (let i = 0; i < 5; i++) {
    const type = types[Math.floor(Math.random() * types.length)]
    const description = descriptions[Math.floor(Math.random() * descriptions.length)]
    const locationData = locations[Math.floor(Math.random() * locations.length)]
    const now = Date.now()
    const timestamp = now - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000) // 过去3天内
    const verifications = Math.floor(Math.random() * 4) + 1 // 1-4次验证
    
    pendingList.push({
      id: `pending_${i}`,
      type,
      description,
      location: locationData.name,
      position: locationData.position,
      timestamp,
      status: 'pending',
      verifications,
      verifiedBy: [],
      images: [
        {
          name: 'image1.jpg',
          url: 'https://picsum.photos/300/200?random=' + (i + 10)
        }
      ]
    })
  }
  
  return { trafficList, pendingList }
}

// 生成模拟数据
const mockData = generateMockTrafficData()

// 添加用户历史记录存储
const userSubmissionHistories = {}
const userVerificationHistories = {}

// 默认用户列表
const defaultUsers = [
  { id: 'admin', role: 'admin', reputation: 100, tokens: 1000 },
  { id: 'user1', role: 'user', reputation: 85, tokens: 300 },
  { id: 'user2', role: 'user', reputation: 75, tokens: 250 },
  { id: 'user3', role: 'user', reputation: 90, tokens: 400 },
  { id: 'user4', role: 'user', reputation: 70, tokens: 200 },
  { id: 'user5', role: 'user', reputation: 80, tokens: 350 }
]

export default createStore({
  state: {
    trafficList: mockData.trafficList,
    pendingVerifications: mockData.pendingList, // 待验证的路况信息
    userPosition: { latitude: 30.5728, longitude: 104.0668 }, // 默认位置：成都
    userToken: localStorage.getItem('userToken') || null, // 用户令牌
    currentUser: null, // 当前用户对象
    userList: defaultUsers, // 用户列表，初始化为默认用户
    userInfo: {
      reputation: 0,
      tokens: 0
    },
    submissionHistory: [],
    verificationHistory: [],
    isGuest: true // 是否为游客模式
  },
  
  mutations: {
    SET_TRAFFIC_LIST(state, list) {
      state.trafficList = list
    },
    SET_PENDING_VERIFICATIONS(state, list) {
      state.pendingVerifications = list
    },
    SET_USER_POSITION(state, position) {
      state.userPosition = position
    },
    SET_USER_INFO(state, info) {
      state.userInfo = info
    },
    SET_SUBMISSION_HISTORY(state, history) {
      state.submissionHistory = history
    },
    SET_VERIFICATION_HISTORY(state, history) {
      state.verificationHistory = history
    },
    UPDATE_USER_STATS(state, { reputation, tokens }) {
      if (reputation) state.userInfo.reputation += reputation
      if (tokens) state.userInfo.tokens += tokens
    },
    // 设置游客模式
    SET_GUEST_MODE(state, isGuest) {
      state.isGuest = isGuest
    },
    // 设置当前用户
    SET_CURRENT_USER(state, userData) {
      state.userToken = userData.id
      localStorage.setItem('userToken', userData.id)
      state.currentUser = userData
      state.userInfo = {
        reputation: userData.reputation,
        tokens: userData.tokens
      }
      state.isGuest = false // 设置非游客模式
    },
    // 更新用户列表
    SET_USER_LIST(state, users) {
      state.userList = users
    },
    // 退出登录
    LOGOUT(state) {
      state.userToken = null
      state.currentUser = null
      state.userInfo = {
        reputation: 0,
        tokens: 0
      }
      state.submissionHistory = []
      state.verificationHistory = []
      state.isGuest = true
      localStorage.removeItem('userToken')
    }
  },
  
  actions: {
    // 初始化用户
    async initializeUser({ commit, state }) {
      try {
        const userId = state.userToken
        if (!userId) {
          commit('SET_GUEST_MODE', true)
          return // 如果没有用户令牌，设置为游客模式
        }
        
        // 从本地用户列表获取用户信息
        const user = state.userList.find(u => u.id === userId)
        if (user) {
          commit('SET_CURRENT_USER', {
            id: userId,
            role: userId === 'admin' ? 'admin' : 'user',
            reputation: user.reputation,
            tokens: user.tokens
          })
          commit('SET_GUEST_MODE', false)
          console.log(`[模拟] 已初始化用户: ${userId}`, user)
        } else {
          // 如果用户不存在，创建一个新用户
          const newUser = {
            id: userId,
            role: userId === 'admin' ? 'admin' : 'user',
            reputation: userId === 'admin' ? 100 : 80,
            tokens: userId === 'admin' ? 1000 : 100
          }
          state.userList.push(newUser)
          
          commit('SET_CURRENT_USER', newUser)
          commit('SET_GUEST_MODE', false)
          console.log(`[模拟] 已创建并初始化新用户: ${userId}`, newUser)
        }
      } catch (error) {
        console.error('初始化用户失败:', error)
        commit('LOGOUT') // 如果初始化失败，设置为游客模式
        throw error
      }
    },
    
    // 退出登录
    async logout({ commit }) {
      commit('LOGOUT')
    },
    
    // 切换用户
    async switchUser({ commit, state, dispatch }, userId) {
      try {
        const userToSwitch = state.userList.find(u => u.id === userId) || 
          { id: userId, role: userId === 'admin' ? 'admin' : 'user', reputation: 80, tokens: 100 };
        
        commit('SET_CURRENT_USER', userToSwitch);
        commit('SET_GUEST_MODE', false); // 确保设置为非游客模式
        
        // 获取历史记录
        dispatch('getSubmissionHistory');
        dispatch('getVerificationHistory');
        
        return { success: true, message: `已切换到用户: ${userId}` };
      } catch (error) {
        console.error('切换用户失败:', error);
        return { success: false, message: '切换用户失败' };
      }
    },
    
    // 获取所有用户信息
    async getAllUsers({ commit }) {
      try {
        const response = await axios.get(`${API_BASE_URL}/user/all-credentials`)
        const users = response.data
        commit('SET_USER_LIST', users)
        return users
      } catch (error) {
        console.error('获取用户列表失败:', error)
        throw error
      }
    },
    
    async getCurrentPosition({ commit }) {
      try {
        // 模拟获取位置
        return Promise.resolve({
          latitude: 30.5728,
          longitude: 104.0668
        })
      } catch (error) {
        console.error('获取位置失败:', error);
        throw new Error('无法获取您的位置，请检查位置权限设置');
      }
    },

    async getNearbyTrafficInfo({ commit, state }) {
      try {
        // 模拟API请求
        commit('SET_TRAFFIC_LIST', mockData.trafficList)
        return mockData.trafficList
      } catch (error) {
        console.error('获取路况信息失败:', error)
        throw error
      }
    },
    
    async getPendingVerifications({ commit }) {
      try {
        // 模拟API请求
        commit('SET_PENDING_VERIFICATIONS', mockData.pendingList)
        return mockData.pendingList
      } catch (error) {
        console.error('获取待验证信息失败:', error)
        throw error
      }
    },
    
    // 提交路况信息
    async submitTrafficInfo({ commit, state }, trafficData) {
      if (state.isGuest) {
        throw new Error('游客模式无法提交路况信息，请先登录')
      }
      try {
        // 模拟API请求
        const newTraffic = {
          ...trafficData,
          id: `traffic_${Date.now()}`,
          status: 'pending',
          verifications: 0,
          verifiedBy: []
        }
        
        // 添加到待验证列表
        commit('SET_PENDING_VERIFICATIONS', [...mockData.pendingList, newTraffic])
        
        // 更新用户提交历史
        const userId = this.state.userToken
        const newSubmission = {
          id: `sub_${userId}_${Date.now()}`,
          timestamp: Date.now(),
          type: trafficData.type,
          location: trafficData.location,
          status: 'success',
          reward: 10
        }
        
        // 确保用户提交历史存在并且是数组
        if (!userSubmissionHistories[userId]) {
          userSubmissionHistories[userId] = []
        }
        
        userSubmissionHistories[userId] = [newSubmission, ...userSubmissionHistories[userId]]
        commit('SET_SUBMISSION_HISTORY', userSubmissionHistories[userId])
        
        return newTraffic
      } catch (error) {
        console.error('提交路况信息失败:', error)
        throw error
      }
    },
    
    // 验证路况信息
    async verifyTrafficInfo({ commit, state }, { trafficId }) {
      if (state.isGuest) {
        throw new Error('游客模式无法验证路况信息，请先登录')
      }
      
      try {
        if (!state.userToken) {
          throw new Error('用户未登录')
        }

        // 调用MongoDB API进行验证
        const response = await axios.post(`${API_BASE_URL}/mongodb/traffic/${trafficId}/verify`, {
          userId: state.userToken,
          result: true
        });

        if (!response.data.success) {
          throw new Error(response.data.message || '验证失败');
        }

        const result = response.data.data;
        
        // 更新待验证列表中的项目
        const pendingIndex = state.pendingVerifications.findIndex(item => item.id === trafficId);
        if (pendingIndex !== -1) {
          const updatedItem = {
            ...state.pendingVerifications[pendingIndex],
            verifications: result.verificationCount,
            verifiedBy: result.verifiedBy,
            status: result.status
          };

          // 如果已经验证完成，移动到已验证列表
          if (result.status === 'verified') {
            const newPendingList = state.pendingVerifications.filter(item => item.id !== trafficId);
            commit('SET_PENDING_VERIFICATIONS', newPendingList);
            commit('SET_TRAFFIC_LIST', [...state.trafficList, updatedItem]);
          } else {
            // 否则更新待验证列表
            const newPendingList = [...state.pendingVerifications];
            newPendingList[pendingIndex] = updatedItem;
            commit('SET_PENDING_VERIFICATIONS', newPendingList);
          }
        }

        // 更新用户信息
        if (result.reward) {
          commit('UPDATE_USER_STATS', {
            reputation: result.reward.reputation,
            tokens: result.reward.tokens
          });
        }

        // 更新用户验证历史
        const newVerification = {
          id: `ver_${state.userToken}_${Date.now()}`,
          timestamp: Date.now(),
          type: state.pendingVerifications[pendingIndex]?.type,
          location: state.pendingVerifications[pendingIndex]?.location,
          result: 'correct',
          reputation: result.reward.reputation
        };

        if (!userVerificationHistories[state.userToken]) {
          userVerificationHistories[state.userToken] = [];
        }

        userVerificationHistories[state.userToken] = [newVerification, ...userVerificationHistories[state.userToken]];
        commit('SET_VERIFICATION_HISTORY', userVerificationHistories[state.userToken]);

        return result;
      } catch (error) {
        console.error('验证路况信息失败:', error);
        throw error;
      }
    },
    
    async updateTrafficInfo({ commit, state }, { id, ...updateData }) {
      try {
        // 查找交通信息
        const trafficIndex = state.trafficList.findIndex(item => item.id === id)
        if (trafficIndex === -1) {
          throw new Error('未找到路况信息')
        }
        
        // 更新交通信息
        const updatedItem = {
          ...state.trafficList[trafficIndex],
          ...updateData
        }
        
        const newTrafficList = [...state.trafficList]
        newTrafficList[trafficIndex] = updatedItem
        commit('SET_TRAFFIC_LIST', newTrafficList)
        
        return updatedItem
      } catch (error) {
        console.error('更新路况信息失败:', error)
        throw error
      }
    },
    
    async getUserInfo({ commit, state }) {
      try {
        // 从区块链获取用户信息
        try {
          const userId = state.userToken;
          const response = await axios.get(`${API_BASE_URL}/user/info/${userId}`);
          const userInfo = response.data;
          
          commit('SET_USER_INFO', {
            reputation: userInfo.reputation,
            tokens: userInfo.tokens
          });
          
          return userInfo;
        } catch (error) {
          console.error('获取用户信息失败:', error);
          // 如果获取失败，使用本地数据
          const userId = state.userToken;
          const user = state.userList.find(u => u.id === userId);
          if (user) {
            const userInfo = {
              reputation: user.reputation,
              tokens: user.tokens
            };
            commit('SET_USER_INFO', userInfo);
            return userInfo;
          }
          throw new Error('未找到用户信息');
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
        throw error;
      }
    },
    
    async getSubmissionHistory({ commit, state }) {
      try {
        // 如果是游客模式，直接返回空数组
        if (state.isGuest) {
          commit('SET_SUBMISSION_HISTORY', [])
          return []
        }
        
        // 使用模拟数据代替API请求
        const userId = state.userToken
        if (!userId) {
          throw new Error('用户未登录')
        }
        
        // 如果没有该用户的历史记录，则创建模拟数据
        if (!userSubmissionHistories[userId]) {
          // 生成3-6条随机提交历史
          const count = Math.floor(Math.random() * 4) + 3
          const history = []
          const types = ['congestion', 'construction', 'accident', 'normal']
          const locations = [
            '成都市武侯区天府大道',
            '成都市锦江区春熙路',
            '成都市青羊区人民中路',
            '成都市高新区天府软件园',
            '成都市双流区双流国际机场'
          ]
          
          for (let i = 0; i < count; i++) {
            const now = Date.now()
            history.push({
              id: `sub_${userId}_${now - i * 86400000}`,
              timestamp: now - i * 86400000, // 每天一条记录
              type: types[Math.floor(Math.random() * types.length)],
              location: locations[Math.floor(Math.random() * locations.length)],
              status: Math.random() > 0.2 ? 'success' : 'failed',
              reward: Math.random() > 0.2 ? 10 : 0
            })
          }
          
          userSubmissionHistories[userId] = history
        }
        
        commit('SET_SUBMISSION_HISTORY', userSubmissionHistories[userId])
        return userSubmissionHistories[userId]
      } catch (error) {
        console.error('获取提交历史失败:', error)
        commit('SET_SUBMISSION_HISTORY', [])
        return []
      }
    },
    
    async getVerificationHistory({ commit, state }) {
      try {
        // 如果是游客模式，直接返回空数组
        if (state.isGuest) {
          commit('SET_VERIFICATION_HISTORY', [])
          return []
        }
        
        // 使用模拟数据代替API请求
        const userId = state.userToken
        if (!userId) {
          throw new Error('用户未登录')
        }
        
        // 如果没有该用户的历史记录，则创建模拟数据
        if (!userVerificationHistories[userId]) {
          // 生成4-8条随机验证历史
          const count = Math.floor(Math.random() * 5) + 4
          const history = []
          const types = ['congestion', 'construction', 'accident', 'normal']
          const locations = [
            '成都市武侯区天府大道',
            '成都市锦江区春熙路',
            '成都市青羊区人民中路',
            '成都市高新区天府软件园',
            '成都市双流区双流国际机场'
          ]
          
          for (let i = 0; i < count; i++) {
            const now = Date.now()
            history.push({
              id: `ver_${userId}_${now - i * 72000000}`,
              timestamp: now - i * 72000000, // 每20小时一条记录
              type: types[Math.floor(Math.random() * types.length)],
              location: locations[Math.floor(Math.random() * locations.length)],
              result: Math.random() > 0.1 ? 'correct' : 'incorrect',
              reputation: Math.random() > 0.1 ? 2 : -1
            })
          }
          
          userVerificationHistories[userId] = history
        }
        
        commit('SET_VERIFICATION_HISTORY', userVerificationHistories[userId])
        return userVerificationHistories[userId]
      } catch (error) {
        console.error('获取验证历史失败:', error)
        commit('SET_VERIFICATION_HISTORY', [])
        return []
      }
    },
    
    // 更新用户信息到区块链
    async updateUserInfo({ commit, state }, userData) {
      if (state.isGuest) {
        throw new Error('游客模式无法更新用户信息，请先登录')
      }
      try {
        // 模拟更新，使用本地数据
        const userId = userData.id || state.userToken
        
        // 更新本地用户列表
        const userIndex = state.userList.findIndex(u => u.id === userId)
        if (userIndex !== -1) {
          state.userList[userIndex] = {
            ...state.userList[userIndex],
            ...userData
          }
          
          // 如果更新的是当前用户，更新当前用户信息
          if (userId === state.userToken) {
            commit('SET_USER_INFO', {
              reputation: userData.reputation,
              tokens: userData.tokens
            })
          }
        } else {
          // 如果用户不在列表中，添加到列表
          const newUser = {
            id: userId,
            role: userId === 'admin' ? 'admin' : 'user',
            ...userData
          }
          state.userList.push(newUser)
          
          // 如果是当前用户，更新当前用户信息
          if (userId === state.userToken) {
            commit('SET_USER_INFO', {
              reputation: userData.reputation,
              tokens: userData.tokens
            })
          }
        }
        
        console.log(`[模拟] 用户 ${userId} 信息已更新:`, userData)
        return { success: true, blockchainSync: true, message: '用户信息已更新' }
      } catch (error) {
        console.error('更新用户信息失败:', error)
        throw error
      }
    },
    
    // 获取用户关键信息（信誉度和代币）
    async getUserCredentials({ commit, state }, userId) {
      try {
        // 如果是游客模式，返回默认值
        if (state.isGuest) {
          return {
            id: null,
            reputation: 0,
            tokens: 0,
            blockchainSync: false
          }
        }
        
        const targetUserId = userId || state.userToken
        if (!targetUserId) {
          throw new Error('用户未登录')
        }
        
        // 从本地用户列表获取用户信息
        const user = state.userList.find(u => u.id === targetUserId)
        if (user) {
          // 如果是当前用户，更新用户信息
          if (targetUserId === state.userToken) {
            commit('SET_USER_INFO', {
              reputation: user.reputation,
              tokens: user.tokens
            })
          }
          
          return { 
            id: user.id,
            reputation: user.reputation,
            tokens: user.tokens,
            blockchainSync: true, // 模拟成功
            role: user.role || (user.id === 'admin' ? 'admin' : 'user')
          }
        }
        
        // 如果本地没有数据，创建默认数据
        const defaultUser = {
          id: targetUserId,
          reputation: targetUserId === 'admin' ? 100 : 80,
          tokens: targetUserId === 'admin' ? 1000 : 100,
          role: targetUserId === 'admin' ? 'admin' : 'user',
          blockchainSync: true // 模拟成功
        }
        
        // 添加到用户列表
        commit('SET_USER_LIST', [...state.userList, defaultUser])
        
        // 如果是当前用户，更新用户信息
        if (targetUserId === state.userToken) {
          commit('SET_USER_INFO', {
            reputation: defaultUser.reputation,
            tokens: defaultUser.tokens
          })
        }
        
        return defaultUser
      } catch (error) {
        console.error('获取用户关键信息失败:', error)
        // 发生错误时返回默认值
        return {
          id: userId || state.userToken,
          reputation: 0,
          tokens: 0,
          blockchainSync: false
        }
      }
    }
  },
  
  getters: {
    // 获取当前用户
    currentUser: state => state.currentUser,
    // 获取用户列表
    userList: state => state.userList,
    // 判断是否为管理员
    isAdmin: state => state.currentUser?.role === 'admin',
    // 判断是否为游客
    isGuest: state => state.isGuest,
    // 判断是否可以提交路况信息
    canSubmitTraffic: state => !state.isGuest,
    // 判断是否可以验证路况信息
    canVerifyTraffic: state => !state.isGuest,
    // 判断是否可以更新用户信息
    canUpdateUser: state => !state.isGuest
  }
})
