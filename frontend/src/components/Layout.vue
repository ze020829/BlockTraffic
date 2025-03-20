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
            <div class="user-info-display">
              <el-dropdown trigger="click">
                <div class="user-info-content">
                  <el-avatar :size="32" :icon="UserFilled">
                    {{ currentUser?.id?.charAt(0) || 'U' }}
                  </el-avatar>
                  <div class="user-info-text">
                    <span>{{ currentUser?.id || '游客' }}</span>
                    <el-tag size="small" :type="currentUser?.role === 'admin' ? 'danger' : 'info'">
                      {{ currentUser?.role === 'admin' ? '管理员' : '游客' }}
                    </el-tag>
                  </div>
                </div>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="goToProfile">个人中心</el-dropdown-item>
                    <el-dropdown-item @click="openUserSwitcher">切换用户</el-dropdown-item>
                    <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </el-header>
        
        <el-main>
          <slot></slot>
        </el-main>
      </el-container>
    </el-container>

    <!-- 用户切换对话框 -->
    <UserSwitcher ref="userSwitcherRef" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { Location, Plus, User, UserFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import UserSwitcher from './UserSwitcher.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()
const userSwitcherRef = ref(null)

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

// 打开用户切换对话框
const openUserSwitcher = () => {
  userSwitcherRef.value?.open()
}

// 处理退出登录
const handleLogout = () => {
  store.commit('LOGOUT')
  ElMessage.success('已退出登录')
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

.user-info-content {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info-content:hover {
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