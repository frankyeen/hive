<script setup>
import { ref, onMounted } from 'vue'
import StatusBar from './StatusBar.vue'
import pkg from '../../../../package.json'

// 控制各个弹出框的显示状态
const createSessionVisible = ref(false)
const taskManagerVisible = ref(false)
const createTaskVisible = ref(false)
const helpVisible = ref(false)

// 任务列表数据
const taskList = ref([])

// 新建任务表单数据
const taskForm = ref({
  name: '',
  loop: 10,
  cmd_timeout: 10,
  setup: '',
  cmd: '',
  teardown: ''
})

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入任务名称', type: 'error' }],
  loop: [{ required: true, message: '请输入循环次数', type: 'error' }],
  cmd_timeout: [{ required: true, message: '请输入命令超时时间', type: 'error' }],
  cmd: [{ required: true, message: '请输入命令', type: 'error' }]
}

// 连接参数
const host = ref('192.168.5.58')
const port = ref('23')
const username = ref('admin')
const password = ref('bnm789789')

// 应用版本信息
const appVersion = ref(pkg.version) // 从package.json中获取的版本号
const isCheckingUpdate = ref(false) // 是否正在检查更新

// 更新下载进度相关
const isDownloading = ref(false) // 是否正在下载更新
const downloadProgress = ref(0) // 下载进度百分比
const downloadSpeed = ref(0) // 下载速度
const downloadTransferred = ref(0) // 已下载大小
const downloadTotal = ref(0) // 总大小

// 打开/关闭弹出框的方法
const toggleCreateSession = () => {
  createSessionVisible.value = !createSessionVisible.value
}

const toggleTaskManager = () => {
  taskManagerVisible.value = !taskManagerVisible.value
  // 打开任务管理弹窗时加载任务列表
  if (taskManagerVisible.value) {
    loadTaskList()
  }
}

const toggleCreateTask = () => {
  createTaskVisible.value = !createTaskVisible.value
  // 重置表单
  if (createTaskVisible.value) {
    taskForm.value = {
      name: '',
      loop: 10,
      cmd_timeout: 10,
      setup: '',
      cmd: '',
      teardown: ''
    }
  }
}

const toggleHelp = () => {
  helpVisible.value = !helpVisible.value
}

// 加载任务列表
const loadTaskList = async () => {
  try {
    // 通过IPC调用获取任务列表
    const files = await window.ipcRenderer.invoke('get-task-list')
    taskList.value = files
  } catch (error) {
    console.error('加载任务列表失败:', error)
  }
}

// 创建新任务
const createTask = async (formData) => {
  try {
    // 将多行文本转换为数组
    const setupArray = formData.setup.split('\n').filter(line => line.trim() !== '').map(line => `"${line.trim()}"`)
    const cmdArray = formData.cmd.split('\n').filter(line => line.trim() !== '').map(line => `"${line.trim()}"`)
    const teardownArray = formData.teardown.split('\n').filter(line => line.trim() !== '').map(line => `"${line.trim()}"`)
    
    // 构建YAML内容
    const yamlContent = `setup:\n  - ${setupArray.join('\n  - ')}\n\nteardown:\n  - ${teardownArray.join('\n  - ')}\n\nloop: ${formData.loop}\n\ncmd_timeout: ${formData.cmd_timeout}\n\ncmd:\n  - ${cmdArray.join('\n  - ')}\n`
    
    // 发送到主进程保存文件
    await window.ipcRenderer.invoke('save-task', {
      name: formData.name,
      content: yamlContent
    })
    
    // 关闭弹窗并刷新任务列表
    createTaskVisible.value = false
    loadTaskList()
  } catch (error) {
    console.error('创建任务失败:', error)
  }
}

// 连接方法
const connect = () => {
  window.api.send('connect', {
    host: host.value,
    port: port.value,
    username: username.value,
    password: password.value
  })

  // 添加URL参数，用于在StatusBar中获取当前连接的IP
  const url = new URL(window.location.href)
  url.searchParams.set('ip', host.value)
  window.history.replaceState({}, '', url)

  createSessionVisible.value = false
}

