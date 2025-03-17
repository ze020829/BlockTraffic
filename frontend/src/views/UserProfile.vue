<template>
  <Layout>
    <div class="content-container">
      <!-- 左侧用户信息 -->
      <div class="user-info">
        <el-card class="user-stats">
          <template #header>
            <div class="card-header">
              <span>用户信息</span>
            </div>
          </template>
          <div class="stats-content">
            <!-- 优化用户切换界面 -->
            <div class="user-switcher">
              <h4>当前用户</h4>
              <div class="user-avatar">
                <el-avatar :size="64" :icon="UserFilled">{{ currentUser?.name?.charAt(0) }}</el-avatar>
                <div class="user-name">
                  <span>{{ currentUser?.name }}</span>
                  <el-tag size="small" :type="currentUser?.role === 'admin' ? 'danger' : 'info'">
                    {{ currentUser?.role === 'admin' ? '管理员' : '普通用户' }}
                  </el-tag>
                </div>
              </div>
              
              <div class="switch-user-section">
                <h4>切换用户</h4>
                <el-radio-group v-model="selectedUserId" @change="handleUserChange" class="user-radio-group">
                  <el-radio-button v-for="user in userList" :key="user.id" :label="user.id" :disabled="user.id === currentUser?.id">
                    {{ user.name }}
                  </el-radio-button>
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
    </div>
  </Layout>
</template>

<script setup>
import Layout from '../components/Layout.vue'
import { ref, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { Coin, UserFilled } from '@element-plus/icons-vue'

const store = useStore()
const activeTab = ref('submissions')
const selectedUserId = ref(store.state.userToken)

const userInfo = computed(() => store.state.userInfo)
const currentUser = computed(() => store.getters.currentUser)

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

onMounted(() => {
  // 初始化当前用户
  store.dispatch('initializeUser')
  
  // 获取历史记录
  store.dispatch('getSubmissionHistory')
  store.dispatch('getVerificationHistory')
})
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
</style> 