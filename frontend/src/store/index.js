import { createStore } from 'vuex'
import axios from 'axios'

const API_BASE_URL = '/api'

// 数据存储说明:
// 1. 用户信息 - 存储在区块链上
// 2. 未确认路况信息 - 存储在MongoDB
// 3. 确认过的信息 - 存储在IPFS

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
    trafficList: [], // 已验证的路况信息，从IPFS加载
    pendingVerifications: [], // 待验证的路况信息，从MongoDB加载
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
        // 首先尝试从wallet获取用户身份列表
        try {
          const identitiesResponse = await axios.get(`${API_BASE_URL}/user/identities`)
          if (identitiesResponse.data && Array.isArray(identitiesResponse.data) && identitiesResponse.data.length > 0) {
            console.log('从wallet获取到用户身份列表:', identitiesResponse.data)
            
            // 转换wallet身份列表为用户列表格式
            const walletUsers = identitiesResponse.data.map(identity => {
              // 查找默认用户列表中是否有匹配的用户
              const defaultUser = defaultUsers.find(u => u.id === identity.id) || {}
              
              return {
                id: identity.id,
                role: identity.id === 'admin' ? 'admin' : 'user',
                reputation: defaultUser.reputation || 80,
                tokens: defaultUser.tokens || 100
              }
            })
            
            // 尝试从API获取用户信誉度和代币数据
            try {
              const credentialsResponse = await axios.get(`${API_BASE_URL}/user/all-credentials`)
              if (credentialsResponse.data && Array.isArray(credentialsResponse.data)) {
                // 合并wallet用户和区块链用户数据
                const mergedUsers = walletUsers.map(walletUser => {
                  const blockchainUser = credentialsResponse.data.find(u => u.id === walletUser.id) || {}
                  return {
                    ...walletUser,
                    reputation: blockchainUser.reputation || walletUser.reputation,
                    tokens: blockchainUser.credits || walletUser.tokens
                  }
                })
                
                commit('SET_USER_LIST', mergedUsers)
                return mergedUsers
              }
            } catch (credentialsError) {
              console.warn('无法从区块链获取用户信誉度和代币数据:', credentialsError.message)
            }
            
            // 如果无法获取区块链数据，仅使用wallet用户列表
            commit('SET_USER_LIST', walletUsers)
            return walletUsers
          }
        } catch (identitiesError) {
          console.warn('无法从wallet获取用户身份列表:', identitiesError.message)
        }
        
        // 如果无法从wallet获取，尝试从区块链获取用户列表
        try {
          const response = await axios.get(`${API_BASE_URL}/user/all-credentials`)
          if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            commit('SET_USER_LIST', response.data)
            return response.data
          }
        } catch (apiError) {
          console.warn('无法从API获取用户列表，使用默认用户列表:', apiError.message)
        }
        
        // 如果所有API调用都失败，使用默认用户列表
        console.log('使用默认用户列表')
        commit('SET_USER_LIST', defaultUsers)
        return defaultUsers
      } catch (error) {
        console.error('获取用户列表过程中发生错误:', error)
        commit('SET_USER_LIST', defaultUsers) // 确保用户列表不为空
        return defaultUsers
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

    // 获取附近路况信息
    async getNearbyTrafficInfo({ commit, state }) {
      try {
        console.log('正在获取附近交通信息...');
        
        // 从用户位置获取经纬度
        let position;
        try {
          position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
              }),
              (err) => reject(err),
              { timeout: 10000 }
            );
          });
        } catch (e) {
          console.warn('无法获取位置，使用默认位置', e);
          position = { lat: 30.5728, lng: 104.0668 };
        }
        
        // 构建请求参数
        const params = { 
          lat: position.lat, 
          lng: position.lng,
          radius: 10 // 10公里范围内
        };
        
        // 从API获取交通信息
        const response = await axios.get(`${API_BASE_URL}/traffic/nearby`, { params });
        
        if (response.data && response.data.success) {
          console.log(`获取到${response.data.data.length}条附近交通信息`);
          commit('SET_TRAFFIC_LIST', response.data.data);
          return response.data.data;
        } else {
          console.warn('API返回数据格式不符合预期:', response.data);
          commit('SET_TRAFFIC_LIST', []);
          return [];
        }
      } catch (error) {
        console.error('获取附近交通信息失败:', error);
        // 如果API调用失败，返回空数组
        commit('SET_TRAFFIC_LIST', []);
        return [];
      }
    },
    
    // 获取待验证路况信息
    async getPendingVerifications({ commit, state }) {
      try {
        console.log('正在获取待验证交通信息...');
        
        // 从API获取待验证的交通信息
        const response = await axios.get(`${API_BASE_URL}/traffic/pending`);
        
        if (response.data && response.data.success) {
          console.log(`获取到${response.data.data.length}条待验证交通信息`);
          commit('SET_PENDING_VERIFICATIONS', response.data.data);
          return response.data.data;
        } else {
          console.warn('API返回数据格式不符合预期:', response.data);
          commit('SET_PENDING_VERIFICATIONS', []);
          return [];
        }
      } catch (error) {
        console.error('获取待验证交通信息失败:', error);
        commit('SET_PENDING_VERIFICATIONS', []);
        return [];
      }
    },
    
    // 提交路况信息
    async submitTrafficInfo({ commit, state }, trafficData) {
      if (state.isGuest) {
        throw new Error('游客模式无法提交路况信息，请先登录')
      }
      
      if (!state.userToken) {
        throw new Error('用户未登录')
      }
      
      try {
        console.log('准备提交路况信息到后端，原始数据:', trafficData);
        
        // 确保位置数据格式正确
        let locationData = {};
        
        // 处理位置数据格式
        if (trafficData.location) {
          // 如果是百度地图返回的position对象格式
          if (trafficData.position && trafficData.position.lng && trafficData.position.lat) {
            locationData = {
              name: trafficData.location.name || `位置(${trafficData.position.lng}, ${trafficData.position.lat})`,
              coordinates: {
                type: 'Point',
                coordinates: [trafficData.position.lng, trafficData.position.lat]
              },
              address: trafficData.location.address || '未知地址'
            };
          }
          // 如果本身就是包含name和address的对象
          else if (typeof trafficData.location === 'object') {
            locationData = {
              name: trafficData.location.name || '未命名位置',
              address: trafficData.location.address || '未知地址',
              coordinates: {
                type: 'Point',
                coordinates: []
              }
            };
            
            // 提取坐标信息 - 处理各种可能的格式
            if (trafficData.location.coordinates) {
              if (Array.isArray(trafficData.location.coordinates)) {
                locationData.coordinates.coordinates = trafficData.location.coordinates;
              } else if (trafficData.location.coordinates.coordinates) {
                locationData.coordinates.coordinates = trafficData.location.coordinates.coordinates;
              }
            } else if (trafficData.location.lng !== undefined && trafficData.location.lat !== undefined) {
              locationData.coordinates.coordinates = [trafficData.location.lng, trafficData.location.lat];
            } else if (trafficData.position && trafficData.position.lng && trafficData.position.lat) {
              locationData.coordinates.coordinates = [trafficData.position.lng, trafficData.position.lat];
            }
          }
          // 如果是字符串格式（位置名称）
          else if (typeof trafficData.location === 'string') {
            locationData = {
              name: trafficData.location,
              address: trafficData.location,
              coordinates: {
                type: 'Point',
                coordinates: [state.userPosition.longitude, state.userPosition.latitude] // 使用当前用户位置
              }
            };
          }
        } else {
          // 如果未提供位置信息，使用当前用户位置
          locationData = {
            name: '当前位置',
            address: '当前位置',
            coordinates: {
              type: 'Point',
              coordinates: [state.userPosition.longitude, state.userPosition.latitude]
            }
          };
        }
        
        // 确保坐标合法
        if (!locationData.coordinates.coordinates || !locationData.coordinates.coordinates.length) {
          locationData.coordinates.coordinates = [state.userPosition.longitude, state.userPosition.latitude];
        }
        
        // 构建交通数据对象
        const trafficInfo = {
          trafficId: `traffic_${Date.now()}`,
          userId: state.userToken,
          type: trafficData.type,
          description: trafficData.description,
          location: locationData,
          timestamp: Date.now(),
          status: 'pending',
          verificationCount: 0,
          verifications: [],
          verifiedBy: []
        };
        
        console.log('经过处理后的提交数据:', trafficInfo);
        
        // 发送到后端API
        const response = await axios.post(`${API_BASE_URL}/mongodb/traffic`, trafficInfo);
        
        console.log('提交路况信息响应:', response.data);
        
        if (!response.data.success) {
          throw new Error(response.data.message || '提交路况信息失败');
        }
        
        const newTraffic = response.data.data;
        
        // 添加position属性用于前端显示
        const formattedTraffic = {...newTraffic};
        if (newTraffic.location && newTraffic.location.coordinates && newTraffic.location.coordinates.coordinates) {
          const [lng, lat] = newTraffic.location.coordinates.coordinates;
          formattedTraffic.position = { lng, lat };
        }
        
        // 添加id属性
        if (!formattedTraffic.id && formattedTraffic.trafficId) {
          formattedTraffic.id = formattedTraffic.trafficId;
        }
        
        // 添加到待验证列表
        commit('SET_PENDING_VERIFICATIONS', [...state.pendingVerifications, formattedTraffic]);
        
        // 更新用户提交历史
        const userId = state.userToken;
        const newSubmission = {
          id: `sub_${userId}_${Date.now()}`,
          timestamp: Date.now(),
          type: trafficData.type,
          location: locationData.name || '未知位置',
          status: 'success',
          reward: 10
        };
        
        // 更新用户提交历史
        if (!state.submissionHistory) {
          commit('SET_SUBMISSION_HISTORY', []);
        }
        
        commit('SET_SUBMISSION_HISTORY', [newSubmission, ...state.submissionHistory]);
        
        return formattedTraffic;
      } catch (error) {
        console.error('提交路况信息失败:', error);
        throw error;
      }
    },
    
    // 验证路况信息
    async verifyTrafficInfo({ commit, state, dispatch }, { hash, verified = true }) {
      try {
        if (!state.currentUser) {
          throw new Error('用户未登录');
        }
        
        const userId = state.currentUser.id;
        
        const response = await axios.post(`${API_BASE_URL}/traffic/verify`, {
          hash,
          userId,
          verified
        });
        
        if (response.data && response.data.success) {
          // 更新待验证列表和已验证列表
          dispatch('getPendingVerifications');
          dispatch('getNearbyTrafficInfo');
          
          return { 
            success: true, 
            message: '验证成功', 
            data: response.data.data 
          };
        } else {
          throw new Error(response.data.error || '验证失败');
        }
      } catch (error) {
        console.error('验证路况信息失败:', error);
        return { 
          success: false, 
          message: error.message || '验证失败' 
        };
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
    
    // 获取用户提交历史
    async getSubmissionHistory({ commit, state }) {
      try {
        if (!state.currentUser) {
          return { success: false, message: '用户未登录' };
        }
        
        const userId = state.currentUser.id;
        const response = await axios.get(`${API_BASE_URL}/traffic/user/${userId}`);
        
        if (response.data && response.data.success) {
          commit('SET_SUBMISSION_HISTORY', response.data.data);
          return { 
            success: true, 
            data: response.data.data 
          };
        } else {
          throw new Error(response.data.error || '获取历史记录失败');
        }
      } catch (error) {
        console.error('获取用户提交历史失败:', error);
        commit('SET_SUBMISSION_HISTORY', []);
        return { 
          success: false, 
          message: error.message || '获取历史记录失败' 
        };
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
    },

    // 重置交通信息（删除现有数据并创建新数据）
    async resetTrafficInfo({ commit, state, dispatch }) {
      try {
        // 确认用户是管理员
        const userId = state.userToken;
        const isAdmin = state.currentUser?.role === 'admin';
        console.log('重置交通信息 - 用户信息:', userId, '是否管理员:', isAdmin);

        if (state.isGuest) {
          throw new Error('游客模式无法重置交通信息');
        }
        
        if (!userId) {
          throw new Error('未登录用户无法重置交通信息');
        }
        
        if (!isAdmin) {
          throw new Error('只有管理员才能重置交通信息');
        }
        
        // 步骤1: 删除所有交通信息
        console.log('开始删除所有交通信息...');
        console.log('删除API URL:', `${API_BASE_URL}/traffic/all`);
        
        let deleteResponse;
        try {
          // 先尝试获取当前交通信息数量
          const currentTrafficResponse = await axios.get(`${API_BASE_URL}/traffic/all`);
          console.log('当前交通信息数量:', currentTrafficResponse.data?.length || '未知');
          
          // 发送删除请求
          deleteResponse = await axios.delete(`${API_BASE_URL}/traffic/all`);
          console.log('删除操作返回结果:', deleteResponse.data);
          
          if (!deleteResponse.data.success) {
            throw new Error(deleteResponse.data.message || '删除交通信息失败');
          }
          
          // 清空本地交通数据
          console.log('清空本地交通数据');
          commit('SET_TRAFFIC_LIST', []);
          commit('SET_PENDING_VERIFICATIONS', []);
        } catch (deleteError) {
          console.error('删除交通信息API调用失败:', deleteError);
          if (deleteError.response) {
            console.error('删除API错误响应:', deleteError.response.status, deleteError.response.data);
          }
          throw new Error(`删除交通信息失败: ${deleteError.message}`);
        }

        // 验证删除后是否为空
        try {
          const checkResponse = await axios.get(`${API_BASE_URL}/mongodb/traffic/all`);
          console.log('删除后交通信息数量:', checkResponse.data?.length || 0);
          if (checkResponse.data?.length > 0) {
            console.warn('警告：删除操作后仍有交通信息数据');
          }
        } catch (checkError) {
          console.error('检查删除结果失败:', checkError);
        }
        
        // 步骤2: 生成新的交通信息
        console.log('开始生成新的交通信息...');
        
        // 使用当前位置生成路况
        const position = state.userPosition;
        const lng = position.longitude;
        const lat = position.latitude;
        console.log('当前用户位置:', position);
        
        // 创建3条位置附近的交通信息
        const newTrafficData = [
          {
            trafficId: `traffic_${Date.now()}_1`,
            userId,
            type: 'congestion',
            description: '附近道路拥堵，车辆行驶缓慢，建议绕行',
            location: {
              name: '当前位置附近的主干道',
              coordinates: {
                lng: lng + 0.002,
                lat: lat + 0.001
              },
              address: '当前位置附近500米处'
            },
            status: 'pending',
            verificationCount: 0,
            verifications: [],
            verifiedBy: []
          },
          {
            trafficId: `traffic_${Date.now()}_2`,
            userId,
            type: 'construction',
            description: '道路施工，部分车道关闭，请小心驾驶',
            location: {
              name: '当前位置东南方向',
              coordinates: {
                lng: lng - 0.003,
                lat: lat - 0.002
              },
              address: '当前位置东南方向约800米处'
            },
            status: 'pending',
            verificationCount: 0,
            verifications: [],
            verifiedBy: []
          },
          {
            trafficId: `traffic_${Date.now()}_3`,
            userId,
            type: 'accident',
            description: '发生交通事故，车辆排队等待，请耐心等待',
            location: {
              name: '当前位置西北方向',
              coordinates: {
                lng: lng + 0.001,
                lat: lat + 0.003
              },
              address: '当前位置西北方向约600米处'
            },
            status: 'pending',
            verificationCount: 0,
            verifications: [],
            verifiedBy: []
          }
        ];
        
        console.log('准备创建的交通信息:', newTrafficData.length, '条');
        console.log('创建API URL:', `${API_BASE_URL}/traffic/bulk`);
        
        // 批量创建交通信息
        let createResponse;
        try {
          createResponse = await axios.post(`${API_BASE_URL}/traffic/bulk`, newTrafficData);
          console.log('创建操作结果:', createResponse.data);
          
          if (!createResponse.data.success) {
            throw new Error(createResponse.data.message || '创建交通信息失败');
          }
        } catch (createError) {
          console.error('创建交通信息API调用失败:', createError);
          if (createError.response) {
            console.error('创建API错误响应:', createError.response.status, createError.response.data);
          }
          throw new Error(`创建交通信息失败: ${createError.message}`);
        }
        
        // 步骤3: 刷新本地数据
        console.log('准备刷新本地数据...');
        try {
          await dispatch('getNearbyTrafficInfo');
          await dispatch('getPendingVerifications');
          console.log('本地数据刷新完成');
        } catch (refreshError) {
          console.error('刷新本地数据失败:', refreshError);
        }
        
        return {
          success: true,
          message: `成功重置交通信息：删除了${deleteResponse.data.deletedCount}条，创建了${createResponse.data.data.length}条`,
          deleted: deleteResponse.data.deletedCount,
          created: createResponse.data.data.length
        };
      } catch (error) {
        console.error('重置交通信息失败:', error);
        throw error;
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
  },
  modules: {}
})
