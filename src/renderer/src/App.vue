<script setup>
import Terminal from './components/Terminal.vue'
import TopNavBar from './components/TopNavBar.vue'
import TaskExecutor from './components/TaskExecutor.vue'
</script>

<template>
  <div class="container">
    <TopNavBar />
    <Terminal />
    <TaskExecutor />
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
</style>