// 检查更新方法
const checkForUpdates = () => {
  isCheckingUpdate.value = true
  // 调用预加载脚本中暴露的检查更新方法
  window.ipcRenderer.checkForUpdates()
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

// 选择并执行任务方法
const selectAndExecuteTask = (name) => {
  // 获取任务路径
  const configsDir = 'configs'
  const taskPath = `${configsDir}/${name}.yaml`
  
  // 发送任务名称到主进程
  window.api.send('task-name', { name })
  // 发送任务路径到主进程
  window.api.send('task-path', { path: taskPath })
  // 关闭任务管理弹窗
  taskManagerVisible.value = false
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
  <div class="top-nav-bar">
    <div class="nav-left">
      <t-space>
        <t-button @click="toggleCreateSession">
          <template #icon>
            <t-icon name="add-circle" />
          </template>
          创建会话
        </t-button>
        <t-button @click="toggleTaskManager">
          <template #icon>
            <t-icon name="view-list" />
          </template>
          任务管理
        </t-button>
        <t-button @click="toggleHelp">
          <template #icon>
            <t-icon name="help-circle" />
          </template>
          帮助
        </t-button>
      </t-space>
    </div>
    <div class="nav-right">
      <StatusBar />
    </div>

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

    <!-- 任务管理弹出框 -->
    <t-dialog
      v-model:visible="taskManagerVisible"
      header="任务管理"
      :on-close="toggleTaskManager"
      :on-cancel="toggleTaskManager"
      :footer="false"
      width="680px"
    >
      <div class="task-manager-container">
        <div class="task-manager-header">
          <t-space>
            <t-button theme="primary" @click="toggleCreateTask">
              <template #icon>
                <t-icon name="add" />
              </template>
              新建任务
            </t-button>
            <t-button @click="loadTaskList">
              <template #icon>
                <t-icon name="refresh" />
              </template>
              刷新列表
            </t-button>
          </t-space>
        </div>
        
        <t-table
          :data="taskList"
          :columns="[
            { colKey: 'name', title: '任务名称', width: '200' },
            { colKey: 'operation', title: '操作', width: '150' }
          ]"
          row-key="name"
          size="medium"
          bordered
          stripe
          empty="暂无任务"
        >
          <template #operation="{ row }">
            <t-space>
              <t-button theme="primary" size="small" @click="selectAndExecuteTask(row.name)">
                执行
              </t-button>
              <t-button theme="danger" size="small" @click="window.ipcRenderer.invoke('delete-task', row.name).then(loadTaskList)">
                删除
              </t-button>
            </t-space>
          </template>
        </t-table>
      </div>
    </t-dialog>
    
    <!-- 新建任务弹出框 -->
    <t-dialog
      v-model:visible="createTaskVisible"
      header="新建任务"
      :on-close="toggleCreateTask"
      :on-confirm="() => createTask(taskForm)"
      :on-cancel="toggleCreateTask"
      confirm-btn="创建"
      width="900px"
      class="create-task-dialog"
    >
      <t-form :data="taskForm" :rules="rules" @submit="createTask" class="task-form">
        <t-form-item label="任务名称" name="name">
          <t-input v-model="taskForm.name" placeholder="请输入任务名称"></t-input>
        </t-form-item>
        <t-row :gutter="32">
          <t-col :span="12">
            <t-form-item label="循环次数" name="loop">
              <t-input-number v-model="taskForm.loop" placeholder="请输入循环次数" :min="1"></t-input-number>
            </t-form-item>
          </t-col>
          <t-col :span="12">
            <t-form-item label="命令超时时间(秒)" name="cmd_timeout">
              <t-input-number v-model="taskForm.cmd_timeout" placeholder="请输入超时时间" :min="1"></t-input-number>
            </t-form-item>
          </t-col>
        </t-row>
        
        <t-divider style="margin: 16px 0"></t-divider>
        
        <t-form-item label="前置命令" name="setup">
          <t-textarea v-model="taskForm.setup" placeholder="请输入前置命令，每行一条命令" :autosize="{ minRows: 3, maxRows: 8 }" class="command-textarea"></t-textarea>
        </t-form-item>
        
        <t-form-item label="执行命令 (必填)" name="cmd">
          <t-textarea v-model="taskForm.cmd" placeholder="请输入执行命令，每行一条命令" :autosize="{ minRows: 5, maxRows: 15 }" class="command-textarea"></t-textarea>
        </t-form-item>
        
        <t-form-item label="后置命令" name="teardown">
          <t-textarea v-model="taskForm.teardown" placeholder="请输入后置命令，每行一条命令" :autosize="{ minRows: 3, maxRows: 8 }" class="command-textarea"></t-textarea>
        </t-form-item>
      </t-form>
    </t-dialog>

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
  </div>
</template>

<style scoped>
.top-nav-bar {
  padding: 8px 12px;
  border-bottom: 1px solid #e7e7e7;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 6px;
  background-color: #f8f8f8;
  margin: 0 3px 10px 3px;
}

.nav-left {
  display: flex;
  align-items: center;
}

.nav-right {
  display: flex;
  align-items: center;
}

:deep(.t-dialog__body) {
  padding: 20px;
  overflow: visible;
}

:deep(.create-task-dialog .t-dialog__body) {
  max-height: none;
  overflow: visible;
}

:deep(.t-form__item) {
  margin-bottom: 20px;
}

:deep(.t-form__label) {
  min-width: 120px;
}

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

.task-manager-container {
  padding: 10px 0;
}

.task-manager-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 15px;
}

.command-textarea {
  width: 100%;
  font-family: monospace;
  min-height: 80px;
  line-height: 1.5;
  max-height: 200px;
  overflow-y: auto;
}

:deep(.t-textarea__inner) {
  padding: 8px 12px;
  font-size: 14px;
}

:deep(.t-collapse-panel__content) {
  padding: 16px;
}

:deep(.t-collapse-panel__header) {
  font-weight: 500;
}

:deep(.t-input-number) {
  width: 100%;
}

.task-form {
  padding: 10px;
}

:deep(.t-form__controls) {
  width: 100%;
}
</style>
