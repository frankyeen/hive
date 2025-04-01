import { app } from 'electron'
import path from 'path'
import { is } from '@electron-toolkit/utils'
import { existsSync, mkdirSync } from 'fs'
import { mkdir } from 'fs/promises'

/**
 * 获取配置文件夹路径
 */
export const getConfigsDir = () => {
  // 在开发模式下使用自定义目录，生产环境使用userData目录
  if (is.dev) {
    return '/Users/lvyilin/hive/configs'
  } else {
    // 使用app.getPath('userData')获取应用数据目录，这是程序执行路径下的用户数据目录
    return path.join(app.getPath('userData'), 'configs')
  }
}

/**
 * 获取日志文件夹路径
 */
export const getLogsDir = () => {
  if (is.dev) {
    // 在开发模式下使用自定义目录，生产环境使用userData目录
    return '/Users/lvyilin/hive/logs'
  } else {
    // 使用app.getPath('userData')获取应用数据目录，这是程序执行路径下的用户数据目录
    return path.join(app.getPath('userData'), 'logs')
  }
}

/**
 * 确保配置文件夹存在
 */
export const ensureConfigsDir = async () => {
  const configsDir = path.join(app.getPath('userData'), 'logs')
  if (!existsSync(configsDir)) {
    try {
      await mkdir(configsDir, { recursive: true })
      console.log(`创建配置目录: ${configsDir}`)
    } catch (error) {
      console.error('创建配置目录失败:', error)
    }
  }
  return configsDir
}

/**
 * 确保日志目录存在
 */
export const ensureLogsDir = async () => {
  const logsDirPath = getLogsDir()
  if (!existsSync(logsDirPath)) {
    try {
      await mkdir(logsDirPath, { recursive: true })
      console.log(`创建日志目录: ${logsDirPath}`)
    } catch (error) {
      console.error('创建日志目录失败:', error)
    }
  }
  return logsDirPath
}

/**
 * 注册配置相关的IPC事件处理函数
 */
export function registerConfigHandlers() {
  const { ipcMain, shell } = require('electron')
  
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
    shell.openPath(getLogsDir())
  })
}