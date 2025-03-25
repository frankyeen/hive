import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { Telnet } from 'telnet-client'
import { setupAutoUpdater, checkForUpdates } from './auto-updater'
import YAML from 'yaml'
import { readFile, mkdir } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import pino from 'pino'
import pinoPretty from 'pino-pretty'
import { exec } from 'child_process'
import { promisify } from 'util'

let abortController = null;

// 确保logs目录存在
const logsDir = () => {
  if (is.dev) {
    // 在开发模式下使用自定义目录，生产环境使用userData目录
    return '/Users/lvyilin/hive/logs'
  } else {
    // 使用app.getPath('userData')获取应用数据目录，这是程序执行路径下的用户数据目录
    return path.join(app.getPath('userData'), 'logs')
  }
}

if (!existsSync(logsDir())) {
  mkdirSync(logsDir(), { recursive: true })
}

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

// Telnet连接实例
let connection = null

/**
 * 监听渲染进程发送的连接请求
 */
ipcMain.on('connect', async (event, { host, port, username, password }) => {
  try {
    // 先发送连接中的状态
    event.reply('task-output', `正在连接到 ${host}:${port}...`)
    
    connection = new Telnet()
    
    // 使用await等待连接完成
    if (port >= 10000) {
      await connection.connect({
        host,
        port,
        shellPrompt: /#/,
        timeout: 5000,
        execTimeout: 5000,
        loginPrompt: null,
        passwordPrompt: null,
        username: null,
        password: null,
        initialLFCR: true,
        stripShellPrompt: false,
        pageSeparator: /--More--/,
        irs: '\n'
      })
    } else {
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
        irs: '\n'
      })
    }
    const response = await connection.exec(" ")
    // 连接成功后发送成功消息
    event.reply('data-receive', `\r\n${response}`)
    event.reply('task-output', `连接成功!`)
    // 向状态栏发送连接成功状态
    event.reply('status-change', { status: '已连接', ip: host })
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
    const response = await connection.exec(command)
    event.reply('data-receive', `\r\n${response}`)
  } catch (error) {
    if (error.name === 'AbortError') {
      event.reply('task-output', '命令执行已中止')
    } else {
      const errorMessage = error.message || '命令执行失败'
      event.reply('data-receive', `\r\n${errorMessage}`)
    }
  }
})

/**
 * 任务相关变量
 */
let currentTaskName = 'demo';
let currentTaskPath = '';
let autoUploadEnabled = false;
let svnInfo = null;

/**
 * 监听任务名称变更
 */
ipcMain.on('task-name', (event, { name }) => {
  currentTaskName = name;
  event.reply('task-name', { name });
});

/**
 * 监听任务路径变更
 */
ipcMain.on('task-path', (event, { path }) => {
  currentTaskPath = path;
  event.reply('task-path', { path });
});

// 执行命令并记录日志的辅助函数
async function executeCommand(command, logger, event) {
  // 检测@sleep命令
  const sleepMatch = command.match(/^@sleep\s+(\d+)$/);
  
  if (sleepMatch) {
    const seconds = parseInt(sleepMatch[1], 10);
    logger.info(`等待 ${seconds} 秒`);
    event.reply('task-output', `@sleep ${seconds} 秒中...\r\n`);
    const startTime = Date.now();
    let remaining = seconds * 1000;
    
    while (remaining > 0) {
      if (abortController?.signal.aborted) {
        event.reply('task-output', `等待已中断\r\n`);
        return '';
      }
      const waitTime = Math.min(100, remaining);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      remaining = seconds * 1000 - (Date.now() - startTime);
    }
    event.reply('task-output', `等待完成\r\n`);
    return '';
  }
  
  // 正常执行命令
  logger.info(`执行命令: ${command}`);
  const response = await connection.exec(command);
  logger.info(`命令输出: \n${response.replace(/\r?\n/g, '\n')}`);
  event.reply('data-receive', command + '\r\n' + response);
  return response;
}

