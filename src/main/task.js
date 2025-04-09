import YAML from 'yaml'
import { readFile } from 'fs/promises'
import path from 'path'
import pino from 'pino'
import pinoPretty from 'pino-pretty'
import { getConfigsDir, getLogsDir } from './config'
import { getTelnetConnection } from './telnet'
import { uploadLogToSvn } from './svn'
import { exec } from 'child_process'

// 任务相关变量
let currentTaskName = 'demo'
let currentTaskPath = ''
let autoUploadEnabled = false
let recordStatusEnabled = false
let svnInfo = null
let abortController = null

/**
 * 设置当前任务名称
 */
export function setTaskName(name) {
  currentTaskName = name
  return { name }
}

/**
 * 设置当前任务路径
 */
export function setTaskPath(taskPath) {
  currentTaskPath = taskPath
  return { path: taskPath }
}

/**
 * 执行命令并记录日志的辅助函数
 */
async function executeCommand(command, logger, event, timeout) {
  const connection = getTelnetConnection()
  if (!connection) {
    throw new Error('未连接到设备')
  }
  
  // 检测@sleep命令
  const sleepMatch = command.match(/^@sleep\s+(\d+)$/)
  
  if (sleepMatch) {
    const seconds = parseInt(sleepMatch[1], 10)
    logger.info(`等待 ${seconds} 秒`)
    event.reply('task-output', `@sleep ${seconds} 秒中...\r\n`)
    const startTime = Date.now()
    let remaining = seconds * 1000
    
    while (remaining > 0) {
      if (abortController?.signal.aborted) {
        event.reply('task-output', `等待已中断\r\n`)
        return ''
      }
      const waitTime = Math.min(100, remaining)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      remaining = seconds * 1000 - (Date.now() - startTime)
    }
    event.reply('task-output', `等待完成\r\n`)
    return ''
  }
  
  // 正常执行命令
  logger.info(`执行命令: ${command}`)
  const response = await connection.exec(command, {execTimeout: timeout * 1000})
  logger.info(`命令输出: \n${response.replace(/\r?\n/g, '\n')}`)
  event.reply('data-receive', command + '\r\n' + response)
  return response
}

/**
 * 开始执行任务
 */
