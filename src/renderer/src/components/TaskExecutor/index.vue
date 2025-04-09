<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

// 任务状态数据
const taskName = ref('未选择任务')
const taskPath = ref('')
const taskStatus = ref('未开始') // 状态：未开始、执行中、已完成、已停止
const isRunning = ref(false)

// 自动上传相关状态
const autoUpload = ref(false)
const svnDialogVisible = ref(false)
const url = ref('')
const username = ref('')
const password = ref('')

// 状态记录开关
const recordStatus = ref(false)

// 终端相关变量
const terminalElement = ref(null)
let terminal = null
let fitAddon = null

// 开始任务
const startTask = () => {
  if (isRunning.value) return
  
  isRunning.value = true
  taskStatus.value = '执行中'
  
  // 发送开始任务的消息到主进程，包含自动上传信息和状态记录标志
  const message = { 
    name: taskName.value,
    autoUpload: autoUpload.value,
    recordStatus: recordStatus.value
  }
  if (autoUpload.value) {
    // Stringify SVN info to avoid cloning issues
    message.svnInfo = JSON.stringify({url: url.value, username: username.value, password: password.value})
  }
  window.api.send('task-start', message)
}

// 停止任务
const stopTask = () => {
  if (!isRunning.value) return
  
  isRunning.value = false
  taskStatus.value = '已停止'
  
  // 发送停止任务的消息到主进程，包含自动上传信息和状态记录标志
  const message = { 
    name: taskName.value,
    autoUpload: autoUpload.value,
    recordStatus: recordStatus.value
  }
  if (autoUpload.value) {
    // Stringify SVN info to avoid cloning issues
    message.svnInfo = JSON.stringify({url: url.value, username: username.value, password: password.value})
  }
  window.api.send('task-stop', message)
}

// 清空输出
const clearOutput = () => {
  if (terminal) {
    terminal.clear()
  }
}

// 添加输出内容
const appendOutput = (text) => {
  if (terminal) {
    terminal.writeln(text)
  }
}

// 初始化终端
const initTerminal = () => {
  if (!terminalElement.value) return
  
  // 初始化终端
  terminal = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'monospace',
    scrollback: 1500,
    theme: {
      background: '#1e1e1e',
      foreground: '#f0f0f0'
    }
  })

  // 添加自适应插件
  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)

  // 打开终端并挂载到DOM元素
  terminal.open(terminalElement.value)
  fitAddon.fit()
}

// 监听任务状态变化
onMounted(() => {
  // 初始化终端
  initTerminal()
  
  // 处理窗口大小变化
  window.addEventListener('resize', handleResize)
  // 监听任务输出
  window.api.on('task-output', (data) => {
    appendOutput(data)
  })
  
  // 监听任务状态变化
  window.api.on('task-status', (data) => {
    taskStatus.value = data.status
    isRunning.value = data.status === '执行中'
  })
  
  // 监听任务名称变化
  window.api.on('task-name', (data) => {
    taskName.value = data.name || '未选择任务'
  })
  
  // 监听任务路径变化
  window.api.on('task-path', (data) => {
    taskPath.value = data.path || ''
    appendOutput(`选中任务路径: ${data.path}`)
  })
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.api.removeListener('task-output')
  window.api.removeListener('task-status')
  window.api.removeListener('task-name')
  window.api.removeListener('task-path')
  
  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleResize)
  
  // 销毁终端实例
  if (terminal) {
    terminal.dispose()
  }
})

// 处理窗口大小变化
const handleResize = () => {
  if (fitAddon) {
    fitAddon.fit()
  }
}

// 根据状态返回对应的标签主题
const getStatusTheme = (status) => {
  switch (status) {
    case '执行中': return 'warning'
    case '已完成': return 'success'
    case '已停止': return 'danger'
    default: return 'default'
  }
}

// 切换自动上传状态
const toggleAutoUpload = () => {
  if (!autoUpload.value) {
    // 从关闭切换到开启时，显示SVN信息对话框
    svnDialogVisible.value = true
  } else {
    // 从开启切换到关闭时，直接关闭
    autoUpload.value = false
  }
}

