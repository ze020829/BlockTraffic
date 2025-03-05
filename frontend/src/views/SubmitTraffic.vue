<template>
  <Layout>
    <div class="content-container">
      <!-- 左侧表单 -->
      <div class="form-container">
        <el-card class="form-card">
          <template #header>
            <div class="card-header">
              <h3>提交路况信息</h3>
            </div>
          </template>

          <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
            <el-form-item label="位置" prop="location">
              <div class="location-input">
                <el-input
                  v-model="form.location"
                  placeholder="输入地址或点击下方地图选择"
                  @change="handleLocationSearch"
                >
                  <template #append>
                    <el-button @click="searchLocation">搜索</el-button>
                  </template>
                </el-input>
              </div>
              <!-- 嵌入式地图 -->
              <div class="embedded-map">
                <baidu-map
                  class="map"
                  :center="mapCenter"
                  :zoom="15"
                  :scroll-wheel-zoom="true"
                  @click="handleMapClick"
                  @ready="handleMapReady"
                >
                  <bm-geolocation
                    anchor="BMAP_ANCHOR_BOTTOM_RIGHT"
                    :show-address-bar="true"
                    :auto-location="true"
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
              <el-button type="primary" @click="submitForm">提交</el-button>
              <el-button @click="resetForm">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </div>

      <!-- 右侧预览 -->
      <div class="preview-container">
        <el-card class="preview-card">
          <template #header>
            <div class="card-header">
              <h3>预览信息</h3>
            </div>
          </template>
          <div v-if="form.location" class="preview-item">
            <label>位置：</label>
            <span>{{ form.location }}</span>
          </div>
          <div v-if="form.type" class="preview-item">
            <label>类型：</label>
            <span>{{ typeText[form.type] }}</span>
          </div>
          <div v-if="form.description" class="preview-item">
            <label>描述：</label>
            <p>{{ form.description }}</p>
          </div>
          <div v-if="form.images.length" class="preview-item">
            <label>图片：</label>
            <div class="image-preview">
              <el-image
                v-for="(img, index) in form.images"
                :key="index"
                :src="img.url"
                :preview-src-list="form.images.map(img => img.url)"
                fit="cover"
              />
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import Layout from '../components/Layout.vue'
import axios from 'axios'

const store = useStore()
const router = useRouter()
const formRef = ref(null)
const showMapPicker = ref(false)
const mapCenter = ref({ lng: 116.404, lat: 39.915 })
const selectedLocation = ref(null)
const userLocation = ref(null)
const searchAddress = ref('')
let geocoder = null
let localSearch = null

const form = reactive({
  location: '',
  type: '',
  description: '',
  images: [],
  position: null
})

const rules = {
  location: [{ required: true, message: '请选择位置', trigger: 'change' }],
  type: [{ required: true, message: '请选择路况类型', trigger: 'change' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }],
  images: [{ required: true, message: '请上传至少一张图片', trigger: 'change' }]
}

const typeText = {
  congestion: '交通拥堵',
  construction: '道路施工',
  accident: '交通事故',
  normal: '道路正常'
}

const handleMapReady = ({ BMap, map }) => {
  geocoder = new BMap.Geocoder()
  
  // 先获取用户位置
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const pos = {
        lng: position.coords.longitude,
        lat: position.coords.latitude
      }
      userLocation.value = pos
      mapCenter.value = pos
      selectedLocation.value = pos
      
      // 设置地图中心点和缩放级别
      map.centerAndZoom(new BMap.Point(pos.lng, pos.lat), 15)
      
      // 获取地址
      geocoder.getLocation(new BMap.Point(pos.lng, pos.lat), (result) => {
        if (result) {
          form.location = result.address
          form.position = pos
        }
      })
    },
    (error) => {
      console.error('定位失败:', error)
      ElMessage.warning('获取位置失败，请手动选择位置')
    }
  )
}

