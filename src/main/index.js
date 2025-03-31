import { app, shell, ipcMain, BrowserWindow } from 'electron'
import { electronApp } from '@electron-toolkit/utils'
import { setupAutoUpdater, checkForUpdates } from './auto-updater'
import { createWindow, setupWindowShortcuts } from './window'
import { ensureConfigsDir, ensureLogsDir, getConfigsDir, logsDir } from './config'
import { createTelnetConnection, executeTelnetCommand } from './telnet'
import { 
  startTask, 
  stopTask, 
  setTaskName, 
  setTaskPath, 
  getTaskList, 
  saveTask, 
  deleteTask, 
  getLogList, 
  openLogFile 
} from './task'

// 确保日志目录存在
ensureLogsDir()

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  // 设置窗口快捷键
  setupWindowShortcuts(app)

  // 确保配置目录存在
  await ensureConfigsDir()

  // 创建主窗口
  createWindow()

  // 设置自动更新
  setupAutoUpdater()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * 监听渲染进程发送的连接请求
 */
ipcMain.on('connect', async (event, { host, port, username, password }) => {
  try {
    // 先发送连接中的状态
    event.reply('task-output', `正在连接到 ${host}:${port}...`)
    
    const result = await createTelnetConnection(host, port, username, password)
    
    if (result.success) {
      // 连接成功后发送成功消息
      event.reply('data-receive', `\r\n${result.response}`)
      event.reply('task-output', `连接成功!`)
      // 向状态栏发送连接成功状态
      event.reply('status-change', { status: '已连接', ip: host, port: port })
    } else {
      // 连接失败时发送错误消息
      event.reply('task-output', `Connection failed: ${result.error.message}`)
      // 向状态栏发送连接失败状态
      event.reply('status-change', { status: '未连接', error: result.error.message })
    }
  } catch (error) {
    console.error('Connection error:', error)
    // 连接失败时发送错误消息
    event.reply('task-output', `Connection failed: ${error.message}`)
    // 向状态栏发送连接失败状态
    event.reply('status-change', { status: '未连接', error: error.message })
  }
})

/**
 * 监听渲染进程发送的命令请求
 */
ipcMain.on('send-command', async (event, command) => {
  try {
    const result = await executeTelnetCommand(command)
    if (result.success) {
      event.reply('data-receive', `\r\n${result.response}`)
    } else {
      const errorMessage = result.error.message || '命令执行失败'
      event.reply('data-receive', `\r\n${errorMessage}`)
    }
  } catch (error) {
    const errorMessage = error.message || '命令执行失败'
    event.reply('data-receive', `\r\n${errorMessage}`)
  }
})

/**
 * 监听任务名称变更
 */
ipcMain.on('task-name', (event, { name }) => {
  const result = setTaskName(name)
  event.reply('task-name', result)
})

/**
 * 监听任务路径变更
 */
ipcMain.on('task-path', (event, { path }) => {
  const result = setTaskPath(path)
  event.reply('task-path', result)
})

/**
 * 监听任务开始
 */
ipcMain.on('task-start', async (event, data) => {
  await startTask(event, data)
})

/**
 * 监听任务停止
 */
ipcMain.on('task-stop', (event) => {
  const result = stopTask()
  event.reply('task-status', result)
  event.reply('task-output', '任务已手动停止')
  console.log('任务终止流程完成')
})

/**
 * 手动检查更新的IPC处理程序
 */
ipcMain.on('check-for-updates', () => {
  checkForUpdates()
})

/**
 * 刷新任务列表的IPC处理程序
 */
ipcMain.on('refresh-task-list', async (event) => {
  try {
    const taskList = await getTaskList()
    event.reply('task-list-refreshed', { success: true, tasks: taskList })
  } catch (error) {
    console.error('刷新任务列表失败:', error)
    event.reply('task-list-refreshed', { success: false, error: error.message })
  }
})

/**
 * 获取任务列表
 */
ipcMain.handle('get-task-list', async () => {
  return await getTaskList()
})

/**
 * 保存任务
 */
ipcMain.handle('save-task', async (_, { name, content }) => {
  return await saveTask(name, content)
})

/**
 * 删除任务
 */
ipcMain.handle('delete-task', async (_, name) => {
  return await deleteTask(name)
})

/**
 * 获取日志列表
 */
ipcMain.handle('get-log-list', async () => {
  return await getLogList()
})

/**
 * 打开日志文件
 */
ipcMain.handle('open-log-file', async (_, filePath) => {
  return await openLogFile(filePath)
})

/**
 * 打开配置目录
 */
ipcMain.on('open-config-dir', () => {
  shell.openPath(getConfigsDir())
})

/**
 * 打开日志目录
 */
ipcMain.on('open-logs-dir', () => {
  shell.openPath(logsDir())
})