import { Telnet } from 'telnet-client'
import { ipcMain } from 'electron'

// Telnet连接实例
let connection = null

/**
 * 创建Telnet连接
 */
export async function createTelnetConnection(host, port, username, password) {
  try {
    connection = new Telnet()
    
    // 根据端口号使用不同的连接参数
    if (port >= 10000) {
      await connection.connect({
        host,
        port,
        shellPrompt: "#|\(Y/N\)|>",
        timeout: 10000,
        execTimeout: 10000,
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
        shellPrompt: "#|\(Y/N\)|>",
        timeout: 10000,
        execTimeout: 10000,
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
    
    // 返回初始响应
    const response = await connection.exec(" ")
    return { success: true, response }
  } catch (error) {
    console.error('Connection error:', error)
    return { success: false, error }
  }
}

/**
 * 执行Telnet命令
 */
export async function executeTelnetCommand(command) {
  try {
    if (!connection) {
      throw new Error('未连接到设备')
    }
    const response = await connection.exec(command)
    return { success: true, response }
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, error: { message: '命令执行已中止' } }
    } else {
      return { success: false, error }
    }
  }
}

/**
 * 获取当前连接实例
 */
export function getTelnetConnection() {
  return connection
}

/**
 * 注册Telnet相关的IPC事件处理函数
 */
export function registerTelnetHandlers() {
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
}