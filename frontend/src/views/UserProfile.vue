<template>
  <Layout>
    <div class="content-container">
      <template v-if="isGuest">
        <el-card class="guest-card">
          <template #header>
            <div class="card-header">
              <span>游客模式</span>
            </div>
          </template>
          <div class="guest-content">
            <el-alert
              title="当前处于游客模式"
              type="info"
              description="登录后可以查看个人中心、提交路况信息、验证路况信息、获取奖励等"
              show-icon
            />
          </div>
        </el-card>
      </template>
      
      <template v-else>
        <!-- 左侧用户信息 -->
        <div class="user-info">
          <el-card class="user-stats">
            <template #header>
              <div class="card-header">
                <span>用户信息</span>
                <el-button 
                  type="primary" 
                  @click="syncWithBlockchain" 
                  :disabled="!currentUser?.id"
                >
                  同步到区块链
                </el-button>
              </div>
            </template>
            <div class="stats-content">
              <!-- 优化用户切换界面 -->
              <div class="user-switcher">
                <h4>当前用户</h4>
                <div class="user-avatar">
                  <el-avatar :size="64" :icon="UserFilled">
                    {{ currentUser?.id?.charAt(0) || 'U' }}
                  </el-avatar>
                  <div class="user-name">
                    <span>{{ currentUser?.id || '未知用户' }}</span>
                    <el-tag size="small" :type="currentUser?.role === 'admin' ? 'danger' : 'info'">
                      {{ currentUser?.role === 'admin' ? '管理员' : '游客' }}
                    </el-tag>
                  </div>
                </div>
                
                <div class="switch-user-section">
                  <h4>切换用户</h4>
                  <el-radio-group v-model="selectedUserId" @change="handleUserChange" class="user-radio-group">
                    <el-radio 
                      v-for="user in userList" 
                      :key="user.id" 
                      :value="user.id" 
                      :disabled="user.id === currentUser?.id"
                    >
                      {{ user.name }}
                    </el-radio>
                  </el-radio-group>
                </div>
              </div>
              
              <div class="user-stats-container">
                <div class="stat-item">
                  <h4>信誉度</h4>
                  <el-progress
                    type="dashboard"
                    :percentage="userInfo.reputation"
                    :color="reputationColor"
                  />
                </div>
                <div class="stat-item">
                  <h4>代币数量</h4>
                  <div class="token-amount">
                    <el-icon><Coin /></el-icon>
                    <span>{{ userInfo.tokens }}</span>
                  </div>
                </div>
                <div class="stat-item blockchain-info">
                  <h4>区块链信息</h4>
                  <div class="blockchain-status">
                    <el-tag type="success" v-if="blockchainStatus">已同步</el-tag>
                    <el-tag type="warning" v-else>本地模式</el-tag>
                  </div>
                  <div class="blockchain-details">
                    <p>上次同步: {{ lastSyncTime }}</p>
                    <p class="blockchain-note">
                      <el-icon><InfoFilled /></el-icon>
                      <span>只有信誉度和代币会存储到区块链</span>
                    </p>
                    <el-button size="small" type="primary" @click="syncWithBlockchain">
                      同步到区块链
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 右侧历史记录 -->
        <div class="history-container">
          <el-tabs v-model="activeTab" class="history-tabs">
            <el-tab-pane label="提交历史" name="submissions">
              <el-empty v-if="submissionHistory.length === 0" description="暂无提交历史" />
              <el-table v-else :data="submissionHistory" style="width: 100%">
                <el-table-column prop="time" label="时间" width="180">
                  <template #default="scope">
                    {{ formatTime(scope.row.timestamp) }}
                  </template>
                </el-table-column>
                <el-table-column prop="type" label="类型" width="120">
                  <template #default="scope">
                    {{ typeText[scope.row.type] }}
                  </template>
                </el-table-column>
                <el-table-column prop="location" label="位置" />
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="scope">
                    <el-tag :type="scope.row.status === 'success' ? 'success' : 'danger'">
                      {{ scope.row.status === 'success' ? '成功' : '失败' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="reward" label="奖励" width="100">
                  <template #default="scope">
                    <span v-if="scope.row.status === 'success'" class="reward">
                      +{{ scope.row.reward }}
                    </span>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>

            <el-tab-pane label="确认历史" name="verifications">
              <el-empty v-if="verificationHistory.length === 0" description="暂无确认历史" />
              <el-table v-else :data="verificationHistory" style="width: 100%">
                <el-table-column prop="time" label="时间" width="180">
                  <template #default="scope">
                    {{ formatTime(scope.row.timestamp) }}
                  </template>
                </el-table-column>
                <el-table-column prop="type" label="类型" width="120">
                  <template #default="scope">
                    {{ typeText[scope.row.type] }}
                  </template>
                </el-table-column>
                <el-table-column prop="location" label="位置" />
                <el-table-column prop="result" label="结果" width="100">
                  <template #default="scope">
                    <el-tag :type="scope.row.result === 'correct' ? 'success' : 'danger'">
                      {{ scope.row.result === 'correct' ? '正确' : '错误' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="reputation" label="信誉度变化" width="120">
                  <template #default="scope">
                    <span :class="scope.row.reputation >= 0 ? 'increase' : 'decrease'">
                      {{ scope.row.reputation >= 0 ? '+' : '' }}{{ scope.row.reputation }}
                    </span>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </div>
      </template>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import Layout from '../components/Layout.vue'
import { ref, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { Coin, UserFilled, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import moment from 'moment'

const API_BASE_URL = 'http://localhost:3000/api'

const store = useStore()
const activeTab = ref('submissions')
const selectedUserId = ref(store.state.userToken)

const userInfo = computed(() => store.state.userInfo || { reputation: 0, tokens: 0 })
const currentUser = computed(() => store.getters.currentUser || { id: '', role: 'user' })
const blockchainStatus = ref(false)
const lastSyncTime = ref('未同步')

const typeText = {
  congestion: '交通拥堵',
  construction: '道路施工',
  accident: '交通事故',
  normal: '道路正常'
}

const reputationColor = computed(() => {
  const reputation = userInfo.value.reputation
  if (reputation >= 80) return '#67C23A'
  if (reputation >= 60) return '#E6A23C'
  return '#F56C6C'
})

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 这些数据应该从 Vuex 获取
const submissionHistory = computed(() => store.state.submissionHistory)
const verificationHistory = computed(() => store.state.verificationHistory)

const userList = computed(() => store.state.userList)

const handleUserChange = () => {
  store.dispatch('switchUser', selectedUserId.value)
}

// 监听当前用户变化，更新选中的用户ID
watch(() => store.state.userToken, (newToken) => {
  selectedUserId.value = newToken
})

// 获取游客模式状态
const isGuest = computed(() => store.getters.isGuest)

onMounted(() => {
  // 初始化当前用户
  store.dispatch('initializeUser')
  
  // 获取历史记录
  store.dispatch('getSubmissionHistory')
  store.dispatch('getVerificationHistory')
  
  // 检查区块链状态
  checkBlockchainStatus()
})

// 同步用户信息到区块链
const syncWithBlockchain = async () => {
  if (!currentUser.value?.id) {
    ElMessage.warning('用户信息不完整，无法同步到区块链')
    return
  }
  
  try {
    const result = await store.dispatch('updateUserInfo', {
      id: currentUser.value.id,
      reputation: userInfo.value.reputation,
      tokens: userInfo.value.tokens
    })
    
    if (result.blockchainSync) {
      blockchainStatus.value = true
      lastSyncTime.value = new Date().toLocaleString()
      ElMessage.success('用户关键信息已成功同步到区块链')
    } else {
      ElMessage({
        message: result.warning || '区块链同步失败，请稍后重试',
        type: 'warning',
        duration: 5000
      })
    }
  } catch (error) {
    console.error('同步到区块链失败:', error)
    ElMessage.error('同步失败: ' + (error.message || '未知错误'))
  }
}

// 检查区块链连接状态
const checkBlockchainStatus = async () => {
  try {
    // 尝试从区块链获取用户关键信息
    const result = await store.dispatch('getUserCredentials')
    blockchainStatus.value = result.blockchainSync
    
    if (result.blockchainSync) {
      lastSyncTime.value = new Date().toLocaleString()
    } else {
      lastSyncTime.value = '未同步'
    }
  } catch (error) {
    console.error('检查区块链状态失败:', error)
    blockchainStatus.value = false
    lastSyncTime.value = '未同步'
  }
}
</script>

<style scoped>
.content-container {
  display: flex;
  gap: 20px;
  height: 100%;
}

.user-info {
  flex: 1;
}

.history-container {
  flex: 2;
}

.user-stats {
  margin-bottom: 20px;
}

.stats-content {
  display: flex;
  flex-direction: column;
  padding: 20px 0;
}

.user-switcher {
  margin: 0 0 20px 0;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.user-avatar {
  display: flex;
  align-items: center;
  margin: 15px 0;
}

.user-name {
  margin-left: 15px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.user-name span {
  font-size: 18px;
  font-weight: bold;
}

.switch-user-section {
  margin-top: 15px;
}

.user-radio-group {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.user-stats-container {
  display: flex;
  justify-content: space-around;
  margin-top: 10px;
}

.stat-item {
  text-align: center;
}

.token-amount {
  font-size: 24px;
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.history-tabs {
  margin-top: 20px;
}

.reward {
  color: #67C23A;
  font-weight: bold;
}

.increase {
  color: #67C23A;
}

.decrease {
  color: #F56C6C;
}

h4 {
  margin-bottom: 10px;
  color: #606266;
}

.blockchain-info {
  text-align: center;
}

.blockchain-status {
  margin-bottom: 10px;
}

.blockchain-details {
  margin-top: 10px;
}

.blockchain-note {
  margin-top: 10px;
  font-size: 0.8em;
  color: #909399;
}
</style> 