import { app, ipcMain, shell } from 'electron'
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
export const logsDir = () => {
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

/**
 * 确保日志目录存在
 */
export const ensureLogsDir = () => {
  const logsDirPath = logsDir()
  if (!existsSync(logsDirPath)) {
    mkdirSync(logsDirPath, { recursive: true })
  }
  return logsDirPath
}

/**
 * 注册配置相关的IPC事件处理程序
 */
export function registerConfigHandlers() {
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
}