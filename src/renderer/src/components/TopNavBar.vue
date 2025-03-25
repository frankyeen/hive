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

// 步骤控制
const currentStep = ref(0)
const steps = [
  { value: 0, label: '基本信息', content: '配置任务名称和命令超时时间' },
  { value: 1, label: '前置命令', content: '配置任务执行前的准备命令' },
  { value: 2, label: '执行命令', content: '配置循环次数和主要执行命令' },
  { value: 3, label: '后置命令', content: '配置任务执行后的清理命令' }
]

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
  // 重置表单和步骤
  if (createTaskVisible.value) {
    taskForm.value = {
      name: '',
      loop: 10,
      cmd_timeout: 10,
      setup: '',
      cmd: '',
      teardown: ''
    }
    currentStep.value = 0
  }
}

// 步骤控制方法
const nextStep = () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const resetSteps = () => {
  currentStep.value = 0
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
    const cmdArray = formData.cmd.split('\n').filter(line => line.trim() !== '').map(line => `"${line.trim()}"`)
    
    // 构建YAML内容
    let yamlContent = ''
    
    // 只有当setup不为空时才添加setup字段
    const setupArray = formData.setup.split('\n').filter(line => line.trim() !== '')
    if (setupArray.length > 0) {
      const formattedSetup = setupArray.map(line => `"${line.trim()}"`)
      yamlContent += `setup:\n  - ${formattedSetup.join('\n  - ')}\n\n`
    }
    
    // 只有当teardown不为空时才添加teardown字段
    const teardownArray = formData.teardown.split('\n').filter(line => line.trim() !== '')
    if (teardownArray.length > 0) {
      const formattedTeardown = teardownArray.map(line => `"${line.trim()}"`)
      yamlContent += `teardown:\n  - ${formattedTeardown.join('\n  - ')}\n\n`
    }
    
    // 添加必需的字段
    yamlContent += `loop: ${formData.loop}\n\ncmd_timeout: ${formData.cmd_timeout}\n\ncmd:\n  - ${cmdArray.join('\n  - ')}\n`
    
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

const deleteTask = async (name) => {
  try {
    // 调用预加载脚本中暴露的删除任务方法
    await window.ipcRenderer.invoke('delete-task', name)
    // 刷新任务列表
    loadTaskList()
  } catch (error) {
    console.error('删除任务失败:', error)
  }
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
              新建
            </t-button>
            <t-button @click="loadTaskList">
              <template #icon>
                <t-icon name="refresh" />
              </template>
              刷新
            </t-button>
          </t-space>
        </div>
        
        <t-table
          :data="taskList"
          :columns="[
            { colKey: 'name', title: '任务名称', width: '200' },
            { colKey: 'operation', title: '操作', width: '60' }
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
                选中
              </t-button>
              <t-button theme="danger" size="small" @click="deleteTask(row.name)">
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
      :footer="false"
      width="900px"
      class="create-task-dialog"
    >
      <!-- 步骤条 -->
      <t-steps :current="currentStep" class="task-steps">
        <t-step-item
          v-for="step in steps"
          :key="step.value"
          :title="step.label"
          :content="step.content"
        />
      </t-steps>
      
      <t-divider></t-divider>
      
      <t-form :data="taskForm" :rules="rules" @submit="createTask" class="task-form">
        <!-- 步骤1：基本信息 - 任务名称和命令超时时间 -->
        <div v-show="currentStep === 0">
          <t-form-item label="任务名称" name="name">
            <t-input v-model="taskForm.name" placeholder="请输入任务名称"></t-input>
          </t-form-item>
          <t-form-item label="命令超时时间(秒)" name="cmd_timeout">
            <t-input-number v-model="taskForm.cmd_timeout" placeholder="请输入超时时间" :min="1"></t-input-number>
          </t-form-item>
        </div>
        
        <!-- 步骤2：前置命令 -->
        <div v-show="currentStep === 1">
          <t-form-item label="前置命令" name="setup">
            <t-textarea v-model="taskForm.setup" placeholder="请输入前置命令，每行一条命令" :autosize="{ minRows: 5, maxRows: 15 }" class="command-textarea"></t-textarea>
          </t-form-item>
        </div>
        
        <!-- 步骤3：循环次数和执行命令 -->
        <div v-show="currentStep === 2">
          <t-form-item label="循环次数" name="loop">
            <t-input-number v-model="taskForm.loop" placeholder="请输入循环次数" :min="1"></t-input-number>
          </t-form-item>
          
          <t-form-item label="执行命令 (必填)" name="cmd">
            <t-textarea v-model="taskForm.cmd" placeholder="请输入执行命令，每行一条命令" :autosize="{ minRows: 5, maxRows: 15 }" class="command-textarea"></t-textarea>
          </t-form-item>
        </div>
        
        <!-- 步骤4：后置命令 -->
        <div v-show="currentStep === 3">
          <t-form-item label="后置命令" name="teardown">
            <t-textarea v-model="taskForm.teardown" placeholder="请输入后置命令，每行一条命令" :autosize="{ minRows: 5, maxRows: 15 }" class="command-textarea"></t-textarea>
          </t-form-item>
        </div>
        
        <!-- 步骤导航按钮 -->
        <div class="step-actions">
          <t-space>
            <t-button theme="default" @click="toggleCreateTask">取消</t-button>
            <t-button v-if="currentStep > 0" @click="prevStep">上一步</t-button>
            <t-button v-if="currentStep < steps.length - 1" theme="primary" @click="nextStep">下一步</t-button>
            <t-button v-if="currentStep === steps.length - 1" theme="primary" @click="createTask(taskForm)">创建任务</t-button>
          </t-space>
        </div>
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


.task-form {
  padding: 10px;
}

.task-steps {
  margin: 20px 0;
  display: flex;
  justify-content: flex-start;
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e7e7e7;
}

.confirmation-card {
  margin: 20px 0;
}

.command-preview {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

/* 增加表单标签右侧距离，防止与输入框内容重叠 */
:deep(.t-form__label) {
  padding-right: 130px;
}

</style>
