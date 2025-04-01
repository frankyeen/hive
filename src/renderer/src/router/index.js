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
    },
    children: [
      {
        path: 'random-string',
        name: 'RandomStringGenerator',
        component: () => import('@renderer/views/tools/RandomStringGenerator.vue'),
        meta: {
          keepAlive: false
        }
      },
      {
        path: 'multicast-converter',
        name: 'MulticastConverter',
        component: () => import('@renderer/views/tools/MulticastConverter.vue'),
        meta: {
          keepAlive: false
        }
      }
      // 可以在这里添加更多工具子路由
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router