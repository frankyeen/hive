import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execPromise = promisify(exec)

/**
 * 上传日志文件到SVN
 */
export async function uploadLogToSvn(logFilePath, svnInfo, logger, event) {
  console.log(logFilePath)
  console.log(svnInfo)
  
  if (!svnInfo || !svnInfo.url || !svnInfo.username || !svnInfo.password) {
    throw new Error('SVN信息不完整')
  }
  const { url, username, password } = svnInfo
  const logFileName = path.basename(logFilePath)

  try {
    // 验证SVN路径格式
    if (!url.startsWith('http')) {
      throw new Error('SVN路径必须使用HTTP协议')
    }

    // 直接使用import命令上传文件
    const importCmd = `svn import ${logFilePath} ${url}/${username}/${logFileName} -m "自动上传日志文件${logFileName}" --username ${username} --password "${password}" --non-interactive --trust-server-cert`
    logger.info(`开始直接上传日志文件到${url}/${username}/${logFileName}`)
    event.reply('task-output', `开始直接上传日志文件到${url}/${username}/${logFileName}`)
    const { stdout } = await execPromise(importCmd)
    
    logger.info(`SVN上传成功: ${stdout}`)
    event.reply('task-output', `文件上传成功: ${stdout}`)
    
    return { success: true }
  } catch (error) {
    logger.error(`SVN上传失败: ${error.message}`)
    if (error.stderr) {
      logger.error(`错误详情: ${error.stderr}`)
    }
    throw error
  }
}