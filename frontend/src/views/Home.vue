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
                </div>
              </el-card>
            </el-scrollbar>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 路况信息对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isSubmitting ? '提交路况信息' : '路况详情'"
      width="30%"
    >
      <traffic-form
        v-if="isSubmitting"
        @submit="submitTrafficInfo"
        @cancel="dialogVisible = false"
      />
      <traffic-detail
        v-else
        :traffic="selectedTraffic"
        @verify="verifyTrafficInfo"
        @update="updateTrafficInfo"
      />
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
import { ElMessage } from 'element-plus'

const store = useStore()
const router = useRouter()
const center = ref({ lng: 116.404, lat: 39.915 })
const zoom = ref(15)
const dialogVisible = ref(false)
const isSubmitting = ref(false)
const selectedTraffic = ref(null)
const activeTab = ref('verified')

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
  dialogVisible.value = true
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
}
</style>
