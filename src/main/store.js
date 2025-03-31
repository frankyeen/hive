import { app, ipcMain } from 'electron'
import path from 'path'
import { is } from '@electron-toolkit/utils'
import { Conf } from 'electron-conf/main'

// 创建配置实例
const config = new Conf({
  // 配置文件路径
  dir: is.dev
    ? path.join('/Users/lvyilin/hive/configs')
    : path.join(app.getPath('userData'))
})

/**
 * 获取连接参数
 * @returns {Object} 连接参数对象
 */
export function getConnectionParams() {
  return {
    host: config.get('connection.host', ''),
    port: config.get('connection.port', ''),
    username: config.get('connection.username', ''),
    password: config.get('connection.password', '')
  }
}

/**
 * 保存连接参数
 * @param {Object} params 连接参数对象
 */
export function saveConnectionParams(params) {
  if (params.host) config.set('connection.host', params.host)
  if (params.port) config.set('connection.port', params.port)
  if (params.username) config.set('connection.username', params.username)
  if (params.password) config.set('connection.password', params.password)
}

/**
 * 获取SVN信息
 * @returns {Object} SVN信息对象
 */
export function getSvnInfo() {
  return {
    url: config.get('svn.url', ''),
    username: config.get('svn.username', ''),
    password: config.get('svn.password', '')
  }
}

/**
 * 保存SVN信息
 * @param {Object} info SVN信息对象
 */
export function saveSvnInfo(info) {
  if (info.url) config.set('svn.url', info.url)
  if (info.username) config.set('svn.username', info.username)
  if (info.password) config.set('svn.password', info.password)
}

/**
 * 注册存储相关的IPC事件处理程序
 */
export function registerStoreHandlers() {
  // 获取连接参数
  ipcMain.handle('get-connection-params', () => {
    return getConnectionParams()
  })

  // 保存连接参数
  ipcMain.handle('save-connection-params', (_, params) => {
    saveConnectionParams(params)
    return { success: true }
  })
  
  // 获取SVN信息
  ipcMain.handle('get-svn-info', () => {
    return getSvnInfo()
  })

  // 保存SVN信息
  ipcMain.handle('save-svn-info', (_, info) => {
    saveSvnInfo(info)
    return { success: true }
  })
}