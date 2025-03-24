import { contextBridge, ipcRenderer } from 'electron'

// 安全地暴露主进程的API给渲染进程
contextBridge.exposeInMainWorld('api', {
  // 发送消息到主进程
  send: (channel, data) => {
    // 白名单通道
    const validChannels = ['connect', 'send-command', 'task-start', 'task-stop', 'task-path', 'task-name']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  // 调用主进程方法并等待结果
  invoke: (channel, data) => {
    // 白名单通道
    const validChannels = ['get-task-list', 'save-task', 'delete-task']
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data)
    }
    return Promise.reject(new Error('Invalid channel'))
  },
  // 监听主进程发送的消息
  on: (channel, callback) => {
    // 白名单通道
    const validChannels = ['data-receive', 'status-change', 'update-download-progress', 'task-output', 'task-status', 'task-path', 'task-name']
    if (validChannels.includes(channel)) {
      // 移除所有现有监听器，防止重复
      ipcRenderer.removeAllListeners(channel)
      // 添加新的监听器
      ipcRenderer.on(channel, (_, ...args) => callback(...args))
    }
  },
  // 移除监听器
  removeListener: (channel) => {
    const validChannels = ['data-receive', 'task-status', 'task-output', 'task-name', 'task-path']
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel)
    }
  }
})

// 在预加载脚本中添加全局变量，使其在渲染进程中可用
contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, data) => {
    return ipcRenderer.invoke(channel, data)
  },
  // 添加检查更新方法
  checkForUpdates: () => {
    ipcRenderer.send('check-for-updates')
  }
})