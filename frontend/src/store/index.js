import { createStore } from 'vuex'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

const mockTrafficData = [
  {
    id: 1,
    type: 'congestion',
    location: '北京市海淀区中关村大街',
    description: '早高峰拥堵',
    position: { lng: 116.404, lat: 39.915 },
    status: 'verified',
    timestamp: Date.now() - 3600000
  },
  // ... 可以添加更多模拟数据
]

export default createStore({
  state: {
    trafficList: [],
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
    async getNearbyTrafficInfo({ commit }) {
      try {
        // 暂时使用模拟数据
        commit('SET_TRAFFIC_LIST', mockTrafficData)
      } catch (error) {
        console.error('获取路况信息失败:', error)
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
    
    async verifyTrafficInfo({ commit }, trafficId) {
      try {
        const { data } = await axios.post(`${API_BASE_URL}/traffic/${trafficId}/verify`)
        commit('UPDATE_TRAFFIC', { 
          id: trafficId, 
          data: { verifications: data.verifications }
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