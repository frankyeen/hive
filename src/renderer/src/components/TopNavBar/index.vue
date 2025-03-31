<script setup>
import { ref } from 'vue'
import StatusBar from '@renderer/components/TopNavBar/StatusBar.vue'
import CreateSession from '@renderer/components/TopNavBar/CreateSession.vue'
import TaskManager from '@renderer/components/TopNavBar/TaskManager.vue'
import HelpDialog from '@renderer/components/TopNavBar/HelpDialog.vue'

// 组件引用
const createSessionRef = ref(null)
const taskManagerRef = ref(null)
const helpDialogRef = ref(null)

// 打开创建会话弹窗
const openCreateSession = () => {
  createSessionRef.value.toggleCreateSession()
}

// 打开任务管理弹窗
const openTaskManager = () => {
  taskManagerRef.value.toggleTaskManager()
}

// 打开帮助弹窗
const openHelp = () => {
  helpDialogRef.value.toggleHelp()
}
</script>

<template>
  <div class="top-nav-bar">
    <div class="nav-left">
      <t-space>
        <CreateSession />
        <TaskManager />
        <HelpDialog />
      </t-space>
    </div>
    <div class="nav-right">
      <StatusBar />
    </div>
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
</style>