const handleLocationSuccess = (e) => {
  const pos = {
    lng: e.point.lng,
    lat: e.point.lat
  }
  userLocation.value = pos
  mapCenter.value = pos
  selectedLocation.value = pos
  
  if (e.target && e.target.getMap) {
    const map = e.target.getMap()
    map.centerAndZoom(new BMap.Point(pos.lng, pos.lat), 15)
  }
  
  if (geocoder) {
    geocoder.getLocation(new BMap.Point(pos.lng, pos.lat), (result) => {
      if (result) {
        form.location = result.address
        form.position = pos
      }
    })
  }
}

const handleLocationSearch = (value) => {
  if (!value) return
  if (localSearch) {
    localSearch.search(value)
  }
}

const searchLocation = () => {
  if (!searchAddress.value) return
  
  if (geocoder) {
    geocoder.getPoint(searchAddress.value, (point) => {
      if (point) {
        if (!isWithinRange(point, userLocation.value)) {
          ElMessage.warning('搜索位置超出1公里范围')
          return
        }
        mapCenter.value = point
        selectedLocation.value = point
        form.location = searchAddress.value
        form.position = point
      } else {
        ElMessage.error('未找到该地址')
      }
    })
  }
}

const isWithinRange = (point, center, radius = 1000) => {
  const R = 6371000
  const lat1 = point.lat * Math.PI / 180
  const lat2 = center.lat * Math.PI / 180
  const dLat = (point.lat - center.lat) * Math.PI / 180
  const dLon = (point.lng - center.lng) * Math.PI / 180

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const handleMapClick = (e) => {
  const clickPosition = {
    lng: e.point.lng,
    lat: e.point.lat
  }
  
  if (!userLocation.value || !isWithinRange(clickPosition, userLocation.value)) {
    ElMessage.warning('只能选择1公里范围内的位置')
    return
  }
  
  selectedLocation.value = clickPosition
  mapCenter.value = clickPosition
  
  if (geocoder) {
    geocoder.getLocation(new BMap.Point(clickPosition.lng, clickPosition.lat), (result) => {
      if (result) {
        form.location = result.address
        form.position = clickPosition
      }
    })
  }
}

const confirmLocation = async () => {
  if (!selectedLocation.value) {
    ElMessage.warning('请先在地图上选择位置')
    return
  }
  
  geocoder.getLocation(selectedLocation.value, (rs) => {
    form.location = rs.address
    form.position = selectedLocation.value
    showMapPicker.value = false
  })
}

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371
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
  try {
    // 创建 FormData
    const formData = new FormData()
    formData.append('image', file)
    
    // 发送到后端
    const { data } = await axios.post('http://localhost:3000/api/traffic/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    const { url, hash } = data
    
    // 添加到表单数据
    form.images.push({
      name: file.name,
      url: url,
      hash: hash
    })
    
    ElMessage.success('图片上传成功')
  } catch (error) {
    console.error('上传失败:', error.message)
    ElMessage.error(error.response?.data?.error || '图片上传失败')
  }
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
      
      try {
        await store.dispatch('submitTrafficInfo', {
          ...form,
          // 只发送图片的 IPFS hash
          images: form.images.map(img => ({
            name: img.name,
            hash: img.hash
          })),
          timestamp: Date.now()
        })
        ElMessage.success('提交成功')
        router.push('/')
      } catch (error) {
        ElMessage.error('提交失败')
      }
    }
  })
}

const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
    form.images = []
  }
}
</script>

<style scoped>
.content-container {
  display: flex;
  gap: 20px;
  height: 100%;
}

.form-container {
  flex: 3;
}

.preview-container {
  flex: 2;
}

.preview-item {
  margin-bottom: 15px;
}

.preview-item label {
  font-weight: bold;
  margin-right: 10px;
}

.image-preview {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.image-preview .el-image {
  width: 100px;
  height: 100px;
  border-radius: 4px;
}

.submit-traffic {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.form-card {
  margin-bottom: 20px;
}

.map-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.map-wrapper {
  width: 100%;
  height: 500px;
}

.map {
  width: 100%;
  height: 100%;
}

.map-search {
  padding: 10px;
}

.location-input {
  margin-bottom: 10px;
}

.embedded-map {
  width: 100%;
  height: 300px;
  margin-top: 10px;
  margin-bottom: 20px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
}

:deep(.el-upload--picture-card) {
  width: 100px;
  height: 100px;
  line-height: 100px;
}
</style> 