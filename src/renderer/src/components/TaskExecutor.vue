<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// 任务状态数据
const taskName = ref('未选择任务')
const taskStatus = ref('未开始') // 状态：未开始、执行中、已完成、已停止
const taskOutput = ref('')
const isRunning = ref(false)

// 开始任务
const startTask = () => {
  if (isRunning.value) return
  
  isRunning.value = true
  taskStatus.value = '执行中'
  
  // 发送开始任务的消息到主进程
  window.api.send('task-start', { name: taskName.value })
  
  // 这里可以添加模拟任务输出的逻辑
  appendOutput('开始执行任务: ' + taskName.value + '\n')
}

// 停止任务
const stopTask = () => {
  if (!isRunning.value) return
  
  isRunning.value = false
  taskStatus.value = '已停止'
  
  // 发送停止任务的消息到主进程
  window.api.send('task-stop', { name: taskName.value })
  
  appendOutput('任务已停止\n')
}

// 清空输出
const clearOutput = () => {
  taskOutput.value = ''
}

// 添加输出内容
const appendOutput = (text) => {
  taskOutput.value += text
  // 自动滚动到底部
  if (outputElement.value) {
    setTimeout(() => {
      // 获取textarea内部元素并滚动到底部
      const textareaInner = outputElement.value.$el.querySelector('.t-textarea__inner')
      if (textareaInner) {
        textareaInner.scrollTop = textareaInner.scrollHeight
      }
    }, 0)
  }
}

// 输出框DOM引用
const outputElement = ref(null)

// 监听任务状态变化
onMounted(() => {
  // 监听任务输出
  window.api.on('task-output', (data) => {
    appendOutput(data.text + '\n')
  })
  
  // 监听任务状态变化
  window.api.on('task-status', (data) => {
    taskStatus.value = data.status
    isRunning.value = data.status === '执行中'
    
    if (data.status === '已完成') {
      appendOutput('任务已完成\n')
    }
  })
  
  // 监听任务名称变化
  window.api.on('task-name', (data) => {
    taskName.value = data.name || '未选择任务'
  })
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.api.removeListener('task-output')
  window.api.removeListener('task-status')
  window.api.removeListener('task-name')
})

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
              <t-icon name="stop-circle-1" v-else-if="taskStatus === '已停止'" />
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
    
    <t-textarea
      class="task-output"
      ref="outputElement"
      v-model="taskOutput"
      readonly
      :autosize="{ minRows: 5 }"
    ></t-textarea>
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
  height: 180px; /* 减小固定高度 */
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
  color: #f0f0f0;
  border-radius: 3px;
  padding: 6px;
  font-family: monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}

/* 覆盖TDesign文本区域的默认样式 */
.task-output :deep(.t-textarea__inner) {
  background-color: #1e1e1e;
  color: #f0f0f0;
  border: none;
  resize: none;
}

.task-output :deep(.t-textarea__inner:focus) {
  box-shadow: none;
}
</style>