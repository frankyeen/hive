import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { Telnet } from 'telnet-client'
import { setupAutoUpdater, checkForUpdates } from './auto-updater'
import YAML from 'yaml'
import { readFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 600,
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

// 获取配置文件夹路径
const getConfigsDir = () => {
  // 在开发模式下使用自定义目录，生产环境使用userData目录
  if (is.dev) {
    return '/Users/lvyilin/hive/configs'
  } else {
    // 使用app.getPath('userData')获取应用数据目录，这是程序执行路径下的用户数据目录
    return path.join(app.getPath('userData'), 'configs')
  }
}

// 确保配置文件夹存在
const ensureConfigsDir = async () => {
  const configsDir = getConfigsDir()
  if (!existsSync(configsDir)) {
    try {
      await mkdir(configsDir, { recursive: true })
      console.log(`创建配置目录: ${configsDir}`)
      
      // 如果是新创建的目录，复制默认配置文件
      const defaultConfigPath = path.join(app.getAppPath(), '../configs/demo.yaml')
      if (existsSync(defaultConfigPath)) {
        const fs = require('fs')
        fs.copyFileSync(defaultConfigPath, path.join(configsDir, 'demo.yaml'))
        console.log('已复制默认配置文件')
      }
    } catch (error) {
      console.error('创建配置目录失败:', error)
    }
  }
  return configsDir
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 确保配置目录存在
  await ensureConfigsDir()

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

// 监听渲染进程发送的连接请求
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

// 监听渲染进程发送的命令请求
ipcMain.on('send-command', async (event, command) => {
  try {
    let response = await connection.exec(command)
    event.reply('data-receive', '\r\n' + response)
  } catch (error) {
    event.reply('data-receive', '\r\n' + error.message || '\r\n' + 'Command execution failed')
  }
})

// 当前选择的任务名称和路径
let currentTaskName = 'demo';
let currentTaskPath = '';

// 监听任务名称变更
ipcMain.on('task-name', (event, { name }) => {
  currentTaskName = name;
  event.reply('task-name', { name });
});

// 监听任务路径变更
ipcMain.on('task-path', (event, { path }) => {
  currentTaskPath = path;
  event.reply('task-path', { path });
});

ipcMain.on('task-start', async (event) => {
  try {
    const configsDir = getConfigsDir();
    const filePath = path.join(configsDir, `${currentTaskName}.yaml`);
    
    event.reply('data-receive', `开始执行任务: ${currentTaskName}`);
    event.reply('task-status', { status: '执行中' });
    
    const fileContent = await readFile(filePath, 'utf8');
    const data = YAML.parse(fileContent);
    
    // 执行前置命令
    if (data.setup && Array.isArray(data.setup)) {
      for (let eachCmd of data.setup) {
        let response = await connection.exec(eachCmd);
        event.reply('data-receive', eachCmd + '\r\n' + response);
      }
    }
    
    // 执行循环命令
    for (let i = 0; i < data.loop; i++) {
      event.reply('data-receive', `执行第 ${i+1}/${data.loop} 轮`);
      
      if (data.cmd && Array.isArray(data.cmd)) {
        for (let eachCmd of data.cmd) {
          let response = await connection.exec(eachCmd);
          event.reply('data-receive', eachCmd + '\r\n' + response);
          
          // 检查是否有意外情况
          if (data.unexpected && Array.isArray(data.unexpected)) {
            let unexpected = data.unexpected.find(element => response.includes(element));
            if (unexpected != undefined) {
              event.reply('data-receive', `检测到意外情况: ${unexpected}`);
              event.reply('task-output', { text: `检测到意外情况: ${unexpected}` });
              event.reply('task-status', { status: '已停止' });
              return;
            }
          }
        }
      }
    }

    // 执行后置命令
    if (data.teardown && Array.isArray(data.teardown)) {
      for (let eachCmd of data.teardown) {
        let response = await connection.exec(eachCmd);
        event.reply('data-receive', eachCmd + '\r\n' + response);
      }
    }

    event.reply('task-status', { status: '已完成' });
    event.reply('data-receive', `任务 ${currentTaskName} 执行完成`);
    
  } catch (error) {
    console.error('任务执行失败:', error.message);
    event.reply('data-receive', `任务执行失败: ${error.message}`);
    event.reply('task-output', { text: `任务执行失败: ${error.message}` });
    event.reply('task-status', { status: '已停止' });
  }
})

// 添加手动检查更新的IPC处理程序
ipcMain.on('check-for-updates', () => {
  checkForUpdates()
})

// 添加刷新任务列表的IPC处理程序
ipcMain.on('refresh-task-list', async (event) => {
  try {
    const fs = require('fs').promises
    const configsDir = getConfigsDir()
    
    const files = await fs.readdir(configsDir)
    const yamlFiles = files.filter(file => file.endsWith('.yaml'))
    const taskList = yamlFiles.map(file => ({ name: file.replace('.yaml', '') }))
    
    event.reply('task-list-refreshed', { success: true, tasks: taskList })
  } catch (error) {
    console.error('刷新任务列表失败:', error)
    event.reply('task-list-refreshed', { success: false, error: error.message })
  }
})

// 获取任务列表
ipcMain.handle('get-task-list', async () => {
  const fs = require('fs').promises
  const configsDir = getConfigsDir()
  
  try {
    const files = await fs.readdir(configsDir)
    const yamlFiles = files.filter(file => file.endsWith('.yaml'))
    return yamlFiles.map(file => ({ name: file.replace('.yaml', '') }))
  } catch (error) {
    console.error('读取任务列表失败:', error)
    return []
  }
})

// 保存任务
ipcMain.handle('save-task', async (_, { name, content }) => {
  const fs = require('fs').promises
  const configsDir = getConfigsDir()
  const filePath = path.join(configsDir, `${name}.yaml`)
  
  try {
    await fs.writeFile(filePath, content)
    return { success: true }
  } catch (error) {
    console.error('保存任务失败:', error)
    return { success: false, error: error.message }
  }
})

// 删除任务
ipcMain.handle('delete-task', async (_, name) => {
  const fs = require('fs').promises
  const configsDir = getConfigsDir()
  const filePath = path.join(configsDir, `${name}.yaml`)
  
  try {
    await fs.unlink(filePath)
    return { success: true }
  } catch (error) {
    console.error('删除任务失败:', error)
    return { success: false, error: error.message }
  }
})
