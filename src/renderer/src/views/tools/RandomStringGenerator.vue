<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from 'tdesign-icons-vue-next'

const router = useRouter()

// 返回工具列表
const backToTools = () => {
  router.push('/tools')
}

// 随机字符串生成器配置
const stringConfig = reactive({
  lowercase: true,
  uppercase: true,
  numbers: true,
  special: false,
  length: 12
})

// 特殊字符示例
const specialCharsExample = ref('!@#$%^&*()_+~`|}{[]\:;?><,./-=')

// 生成的随机字符串
const generatedString = ref('')

// 生成随机字符串的函数
const generateRandomString = () => {
  let charset = ''
  if (stringConfig.lowercase) charset += 'abcdefghijklmnopqrstuvwxyz'
  if (stringConfig.uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (stringConfig.numbers) charset += '0123456789'
  if (stringConfig.special) charset += specialCharsExample.value

  // 如果没有选择任何字符集，使用默认的小写字母
  if (charset === '') {
    charset = 'abcdefghijklmnopqrstuvwxyz'
    stringConfig.lowercase = true
  }

  let result = ''
  const charsetLength = charset.length
  for (let i = 0; i < stringConfig.length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charsetLength))
  }

  generatedString.value = result
}

// 复制到剪贴板
const copyToClipboard = () => {
  if (!generatedString.value) return
  navigator.clipboard.writeText(generatedString.value)
    .then(() => {
      // 复制成功提示
      alert('已复制到剪贴板')
    })
    .catch(err => {
      console.error('复制失败:', err)
    })
}

// 清空生成的字符串
const clearGeneratedString = () => {
  generatedString.value = ''
}
</script>

<template>
  <div class="tool-view">
    <div class="tool-container">
      <div class="tool-header">
        <t-button theme="default" variant="text" size="small" class="back-button" @click="backToTools">
          <template #icon><ArrowLeftIcon /></template>
          返回工具列表
        </t-button>
        <h2 class="tool-title">随机字符串生成器</h2>
      </div>
      
      <div class="tool-content">
        <div class="config-section">
          <t-card title="配置选项" class="config-card">
            <div class="checkbox-row">
              <t-checkbox v-model="stringConfig.lowercase">小写字母</t-checkbox>
              <t-checkbox v-model="stringConfig.uppercase">大写字母</t-checkbox>
              <t-checkbox v-model="stringConfig.numbers">数字</t-checkbox>
              <t-checkbox v-model="stringConfig.special">特殊字符</t-checkbox>
              <t-input v-model="specialCharsExample" class="special-chars-input" placeholder="输入自定义特殊字符"></t-input>
            </div>
            
            <div class="length-input-container">
              <t-input-number v-model="stringConfig.length" label="长度:" min="1" max="1000" theme="column" align="right" class="length-input" />
            </div>
          </t-card>
        </div>
        
        <div class="result-section">
          <t-card title="生成结果" class="result-card">
            <t-textarea
              v-model="generatedString"
              readonly
              placeholder="点击生成按钮创建随机字符串"
              class="result-input"
              :autosize="{ minRows: 5, maxRows: 10 }"
            />
            
            <div class="action-section">
              <t-space>
                <t-button theme="primary" @click="generateRandomString">生成</t-button>
                <t-button theme="default" @click="clearGeneratedString">清空</t-button>
                <t-button theme="default" @click="copyToClipboard" :disabled="!generatedString">复制</t-button>
              </t-space>
            </div>
          </t-card>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-view {
  display: flex;
  flex: 1;
  overflow: auto;
}

.tool-container {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.tool-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 20px;
}

.back-button {
  margin-bottom: 8px;
  padding-left: 0;
}

.tool-title {
  margin-bottom: 8px;
  align-self: center;
}

.tool-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
}

.config-card,
.result-card {
  width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.config-section {
  margin-bottom: 0;
}

.checkbox-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.special-chars-input {
  font-family: monospace;
  color: #666;
  font-size: 14px;
  margin-left: 8px;
  border-radius: 4px;
  white-space: nowrap;
  width: 250px;
}

.length-input-container {
  max-width: 200px;
}

.length-input {
  width: 120px;
}

.result-section {
  margin-top: 0;
}

.result-input {
  width: 100%;
  font-family: monospace;
  margin-bottom: 16px;
  font-size: 16px;
  min-height: 120px;
}

.action-section {
  display: flex;
  justify-content: center;
}

@media (max-width: 600px) {
  .checkbox-group {
    grid-template-columns: 1fr 1fr;
  }
  
  .tool-content {
    max-width: 100%;
  }
}
</style>