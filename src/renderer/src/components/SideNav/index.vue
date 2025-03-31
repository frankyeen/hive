<script setup>
import { ref, onMounted, watch, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { TerminalIcon, ToolsIcon } from 'tdesign-icons-vue-next'

const router = useRouter()
const route = useRoute()
const activeMenu = ref('')

// 根据当前路由路径设置活动菜单
const updateActiveMenu = () => {
  const path = route.path.split('/')[1] || 'terminal'
  activeMenu.value = path
}

// 组件挂载时初始化活动菜单
onMounted(() => {
  updateActiveMenu()
})

// 监听路由变化
watch(() => route.path, () => {
  updateActiveMenu()
})

const handleMenuChange = (value) => {
  activeMenu.value = value
  router.push(`/${value}`)
}
</script>

<template>
  <div class="side-nav">
    <t-menu
      theme="light"
      :value="activeMenu"
      @change="handleMenuChange"
      width="64px"
      :collapsed="true"
    >
      <t-menu-item value="terminal" :icon="() => h(TerminalIcon)">
        <span>终端</span>
      </t-menu-item>
      <t-menu-item value="tools" :icon="() => h(ToolsIcon)">
        <span>工具</span>
      </t-menu-item>
    </t-menu>
  </div>
</template>

<style scoped>
.side-nav {
  height: 100%;
  border-right: 1px solid #e7e7e7;
}

:deep(.t-menu__item) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 64px;
}

:deep(.t-menu__item .t-icon) {
  font-size: 20px;
}

:deep(.t-menu__item span) {
  margin-top: 4px;
  font-size: 12px;
}
</style>