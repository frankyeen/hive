<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from 'tdesign-icons-vue-next'

const router = useRouter()

// 返回工具列表
const backToTools = () => {
  router.push('/tools')
}

// 输入的IPv4组播地址
const ipv4Address = ref('')

// 转换结果
const macAddress = ref('')

// 错误信息
const errorMessage = ref('')

// 验证IPv4组播地址格式
const isValidMulticastIP = (ip) => {
  // 检查IP格式是否正确
  const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  if (!ipRegex.test(ip)) return false
  
  // 解析IP地址的各个部分
  const parts = ip.split('.')
  const firstOctet = parseInt(parts[0], 10)
  
  // 检查是否是组播地址范围 (224.0.0.0 - 239.255.255.255)
  return firstOctet >= 224 && firstOctet <= 239
}

// 将IPv4组播地址转换为MAC地址
const convertToMac = () => {
  errorMessage.value = ''
  macAddress.value = ''
  
  // 验证输入
  if (!ipv4Address.value) {
    errorMessage.value = '请输入IPv4组播地址'
    return
  }
  
  if (!isValidMulticastIP(ipv4Address.value)) {
    errorMessage.value = '无效的IPv4组播地址，有效范围为224.0.0.0 - 239.255.255.255'
    return
  }
  
  // 解析IP地址
  const ipParts = ipv4Address.value.split('.')
  
  // 将IP地址转换为二进制
  const secondOctet = parseInt(ipParts[1], 10)
  const thirdOctet = parseInt(ipParts[2], 10)
  const fourthOctet = parseInt(ipParts[3], 10)
  
  // 组播MAC地址的前24位是固定的(01:00:5E)
  // 组播IP地址的最高位被忽略，只使用后23位
  const lowBitOfSecond = secondOctet & 0x7F // 取第二个八位字节的低7位
  
  // 格式化为MAC地址
  macAddress.value = `01:00:5E:${lowBitOfSecond.toString(16).padStart(2, '0')}:${thirdOctet.toString(16).padStart(2, '0')}:${fourthOctet.toString(16).padStart(2, '0')}`
}

// 清空输入和结果
const clearAll = () => {
  ipv4Address.value = ''
  macAddress.value = ''
  errorMessage.value = ''
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
        <h2 class="tool-title">组播地址转换</h2>
      </div>
      
      <div class="tool-content">
        <t-card title="IPv4组播地址转MAC地址" class="converter-card">
          <div class="input-section">
            <t-input
              v-model="ipv4Address"
              placeholder="输入IPv4组播地址 (例如: 224.0.0.1)"
              class="ip-input"
              clearable
            />
            <t-alert v-if="errorMessage" theme="error" :message="errorMessage" class="error-alert" />
          </div>
          
          <div class="action-section">
            <t-space>
              <t-button theme="primary" @click="convertToMac">转换</t-button>
              <t-button theme="default" @click="clearAll">清空</t-button>
            </t-space>
          </div>
          
          <div class="result-section" v-if="macAddress">
            <t-divider>转换结果</t-divider>
            <div class="result-container">
              <t-input
                v-model="macAddress"
                readonly
                class="mac-result"
              />
            </div>
            
            <div class="explanation">
              <t-alert theme="info">
                <template #message>
                  <div>
                    <p><strong>转换规则说明：</strong></p>
                    <p>1. 组播MAC地址的前24位是固定的: <code>01:00:5E</code></p>
                    <p>2. 组播MAC地址的后24位来自IPv4组播地址的后23位（忽略最高位）</p>
                    <p>3. 因此，每个MAC地址可能对应多个IPv4组播地址</p>
                  </div>
                </template>
              </t-alert>
            </div>
          </div>
        </t-card>
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
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
}

.converter-card {
  width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.input-section {
  margin-bottom: 20px;
}

.ip-input {
  margin-bottom: 10px;
}

.error-alert {
  margin-top: 10px;
}

.action-section {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.result-section {
  margin-top: 10px;
}

.result-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.mac-result {
  font-family: monospace;
  font-size: 16px;
  font-weight: bold;
}

.explanation {
  margin-top: 20px;
}

@media (max-width: 600px) {
  .tool-content {
    max-width: 100%;
  }
  
  .result-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .copy-button {
    margin-top: 10px;
  }
}
</style>