<template>
  <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
    <el-form-item label="位置" prop="location">
      <div class="location-picker">
        <el-input v-model="form.location" readonly placeholder="点击地图选择位置">
          <template #append>
            <el-button @click="showMapPicker = true">选择位置</el-button>
          </template>
        </el-input>
      </div>
    </el-form-item>

    <el-form-item label="类型" prop="type">
      <el-select v-model="form.type" placeholder="请选择路况类型">
        <el-option label="交通拥堵" value="congestion" />
        <el-option label="道路施工" value="construction" />
        <el-option label="交通事故" value="accident" />
        <el-option label="道路正常" value="normal" />
      </el-select>
    </el-form-item>

    <el-form-item label="描述" prop="description">
      <el-input
        v-model="form.description"
        type="textarea"
        rows="3"
        placeholder="请输入路况详细描述"
      />
    </el-form-item>

    <el-form-item label="图片" prop="images">
      <el-upload
        class="upload-demo"
        action="#"
        :http-request="uploadImage"
        :before-upload="beforeUpload"
        :on-exceed="handleExceed"
        :file-list="form.images"
        list-type="picture-card"
        multiple
        :limit="3"
      >
        <el-icon><Plus /></el-icon>
      </el-upload>
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="submitForm">{{ isEditing ? '保存修改' : '提交' }}</el-button>
      <el-button @click="$emit('cancel')">取消</el-button>
    </el-form-item>
  </el-form>

  <!-- 地图选择器对话框 -->
  <el-dialog v-model="showMapPicker" title="选择位置" width="70%">
    <div class="map-picker">
      <baidu-map
        class="map"
        :center="mapCenter"
        :zoom="15"
        @click="handleMapClick"
      >
        <bm-geolocation
          anchor="BMAP_ANCHOR_BOTTOM_RIGHT"
          :showAddressBar="true"
          :autoLocation="true"
          @locationSuccess="handleLocationSuccess"
        />
        <bm-marker v-if="selectedLocation" :position="selectedLocation" />
        <bm-circle
          v-if="userLocation"
          :center="userLocation"
          :radius="1000"
          stroke-color="#409EFF"
          :stroke-opacity="0.5"
          :stroke-weight="2"
          :fill-opacity="0.1"
        />
      </baidu-map>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="showMapPicker = false">取消</el-button>
        <el-button type="primary" @click="confirmLocation">
          确认位置
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const props = defineProps({
  initialData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['submit', 'cancel'])
const formRef = ref(null)
const showMapPicker = ref(false)
const mapCenter = ref({ lng: 116.404, lat: 39.915 })
const selectedLocation = ref(null)
const userLocation = ref(null)

// 判断是否为编辑模式
const isEditing = computed(() => !!props.initialData)

// 初始化表单数据
const form = reactive({
  location: '',
  type: '',
  description: '',
  images: [],
  position: null
})

// 如果有初始数据，则填充表单
onMounted(() => {
  if (props.initialData) {
    form.location = props.initialData.location || ''
    form.type = props.initialData.type || ''
    form.description = props.initialData.description || ''
    form.images = props.initialData.images || []
    form.position = props.initialData.position || null
    
    if (form.position) {
      selectedLocation.value = form.position
      mapCenter.value = form.position
    }
  }
})

const rules = {
  location: [{ required: true, message: '请选择位置', trigger: 'change' }],
  type: [{ required: true, message: '请选择路况类型', trigger: 'change' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }],
  images: [{ required: true, message: '请上传至少一张图片', trigger: 'change' }]
}

const handleLocationSuccess = (e) => {
  userLocation.value = {
    lng: e.point.lng,
    lat: e.point.lat
  }
  mapCenter.value = userLocation.value
}

const handleMapClick = (e) => {
  const clickPosition = {
    lng: e.point.lng,
    lat: e.point.lat
  }
  
  // 检查是否在用户1公里范围内
  if (userLocation.value) {
    const distance = calculateDistance(
      userLocation.value.lat,
      userLocation.value.lng,
      clickPosition.lat,
      clickPosition.lng
    )
    
    if (distance > 1) {
      ElMessage.warning('只能选择1公里范围内的位置')
      return
    }
  }
  
  selectedLocation.value = clickPosition
}

const confirmLocation = async () => {
  if (!selectedLocation.value) {
    ElMessage.warning('请先在地图上选择位置')
    return
  }
  
  // 使用百度地图API获取地址描述
  const geoc = new BMap.Geocoder()
  geoc.getLocation(selectedLocation.value, (rs) => {
    form.location = rs.address
    form.position = selectedLocation.value
    showMapPicker.value = false
  })
}

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // 地球半径，单位km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!')
    return false
  }
  return true
}

const uploadImage = async ({ file }) => {
  // 这里应该调用实际的上传API，现在先用本地URL模拟
  form.images.push({
    name: file.name,
    url: URL.createObjectURL(file)
  })
}

const handleExceed = () => {
  ElMessage.warning('最多只能上传3张图片')
}

const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      if (form.images.length === 0) {
        ElMessage.warning('请至少上传一张图片')
        return
      }
      
      const submitData = {
        ...form,
        timestamp: Date.now()
      }
      
      // 如果是编辑模式，保留原始ID
      if (props.initialData && props.initialData.id) {
        submitData.id = props.initialData.id
      }
      
      emit('submit', submitData)
    }
  })
}
</script>

<style scoped>
.map-picker {
  width: 100%;
  height: 500px;
}

.map {
  width: 100%;
  height: 100%;
}

.location-picker {
  display: flex;
  align-items: center;
}

:deep(.el-upload--picture-card) {
  width: 100px;
  height: 100px;
  line-height: 100px;
}
</style> 