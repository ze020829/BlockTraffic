<template>
  <div class="traffic-detail">
    <div class="info-section">
      <h3>路况信息</h3>
      <p>类型：{{ typeText[traffic.type] }}</p>
      <p>描述：{{ traffic.description }}</p>
      <p>提交时间：{{ formatTime(traffic.timestamp) }}</p>
      <p>确认数：{{ traffic.verifications || 0 }}/5</p>
    </div>

    <div class="action-section">
      <template v-if="traffic.status !== 'verified'">
        <el-button 
          type="primary" 
          @click="handleVerify"
          :disabled="traffic.hasVerified"
        >
          {{ traffic.hasVerified ? '已确认' : '确认信息' }}
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
import { computed } from 'vue'

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

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

const handleVerify = () => {
  emit('verify', props.traffic.id)
}

const handleUpdate = () => {
  emit('update', {
    id: props.traffic.id,
    type: 'normal',
    description: '路况已恢复正常'
  })
}
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