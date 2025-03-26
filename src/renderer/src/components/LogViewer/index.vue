<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// 日志列表数据
const logList = ref([])
const isLoading = ref(false)

// 加载日志列表
const loadLogList = async () => {
  try {
    isLoading.value = true
    // 通过IPC调用获取日志列表
    const logs = await window.api.invoke('get-log-list')
    logList.value = logs
  } catch (error) {
    console.error('加载日志列表失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 打开日志文件
const openLogFile = (logPath) => {
  window.api.invoke('open-log-file', logPath)
}

// 刷新日志列表
const refreshLogList = () => {
  loadLogList()
}

// 打开日志文件夹
const openLogsDir = () => {
  window.api.send('open-logs-dir')
}

// 组件挂载时加载日志列表
onMounted(() => {
  loadLogList()
  
  // 每60秒自动刷新一次日志列表
  const refreshInterval = setInterval(() => {
    loadLogList()
  }, 60000)
  
  // 组件卸载时清除定时器
  onUnmounted(() => {
    clearInterval(refreshInterval)
  })
})
</script>

<template>
  <div class="log-viewer">
    <div class="log-header">
      <div class="log-title">
        <t-space>
          <t-button theme="primary" size="small" @click="openLogsDir">
            <template #icon>
              <t-icon name="file-paste" />
            </template>
            日志列表
          </t-button>
        </t-space>
      </div>
      
      <div class="log-controls">
        <t-button theme="default" size="small" @click="refreshLogList">
          <template #icon>
            <t-icon name="refresh" />
          </template>
          刷新
        </t-button>
      </div>
    </div>
    
    <div class="log-list">
      <t-loading :loading="isLoading">
        <t-list v-if="logList.length > 0" size="small">
          <t-list-item v-for="log in logList" :key="log.path" @click="openLogFile(log.path)">
            <template #content>
              <div class="log-item">
                <t-icon name="file-text" />
                <span class="log-name">{{ log.name }}</span>
              </div>
            </template>
          </t-list-item>
        </t-list>
        
        <t-empty v-else description="暂无日志文件" />
      </t-loading>
    </div>
  </div>
</template>

<style scoped>
.log-viewer {
  width: 250px;
  background-color: #f8f8f8;
  border-radius: 6px;
  margin: 0 8px 8px 0;
  padding: 8px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
  box-sizing: border-box;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e7e7e7;
}

.log-title, .log-controls {
  display: flex;
  align-items: center;
}

.log-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: #fff;
  border-radius: 3px;
  padding: 4px;
  box-sizing: border-box;
}

.log-item {
  display: flex;
  align-items: center;
  padding: 4px 6px;
  cursor: pointer;
  border-radius: 2px;
  transition: background-color 0.2s;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.log-item:hover {
  background-color: #f0f0f0;
}

.log-name {
  margin-left: 4px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
}
</style>