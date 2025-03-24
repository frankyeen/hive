import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { Telnet } from 'telnet-client'
import { setupAutoUpdater, checkForUpdates } from './auto-updater'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 650,
    minWidth: 800,
    minHeight: 500,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    // webPreferences: {
    //   nodeIntegration: true,
    //   contextIsolation: false,
    //   webSecurity: false
    // }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

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

//
let connection = null

ipcMain.on('connect', async (event, { host, port, username, password }) => {
  try {
    // 先发送连接中的状态
    event.reply('data-receive', '正在连接到 ' + host + ':' + port + '...')
    
    connection = new Telnet()
    
    // 使用await等待连接完成
    await connection.connect({
      host,
      port,
      shellPrompt: /#/,
      timeout: 5000,
      execTimeout: 5000,
      loginPrompt: /Username:/i,
      passwordPrompt: /Password:/i,
      username,
      password,
      initialLFCR: false,
      stripShellPrompt: false,
      pageSeparator: /--More--/,
      irs: '\n',
    })
    let response = await connection.exec(" ")
    // 连接成功后发送成功消息
    event.reply('data-receive', '连接成功!\r\n' + response)
    // 向状态栏发送连接成功状态
    event.reply('status-change', { status: '已连接', ip: host })
  } catch (error) {
    console.error('Connection error:', error)
    // 连接失败时发送错误消息
    event.reply('data-receive', 'Connection failed: ' + error.message)
    // 向状态栏发送连接失败状态
    event.reply('status-change', { status: '未连接', error: error.message })
  }
})

ipcMain.on('send-command', async (event, command) => {
  try {
    let response = await connection.exec(command)
    // console.log('Response:', response)
    event.reply('data-receive', '\r\n' + response)
  } catch (error) {
    // console.error('Command execution error:', error)
    event.reply('data-receive', '\r\n' + error.message || '\r\n' + 'Command execution failed')
  }
})

// 添加手动检查更新的IPC处理程序
ipcMain.on('check-for-updates', () => {
  checkForUpdates()
})
