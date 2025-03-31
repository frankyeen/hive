import { Telnet } from 'telnet-client'

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
        shellPrompt: "#|\(Y/N\)|>",
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