ipcMain.on('task-start', async (event, data) => {
  // 保存自动上传设置
  if (data && typeof data === 'object') {
    autoUploadEnabled = data.autoUpload || false;
    svnInfo = data.svnInfo || null;
  }
  let stream = null;
  let logger = null;
  let logFilePath = '';
  
  try {
    abortController = new AbortController();
    const configsDir = getConfigsDir();
    const filePath = path.join(configsDir, `${currentTaskName}.yaml`);
    
    // 创建日志文件名，格式：任务名-YYYY-MM-DD-HH-MM-SS.log
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    const logFileName = `${currentTaskName}-${timestamp}.log`;
    logFilePath = path.join(logsDir(), logFileName);
    
    // 创建pino日志记录器，使用pino-pretty实现流式输出
    const prettyOptions = {
      destination: logFilePath,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      colorize: false,
      singleLine: true,
      levelFirst: true,
      messageKey: 'msg'
    };
    
    // 创建pretty流并将其作为目标
    stream = pinoPretty(prettyOptions);
    logger = pino({ level: 'info' }, stream);
    
    // 记录任务开始信息
    const startMessage = `开始执行任务: ${currentTaskName}`;
    logger.info(startMessage);
    event.reply('task-output', startMessage);
    event.reply('task-status', { status: '执行中' });
    
    const fileContent = await readFile(filePath, 'utf8');
    const data = YAML.parse(fileContent);
    logger.info(`任务配置: \n${JSON.stringify(data, null, 2)}`);
    
    // 执行前置命令
    if (data.setup && Array.isArray(data.setup) && data.setup.length > 0) {
      logger.info('开始执行前置命令');
      event.reply('task-output', '开始执行前置命令');
      for (const eachCmd of data.setup) {
        await executeCommand(eachCmd, logger, event);
      }
    }
    
    // 执行循环命令
    for (let i = 0; i < data.loop; i++) {
      if (abortController.signal.aborted) {
        logger.info('任务已中止');
        return;
      }
      const loopMessage = `执行第 ${i+1}/${data.loop} 轮`;
      logger.info(loopMessage);
      event.reply('task-output', loopMessage);
      
      if (data.cmd && Array.isArray(data.cmd)) {
        for (const eachCmd of data.cmd) {
          const response = await executeCommand(eachCmd, logger, event);
          
          // 检查是否有意外情况
          if (data.unexpected && Array.isArray(data.unexpected)) {
            const unexpected = data.unexpected.find(element => response.includes(element));
            if (unexpected !== undefined) {
              const errorMessage = `检测到意外情况: ${unexpected}`;
              logger.error(errorMessage);
              event.reply('task-output', errorMessage);
              event.reply('task-status', { status: '已停止' });
              logger.info('任务因意外情况停止');
              return;
            }
          }
        }
      }
    }

    // 执行后置命令
    if (data.teardown && Array.isArray(data.teardown) && data.teardown.length > 0) {
      logger.info('开始执行后置命令');
      event.reply('task-output', '开始执行后置命令');
      for (const eachCmd of data.teardown) {
        await executeCommand(eachCmd, logger, event);
      }
    }

    const completeMessage = `任务 ${currentTaskName} 执行完成`;
    logger.info(completeMessage);
    event.reply('task-status', { status: '已完成' });
    event.reply('task-output', completeMessage);
    
    // 如果启用了自动上传，执行SVN上传
    if (autoUploadEnabled && svnInfo && logFilePath) {
      try {
        event.reply('task-output', '开始自动上传日志文件到SVN...');
        await uploadLogToSvn(logFilePath, svnInfo, logger, event);
      } catch (uploadError) {
        const errorMsg = `SVN上传失败: ${uploadError.message}`;
        logger.error(errorMsg);
        event.reply('task-output', errorMsg);
      }
    }
    
  } catch (error) {
    console.error(error);
    if (logger) {
      const errorMessage = `任务执行失败: ${error.message}`;
      logger.error(errorMessage);
      logger.error(error);
      event.reply('task-output', errorMessage);
      event.reply('task-status', { status: '已停止' });
    } else {
      event.reply('task-output', `任务执行失败: ${error.message}`);
      event.reply('task-status', { status: '已停止' });
    }
  } finally {
    // 确保日志流被正确关闭
    if (stream) {
      // 使用setImmediate确保所有日志都被写入
      setImmediate(() => {
        stream.end();
        console.log(`日志文件已关闭: ${logFilePath}`);
      });
    }
  }
})

/**
 * 监听任务停止
 */
ipcMain.on('task-stop', (event) => {
  // 无论是否有控制器都尝试终止连接
  // 保留现有连接不关闭
  if (connection) {
    console.log('保持网络连接存活');
  }

  // 中止可能存在的控制器
  if (abortController) {
    abortController.abort();
  }

  event.reply('task-status', { status: '已停止' });
  event.reply('task-output', '任务已手动停止');
  console.log('任务终止流程完成');
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
    const { promises: fsPromises } = require('fs')
    const configsDir = getConfigsDir()
    
    const files = await fsPromises.readdir(configsDir)
    const yamlFiles = files.filter(file => file.endsWith('.yaml'))
    const taskList = yamlFiles.map(file => ({ name: file.replace('.yaml', '') }))
    
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
  const { promises: fsPromises } = require('fs')
  const configsDir = getConfigsDir()
  
  try {
    const files = await fsPromises.readdir(configsDir)
    const yamlFiles = files.filter(file => file.endsWith('.yaml'))
    return yamlFiles.map(file => ({ name: file.replace('.yaml', '') }))
  } catch (error) {
    console.error('读取任务列表失败:', error)
    return []
  }
})

