<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// 状态数据
const connectionStatus = ref('未连接') // 连接状态：已连接、未连接
const sessionIP = ref('0.0.0.0') // 会话IP地址

// 监听连接状态变化
onMounted(() => {
  window.api.on('status-change', (data) => {
    console.log('状态变化:', data)
    if (data.status === '已连接') {
      connectionStatus.value = '已连接'
      sessionIP.value = data.ip || ''
    } else if (data.status === '未连接') {
      connectionStatus.value = '未连接'
      sessionIP.value = ''
    }
  })
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.api.removeListener('status-change')
})

// 根据状态返回对应的标签主题
const getConnectionTheme = (status) => {
  return status === '已连接' ? 'success' : 'danger'
}
</script>

<template>
  <div class="status-bar">
    <t-space>
      <t-tag :theme="getConnectionTheme(connectionStatus)" size="small">
        <template #icon>
          <t-icon name="link" />
        </template>
        {{ connectionStatus }}
      </t-tag>

      <t-tag theme="default" size="small">
        <template #icon>
          <t-icon name="internet" />
        </template>
        {{ sessionIP }}
      </t-tag>
    </t-space>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
}
</style>
