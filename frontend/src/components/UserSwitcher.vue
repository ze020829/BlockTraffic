<template>
  <el-dialog
    v-model="dialogVisible"
    title="用户切换"
    width="400px"
    :close-on-click-modal="false"
  >
    <el-tabs v-model="activeTab">
      <!-- 登录表单 -->
      <el-tab-pane label="登录" name="login">
        <el-form
          ref="loginFormRef"
          :model="loginForm"
          :rules="loginRules"
          label-width="80px"
        >
          <el-form-item label="用户ID" prop="userId">
            <el-input v-model="loginForm.userId" placeholder="请输入用户ID" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 注册表单 -->
      <el-tab-pane label="注册" name="register">
        <el-form
          ref="registerFormRef"
          :model="registerForm"
          :rules="registerRules"
          label-width="80px"
        >
          <el-form-item label="用户ID" prop="userId">
            <el-input v-model="registerForm.userId" placeholder="请输入用户ID" />
          </el-form-item>
          <el-form-item label="用户角色" prop="role">
            <el-select v-model="registerForm.role" placeholder="请选择用户角色">
              <el-option label="普通用户" value="user" />
              <el-option label="管理员" value="admin" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading">
          {{ activeTab === 'login' ? '登录' : '注册' }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useStore } from 'vuex'

const store = useStore()
const dialogVisible = ref(false)
const activeTab = ref('login')
const loading = ref(false)

// 登录表单
const loginFormRef = ref()
const loginForm = ref({
  userId: ''
})
const loginRules = {
  userId: [
    { required: true, message: '请输入用户ID', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ]
}

// 注册表单
const registerFormRef = ref()
const registerForm = ref({
  userId: '',
  role: 'user'
})
const registerRules = {
  userId: [
    { required: true, message: '请输入用户ID', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择用户角色', trigger: 'change' }
  ]
}

// 打开对话框
const open = () => {
  dialogVisible.value = true
}

// 处理表单提交
const handleSubmit = async () => {
  try {
    loading.value = true
    if (activeTab.value === 'login') {
      // 登录逻辑
      await loginFormRef.value.validate()
      const result = await store.dispatch('login', loginForm.value)
      if (result.success) {
        ElMessage.success('登录成功')
        dialogVisible.value = false
      } else {
        ElMessage.error(result.message || '登录失败')
      }
    } else {
      // 注册逻辑
      await registerFormRef.value.validate()
      const result = await store.dispatch('register', registerForm.value)
      if (result.success) {
        ElMessage.success('注册成功')
        // 注册成功后自动登录
        await store.dispatch('login', { userId: registerForm.value.userId })
        dialogVisible.value = false
      } else {
        ElMessage.error(result.message || '注册失败')
      }
    }
  } catch (error) {
    console.error('表单提交错误:', error)
  } finally {
    loading.value = false
  }
}

// 暴露方法给父组件
defineExpose({
  open
})
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>