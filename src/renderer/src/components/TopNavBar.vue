<script setup>
import { ref } from 'vue'
import StatusBar from './StatusBar.vue'

// 控制各个弹出框的显示状态
const createSessionVisible = ref(false)
const taskManagerVisible = ref(false)
const helpVisible = ref(false)

// 连接参数
const host = ref('192.168.5.58')
const port = ref('23')
const username = ref('admin')
const password = ref('bnm789789')

// 打开/关闭弹出框的方法
const toggleCreateSession = () => {
  createSessionVisible.value = !createSessionVisible.value
}

const toggleTaskManager = () => {
  taskManagerVisible.value = !taskManagerVisible.value
}

const toggleHelp = () => {
  helpVisible.value = !helpVisible.value
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
      header="创建会话"
      v-model:visible="createSessionVisible"
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
      header="任务管理"
      v-model:visible="taskManagerVisible"
      :on-close="toggleTaskManager"
      :on-confirm="toggleTaskManager"
      :on-cancel="toggleTaskManager"
    >
      <template>
        <p>任务管理的内容区域</p>
        <!-- 这里将来可以添加任务管理的具体内容 -->
      </template>
    </t-dialog>

    <!-- 帮助弹出框 -->
    <t-dialog
      header="帮助"
      v-model:visible="helpVisible"
      :on-close="toggleHelp"
      :on-confirm="toggleHelp"
      :on-cancel="toggleHelp"
    >
      <template>
        <p>帮助的内容区域</p>
        <!-- 这里将来可以添加帮助的具体内容 -->
      </template>
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
  max-height: 70vh;
  overflow: auto;
}
</style>