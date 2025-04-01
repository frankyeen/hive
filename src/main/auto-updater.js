import { app, dialog, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'

// 配置日志
autoUpdater.logger = require('electron-log')
autoUpdater.logger.transports.file.level = 'info'

// 禁用自动下载
autoUpdater.autoDownload = false

// 确保更新在当前安装路径下进行
autoUpdater.forceDevUpdateConfig = false
autoUpdater.allowDowngrade = false
autoUpdater.currentAppPath = app.getPath('exe')

// 检查更新错误处理
autoUpdater.on('error', (error) => {
  dialog.showErrorBox('更新错误', error.message)
})

// 检查到新版本
autoUpdater.on('update-available', (info) => {
  dialog
    .showMessageBox({
      type: 'info',
      title: '发现新版本',
      message: `发现新版本: ${info.version}`,
      detail: '是否现在下载更新？',
      buttons: ['是', '否'],
      cancelId: 1
    })
    .then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate()
      }
    })
})

// 没有新版本
autoUpdater.on('update-not-available', () => {
  dialog.showMessageBox({
    title: '没有更新',
    message: '当前已经是最新版本'
  })
})

// 更新下载进度
autoUpdater.on('download-progress', (progressObj) => {
  let logMessage = `下载速度: ${progressObj.bytesPerSecond}`
  logMessage = `${logMessage} - 已下载 ${progressObj.percent}%`
  logMessage = `${logMessage} (${progressObj.transferred}/${progressObj.total})`
  console.log(logMessage)
  
  // 向渲染进程发送下载进度信息
  const mainWindow = BrowserWindow.getFocusedWindow()
  if (mainWindow) {
    mainWindow.webContents.send('update-download-progress', {
      percent: progressObj.percent,
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total
    })
  }
})

// 更新下载完成
autoUpdater.on('update-downloaded', () => {
  // 记录当前安装路径
  console.log(`当前应用路径: ${app.getPath('exe')}`)
  autoUpdater.logger.info(`当前应用路径: ${app.getPath('exe')}`)
  
  dialog
    .showMessageBox({
      title: '安装更新',
      message: '更新下载完毕，应用将重启并安装',
      detail: '更新将在当前安装路径下进行'
    })
    .then(() => {
      // 退出并安装更新
      autoUpdater.quitAndInstall(false, true) // 第二个参数为true表示强制重启应用
    })
})

// 导出检查更新函数
export function checkForUpdates(customServerUrl = '') {
  // 记录当前应用路径信息
  const appPath = app.getPath('exe')
  const appDir = path.dirname(appPath)
  
  console.log(`检查更新 - 当前应用路径: ${appPath}`)
  console.log(`检查更新 - 当前应用目录: ${appDir}`)
  autoUpdater.logger.info(`检查更新 - 当前应用路径: ${appPath}`)
  autoUpdater.logger.info(`检查更新 - 当前应用目录: ${appDir}`)
  
  // 确保更新在当前安装路径下进行
  autoUpdater.currentAppPath = appPath
  
  // 如果提供了自定义服务器地址，则设置更新服务器URL
  if (customServerUrl && customServerUrl.trim() !== '') {
    // 使用自定义服务器URL
    const urlOptions = {
      provider: 'generic',
      url: customServerUrl
    }
    autoUpdater.setFeedURL(urlOptions)
  } else {
    // 使用默认配置（从electron-builder.yml读取）
    // electron-updater会自动使用默认配置，无需显式重置
  }
  
  autoUpdater.checkForUpdates()
}

// 应用启动时检查更新
export function setupAutoUpdater() {
  // 等待应用准备就绪
  app.whenReady().then(() => {
    // 禁用自动更新检查
    // setTimeout(() => {
    //   autoUpdater.checkForUpdates()
    // }, 3000)
  })
}

/**
 * 注册自动更新相关的IPC事件处理函数
 */
export function registerUpdateHandlers() {
  const { ipcMain } = require('electron')
  
  /**
   * 手动检查更新的IPC处理程序
   * @param {Event} event - 事件对象
   * @param {string} customServerUrl - 自定义更新服务器地址
   */
  ipcMain.on('check-for-updates', (event, customServerUrl) => {
    checkForUpdates(customServerUrl)
  })
}
