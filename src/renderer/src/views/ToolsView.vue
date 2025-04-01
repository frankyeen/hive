<script setup>
import { useRouter } from 'vue-router'
import { CodeIcon, TransformIcon } from 'tdesign-icons-vue-next'

const router = useRouter()

// 工具列表
const tools = [
  {
    id: 'random-string',
    name: '随机字符串生成器',
    description: '根据指定字符集，生成自定义长度随机字符串',
    icon: CodeIcon
  },
  {
    id: 'multicast-converter',
    name: '组播地址转换',
    description: '将IPv4组播地址转换为对应的MAC地址',
    icon: TransformIcon
  }
  // 可以在这里添加更多工具
]

// 导航到具体工具页面
const navigateToTool = (toolId) => {
  router.push(`/tools/${toolId}`)
}
</script>

<template>
  <div class="tools-view">
    <!-- 当路径是/tools时显示工具列表，否则显示子路由 -->
    <div v-if="$route.path === '/tools'" class="tools-container">
      <h2 class="tools-title">工具列表</h2>
      
      <div class="tools-grid">
        <!-- 工具卡片列表 -->
        <t-card 
          v-for="tool in tools" 
          :key="tool.id"
          class="tool-card"
          hover
          @click="navigateToTool(tool.id)"
        >
          <template #header>
            <div class="tool-header">
              <div class="tool-icon">
                <component :is="tool.icon" />
              </div>
              <div class="tool-title">{{ tool.name }}</div>
            </div>
          </template>
          
          <div class="tool-description">
            {{ tool.description }}
          </div>
        </t-card>
      </div>
    </div>
      <!-- 子路由出口 -->
    <router-view v-if="$route.path.startsWith('/tools/') && $route.path !== '/tools'" class="tool-content-view" />
  </div>
</template>

<style scoped>
.tools-view {
  display: flex;
  flex: 1;
  overflow: auto;
}

.tools-container {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.tool-content-view {
  flex: 1;
  display: flex;
  overflow: auto;
}

.tools-title {
  margin-bottom: 20px;
  text-align: left;
  font-size: 24px;
  padding-left: 10px;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.tool-card {
  height: 100%;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.tool-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.tool-header {
  display: flex;
  align-items: center;
  padding: 10px 0;
}

.tool-icon {
  font-size: 30px;
  margin-right: 10px;
}

.tool-title {
  font-size: 16px;
  font-weight: 500;
}

.tool-description {
  margin: 10px 0;
  color: #aaaaaa;
  min-height: 40px;
  font-size: 14px;
}
</style>