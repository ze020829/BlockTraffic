<template>
  <div class="traffic-detail">
    <div class="info-section">
      <h3>路况信息</h3>
      <p>类型：{{ typeText[traffic.type] }}</p>
      <p>地点：{{ formatLocation(traffic.location) }}</p>
      <p>描述：{{ traffic.description }}</p>
      <p>提交时间：{{ formatTime(traffic.timestamp || traffic.created) }}</p>
      <p>确认数：{{ verificationStatus }}</p>
    </div>

    <div class="action-section">
      <template v-if="traffic.status !== 'verified'">
        <el-button 
          type="primary" 
          @click="handleVerify"
          :disabled="!canVerify"
        >
          {{ verificationStatus }}
        </el-button>
      </template>
      
      <template v-if="traffic.status === 'verified' && traffic.type !== 'normal'">
        <el-button type="success" @click="handleUpdate">
          提交路况恢复正常
        </el-button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useStore } from 'vuex'

const store = useStore()
const isVerifying = ref(false)

const props = defineProps({
  traffic: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['verify', 'update'])

const typeText = {
  congestion: '交通拥堵',
  construction: '道路施工',
  accident: '交通事故',
  normal: '道路正常'
}

// 改进的时间格式化函数，处理无效日期
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
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (error) {
    console.error('格式化时间错误:', error)
    return '未知时间'
  }
}

// 格式化位置信息
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

const verificationProgress = computed(() => {
  const count = props.traffic.verifications || 0
  const total = 5
  return Math.round((count / total) * 100)
})

const handleVerify = async () => {
  if (isVerifying.value) return
  
  // 检查用户是否已经验证过
  const userId = store.state.userToken
  if (props.traffic.verifiedBy?.includes(userId)) {
    ElMessage.warning('您已经验证过此路况信息')
    return
  }
  
  try {
    isVerifying.value = true
    const result = await store.dispatch('verifyTrafficInfo', { 
      trafficId: props.traffic.id 
    })
    
    if (result) {
      ElMessage.success(`验证成功！获得 ${result.reward.tokens} 代币和 ${result.reward.reputation} 信誉度`)
      emit('verify', result)
    }
  } catch (error) {
    // 获取详细错误信息
    let errorMessage = '验证失败';
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    ElMessage.error(errorMessage)
  } finally {
    isVerifying.value = false
  }
}

const handleUpdate = () => {
  emit('update', {
    id: props.traffic.id,
    type: 'normal',
    description: '路况已恢复正常'
  })
}

const canVerify = computed(() => {
  const userId = store.state.userToken
  return !props.traffic.verifiedBy?.includes(userId)
})

const verificationStatus = computed(() => {
  if (props.traffic.status === 'verified') {
    return '已验证'
  }
  
  // 获取验证数量，处理可能的各种格式
  let verificationCount = 0;
  if (props.traffic.verificationCount !== undefined) {
    // 如果有verificationCount字段，直接使用
    verificationCount = props.traffic.verificationCount;
    console.log('从verificationCount获取:', verificationCount);
  } else if (props.traffic.verifications !== undefined) {
    // 处理verifications可能是数字或数组的情况
    if (Array.isArray(props.traffic.verifications)) {
      verificationCount = props.traffic.verifications.length;
      console.log('从verifications数组获取:', verificationCount);
    } else if (typeof props.traffic.verifications === 'number') {
      verificationCount = props.traffic.verifications;
      console.log('从verifications数字获取:', verificationCount);
    }
  } else if (Array.isArray(props.traffic.verifiedBy)) {
    // 如果有verifiedBy数组，用其长度
    verificationCount = props.traffic.verifiedBy.length;
    console.log('从verifiedBy数组获取:', verificationCount);
  }
  
  return `待验证 (${verificationCount}/5)`;
})
</script>

<style scoped>
.traffic-detail {
  padding: 20px;
}

.info-section {
  margin-bottom: 20px;
}

.action-section {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
