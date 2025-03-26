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
            v-for="traffic in trafficInfo.filter(t => t.position)"
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
                
                <!-- 添加图片缩略图显示 -->
                <div v-if="item.imageHash" class="traffic-image-preview">
                  <img :src="`/api/traffic/${item.hash}/image`" alt="路况图片" class="thumbnail" />
                </div>
                
                <p class="traffic-description">{{ item.description || '无描述信息' }}</p>
                <p class="time">{{ formatTime(item.timestamp || item.created) }}</p>
                <p class="location">{{ formatLocation(item.location) }}</p>
                
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
              <el-empty v-if="verifiedTraffic.length === 0" description="暂无已验证的路况信息"></el-empty>
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
                      待确认 ({{ getVerificationCount(item) }}/5)
                    </el-tag>
                  </div>
                </template>
                
                <!-- 添加图片缩略图显示 -->
                <div v-if="item.imageHash" class="traffic-image-preview">
                  <img :src="`/api/traffic/${item.hash}/image`" alt="路况图片" class="thumbnail" />
                </div>
                
                <p class="traffic-description">{{ item.description || '无描述信息' }}</p>
                <p class="time">{{ formatTime(item.timestamp || item.created) }}</p>
                <p class="location">{{ formatLocation(item.location) }}</p>
                <div class="verify-action">
                  <el-button 
                    v-if="canVerifyTraffic && !hasUserVerified(item)"
                    type="primary" 
                    size="small"
                    @click.stop="verifyTraffic(item.id)"
                  >
                    确认
                  </el-button>
                  <el-button 
                    v-else-if="canVerifyTraffic && hasUserVerified(item)"
                    type="info" 
                    size="small"
                    disabled
                  >
                    已确认
                  </el-button>
                  <el-button 
                    v-else
                    type="info" 
                    size="small"
                    @click="showLoginPrompt"
                  >
                    登录后确认
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
              <el-empty v-if="pendingVerifications.length === 0" description="暂无待验证的路况信息"></el-empty>
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
                  <el-button type="danger" @click="resetTrafficInfo">重置交通信息</el-button>
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
      width="50%"
    >
      <div class="settings-form">
        <el-tabs v-model="settingsActiveTab">
          <el-tab-pane label="区块链设置" name="blockchain">
            <el-form label-width="120px">
              <el-form-item label="刷新间隔">
                <el-input-number v-model="refreshInterval" :min="5" :max="60" />
                <span class="unit">秒</span>
              </el-form-item>
              
              <el-form-item label="验证阈值">
                <el-input-number v-model="verificationThreshold" :min="1" :max="10" />
                <span class="unit">次</span>
                <div class="setting-description">
                  路况信息需要被验证的次数才能被标记为已验证（当前为5次）
                </div>
              </el-form-item>
              
              <el-form-item label="验证奖励">
                <el-input-number v-model="verificationReward" :min="1" :max="20" />
                <span class="unit">代币</span>
                <div class="setting-description">
                  用户成功验证路况信息后获得的代币奖励
                </div>
              </el-form-item>
              
              <el-divider content-position="left">区块链存储策略</el-divider>
              
              <div class="blockchain-storage-info">
                <el-alert
                  title="区块链存储说明"
                  type="info"
                  description="为了优化性能和资源利用，系统只将用户的关键信息（信誉度和代币）存储到区块链上，历史记录等辅助信息存储在传统数据库中。"
                  show-icon
                  :closable="false"
                />
              </div>
            </el-form>
          </el-tab-pane>
          
          <el-tab-pane label="用户设置" name="users">
            <el-table :data="userList" style="width: 100%">
              <el-table-column prop="name" label="用户名" width="120" />
              <el-table-column prop="role" label="角色" width="100">
                <template #default="scope">
                  <el-tag :type="scope.row.role === 'admin' ? 'danger' : 'success'">
                    {{ scope.row.role === 'admin' ? '管理员' : '普通用户' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="reputation" label="信誉度" width="100">
                <template #default="scope">
                  <el-progress :percentage="scope.row.reputation" :status="getReputationStatus(scope.row.reputation)" />
                </template>
              </el-table-column>
              <el-table-column prop="tokens" label="代币" width="100" />
              <el-table-column label="操作" width="200">
                <template #default="scope">
                  <el-button 
                    size="small" 
                    type="primary"
                    @click="editUser(scope.row)"
                    :disabled="!isAdmin"
                  >
                    编辑
                  </el-button>
                  <el-button 
                    size="small" 
                    type="success"
                    @click="loginAsUser(scope.row.id)"
                  >
                    切换至
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
        
        <div class="dialog-footer">
          <el-button type="primary" @click="saveSettings">保存设置</el-button>
          <el-button @click="settingsDialogVisible = false">取消</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 用户编辑对话框 -->
    <el-dialog
      v-model="userEditDialogVisible"
      title="编辑用户"
      width="30%"
    >
      <el-form :model="editingUser" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="editingUser.name" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editingUser.role">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="信誉度">
          <el-slider v-model="editingUser.reputation" :min="0" :max="100" />
          <div class="blockchain-field-tag">
            <el-tag size="small" type="success">区块链存储</el-tag>
          </div>
        </el-form-item>
        <el-form-item label="代币">
          <el-input-number v-model="editingUser.tokens" :min="0" :max="10000" />
          <div class="blockchain-field-tag">
            <el-tag size="small" type="success">区块链存储</el-tag>
          </div>
        </el-form-item>
        
        <el-alert
          title="区块链存储说明"
          type="info"
          description="只有信誉度和代币会存储到区块链上，其他信息存储在本地数据库中。"
          show-icon
          :closable="false"
          style="margin-top: 20px;"
        />
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="userEditDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveUserEdit">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 提交路况信息按钮 -->
    <div class="submit-section">
      <el-button 
        v-if="canSubmitTraffic"
        type="primary"
        @click="showSubmitDialog"
      >
        提交路况信息
      </el-button>
      <el-button 
        v-else
        type="info"
        @click="showLoginPrompt"
      >
        登录后提交
      </el-button>
    </div>

    <!-- 用户信息区域 -->
    <div v-if="!isGuest" class="user-info">
      <!-- ... 原有的用户信息显示代码 ... -->
    </div>
    <div v-else class="guest-info">
      <el-alert
        title="游客模式"
        type="info"
        description="登录后可以提交路况信息、验证路况信息、获取奖励等"
        show-icon
      />
    </div>
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
import axios from 'axios'

const API_BASE_URL = '/api'
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
const settingsActiveTab = ref('blockchain')
const verificationReward = ref(10)
const userEditDialogVisible = ref(false)
const editingUser = ref({})

// 获取当前用户是否为管理员
const isAdmin = computed(() => store.getters.isAdmin)

// 获取游客模式状态
const isGuest = computed(() => store.getters.isGuest)

// 获取权限状态
const canSubmitTraffic = computed(() => store.getters.canSubmitTraffic)
const canVerifyTraffic = computed(() => store.getters.canVerifyTraffic)

const typeText = {
  congestion: '交通拥堵',
  construction: '道路施工',
  accident: '交通事故',
  normal: '道路正常'
}

const trafficInfo = computed(() => {
  // 确保所有交通信息都有位置属性
  return store.state.trafficList.map(traffic => {
    // 如果已经有position属性，直接返回
    if (traffic.position) return traffic;
    
    // 创建一个副本以避免修改原始对象
    const updatedTraffic = {...traffic};
    
    // 尝试从location对象提取position信息
    try {
      if (traffic.location) {
        if (traffic.location.coordinates && traffic.location.coordinates.type === 'Point' && 
            Array.isArray(traffic.location.coordinates.coordinates)) {
          const [lng, lat] = traffic.location.coordinates.coordinates;
          updatedTraffic.position = { lng, lat };
        } else if (traffic.location.lng !== undefined && traffic.location.lat !== undefined) {
          updatedTraffic.position = { 
            lng: traffic.location.lng, 
            lat: traffic.location.lat 
          };
        } else {
          // 默认位置 - 成都
          updatedTraffic.position = { lng: 104.0668, lat: 30.5728 };
        }
      } else {
        // 默认位置 - 成都
        updatedTraffic.position = { lng: 104.0668, lat: 30.5728 };
      }
    } catch (err) {
      console.error('处理位置数据时出错:', err);
      // 出错时使用默认位置
      updatedTraffic.position = { lng: 104.0668, lat: 30.5728 };
    }
    
    return updatedTraffic;
  });
})

const pendingVerifications = computed(() => {
  // 确保所有待验证的交通信息都有位置属性
  return store.state.pendingVerifications.map(traffic => {
    // 如果已经有position属性，直接返回
    if (traffic.position) return traffic;
    
    // 创建一个副本以避免修改原始对象
    const updatedTraffic = {...traffic};
    
    // 尝试从location对象提取position信息
    try {
      if (traffic.location) {
        if (traffic.location.coordinates && traffic.location.coordinates.type === 'Point' && 
            Array.isArray(traffic.location.coordinates.coordinates)) {
          const [lng, lat] = traffic.location.coordinates.coordinates;
          updatedTraffic.position = { lng, lat };
        } else if (traffic.location.lng !== undefined && traffic.location.lat !== undefined) {
          updatedTraffic.position = { 
            lng: traffic.location.lng, 
            lat: traffic.location.lat 
          };
        } else {
          // 默认位置 - 成都
          updatedTraffic.position = { lng: 104.0668, lat: 30.5728 };
        }
      } else {
        // 默认位置 - 成都
        updatedTraffic.position = { lng: 104.0668, lat: 30.5728 };
      }
    } catch (err) {
      console.error('处理待验证位置数据时出错:', err);
      // 出错时使用默认位置
      updatedTraffic.position = { lng: 104.0668, lat: 30.5728 };
    }
    
    return updatedTraffic;
  });
})

const verifiedTraffic = computed(() => 
  store.state.trafficList.filter(t => 
    t.status === 'verified' || // 通过status字段检查
    t.verifiedBy || // 通过verifiedBy字段检查
    t.verifiedAt // 通过verifiedAt字段检查
  )
)

const formatTime = (timestamp) => {
  if (!timestamp) return '未知时间'
  
  try {
    const date = new Date(timestamp)
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('无效的时间戳:', timestamp)
      return '未知时间'
    }
    return date.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('格式化时间错误:', error)
    return '未知时间'
  }
}

// 格式化位置信息函数
const formatLocation = (location) => {
  if (!location) return '未知位置'
  
  try {
    // 如果location是字符串，直接返回
    if (typeof location === 'string') return location
    
    // 如果location有name属性，优先使用
    if (location.name && !location.name.startsWith('位置(') && !location.name.startsWith('成都市位置(')) 
      return location.name
    
    // 如果location有address属性，也可以使用
    if (location.address && !location.address.startsWith('位置(') && !location.address.includes('模拟地址')) 
      return location.address
    
    // 坐标到道路名称的映射表
    const coordToRoadMap = {
      // 成都市主要路段映射 - 根据经纬度范围映射到具体道路
      '104.06,30.57': '成都市锦江区人民东路',
      '104.07,30.57': '成都市锦江区红星路',
      '104.08,30.57': '成都市锦江区东大街',
      '104.06,30.58': '成都市青羊区人民西路',
      '104.07,30.58': '成都市青羊区文武路',
      '104.08,30.58': '成都市青羊区蜀都大道',
      '104.06,30.59': '成都市金牛区一环路',
      '104.07,30.59': '成都市金牛区人民北路',
      '104.05,30.57': '成都市武侯区天府大道',
      '104.05,30.58': '成都市武侯区二环路',
      '104.04,30.57': '成都市高新区天府五街',
      '104.04,30.58': '成都市高新区剑南大道'
    }
    
    // 提取坐标信息
    let lng, lat
    let coordFound = false
    
    // 尝试从不同格式获取坐标
    if (location.coordinates) {
      if (location.coordinates.type === 'Point' && Array.isArray(location.coordinates.coordinates)) {
        [lng, lat] = location.coordinates.coordinates
        coordFound = true
      } else if (location.coordinates.lng !== undefined && location.coordinates.lat !== undefined) {
        lng = location.coordinates.lng
        lat = location.coordinates.lat
        coordFound = true
      }
    } else if (location.position && location.position.lng && location.position.lat) {
      lng = location.position.lng
      lat = location.position.lat
      coordFound = true
    }
    
    // 如果找到坐标，查找映射
    if (coordFound) {
      // 截取坐标的前两位小数进行匹配
      const shortCoord = `${lng.toFixed(2)},${lat.toFixed(2)}`
      
      // 检查是否有精确匹配
      if (coordToRoadMap[shortCoord]) {
        return coordToRoadMap[shortCoord]
      }
      
      // 如果没有精确匹配，找最接近的道路（简单实现，仅供示例）
      for (const key in coordToRoadMap) {
        const [mapLng, mapLat] = key.split(',')
        // 计算简单距离（不是精确的地理距离）
        if (Math.abs(parseFloat(mapLng) - lng) < 0.03 && Math.abs(parseFloat(mapLat) - lat) < 0.03) {
          return `${coordToRoadMap[key]}附近`
        }
      }
      
      // 如果找不到匹配，返回"成都市XXX路段"这样的描述
      return `成都市${Math.floor((lat - 30.57) * 100)}区${Math.floor((lng - 104) * 100)}路段`
    }
    
    // 如果所有方法都失败，返回通用信息
    return '成都市区域内'
  } catch (error) {
    console.error('格式化位置信息错误:', error, location)
    return '成都市区域内' // 出错时返回默认值
  }
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
      latitude: 30.5728,
      longitude: 104.0668
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

  // 直接使用默认位置
  handleLocationSuccess()
}

const showTrafficDetail = (traffic) => {
  // 确保traffic对象有一个有效的position属性
  if (!traffic.position && traffic.location) {
    console.log('修正缺失的position属性:', traffic.id);
    try {
      // 尝试从location对象提取position信息
      if (traffic.location.coordinates && traffic.location.coordinates.type === 'Point' && 
          Array.isArray(traffic.location.coordinates.coordinates)) {
        const [lng, lat] = traffic.location.coordinates.coordinates;
        traffic.position = { lng, lat };
      } else if (traffic.location.lng !== undefined && traffic.location.lat !== undefined) {
        traffic.position = { 
          lng: traffic.location.lng, 
          lat: traffic.location.lat 
        };
      }
    } catch (err) {
      console.error('处理位置数据时出错:', err);
    }
  }
  
  selectedTraffic.value = traffic;
  isSubmitting.value = false;
  isEditing.value = false;
  dialogVisible.value = true;
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
    // 确认管理员操作
    await ElMessageBox.confirm(
      '作为管理员，您可以直接批准此路况信息而无需等待5人验证。确定要批准吗？',
      '管理员批准',
      {
        confirmButtonText: '确定批准',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    try {
      // 查找待验证的交通信息
      const pendingItem = pendingVerifications.value.find(item => item.id === trafficId)
      if (!pendingItem) {
        ElMessage.error('未找到待验证的路况信息')
        return
      }
      
      // 调用管理员批准API
      const response = await axios.post(`${API_BASE_URL}/traffic/admin-verify`, {
        hash: pendingItem.hash,
        adminId: store.state.userToken
      });
      
      if (response.data && response.data.success) {
        ElMessage.success('管理员批准成功')
        // 刷新数据
        await refreshAllData()
      } else {
        throw new Error(response.data.error || '批准失败')
      }
    } catch (error) {
      console.error('管理员批准失败:', error)
      ElMessage.error(error.message || '批准失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('管理员批准失败:', error)
      ElMessage.error(error.message || '批准失败')
    } else {
      ElMessage.info('已取消批准')
    }
  }
}

// 刷新所有数据
const refreshAllData = async () => {
  try {
    ElMessage.info('正在刷新数据...')
    
    // 先清空本地数据
    store.commit('SET_TRAFFIC_LIST', []);
    store.commit('SET_PENDING_VERIFICATIONS', []);
    
    // 然后从服务器获取最新数据
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

// 获取用户列表
const userList = computed(() => store.state.userList)

// 根据信誉度获取状态
const getReputationStatus = (reputation) => {
  if (reputation >= 80) return 'success'
  if (reputation >= 60) return 'warning'
  return 'exception'
}

// 编辑用户
const editUser = (user) => {
  editingUser.value = { ...user }
  userEditDialogVisible.value = true
}

// 保存用户编辑
const saveUserEdit = async () => {
  try {
    // 更新区块链上的用户信息
    const result = await store.dispatch('updateUserInfo', editingUser.value);
    
    if (result.warning) {
      ElMessage({
        message: `用户信息已更新，但${result.warning}`,
        type: 'warning',
        duration: 5000
      });
    } else {
      ElMessage.success('用户信息更新成功');
    }
    
    userEditDialogVisible.value = false;
  } catch (error) {
    console.error('更新用户信息失败:', error);
    ElMessage.error('更新用户信息失败: ' + (error.message || '未知错误'));
  }
}

// 切换到指定用户
const loginAsUser = (userId) => {
  store.dispatch('switchUser', userId)
  ElMessage.success(`已切换到用户: ${store.getters.currentUser.name}`)
  settingsDialogVisible.value = false
}

// 保存系统设置
const saveSettings = () => {
  // 在实际应用中，这里应该调用API保存设置
  ElMessage.success('设置保存成功')
  settingsDialogVisible.value = false
}

const verifyTraffic = async (trafficId) => {
  if (isGuest.value) {
    ElMessage.warning('游客模式无法验证路况信息，请先登录')
    return
  }
  
  // 查找待验证的交通信息
  const pendingItem = pendingVerifications.value.find(item => item.id === trafficId)
  if (!pendingItem) {
    ElMessage.error('未找到待验证的路况信息')
    return
  }
  
  // 检查用户是否已经验证过
  if (hasUserVerified(pendingItem)) {
    ElMessage.warning('您已经验证过此路况信息')
    return
  }
  
  try {
    if (!pendingItem.hash) {
      ElMessage.error('路况信息缺少哈希值，无法验证')
      console.error('路况信息缺少hash:', pendingItem)
      return
    }
    
    console.log('开始验证路况信息:', pendingItem.id, 'hash:', pendingItem.hash)
    const result = await store.dispatch('verifyTrafficInfo', { hash: pendingItem.hash })
    
    if (result && result.success) {
      console.log('验证成功:', result)
      ElMessage.success('验证成功!')
      
      // 立即刷新数据
      await refreshAllData()
    } else {
      throw new Error(result?.message || '验证失败')
    }
  } catch (error) {
    console.error('验证路况信息失败:', error)
    
    // 获取详细错误信息
    let errorMessage = '验证失败';
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    ElMessage.error(errorMessage)
  }
}

// 提交路况信息
const submitTrafficInfo = async (trafficData) => {
  if (isGuest.value) {
    ElMessage.warning('游客模式无法提交路况信息，请先登录')
    return
  }
  try {
    await store.dispatch('submitTrafficInfo', trafficData)
    ElMessage.success('路况信息提交成功')
  } catch (error) {
    console.error('提交路况信息失败:', error)
    ElMessage.error(error.message || '提交失败')
  }
}

// 更新路况信息
const updateTrafficInfo = async (updateData) => {
  try {
    await store.dispatch('updateTrafficInfo', updateData)
    ElMessage.success('更新成功')
    dialogVisible.value = false
    // 刷新数据
    refreshAllData()
  } catch (error) {
    console.error('更新路况信息失败:', error)
    ElMessage.error(error.message || '更新失败')
  }
}

// 验证路况信息
const verifyTrafficInfo = async (traffic) => {
  if (isGuest.value) {
    ElMessage.warning('游客模式无法验证路况信息，请先登录')
    return
  }
  try {
    const trafficId = traffic.id
    if (!trafficId || typeof trafficId !== 'string') {
      throw new Error('无效的路况ID格式')
    }
    console.log('开始验证路况信息:', trafficId)
    await store.dispatch('verifyTrafficInfo', { hash: traffic.hash })
    console.log('验证成功后，准备刷新界面数据')
    ElMessage.success('验证成功')
    dialogVisible.value = false
    
    // 强制延时刷新数据，确保后端更新完成
    setTimeout(async () => {
      console.log('延时刷新数据开始')
      await refreshAllData()
      console.log('延时刷新数据完成')
    }, 500)
  } catch (error) {
    console.error('验证路况信息失败:', error)
    ElMessage.error(error.message || '验证失败')
  }
}

// 显示登录提示
const showLoginPrompt = () => {
  ElMessage.warning('请先登录后再操作')
}

// 添加这个变量
const showSubmitDialog = () => {
  // 直接跳转到提交页面
  router.push('/submit')
}

// 重置交通信息
const resetTrafficInfo = async () => {
  ElMessageBox.confirm(
    '确定要重置所有交通信息吗？此操作将删除所有现有数据，并创建3条新的交通信息。此操作不可逆。',
    '警告',
    {
      confirmButtonText: '确定重置',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        ElMessage.info('正在重置交通信息...');
        console.log('== 开始执行重置操作 ==');
        console.log('用户信息:', store.state.userToken, '是否管理员:', store.getters.isAdmin);
        
        const result = await store.dispatch('resetTrafficInfo');
        console.log('重置操作返回结果:', result);
        ElMessage.success(result.message);
        
        // 延迟刷新确保后端处理完成
        console.log('重置成功，准备刷新数据...');
        
        // 增加延迟时间和刷新逻辑
        setTimeout(async () => {
          console.log('开始延迟刷新...');
          // 先清空本地数据
          console.log('清空本地数据');
          store.commit('SET_TRAFFIC_LIST', []);
          store.commit('SET_PENDING_VERIFICATIONS', []);
          
          // 强制刷新
          console.log('开始强制刷新数据');
          try {
            console.log('获取最新交通信息');
            await store.dispatch('getNearbyTrafficInfo');
            console.log('获取最新待验证信息');
            await store.dispatch('getPendingVerifications');
            console.log('数据刷新成功');
            ElMessage.success('数据刷新成功');
          } catch (refreshError) {
            console.error('数据刷新失败:', refreshError);
            ElMessage.error('数据刷新失败，请手动刷新页面');
          }
        }, 2000); // 增加延迟时间到2秒
      } catch (error) {
        console.error('重置交通信息失败:', error);
        ElMessage.error(error.message || '重置失败');
      }
    })
    .catch(() => {
      ElMessage.info('已取消重置');
    });
}

// 在script部分添加方法
const getVerificationCount = (traffic) => {
  // 获取验证数量，处理可能的各种格式
  let verificationCount = 0;
  
  if (traffic.verificationCount !== undefined) {
    // 如果有verificationCount字段，直接使用
    verificationCount = traffic.verificationCount;
  } else if (traffic.verifications !== undefined) {
    // 处理verifications可能是数字或数组的情况
    if (Array.isArray(traffic.verifications)) {
      verificationCount = traffic.verifications.length;
    } else if (typeof traffic.verifications === 'number') {
      verificationCount = traffic.verifications;
    }
  } else if (traffic.verifiedBy !== undefined) {
    // 优先处理verifiedBy数组
    if (Array.isArray(traffic.verifiedBy)) {
      verificationCount = traffic.verifiedBy.length;
    } else if (typeof traffic.verifiedBy === 'string') {
      // 如果是单个用户ID字符串，则计数为1
      verificationCount = 1;
    }
  }
  
  return verificationCount;
}

// 添加一个方法检查用户是否已经验证过
const hasUserVerified = (traffic) => {
  const currentUserId = store.state.userToken;
  
  if (!currentUserId || !traffic) {
    return false;
  }
  
  // 处理verifiedBy可能的各种格式
  if (traffic.verifiedBy) {
    if (Array.isArray(traffic.verifiedBy)) {
      return traffic.verifiedBy.includes(currentUserId);
    } else if (typeof traffic.verifiedBy === 'string') {
      return traffic.verifiedBy === currentUserId;
    }
  }
  
  // 处理旧数据格式
  if (traffic.verifications && Array.isArray(traffic.verifications)) {
    return traffic.verifications.some(v => v.userId === currentUserId);
  }
  
  return false;
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
    .then(() => {
      console.log('已验证路况信息:', verifiedTraffic.value.length, '条');
      console.log('已验证路况信息详情:', verifiedTraffic.value);
    });
  store.dispatch('getPendingVerifications')
    .then(() => {
      console.log('待验证路况信息:', pendingVerifications.value.length, '条');
      console.log('待验证路况信息详情:', pendingVerifications.value);
    });
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
  transition: all 0.3s;
}

.traffic-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.traffic-description {
  font-size: 14px;
  margin: 10px 0;
  min-height: 20px;
  color: #333;
  font-weight: normal;
  line-height: 1.5;
}

.time {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.location {
  font-size: 12px;
  color: #606266;
  margin-top: 4px;
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

.setting-description {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.dialog-footer {
  margin-top: 20px;
  text-align: right;
}

.unit {
  margin-left: 10px;
  color: #666;
}

.blockchain-storage-info {
  margin-top: 20px;
}

.blockchain-field-tag {
  margin-top: 10px;
}

.guest-info {
  margin: 20px;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.traffic-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.submit-section {
  margin: 20px;
  text-align: center;
}

.user-info {
  /* ... 原有的用户信息显示代码 ... */
}

.traffic-image-preview {
  margin: 10px 0;
  width: 100%;
  display: flex;
  justify-content: center;
}

.thumbnail {
  width: 150px;
  height: 120px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #ebeef5;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.thumbnail:hover {
  transform: scale(1.05);
}
</style>

