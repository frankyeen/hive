<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

const terminalElement = ref(null)
let terminal = null
let fitAddon = null

onMounted(() => {
  // 初始化终端
  terminal = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'monospace',
    scrollback: 1000, // 添加scrollback参数，设置终端历史记录行数
    theme: {
      background: '#1e1e1e',
      foreground: '#f0f0f0'
    }
  })

  // 添加自适应插件
  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)

  // 打开终端并挂载到DOM元素
  terminal.open(terminalElement.value)
  fitAddon.fit()

  // 处理窗口大小变化
  window.addEventListener('resize', handleResize)

  // 接收数据并显示到终端
  window.api.on('data-receive', (data) => {
    terminal.write(data);
  });

  // 处理用户输入
  let userInput = ''
  terminal.onData(data => {
    // 处理回车键
    if (data === '\r') {
      window.api.send('send-command', userInput)
      userInput = ''
      return
    }
    
    // 处理退格键
    if (data === '\x7f') {
      if (userInput.length > 0) {
        userInput = userInput.slice(0, -1)
        terminal.write('\b \b')
      }
      return
    }
    
    // 处理普通字符输入
    if (data.match(/^[\x20-\x7E]$/)) { // 可打印ASCII字符
      userInput += data
      terminal.write(data)
    }
  })
})

// 组件卸载时清理资源
onUnmounted(() => {
  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleResize)
  
  // 移除数据接收监听
  window.api.removeListener('data-receive')
  
  // 销毁终端实例
  if (terminal) {
    terminal.dispose()
  }
})

// 处理窗口大小变化
const handleResize = () => {
  if (fitAddon) {
    fitAddon.fit()
  }
}

onUnmounted(() => {
  // 清理事件监听器
  window.removeEventListener('resize', handleResize)
  
  // 销毁终端实例
  if (terminal) {
    terminal.dispose()
  }
})
</script>

<template>
  <div class="terminal-container">
    <div ref="terminalElement" class="terminal"></div>
  </div>
</template>

<style scoped>
.terminal-container {
  width: calc(100% - 16px); /* 减去左右margin的总和 */
  flex: 1;
  overflow: auto; /* 修改为auto，只在内容超出时显示滚动条 */
  background-color: #1e1e1e;
  padding: 8px;
  display: flex;
  flex-direction: column;
  border-radius: 6px;
  margin: 0 8px 10px 8px;
  box-sizing: border-box;
}

.terminal {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  overflow: auto; /* 修改为auto，只在内容超出时显示滚动条 */
}
</style>