<script setup>
import Terminal from '@renderer/components/Terminal/index.vue'
import TaskExecutor from '@renderer/components/TaskExecutor/index.vue'
import LogViewer from '@renderer/components/LogViewer/index.vue'
import TopNavBar from '@renderer/components/TopNavBar/index.vue'
</script>

<template>
  <div class="terminal-view">
    <TopNavBar />
    <div class="content-container">
      <div class="left-panel">
        <Terminal class="terminal-component" />
        <TaskExecutor class="task-executor-component" />
      </div>
      <LogViewer class="right-panel" />
    </div>
  </div>
</template>

<style scoped>
.terminal-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  height: 100%;
  box-sizing: border-box;
  padding: 0 8px;
}

.content-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 16px; /* 增加组件之间的间距 */
  margin-bottom: 8px; /* 底部添加间距 */
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0; /* 确保flex子项可以正确缩小 */
}

.terminal-component {
  flex: 3; /* 终端组件占据更多空间 */
  margin-bottom: 12px; /* 与下方组件的间距 */
}

.task-executor-component {
  flex: 2; /* 任务执行器组件占据较少空间 */
}

.right-panel {
  /* LogViewer组件已有自己的宽度设置(250px) */
  height: 100%;
  display: flex;
  flex-shrink: 0; /* 防止右侧面板被压缩 */
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.05); /* 添加轻微阴影分隔左右面板 */
  border-radius: 8px; /* 增加圆角效果 */
  overflow: hidden; /* 确保内容不超出圆角边界 */
}
</style>