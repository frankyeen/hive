import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/terminal'
  },
  {
    path: '/terminal',
    name: 'Terminal',
    component: () => import('@renderer/views/TerminalView.vue'),
    meta: {
      keepAlive: true // 标记该路由需要被缓存
    }
  },
  {
    path: '/tools',
    name: 'Tools',
    component: () => import('@renderer/views/ToolsView.vue'),
    meta: {
      keepAlive: false // 该路由不需要被缓存
    }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router