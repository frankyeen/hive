<script setup>
import Terminal from './components/Terminal.vue'
import TopNavBar from './components/TopNavBar.vue'
import TaskExecutor from './components/TaskExecutor.vue'
import LogViewer from './components/LogViewer.vue'
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
