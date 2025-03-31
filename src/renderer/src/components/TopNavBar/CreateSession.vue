<script setup>
import { ref, onMounted } from 'vue'

// 控制弹出框的显示状态
const createSessionVisible = ref(false)

// 连接参数
const host = ref()
const port = ref()
const username = ref()
const password = ref()

// 在组件挂载时加载保存的连接参数
onMounted(async () => {
  try {
    const savedParams = await window.api.invoke('get-connection-params')
    if (savedParams) {
      host.value = savedParams.host
      port.value = savedParams.port
      username.value = savedParams.username
      password.value = savedParams.password
    }
  } catch (error) {
    console.error('加载连接参数失败:', error)
  }
})

// 打开/关闭弹出框的方法
const toggleCreateSession = () => {
  createSessionVisible.value = !createSessionVisible.value
}

// 连接方法
const connect = async () => {
  const connectionParams = {
    host: host.value,
    port: port.value,
    username: username.value,
    password: password.value
  }
  
  // 保存连接参数到本地存储
  try {
    await window.api.invoke('save-connection-params', connectionParams)
  } catch (error) {
    console.error('保存连接参数失败:', error)
  }
  
  // 发送连接请求到主进程
  window.api.send('connect', connectionParams)

  // 添加URL参数，用于在StatusBar中获取当前连接的IP
  const url = new URL(window.location.href)
  url.searchParams.set('ip', host.value)
  window.history.replaceState({}, '', url)

  createSessionVisible.value = false
}
</script>

<template>
  <!-- 创建会话按钮 -->
  <t-button @click="toggleCreateSession">
    <template #icon>
      <t-icon name="add-circle" />
    </template>
    创建会话
  </t-button>

  <!-- 创建会话弹出框 -->
  <t-dialog
    v-model:visible="createSessionVisible"
    header="创建会话"
    :on-close="toggleCreateSession"
    :on-confirm="connect"
    :on-cancel="toggleCreateSession"
    confirm-btn="连接"
  >
    <t-form>
      <t-form-item label="主机地址">
        <t-input v-model="host" placeholder="请输入主机IP地址"></t-input>
      </t-form-item>
      <t-form-item label="端口">
        <t-input v-model="port" placeholder="请输入端口号"></t-input>
      </t-form-item>
      <t-form-item label="用户名">
        <t-input v-model="username" placeholder="请输入用户名"></t-input>
      </t-form-item>
      <t-form-item label="密码">
        <t-input v-model="password" type="password" placeholder="请输入密码"></t-input>
      </t-form-item>
    </t-form>
  </t-dialog>
</template>

<style scoped>
/* 组件样式可以根据需要添加 */
</style>