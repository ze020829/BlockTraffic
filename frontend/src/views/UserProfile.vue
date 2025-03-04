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
        </el-card>
      </div>

      <!-- 右侧历史记录 -->
      <div class="history-container">
        <el-tabs v-model="activeTab" class="history-tabs">
          <el-tab-pane label="提交历史" name="submissions">
            <el-table :data="submissionHistory" style="width: 100%">
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
            <el-table :data="verificationHistory" style="width: 100%">
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
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { Coin } from '@element-plus/icons-vue'

const store = useStore()
const activeTab = ref('submissions')

const userInfo = computed(() => store.state.userInfo)

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
  return new Date(timestamp).toLocaleString()
}

// 这些数据应该从 Vuex 获取
const submissionHistory = computed(() => store.state.submissionHistory)
const verificationHistory = computed(() => store.state.verificationHistory)
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
  justify-content: space-around;
  padding: 20px 0;
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
</style> 