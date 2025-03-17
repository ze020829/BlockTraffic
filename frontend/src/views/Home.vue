<template>
  <Layout>
    <div class="content-container">
      <!-- 左侧地图 -->
      <div class="map-container">
        <baidu-map 
          class="map"
          :center="center"
          :zoom="zoom"
          :scroll-wheel-zoom="true"
          @ready="handleMapReady"
        >
          <bm-geolocation
            anchor="BMAP_ANCHOR_BOTTOM_RIGHT"
            :showAddressBar="true"
            :autoLocation="true"
            @locationSuccess="locationSuccess"
          />
          <bm-marker
            v-for="traffic in trafficInfo"
            :key="traffic.id"
            :position="traffic.position"
            @click="showTrafficDetail(traffic)"
          />
        </baidu-map>
      </div>

      <!-- 右侧路况列表 -->
      <div class="traffic-list">
        <!-- 添加管理员标识 -->
        <div class="admin-badge" v-if="isAdmin">
          <el-tag type="danger">管理员模式</el-tag>
        </div>
        
        <h3>周边路况信息（1公里范围内）</h3>
        <el-tabs v-model="activeTab">
          <el-tab-pane label="已验证" name="verified">
            <el-scrollbar height="calc(100vh - 180px)">
              <el-card 
                v-for="item in verifiedTraffic" 
                :key="item.id" 
                class="traffic-card"
                @click="showTrafficDetail(item)"
              >
                <template #header>
                  <div class="card-header">
                    <span>{{ typeText[item.type] }}</span>
                    <el-tag type="success" size="small">已确认</el-tag>
                  </div>
                </template>
                <p>{{ item.description }}</p>
                <p class="time">{{ formatTime(item.timestamp) }}</p>
                <p class="location">{{ item.location }}</p>
                
                <!-- 管理员可以直接删除或修改已验证的路况 -->
                <div class="admin-actions" v-if="isAdmin">
                  <el-button 
                    type="warning" 
                    size="small"
                    @click.stop="editTraffic(item)"
                  >
                    编辑
                  </el-button>
                  <el-button 
                    type="danger" 
                    size="small"
                    @click.stop="deleteTraffic(item.id)"
                  >
                    删除
                  </el-button>
                </div>
              </el-card>
            </el-scrollbar>
          </el-tab-pane>

          <el-tab-pane label="待验证" name="pending">
            <el-scrollbar height="calc(100vh - 180px)">
              <el-card 
                v-for="item in pendingVerifications" 
                :key="item.id" 
                class="traffic-card"
                @click="showTrafficDetail(item)"
              >
                <template #header>
                  <div class="card-header">
                    <span>{{ typeText[item.type] }}</span>
                    <el-tag type="warning" size="small">
                      待确认 ({{ item.verifications }}/5)
                    </el-tag>
                  </div>
                </template>
                <p>{{ item.description }}</p>
                <p class="time">{{ formatTime(item.timestamp) }}</p>
                <p class="location">{{ item.location }}</p>
                <div class="verify-action">
                  <el-button 
                    type="primary" 
                    size="small"
                    @click.stop="verifyTraffic(item.id)"
                  >
                    确认
                  </el-button>
                  
                  <!-- 管理员可以直接批准待验证的路况 -->
                  <el-button 
                    v-if="isAdmin"
                    type="success" 
                    size="small"
                    @click.stop="adminApprove(item.id)"
                  >
                    管理员批准
                  </el-button>
                </div>
              </el-card>
            </el-scrollbar>
          </el-tab-pane>
          
          <!-- 管理员专用标签页 -->
          <el-tab-pane v-if="isAdmin" label="管理" name="admin">
            <el-scrollbar height="calc(100vh - 180px)">
              <div class="admin-panel">
                <h4>管理员控制面板</h4>
                <div class="admin-actions">
                  <el-button type="primary" @click="refreshAllData">刷新所有数据</el-button>
                  <el-button type="warning" @click="showSystemSettings">系统设置</el-button>
                </div>
                
                <div class="admin-stats">
                  <h4>系统统计</h4>
                  <p>总路况数量: {{ trafficInfo.length + pendingVerifications.length }}</p>
                  <p>已验证路况: {{ verifiedTraffic.length }}</p>
                  <p>待验证路况: {{ pendingVerifications.length }}</p>
                </div>
              </div>
            </el-scrollbar>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 路况信息对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isSubmitting ? '提交路况信息' : (isEditing ? '编辑路况信息' : '路况详情')"
      width="30%"
    >
      <traffic-form
        v-if="isSubmitting || isEditing"
        :initial-data="isEditing ? selectedTraffic : null"
        @submit="isEditing ? updateTrafficInfo : submitTrafficInfo"
        @cancel="dialogVisible = false"
      />
      <traffic-detail
        v-else
        :traffic="selectedTraffic"
        @verify="verifyTrafficInfo"
        @update="updateTrafficInfo"
      />
    </el-dialog>
    
    <!-- 系统设置对话框 -->
    <el-dialog
      v-model="settingsDialogVisible"
      title="系统设置"
      width="40%"
    >
      <div class="settings-form">
        <h4>区块链设置</h4>
        <el-form label-width="120px">
          <el-form-item label="刷新间隔">
            <el-input-number v-model="refreshInterval" :min="5" :max="60" />
            <span class="unit">秒</span>
          </el-form-item>
          
          <el-form-item label="验证阈值">
            <el-input-number v-model="verificationThreshold" :min="1" :max="10" />
            <span class="unit">次</span>
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="saveSettings">保存设置</el-button>
            <el-button @click="settingsDialogVisible = false">取消</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { Location, Plus, User } from '@element-plus/icons-vue'
