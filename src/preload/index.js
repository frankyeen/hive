import { contextBridge, ipcRenderer } from 'electron'

// 安全地暴露主进程的API给渲染进程
contextBridge.exposeInMainWorld('api', {
  // 发送消息到主进程
  send: (channel, data) => {
    ipcRenderer.send(channel, data)
  },
  // 调用主进程方法并等待结果
  invoke: (channel, data) => {
    return ipcRenderer.invoke(channel, data)
  },
  // 监听主进程发送的消息
  on: (channel, callback) => {
    // 移除所有现有监听器，防止重复
    ipcRenderer.removeAllListeners(channel)
    // 添加新的监听器
    ipcRenderer.on(channel, (_, ...args) => callback(...args))
  },
  // 移除监听器
  removeListener: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})