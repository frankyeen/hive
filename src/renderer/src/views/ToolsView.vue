<script setup>
// 工具页面组件，后续可以添加实际的工具功能
</script>

<template>
  <div class="tools-view">
    <div class="tools-container">
      <h2>工具页面</h2>
      <p>这里将展示各种实用工具，敬请期待...</p>
    </div>
  </div>
</template>

<style scoped>
.tools-view {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.tools-container {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>