<script setup>
import { ref, onMounted } from 'vue'
import pkg from '@renderer/../../../package.json'

// 控制弹出框的显示状态
const helpVisible = ref(false)

// 应用版本信息
const appVersion = ref(pkg.version) // 从package.json中获取的版本号
const isCheckingUpdate = ref(false) // 是否正在检查更新
const customUpdateServer = ref('') // 自定义更新服务器地址

// 更新下载进度相关
const isDownloading = ref(false) // 是否正在下载更新
const downloadProgress = ref(0) // 下载进度百分比
const downloadSpeed = ref(0) // 下载速度
const downloadTransferred = ref(0) // 已下载大小
const downloadTotal = ref(0) // 总大小

// 打开/关闭弹出框的方法
const toggleHelp = () => {
  helpVisible.value = !helpVisible.value
}

// 检查更新方法
const checkForUpdates = () => {
  isCheckingUpdate.value = true
  // 调用预加载脚本中暴露的检查更新方法，传递自定义服务器地址
  window.api.send('check-for-updates', customUpdateServer.value)
  // 设置一个定时器，3秒后重置检查状态
  setTimeout(() => {
    isCheckingUpdate.value = false
  }, 3000)
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

// 格式化下载速度
const formatSpeed = (bytesPerSecond) => {
  return formatFileSize(bytesPerSecond) + '/s'
}

// 监听下载进度
onMounted(() => {
  window.api.on('update-download-progress', (progressData) => {
    isDownloading.value = true
    downloadProgress.value = progressData.percent
    downloadSpeed.value = progressData.bytesPerSecond
    downloadTransferred.value = progressData.transferred
    downloadTotal.value = progressData.total
  })
})
</script>

<template>
  <!-- 帮助按钮 -->
  <t-button @click="toggleHelp">
    <template #icon>
      <t-icon name="help-circle" />
    </template>
    帮助
  </t-button>

  <!-- 帮助弹出框 -->
  <t-dialog
    v-model:visible="helpVisible"
    header="帮助"
    :on-close="toggleHelp"
    :on-confirm="toggleHelp"
    :on-cancel="toggleHelp"
    :footer="false"
  >
    <div class="help-content">
      <div class="version-info">
        <p><strong>当前版本：</strong> v{{ appVersion }}</p>
        <t-button :loading="isCheckingUpdate" @click="checkForUpdates">
          {{ isCheckingUpdate ? '检查中...' : '检查更新' }}
        </t-button>
      </div>
      
      <!-- 自定义更新服务器设置 -->
      <div class="update-server-container">
        <h3>更新服务器设置</h3>
        <div class="update-server-input">
          <t-input v-model="customUpdateServer" placeholder="请输入自定义更新服务器地址（留空使用默认地址）" />
        </div>
      </div>

      <!-- 更新下载进度显示区域 -->
      <div v-if="isDownloading" class="download-progress-container">
        <h3>正在下载更新</h3>
        <t-progress :percentage="Number(downloadProgress.toFixed(2))" :color="{ from: '#0052D9', to: '#00A870' }" :label="true" />
        <div class="download-details">
          <p>下载速度: {{ formatSpeed(downloadSpeed) }}</p>
          <p>已下载: {{ formatFileSize(downloadTransferred) }} / {{ formatFileSize(downloadTotal) }}</p>
        </div>
      </div>
    </div>
  </t-dialog>
</template>

<style scoped>
.help-content {
  padding: 10px;
}

.help-content h3 {
  margin-top: 15px;
  margin-bottom: 10px;
  color: #0052d9;
}

.version-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  margin: 15px 0;
}

.download-progress-container {
  margin-top: 20px;
  padding: 15px;
  background-color: #f0f9ff;
  border-radius: 6px;
  border: 1px solid #e0f0ff;
}

.download-progress-container h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #0052d9;
}

.download-details {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 14px;
  color: #666;
}

.update-server-container {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 6px;
}

.update-server-input {
  margin-top: 10px;
}
</style>