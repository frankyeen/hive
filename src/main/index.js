import { app, BrowserWindow } from 'electron'
import { electronApp } from '@electron-toolkit/utils'
import { setupAutoUpdater, registerAutoUpdaterHandlers } from './auto-updater'
import { createWindow, setupWindowShortcuts } from './window'
import { ensureConfigsDir, ensureLogsDir, registerConfigHandlers } from './config'
import { registerTelnetHandlers } from './telnet'
import { registerTaskHandlers } from './task'
import { registerStoreHandlers } from './store'

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  // 设置窗口快捷键
  setupWindowShortcuts(app)

  // 确保配置目录存在
  ensureLogsDir()
  ensureConfigsDir()

  // 创建主窗口
  createWindow()

  // 设置自动更新
  setupAutoUpdater()
  
  // 注册各模块的IPC事件处理程序
  registerTelnetHandlers()
  registerTaskHandlers()
  registerAutoUpdaterHandlers()
  registerConfigHandlers()
  registerStoreHandlers()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})