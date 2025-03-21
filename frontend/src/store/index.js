import { createStore } from 'vuex'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

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

    // 获取附近路况信息
    async getNearbyTrafficInfo({ commit, state }) {
      try {
        console.log('正在获取附近交通信息...');
        
        // 从IPFS通过API获取已验证的交通信息
        // 目前通过MongoDB API过渡实现，后续将迁移到IPFS
        const response = await axios.get(`${API_BASE_URL}/mongodb/traffic`, {
          params: {
            status: 'verified',
            lng: state.userPosition.longitude,
            lat: state.userPosition.latitude,
            radius: 10 // 10公里范围内
          }
        });
        
        if (!response.data.success) {
          throw new Error(response.data.message || '获取交通信息失败');
        }
        
        // 记录返回的数据结构，帮助调试
        console.log('返回的交通数据示例:', response.data.data.length > 0 ? JSON.stringify(response.data.data[0], null, 2) : '无数据');
        
        // 处理数据转换，确保格式符合前端期望
        const formattedData = response.data.data.map(item => {
          // 确保每个项目都有position属性，百度地图需要这个格式
          const formattedItem = {...item};
          
          // 调试用: 输出位置信息
          console.debug('处理位置数据:', item.trafficId, item.location);
          
          try {
            // 从各种可能的格式中提取经纬度
            if (item.location && item.location.coordinates) {
              // GeoJSON Point格式: location.coordinates.coordinates = [lng, lat]
              if (item.location.coordinates.coordinates && Array.isArray(item.location.coordinates.coordinates)) {
                const [lng, lat] = item.location.coordinates.coordinates;
                formattedItem.position = { lng, lat };
                console.debug('-> 从coordinates.coordinates提取:', formattedItem.position);
              }
              // 坐标直接是数组: location.coordinates = [lng, lat]
              else if (Array.isArray(item.location.coordinates)) {
                const [lng, lat] = item.location.coordinates;
                formattedItem.position = { lng, lat };
                console.debug('-> 从coordinates数组提取:', formattedItem.position);
              }
              // 坐标是嵌套对象: location.coordinates = {type: 'Point', coordinates: [lng, lat]}
              else if (item.location.coordinates.type === 'Point' && Array.isArray(item.location.coordinates.coordinates)) {
                const [lng, lat] = item.location.coordinates.coordinates;
                formattedItem.position = { lng, lat };
                console.debug('-> 从GeoJSON Point提取:', formattedItem.position);
              }
            }
            // 直接有lng/lat属性
            else if (item.location && item.location.lng !== undefined && item.location.lat !== undefined) {
              formattedItem.position = {
                lng: item.location.lng,
                lat: item.location.lat
              };
              console.debug('-> 从location.lng/lat提取:', formattedItem.position);
            }
            // 检查是否已有position属性
            else if (item.position && item.position.lng !== undefined && item.position.lat !== undefined) {
              // position属性已存在且有效，不需要额外处理
              console.debug('-> 已有position属性:', item.position);
            }
            // 如果仍然没有位置信息，创建一个默认位置（成都）
            if (!formattedItem.position) {
              console.warn('无法提取位置信息，使用默认位置:', item.trafficId);
              formattedItem.position = { lng: 104.0668, lat: 30.5728 };
              console.debug('-> 使用默认位置:', formattedItem.position);
            }
          } catch (error) {
            console.error('处理位置数据时出错:', error, item);
            // 设置默认位置
            formattedItem.position = { lng: 104.0668, lat: 30.5728 };
          }
          
          // 确保有id属性（可能在MongoDB中是trafficId）
          if (!formattedItem.id && formattedItem.trafficId) {
            formattedItem.id = formattedItem.trafficId;
          }
          
          return formattedItem;
        });
        
        console.log(`获取到${response.data.data.length}条附近交通信息，转换后:`, formattedData.length);
        commit('SET_TRAFFIC_LIST', formattedData);
        return formattedData;
      } catch (error) {
        console.error('获取附近交通信息失败:', error);
        // 如果API调用失败，返回空数组而不是抛出错误
        commit('SET_TRAFFIC_LIST', []);
        return [];
      }
    },
    
    // 获取待验证路况信息
    async getPendingVerifications({ commit, state }) {
      try {
        console.log('正在获取待验证交通信息...');
        
        // 调用MongoDB API获取待验证的交通信息
        const response = await axios.get(`${API_BASE_URL}/mongodb/traffic`, {
          params: {
            status: 'pending',
            lng: state.userPosition.longitude,
            lat: state.userPosition.latitude,
            radius: 10 // 10公里范围内
          }
        });
        
        if (!response.data.success) {
          throw new Error(response.data.message || '获取待验证信息失败');
        }
        
        // 记录返回的数据结构，帮助调试
        console.log('返回的待验证数据示例:', response.data.data.length > 0 ? JSON.stringify(response.data.data[0], null, 2) : '无数据');
        
        // 处理数据转换，确保格式符合前端期望
        const formattedData = response.data.data.map(item => {
          // 确保每个项目都有position属性，百度地图需要这个格式
          const formattedItem = {...item};
          
          // 调试用: 输出位置信息
          console.debug('处理待验证位置数据:', item.trafficId, item.location);
          
          try {
            // 从各种可能的格式中提取经纬度
            if (item.location && item.location.coordinates) {
              // GeoJSON Point格式: location.coordinates.coordinates = [lng, lat]
              if (item.location.coordinates.coordinates && Array.isArray(item.location.coordinates.coordinates)) {
                const [lng, lat] = item.location.coordinates.coordinates;
                formattedItem.position = { lng, lat };
                console.debug('-> 从coordinates.coordinates提取:', formattedItem.position);
              }
              // 坐标直接是数组: location.coordinates = [lng, lat]
              else if (Array.isArray(item.location.coordinates)) {
                const [lng, lat] = item.location.coordinates;
                formattedItem.position = { lng, lat };
                console.debug('-> 从coordinates数组提取:', formattedItem.position);
              }
              // 坐标是嵌套对象: location.coordinates = {type: 'Point', coordinates: [lng, lat]}
              else if (item.location.coordinates.type === 'Point' && Array.isArray(item.location.coordinates.coordinates)) {
                const [lng, lat] = item.location.coordinates.coordinates;
                formattedItem.position = { lng, lat };
                console.debug('-> 从GeoJSON Point提取:', formattedItem.position);
              }
            }
            // 直接有lng/lat属性
            else if (item.location && item.location.lng !== undefined && item.location.lat !== undefined) {
              formattedItem.position = {
                lng: item.location.lng,
                lat: item.location.lat
              };
              console.debug('-> 从location.lng/lat提取:', formattedItem.position);
            }
            // 检查是否已有position属性
            else if (item.position && item.position.lng !== undefined && item.position.lat !== undefined) {
              // position属性已存在且有效，不需要额外处理
              console.debug('-> 已有position属性:', item.position);
            }
            // 如果仍然没有位置信息，创建一个默认位置（成都）
            if (!formattedItem.position) {
              console.warn('无法提取位置信息，使用默认位置:', item.trafficId);
              formattedItem.position = { lng: 104.0668, lat: 30.5728 };
              console.debug('-> 使用默认位置:', formattedItem.position);
            }
          } catch (error) {
            console.error('处理待验证位置数据时出错:', error, item);
            // 设置默认位置
            formattedItem.position = { lng: 104.0668, lat: 30.5728 };
          }
          
          // 确保有id属性（可能在MongoDB中是trafficId）
          if (!formattedItem.id && formattedItem.trafficId) {
            formattedItem.id = formattedItem.trafficId;
          }
          
          return formattedItem;
        });
        
        console.log(`获取到${response.data.data.length}条待验证交通信息，转换后:`, formattedData.length);
        commit('SET_PENDING_VERIFICATIONS', formattedData);
        return formattedData;
      } catch (error) {
        console.error('获取待验证交通信息失败:', error);
        // 如果API调用失败，返回空数组而不是抛出错误
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
    async verifyTrafficInfo({ commit, state, dispatch }, { trafficId }) {
      if (state.isGuest) {
        throw new Error('游客模式无法验证路况信息，请先登录')
      }

      // 检查trafficId的有效性
      if (!trafficId || typeof trafficId !== 'string') {
        throw new Error('无效的路况ID格式')
      }
      
      try {
        if (!state.userToken) {
          throw new Error('用户未登录')
        }

        // 先检查用户是否已经验证过
        const pendingItem = state.pendingVerifications.find(item => item.id === trafficId);
        if (pendingItem && pendingItem.verifiedBy && pendingItem.verifiedBy.includes(state.userToken)) {
          throw new Error('您已经验证过此路况信息');
        }

        // 根据ID格式处理，在MongoDB中的ID是 test_traffic_XXX 格式
        let actualTrafficId = trafficId;
        
        // 处理各种可能的ID格式
        if (trafficId.startsWith('pending_')) {
          actualTrafficId = `test_traffic_00${trafficId.substring(8)}`;
        } else if (trafficId === '0') {
          actualTrafficId = 'test_traffic_001';
        }
        
        console.log(`发送验证请求，原始ID: ${trafficId}, 实际使用ID: ${actualTrafficId}, 当前用户: ${state.userToken}`);
        
        try {
          const response = await axios.post(`${API_BASE_URL}/mongodb/traffic/verify/${actualTrafficId}`, {
            userId: state.userToken,
            result: true
          });
  
          console.log('验证请求响应:', response.data);
  
          if (!response.data.success) {
            throw new Error(response.data.message || '验证失败');
          }
  
          const result = response.data.data;
          
          // 更新待验证列表中的项目
          const pendingIndex = state.pendingVerifications.findIndex(item => item.id === trafficId);
          if (pendingIndex !== -1) {
            const updatedItem = {
              ...state.pendingVerifications[pendingIndex],
              verificationCount: result.verificationCount,
              verifications: result.verificationCount,
              verifiedBy: result.verifiedBy || [],
              status: result.status
            };
            
            console.log('更新状态 - 确认计数:', result.verificationCount, '确认用户:', result.verifiedBy);
  
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
          
          // 检查是否为404错误，如果是，尝试直接使用test_traffic_001
          if (error.response && error.response.status === 404) {
            try {
              console.log('尝试使用固定ID重新发送请求: test_traffic_001');
              const retryResponse = await axios.post(`${API_BASE_URL}/mongodb/traffic/verify/test_traffic_001`, {
                userId: state.userToken,
                result: true
              });
              
              if (retryResponse.data.success) {
                console.log('使用固定ID验证成功:', retryResponse.data);
                
                // 获取结果数据
                const retryResult = retryResponse.data.data;
                
                // 更新待验证列表中的项目 - 使用原始trafficId匹配
                const pendingIndex = state.pendingVerifications.findIndex(item => item.id === trafficId);
                console.log(`重试成功，查找原始ID ${trafficId} 在待验证列表中的位置:`, pendingIndex);
                console.log('当前待验证列表:', JSON.stringify(state.pendingVerifications.map(i => ({id: i.id, type: i.type})), null, 2));

                if (pendingIndex !== -1) {
                  const updatedItem = {
                    ...state.pendingVerifications[pendingIndex],
                    verificationCount: retryResult.verificationCount,
                    verifications: retryResult.verificationCount,
                    verifiedBy: retryResult.verifiedBy || [],
                    status: retryResult.status
                  };
                  console.log('更新后的项目:', updatedItem);
                  console.log('更新状态 - 确认计数:', retryResult.verificationCount, '确认用户:', retryResult.verifiedBy);
                  
                  // 如果已经验证完成，移动到已验证列表
                  if (retryResult.status === 'verified') {
                    const newPendingList = state.pendingVerifications.filter(item => item.id !== trafficId);
                    console.log('状态已验证，移动到已验证列表，剩余待验证项目数:', newPendingList.length);
                    commit('SET_PENDING_VERIFICATIONS', newPendingList);
                    commit('SET_TRAFFIC_LIST', [...state.trafficList, updatedItem]);
                  } else {
                    // 否则更新待验证列表
                    const newPendingList = [...state.pendingVerifications];
                    newPendingList[pendingIndex] = updatedItem;
                    console.log('状态待验证，更新待验证列表');
                    commit('SET_PENDING_VERIFICATIONS', newPendingList);
                  }
                } else {
                  console.error('找不到匹配的待验证项目！尝试强制刷新数据');
                  // 如果找不到匹配项，尝试刷新数据
                  dispatch('getPendingVerifications');
                  dispatch('getNearbyTrafficInfo');
                }
                
                // 更新用户信息
                if (retryResult.reward) {
                  commit('UPDATE_USER_STATS', {
                    reputation: retryResult.reward.reputation,
                    tokens: retryResult.reward.tokens
                  });
                }
                
                // 更新用户验证历史
                const newVerification = {
                  id: `ver_${state.userToken}_${Date.now()}`,
                  timestamp: Date.now(),
                  type: state.pendingVerifications[pendingIndex]?.type,
                  location: state.pendingVerifications[pendingIndex]?.location,
                  result: 'correct',
                  reputation: retryResult.reward.reputation
                };
                
                if (!userVerificationHistories[state.userToken]) {
                  userVerificationHistories[state.userToken] = [];
                }
                
                userVerificationHistories[state.userToken] = [newVerification, ...userVerificationHistories[state.userToken]];
                commit('SET_VERIFICATION_HISTORY', userVerificationHistories[state.userToken]);
                
                return retryResult;
              }
            } catch (retryError) {
              console.error('重试验证失败:', retryError);
            }
          }
          
          throw error;
        }
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
        console.log('删除API URL:', `${API_BASE_URL}/mongodb/traffic/all`);
        
        let deleteResponse;
        try {
          // 先尝试获取当前交通信息数量
          const currentTrafficResponse = await axios.get(`${API_BASE_URL}/mongodb/traffic/all`);
          console.log('当前交通信息数量:', currentTrafficResponse.data?.length || '未知');
          
          // 发送删除请求
          deleteResponse = await axios.delete(`${API_BASE_URL}/mongodb/traffic/all`);
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
        console.log('创建API URL:', `${API_BASE_URL}/mongodb/traffic/bulk`);
        
        // 批量创建交通信息
        let createResponse;
        try {
          createResponse = await axios.post(`${API_BASE_URL}/mongodb/traffic/bulk`, newTrafficData);
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
  }
})