/**
 * 保存任务
 */
ipcMain.handle('save-task', async (_, { name, content }) => {
  const { promises: fsPromises } = require('fs')
  const configsDir = getConfigsDir()
  const filePath = path.join(configsDir, `${name}.yaml`)
  
  try {
    await fsPromises.writeFile(filePath, content)
    return { success: true }
  } catch (error) {
    console.error('保存任务失败:', error)
    return { success: false, error: error.message }
  }
})

/**
 * 删除任务
 */
ipcMain.handle('delete-task', async (_, name) => {
  const { promises: fsPromises } = require('fs')
  const configsDir = getConfigsDir()
  const filePath = path.join(configsDir, `${name}.yaml`)
  
  try {
    await fsPromises.unlink(filePath)
    return { success: true }
  } catch (error) {
    console.error('删除任务失败:', error)
    return { success: false, error: error.message }
  }
})

/**
 * 获取日志列表
 */
ipcMain.handle('get-log-list', async () => {
  const { promises: fsPromises } = require('fs')
  const logsDirPath = logsDir()
  
  try {
    const files = await fsPromises.readdir(logsDirPath)
    const logFiles = files.filter(file => file.endsWith('.log'))
    
    // 获取文件信息，包括创建时间
    const logInfoPromises = logFiles.map(async (file) => {
      const filePath = path.join(logsDirPath, file)
      const stats = await fsPromises.stat(filePath)
      
      // 从文件名中提取任务名和时间戳
      const nameParts = file.split('-')
      const taskName = nameParts[0]
      
      // 格式化时间
      const createTime = new Date(stats.birthtime)
      const timeStr = `${createTime.getFullYear()}-${String(createTime.getMonth() + 1).padStart(2, '0')}-${String(createTime.getDate()).padStart(2, '0')} ${String(createTime.getHours()).padStart(2, '0')}:${String(createTime.getMinutes()).padStart(2, '0')}:${String(createTime.getSeconds()).padStart(2, '0')}`
      
      return {
        name: `${taskName} (${timeStr})`,
        path: filePath,
        time: timeStr,
        size: stats.size
      }
    })
    
    const logInfos = await Promise.all(logInfoPromises)
    
    // 按时间倒序排列，最新的日志在前面
    return logInfos.sort((a, b) => new Date(b.time) - new Date(a.time))
  } catch (error) {
    console.error('读取日志列表失败:', error)
    return []
  }
})

/**
 * 打开日志文件
 */
ipcMain.handle('open-log-file', async (_, filePath) => {
  try {
    // 使用系统默认应用打开文件
    await shell.openPath(filePath)
    return { success: true }
  } catch (error) {
    console.error('打开日志文件失败:', error)
    return { success: false, error: error.message }
  }
})

/**
 * 上传日志文件到SVN
 */
async function uploadLogToSvn(logFilePath, svnInfo, logger, event) {
  const execPromise = promisify(exec);
  const { url, username, password } = svnInfo;
  const logFileName = path.basename(logFilePath);

  if (!url || !username || !password) {
    throw new Error('SVN信息不完整');
  }

  try {
    // 验证SVN路径格式
    if (!url.startsWith('http')) {
      throw new Error('SVN路径必须使用HTTP协议');
    }

    // 自动创建父目录
    const parentDir = path.dirname(url);
    const mkdirCmd = `svn mkdir ${parentDir} --parents -m "自动创建目录" --username ${username} --password ${password} --non-interactive --trust-server-cert`;
    await execPromise(mkdirCmd);

    // 直接使用import命令上传文件
    const importCmd = `svn import ${logFilePath} ${url}/${logFileName} -m "自动上传日志文件" --username ${username} --password ${password} --non-interactive --trust-server-cert`;
    
    logger.info('开始直接上传日志文件到SVN');
    event.reply('task-output', '正在直接上传文件到SVN...');
    
    const { stdout } = await execPromise(importCmd);
    
    logger.info(`SVN上传成功: ${stdout}`);
    event.reply('task-output', `文件上传成功: ${stdout}`);
    
    return { success: true };
  } catch (error) {
    logger.error(`SVN上传失败: ${error.message}`);
    if (error.stderr) {
      logger.error(`错误详情: ${error.stderr}`);
    }
    throw error;
  }
}
