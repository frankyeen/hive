import { app, dialog, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'

// 配置日志
autoUpdater.logger = require('electron-log')
autoUpdater.logger.transports.file.level = 'info'

// 禁用自动下载
autoUpdater.autoDownload = false

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
  dialog
    .showMessageBox({
      title: '安装更新',
      message: '更新下载完毕，应用将重启并安装'
    })
    .then(() => {
      // 退出并安装更新
      autoUpdater.quitAndInstall()
    })
})

// 导出检查更新函数
export function checkForUpdates() {
  autoUpdater.checkForUpdates()
}

// 应用启动时检查更新
export function setupAutoUpdater() {
  // 等待应用准备就绪
  app.whenReady().then(() => {
    // 延迟检查更新，确保应用已完全启动
    setTimeout(() => {
      autoUpdater.checkForUpdates()
    }, 3000)
  })
}
