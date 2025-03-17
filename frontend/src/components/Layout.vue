<template>
  <div class="layout">
    <el-container>
      <!-- 侧边栏 -->
      <el-aside width="200px">
        <div class="logo-container">
          <h2>区块链路况</h2>
        </div>
        <el-menu
          :default-active="activeMenu"
          class="sidebar-menu"
          router
        >
          <el-menu-item index="/">
            <el-icon><Location /></el-icon>
            <span>周边路况</span>
          </el-menu-item>
          <el-menu-item index="/submit">
            <el-icon><Plus /></el-icon>
            <span>提交信息</span>
          </el-menu-item>
          <el-menu-item index="/profile">
            <el-icon><User /></el-icon>
            <span>我的</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 主要内容区 -->
      <el-container>
        <!-- 顶部导航栏 -->
        <el-header height="60px">
          <div class="header-content">
            <div class="page-title">
              {{ pageTitle }}
            </div>
            <div class="user-info-display" @click="goToProfile">
              <el-avatar :size="32" :icon="UserFilled">{{ currentUser?.name?.charAt(0) }}</el-avatar>
              <div class="user-info-text">
                <span>{{ currentUser?.name }}</span>
                <el-tag size="small" :type="currentUser?.role === 'admin' ? 'danger' : 'info'">
                  {{ currentUser?.role === 'admin' ? '管理员' : '普通用户' }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-header>
        
        <el-main>
          <slot></slot>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { Location, Plus, User, UserFilled } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const store = useStore()

const activeMenu = computed(() => route.path)
const currentUser = computed(() => store.getters.currentUser)

// 根据路由路径设置页面标题
const pageTitle = computed(() => {
  switch (route.path) {
    case '/':
      return '周边路况'
    case '/submit':
      return '提交路况信息'
    case '/profile':
      return '个人中心'
    default:
      return '区块链路况系统'
  }
})

// 点击用户信息跳转到个人中心
const goToProfile = () => {
  router.push('/profile')
}
</script>

<style scoped>
.layout {
  height: 100vh;
  width: 100vw;
}

.logo-container {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #545c64;
  color: white;
}

.sidebar-menu {
  height: calc(100vh - 60px);
  border-right: none;
}

.el-header {
  background-color: white;
  border-bottom: 1px solid #ebeef5;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  padding: 0 20px;
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.user-info-display {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info-display:hover {
  background-color: #f5f7fa;
}

.user-info-text {
  margin-left: 10px;
  display: flex;
  flex-direction: column;
}

.user-info-text span {
  font-size: 14px;
  line-height: 1.2;
}

.el-main {
  padding: 20px;
  height: calc(100vh - 60px);
  overflow-y: auto;
  background-color: #f5f7fa;
}
</style> 