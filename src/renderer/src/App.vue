<script setup>
import Terminal from '@renderer/components/Terminal/index.vue'
import TopNavBar from '@renderer/components/TopNavBar/index.vue'
import TaskExecutor from '@renderer/components/TaskExecutor/index.vue'
import LogViewer from '@renderer/components/LogViewer/index.vue'
</script>

<template>
  <div class="container">
    <TopNavBar />
    <div class="main-content">
      <div class="left-panel">
        <Terminal />
        <TaskExecutor />
      </div>
      <LogViewer />
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 15px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