export async function startTask(event, data) {
  // 保存自动上传设置和状态记录设置
  if (data && typeof data === 'object') {
    autoUploadEnabled = data.autoUpload || false
    recordStatusEnabled = data.recordStatus || false
    svnInfo = data.svnInfo ? JSON.parse(data.svnInfo) : null
  }
  let stream = null
  let logger = null
  let logFilePath = ''
  
  try {
    abortController = new AbortController()
    const configsDir = getConfigsDir()
    const filePath = path.join(configsDir, `${currentTaskName}.yaml`)
    
    // 创建日志文件名，格式：任务名-YYYY-MM-DD-HH-MM-SS.log
    const now = new Date()
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`
    const logFileName = `${currentTaskName}-${timestamp}.log`
    logFilePath = path.join(getLogsDir(), logFileName)
    
    // 创建pino日志记录器，使用pino-pretty实现流式输出
    const prettyOptions = {
      destination: logFilePath,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      colorize: false,
      singleLine: true,
      levelFirst: true,
      messageKey: 'msg'
    }
    
    // 创建pretty流并将其作为目标
    stream = pinoPretty(prettyOptions)
    logger = pino({ level: 'info' }, stream)
    
    // 记录任务开始信息
    const startMessage = `开始执行任务: ${currentTaskName}`
    logger.info(startMessage)
    event.reply('task-output', startMessage)
    event.reply('task-status', { status: '执行中' })
    
    // 读取任务配置文件
    const fileContent = await readFile(filePath, 'utf8')
    const data = YAML.parse(fileContent)
    logger.info(`任务配置: \n${JSON.stringify(data, null, 2)}`)
    
    // 如果启用了状态记录，记录任务开始状态
    if (recordStatusEnabled) {
      await executeCommand('show version', logger, event, data.cmd_timeout)
      await executeCommand('show cpu-usage', logger, event, data.cmd_timeout)
      await executeCommand('show memory', logger, event, data.cmd_timeout)
    }
    
    // 执行前置命令
    if (data.setup && Array.isArray(data.setup) && data.setup.length > 0) {
      logger.info('开始执行前置命令')
      event.reply('task-output', '开始执行前置命令')
      for (const eachCmd of data.setup) {
        await executeCommand(eachCmd, logger, event, data.cmd_timeout)
      }
    }
    
    // 执行循环命令
    for (let i = 0; i < data.loop; i++) {
      if (abortController.signal.aborted) {
        logger.info('任务已中止')
        return
      }
      const loopMessage = `执行第 ${i+1}/${data.loop} 轮`
      logger.info(loopMessage)
      event.reply('task-output', loopMessage)
      
      if (data.cmd && Array.isArray(data.cmd)) {
        for (const eachCmd of data.cmd) {
          const response = await executeCommand(eachCmd, logger, event, data.cmd_timeout)
          
          if (response == 'response not received') {
            const errorMessage = `检测到意外情况: response not received`
            logger.error(errorMessage)
            event.reply('task-output', errorMessage)
            event.reply('task-status', { status: '已停止' })
            logger.info('任务因意外情况停止')
            
            // 如果启用了自动上传，执行SVN上传
            if (autoUploadEnabled && svnInfo && logFilePath) {
              try {
                event.reply('task-output', '开始自动上传日志文件到SVN...')
                await uploadLogToSvn(logFilePath, svnInfo, logger, event)
              } catch (uploadError) {
                const errorMsg = `SVN上传失败: ${uploadError.message}`
                logger.error(errorMsg)
                event.reply('task-output', errorMsg)
              }
            }
            return
          }
          
          // 检查是否有意外情况
          if (data.unexpected && Array.isArray(data.unexpected)) {
            const unexpected = data.unexpected.find(element => response.includes(element))
            if (unexpected !== undefined) {
              const errorMessage = `检测到意外情况: ${unexpected}`
              logger.error(errorMessage)
              event.reply('task-output', errorMessage)
              event.reply('task-status', { status: '已停止' })
              logger.info('任务因意外情况停止')

              // 如果启用了自动上传，执行SVN上传
              if (autoUploadEnabled && svnInfo && logFilePath) {
                try {
                  event.reply('task-output', '开始自动上传日志文件到SVN...')
                  await uploadLogToSvn(logFilePath, svnInfo, logger, event)
                } catch (uploadError) {
                  const errorMsg = `SVN上传失败: ${uploadError.message}`
                  logger.error(errorMsg)
                  event.reply('task-output', errorMsg)
                }
              }
              return
            }
          }
        }
      }
    }

    // 执行后置命令
    if (data.teardown && Array.isArray(data.teardown) && data.teardown.length > 0) {
      logger.info('开始执行后置命令')
      event.reply('task-output', '开始执行后置命令')
      for (const eachCmd of data.teardown) {
        await executeCommand(eachCmd, logger, event, data.cmd_timeout)
      }
    }

    const completeMessage = `任务 ${currentTaskName} 执行完成`
    logger.info(completeMessage)
    event.reply('task-status', { status: '已完成' })
    event.reply('task-output', completeMessage)
    
    // 如果启用了状态记录，记录任务完成状态
    if (recordStatusEnabled) {
      await executeCommand('show version', logger, event, data.cmd_timeout)
      await executeCommand('show cpu-usage', logger, event, data.cmd_timeout)
      await executeCommand('show memory', logger, event, data.cmd_timeout)
    }

    // 如果启用了自动上传，执行SVN上传
    if (autoUploadEnabled && svnInfo && logFilePath) {
      try {
        event.reply('task-output', '开始自动上传日志文件到SVN...')
        await uploadLogToSvn(logFilePath, svnInfo, logger, event)
      } catch (uploadError) {
        const errorMsg = `SVN上传失败: ${uploadError.message}`
        logger.error(errorMsg)
        event.reply('task-output', errorMsg)
      }
    }
    
  } catch (error) {
    console.error(error)
    if (logger) {
      const errorMessage = `任务执行失败: ${error.message}`
      logger.error(errorMessage)
      logger.error(error)
      event.reply('task-output', errorMessage)
      event.reply('task-status', { status: '已停止' })
    } else {
      event.reply('task-output', `任务执行失败: ${error.message}`)
      event.reply('task-status', { status: '已停止' })
    }
  } finally {
    // 确保日志流被正确关闭
    if (stream) {
      // 使用setImmediate确保所有日志都被写入
      setImmediate(() => {
        stream.end()
        console.log(`日志文件已关闭: ${logFilePath}`)
      })
    }
  }
}

/**
 * 停止当前任务
 */
export function stopTask() {
  // 中止可能存在的控制器
  if (abortController) {
    abortController.abort()
  }
  
  return { status: '已停止' }
}

/**
 * 获取任务列表
 */
export async function getTaskList() {
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
}

/**
 * 保存任务
 */
export async function saveTask(name, content) {
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
}

/**
 * 删除任务
 */
export async function deleteTask(name) {
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
}

/**
 * 获取任务内容
 */
export async function getTaskContent(name) {
  const { promises: fsPromises } = require('fs')
  const configsDir = getConfigsDir()
  const filePath = path.join(configsDir, `${name}.yaml`)
  
  try {
    const content = await fsPromises.readFile(filePath, 'utf8')
    return { success: true, content }
  } catch (error) {
    console.error('读取任务内容失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 获取日志列表
 */
export async function getLogList() {
  const { promises: fsPromises } = require('fs')
  const logsDirPath = getLogsDir()
  
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
}

/**
 * 打开日志文件
 */
export async function openLogFile(filePath) {
  try {
    // 使用系统默认应用打开文件
    const { shell } = require('electron')
    await shell.openPath(filePath)
    return { success: true }
  } catch (error) {
    console.error('打开日志文件失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 注册任务相关的IPC事件处理函数
 */
export function registerTaskHandlers() {
  const { ipcMain } = require('electron')
  
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
  ipcMain.on('task-stop', (event, data) => {
    // 获取状态记录设置
    if (data && typeof data === 'object') {
      recordStatusEnabled = data.recordStatus || false;
    }
    
    const result = stopTask()
    event.reply('task-status', result)
    event.reply('task-output', '任务已手动停止')
    console.log('任务终止流程完成')
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
   * 获取任务内容
   */
  ipcMain.handle('get-task-content', async (_, name) => {
    return await getTaskContent(name)
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
}