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

// 终端相关变量
const terminalElement = ref(null)
let terminal = null
let fitAddon = null

// 开始任务
const startTask = () => {
  if (isRunning.value) return
  
  isRunning.value = true
  taskStatus.value = '执行中'
  
  // 发送开始任务的消息到主进程
  window.api.send('task-start', { name: taskName.value })
  
  // 这里可以添加模拟任务输出的逻辑
  appendOutput('开始执行任务: ' + taskName.value)
  if (taskPath.value) {
    appendOutput('任务路径: ' + taskPath.value)
  }
}

// 停止任务
const stopTask = () => {
  if (!isRunning.value) return
  
  isRunning.value = false
  taskStatus.value = '已停止'
  
  // 发送停止任务的消息到主进程
  window.api.send('task-stop', { name: taskName.value })
  
  appendOutput('任务已停止')
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
    scrollback: 1000,
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
    appendOutput(data.text + '\n')
  })
  
  // 监听任务状态变化
  window.api.on('task-status', (data) => {
    console.log(data)
    taskStatus.value = data.status
    isRunning.value = data.status === '执行中'
    
    if (data.status === '已完成') {
      appendOutput('任务已完成')
    }
  })
  
  // 监听任务名称变化
  window.api.on('task-name', (data) => {
    taskName.value = data.name || '未选择任务'
  })
  
  // 监听任务路径变化
  window.api.on('task-path', (data) => {
    taskPath.value = data.path || ''
  })

  window.api.on('task-output', (data) => {
    appendOutput(data.text)
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
          <t-button theme="primary" :disabled="isRunning" @click="startTask">
            <template #icon>
              <t-icon name="play" />
            </template>
            开始
          </t-button>
          
          <t-button theme="danger" :disabled="!isRunning" @click="stopTask">
            <template #icon>
              <t-icon name="stop" />
            </template>
            停止
          </t-button>
          
          <t-button theme="default" @click="clearOutput">
            <template #icon>
              <t-icon name="clear" />
            </template>
            清空
          </t-button>
        </t-space>
      </div>
    </div>
    
    <div class="task-output" ref="terminalElement"></div>
  </div>
</template>

<style scoped>
.task-executor {
  width: calc(100% - 16px);
  background-color: #f8f8f8;
  border-radius: 6px;
  margin: 0 8px 8px 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  height: 220px; /* 增加固定高度以适应更大的窗口 */
  box-sizing: border-box;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e7e7e7;
}

.task-info {
  display: flex;
  align-items: center;
}

.task-controls {
  display: flex;
  align-items: center;
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