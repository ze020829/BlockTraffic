<template>
  <div class="layout">
    <el-container>
      <!-- 侧边栏 -->
      <el-aside width="200px">
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
        <el-main>
          <slot></slot>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Location, Plus, User } from '@element-plus/icons-vue'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.layout {
  height: 100vh;
  width: 100vw;
}

.sidebar-menu {
  height: 100vh;
  border-right: none;
}

.el-main {
  padding: 20px;
  height: 100vh;
  overflow-y: auto;
}
</style> 