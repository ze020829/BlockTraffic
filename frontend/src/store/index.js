import { createStore } from 'vuex'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

export default createStore({
  state: {
    trafficList: [],
    pendingVerifications: [], // 待验证的路况信息
    userPosition: null,
    userToken: localStorage.getItem('userToken'),
    userInfo: {
      reputation: 80,
      tokens: 100
    },
    submissionHistory: [],
    verificationHistory: []
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
    ADD_TRAFFIC(state, traffic) {
      state.trafficList.push(traffic)
    },
    UPDATE_TRAFFIC(state, { id, data }) {
      const index = state.trafficList.findIndex(item => item.id === id)
      if (index !== -1) {
        state.trafficList[index] = { ...state.trafficList[index], ...data }
      }
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
    }
  },
  
  actions: {
    async getCurrentPosition({ commit }) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        
        commit('SET_USER_POSITION', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        return position.coords;
      } catch (error) {
        console.error('获取位置失败:', error);
        throw new Error('无法获取您的位置，请检查位置权限设置');
      }
    },

    async getNearbyTrafficInfo({ commit, state, dispatch }) {
      try {
        if (!state.userPosition) {
          await dispatch('getCurrentPosition');
        }
        
        const { data } = await axios.get(`${API_BASE_URL}/traffic/nearby`, {
          params: {
            lat: state.userPosition.latitude,
            lng: state.userPosition.longitude
          }
        })
        commit('SET_TRAFFIC_LIST', data)
      } catch (error) {
        console.error('获取路况信息失败:', error)
        throw error
      }
    },
    
    async getPendingVerifications({ commit }) {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/traffic/pending`)
        commit('SET_PENDING_VERIFICATIONS', data)
      } catch (error) {
        console.error('获取待验证信息失败:', error)
        throw error
      }
    },
    
    async submitTrafficInfo({ commit }, trafficData) {
      try {
        const { data } = await axios.post(`${API_BASE_URL}/traffic`, trafficData)
        commit('ADD_TRAFFIC', { ...trafficData, id: data.id })
        return data
      } catch (error) {
        console.error('提交路况信息失败:', error)
        throw error
      }
    },
    
    async verifyTrafficInfo({ commit, state }, { trafficId }) {
      try {
        if (!state.userToken) {
          throw new Error('用户未登录')
        }
        
        const { data } = await axios.post(`${API_BASE_URL}/traffic/${trafficId}/verify`, {
          userId: state.userToken
        }, {
          headers: {
            Authorization: `Bearer ${state.userToken}`
          }
        })
        commit('UPDATE_TRAFFIC', { 
          id: trafficId, 
          data: { 
            verifications: data.verifications,
            verifiedBy: data.verifiedBy
          }
        })
        return data
      } catch (error) {
        console.error('验证路况信息失败:', error)
        throw error
      }
    },
    
    async updateTrafficInfo({ commit }, { id, ...updateData }) {
      try {
        const { data } = await axios.put(`${API_BASE_URL}/traffic/${id}`, updateData)
        commit('UPDATE_TRAFFIC', { id, data })
        return data
      } catch (error) {
        console.error('更新路况信息失败:', error)
        throw error
      }
    },
    
    async getUserInfo({ commit }) {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/user/info`)
        commit('SET_USER_INFO', data)
      } catch (error) {
        console.error('获取用户信息失败:', error)
        throw error
      }
    },
    
    async getSubmissionHistory({ commit }) {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/user/submissions`)
        commit('SET_SUBMISSION_HISTORY', data)
      } catch (error) {
        console.error('获取提交历史失败:', error)
        throw error
      }
    },
    
    async getVerificationHistory({ commit }) {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/user/verifications`)
        commit('SET_VERIFICATION_HISTORY', data)
      } catch (error) {
        console.error('获取确认历史失败:', error)
        throw error
      }
    }
  }
})
