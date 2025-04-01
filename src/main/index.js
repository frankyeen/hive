import { app, BrowserWindow } from 'electron'
import { electronApp } from '@electron-toolkit/utils'
import { setupAutoUpdater, registerUpdateHandlers } from './auto-updater'
import { createWindow, setupWindowShortcuts } from './window'
import { ensureConfigsDir, ensureLogsDir, registerConfigHandlers } from './config'
import { registerTelnetHandlers } from './telnet'
import { registerTaskHandlers } from './task'
import { Conf, useConf } from 'electron-conf/main'

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  // 设置窗口快捷键
  setupWindowShortcuts(app)

  // 确保配置目录、日志目录存在
  await ensureLogsDir()
  await ensureConfigsDir()

  // 创建主窗口
  createWindow()

  // 设置自动更新
  setupAutoUpdater()
  
  // 注册各模块的IPC事件处理函数
  registerTelnetHandlers()
  registerTaskHandlers()
  registerConfigHandlers()
  registerUpdateHandlers()

  // conf
  const conf = new Conf()
  conf.registerRendererListener()
  useConf()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})