import TrafficForm from '../components/TrafficForm.vue'
import TrafficDetail from '../components/TrafficDetail.vue'
import { useRouter } from 'vue-router'
import Layout from '../components/Layout.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const store = useStore()
const router = useRouter()
const center = ref({ lng: 116.404, lat: 39.915 })
const zoom = ref(15)
const dialogVisible = ref(false)
const isSubmitting = ref(false)
const isEditing = ref(false)
const selectedTraffic = ref(null)
const activeTab = ref('verified')
const settingsDialogVisible = ref(false)
const refreshInterval = ref(30)
const verificationThreshold = ref(5)

// 获取当前用户是否为管理员
const isAdmin = computed(() => store.getters.isAdmin)

const typeText = {
  congestion: '交通拥堵',
  construction: '道路施工',
  accident: '交通事故',
  normal: '道路正常'
}

const trafficInfo = computed(() => store.state.trafficList)
const pendingVerifications = computed(() => store.state.pendingVerifications)
const verifiedTraffic = computed(() => 
  store.state.trafficList.filter(t => t.status === 'verified')
)

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

const locationSuccess = (result) => {
  const userPos = {
    latitude: result.point.lat,
    longitude: result.point.lng
  }
  center.value = { lng: userPos.longitude, lat: userPos.latitude }
  store.commit('SET_USER_POSITION', userPos)
  store.dispatch('getNearbyTrafficInfo')
  store.dispatch('getPendingVerifications')
}

const handleMapReady = ({ BMap, map }) => {
  // 定位成功回调
  const handleLocationSuccess = (position) => {
    const userPos = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    }
    center.value = { lng: userPos.longitude, lat: userPos.latitude }
    store.commit('SET_USER_POSITION', userPos)
    // 确保用户位置设置后再获取数据
    Promise.all([
      store.dispatch('getNearbyTrafficInfo'),
      store.dispatch('getPendingVerifications')
    ]).catch(error => {
      console.error('初始化数据获取失败:', error)
    })
  }

  // 先尝试浏览器定位
  navigator.geolocation.getCurrentPosition(
    handleLocationSuccess,
    (error) => {
      console.error('浏览器定位失败:', error)
      ElMessage.warning('正在尝试百度地图定位...')
      // 启用百度地图定位
      const geolocation = new BMap.Geolocation()
      geolocation.getCurrentPosition(function(r) {
        if (this.getStatus() === BMAP_STATUS_SUCCESS) {
          const userPos = {
            latitude: r.point.lat,
            longitude: r.point.lng
          }
          center.value = { lng: userPos.longitude, lat: userPos.latitude }
          store.commit('SET_USER_POSITION', userPos)
          Promise.all([
            store.dispatch('getNearbyTrafficInfo'),
            store.dispatch('getPendingVerifications')
          ])
        } else {
          ElMessage.error('定位失败，请手动刷新页面重试')
          console.error('百度地图定位失败:', this.getStatus())
        }
      })
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    }
  )
}