// 确认SVN信息
const confirmSvnInfo = () => {
  // 验证SVN信息
  if (!url.value || !username.value || !password.value) {
    // 如果信息不完整，显示错误提示
    return
  }
  
  // 设置自动上传为开启状态
  autoUpload.value = true
  // 关闭对话框
  svnDialogVisible.value = false
}

// 取消SVN信息输入
const cancelSvnInfo = () => {
  // 关闭对话框
  svnDialogVisible.value = false
  // 保持自动上传为关闭状态
  autoUpload.value = false
}
</script>

<template>
  <div class="task-executor">
    <div class="task-header">
      <div class="task-info">
        <t-space>
          <t-tag theme="primary" size="medium">
            <template #icon>
              <t-icon name="file" />
            </template>
            {{ taskName }}
          </t-tag>
          
          <t-tag :theme="getStatusTheme(taskStatus)" size="medium">
            <template #icon>
              <t-icon name="play-circle" v-if="taskStatus === '执行中'" />
              <t-icon name="check-circle" v-else-if="taskStatus === '已完成'" />
              <t-icon name="stop-circle" v-else-if="taskStatus === '已停止'" />
              <t-icon name="time" v-else />
            </template>
            {{ taskStatus }}
          </t-tag>
        </t-space>
      </div>
      
      <div class="task-controls">
        <t-space>
          <t-switch
            v-model="recordStatus"
            size="medium"
          >
            <template #label>
              状态记录
              <t-icon name="file-paste" />
            </template>
          </t-switch>
          
          <t-switch
            :value="autoUpload"
            @change="toggleAutoUpload"
            size="medium"
          >
            <template #label>
              SVN
              <t-icon name="upload" />
            </template>
          </t-switch>
          
          <t-button theme="primary" :disabled="isRunning" size="small" @click="startTask">
            <template #icon>
              <t-icon name="play-circle" />
            </template>
            开始
          </t-button>
          
          <t-button theme="danger" :disabled="!isRunning" size="small" @click="stopTask">
            <template #icon>
              <t-icon name="stop-circle" />
            </template>
            停止
          </t-button>
          
          <t-button theme="default" @click="clearOutput" size="small">
            <template #icon>
              <t-icon name="clear" />
            </template>
            清空
          </t-button>
        </t-space>
      </div>
    </div>
    
    <div class="task-output" ref="terminalElement"></div>
    
    <!-- SVN信息对话框 -->
    <t-dialog
      header="SVN上传设置"
      :visible.sync="svnDialogVisible"
      :on-confirm="confirmSvnInfo"
      :on-close="cancelSvnInfo"
      width="600"
    >
      <t-form :label-width="100" layout="inline">
        <t-form-item
          label="SVN路径"
          required
          :label-width="100"
          class="form-item"
        >
          <t-input
            v-model="url"
            placeholder="请输入SVN仓库路径"
            style="max-width: 400px;"
          />
        </t-form-item>
        <t-form-item
          label="用户名"
          required
          :label-width="100"
          class="form-item"
        >
          <t-input
            v-model="username"
            placeholder="请输入SVN用户名"
            style="max-width: 400px;"
          />
        </t-form-item>
        <t-form-item
          label="密码"
          required
          :label-width="100"
          class="form-item"
        >
          <t-input
            v-model="password"
            type="password"
            placeholder="请输入SVN密码"
            style="max-width: 400px;"
          />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<style scoped>
.task-executor {
  width: calc(100% - 16px);
  background-color: #f8f8f8;
  border-radius: 6px;
  margin: 0px 8px 0px 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 220px;
  box-sizing: border-box;
}

.form-item {
  margin-bottom: 16px;
  width: 100%;
}

.form-item .t-input {
  margin-left: 12px;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e7e7e7;
  height: 20px; /* 固定高度保证垂直居中 */
}

.task-info {
  display: flex;
  align-items: center;
}

.task-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-output {
  flex: 1;
  background-color: #1e1e1e;
  border-radius: 3px;
  padding: 8px;
  overflow: auto; /* 修改为auto，只在内容超出时显示滚动条 */
  font-size: 14px;
}
</style>