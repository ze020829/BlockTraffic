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
        <h3>周边路况信息</h3>
        <el-scrollbar height="calc(100vh - 120px)">
          <el-card 
            v-for="item in trafficInfo" 
            :key="item.id" 
            class="traffic-card"
            @click="showTrafficDetail(item)"
          >
            <template #header>
              <div class="card-header">
                <span>{{ typeText[item.type] }}</span>
                <el-tag 
                  :type="item.status === 'verified' ? 'success' : 'warning'"
                  size="small"
                >
                  {{ item.status === 'verified' ? '已确认' : '待确认' }}
                </el-tag>
              </div>
            </template>
            <p>{{ item.description }}</p>
            <p class="time">{{ formatTime(item.timestamp) }}</p>
          </el-card>
        </el-scrollbar>
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
import { ref, onMounted } from 'vue'
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
const trafficInfo = ref([])

const typeText = {
  congestion: '交通拥堵',
  construction: '道路施工',
  accident: '交通事故',
  normal: '道路正常'
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

const handleMenuSelect = (index) => {
  if (index === '2') {
    router.push('/submit')
  } else if (index === '3') {
    router.push('/profile')
  }
}

const handleMapReady = ({ BMap, map }) => {
  // 先尝试获取用户位置
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userPos = {
        lng: position.coords.longitude,
        lat: position.coords.latitude
      }
      center.value = userPos
      store.commit('SET_USER_POSITION', userPos)
      store.dispatch('getNearbyTrafficInfo')
    },
    (error) => {
      console.error('定位失败:', error)
      ElMessage.warning('获取当前位置失败，使用默认位置')
      store.dispatch('getNearbyTrafficInfo')
    }
  )
}

const locationSuccess = (e) => {
  store.commit('SET_USER_POSITION', {
    lng: e.point.lng,
    lat: e.point.lat
  })
  center.value = {
    lng: e.point.lng,
    lat: e.point.lat
  }
  store.dispatch('getNearbyTrafficInfo')
}

const showTrafficDetail = (traffic) => {
  selectedTraffic.value = traffic
  isSubmitting.value = false
  dialogVisible.value = true
}

const submitTrafficInfo = async (data) => {
  try {
    await store.dispatch('submitTrafficInfo', {
      ...data,
      position: center.value
    })
    dialogVisible.value = false
  } catch (error) {
    console.error('提交路况信息失败:', error)
  }
}

const verifyTrafficInfo = async (trafficId) => {
  try {
    await store.dispatch('verifyTrafficInfo', trafficId)
    dialogVisible.value = false
  } catch (error) {
    console.error('验证路况信息失败:', error)
  }
}

const updateTrafficInfo = async (data) => {
  try {
    await store.dispatch('updateTrafficInfo', data)
    dialogVisible.value = false
  } catch (error) {
    console.error('更新路况信息失败:', error)
  }
}

onMounted(async () => {
  await store.dispatch('getNearbyTrafficInfo')
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
</style> 