const showTrafficDetail = (traffic) => {
  selectedTraffic.value = traffic
  isSubmitting.value = false
  isEditing.value = false
  dialogVisible.value = true
}

// 编辑路况信息
const editTraffic = (traffic) => {
  selectedTraffic.value = traffic
  isSubmitting.value = false
  isEditing.value = true
  dialogVisible.value = true
}

// 删除路况信息
const deleteTraffic = (trafficId) => {
  ElMessageBox.confirm(
    '确定要删除这条路况信息吗？此操作不可逆。',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      // 这里应该调用删除API
      ElMessage.success('删除成功')
      // 刷新数据
      refreshAllData()
    })
    .catch(() => {
      ElMessage.info('已取消删除')
    })
}

// 管理员直接批准路况
const adminApprove = async (trafficId) => {
  try {
    // 这里应该调用管理员批准API
    // 模拟批准成功
    ElMessage.success('管理员批准成功')
    // 刷新数据
    await refreshAllData()
  } catch (error) {
    console.error('管理员批准失败:', error)
    ElMessage.error(error.message || '批准失败')
  }
}

// 刷新所有数据
const refreshAllData = async () => {
  try {
    ElMessage.info('正在刷新数据...')
    await Promise.all([
      store.dispatch('getNearbyTrafficInfo'),
      store.dispatch('getPendingVerifications')
    ])
    ElMessage.success('数据刷新成功')
  } catch (error) {
    console.error('数据刷新失败:', error)
    ElMessage.error('数据刷新失败')
  }
}

// 显示系统设置
const showSystemSettings = () => {
  settingsDialogVisible.value = true
}

// 保存系统设置
const saveSettings = () => {
  ElMessage.success('设置保存成功')
  settingsDialogVisible.value = false
}

const verifyTraffic = async (trafficId) => {
  try {
    await store.dispatch('verifyTrafficInfo', { trafficId })
    ElMessage.success('确认成功')
    // 刷新待验证列表和周边路况
    // 刷新数据时添加距离参数（1000米）
    await Promise.all([
      store.dispatch('getPendingVerifications'),
      store.dispatch('getNearbyTrafficInfo', { distance: 1000 })
    ]).catch(error => {
      console.error('数据刷新失败:', error)
      ElMessage.error('数据刷新失败，请稍后重试')
    })
  } catch (error) {
    console.error('确认路况信息失败:', error)
    ElMessage.error(error.response?.data?.error || error.message || '确认失败')
  }
}

onMounted(() => {
  // 监听路由变化，当进入首页时刷新数据
  router.afterEach((to) => {
    if (to.path === '/') {
      store.dispatch('getNearbyTrafficInfo')
      store.dispatch('getPendingVerifications')
    }
  })
  
  // 初始加载
  store.dispatch('getNearbyTrafficInfo')
  store.dispatch('getPendingVerifications')
})
</script>

<style scoped>
.content-container {
  display: flex;
  height: calc(100vh - 40px);
}

.map-container {
  flex: 2;
  height: 100%;
  margin-right: 20px;
}

.map {
  height: 100%;
  width: 100%;
}

.traffic-list {
  flex: 1;
  min-width: 300px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 4px;
  position: relative;
}

.admin-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
}

.traffic-card {
  margin-bottom: 10px;
  cursor: pointer;
}

.traffic-card:hover {
  box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.time {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.verify-action {
  margin-top: 10px;
  text-align: right;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.admin-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.admin-panel {
  padding: 15px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.admin-stats {
  margin-top: 20px;
  padding: 15px;
  background: #f0f9eb;
  border-radius: 4px;
}

.settings-form {
  padding: 20px;
}

.unit {
  margin-left: 10px;
  color: #666;
}
</style>
