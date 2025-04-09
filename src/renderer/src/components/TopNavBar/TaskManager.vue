<script setup>
import { ref } from 'vue'
import YAML from 'yaml'

// 控制弹出框的显示状态
const taskManagerVisible = ref(false)
const createTaskVisible = ref(false)

// 任务列表数据
const taskList = ref([])

// 新建任务表单数据
const taskForm = ref({
  name: '',
  loop: 10,
  cmd_timeout: 10,
  setup: '',
  cmd: '',
  teardown: ''
})

// 步骤控制
const currentStep = ref(0)
const steps = [
  { value: 0, label: '基本信息', content: '配置任务名称和命令超时时间' },
  { value: 1, label: '前置命令', content: '配置任务执行前的准备命令' },
  { value: 2, label: '执行命令', content: '配置循环次数和主要执行命令' },
  { value: 3, label: '后置命令', content: '配置任务执行后的清理命令' }
]

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入任务名称', type: 'error' }],
  loop: [{ required: true, message: '请输入循环次数', type: 'error' }],
  cmd_timeout: [{ required: true, message: '请输入命令超时时间', type: 'error' }],
  cmd: [{ required: true, message: '请输入命令', type: 'error' }]
}

// 打开/关闭弹出框的方法
const toggleTaskManager = () => {
  taskManagerVisible.value = !taskManagerVisible.value
  // 打开任务管理弹窗时加载任务列表
  if (taskManagerVisible.value) {
    loadTaskList()
  }
}

const toggleCreateTask = () => {
  createTaskVisible.value = !createTaskVisible.value
  // 重置表单和步骤
  if (createTaskVisible.value) {
    taskForm.value = {
      name: '',
      loop: 10,
      cmd_timeout: 10,
      setup: '',
      cmd: '',
      teardown: ''
    }
    currentStep.value = 0
  }
}

// 步骤控制方法
const nextStep = () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const resetSteps = () => {
  currentStep.value = 0
}

// 加载任务列表
const loadTaskList = async () => {
  try {
    // 通过IPC调用获取任务列表
    const files = await window.api.invoke('get-task-list')
    taskList.value = files
  } catch (error) {
    console.error('加载任务列表失败:', error)
  }
}

// 创建新任务
const createTask = async (formData) => {
  try {
    // 构建任务配置对象
    const taskConfig = {
      loop: formData.loop,
      cmd_timeout: formData.cmd_timeout,
      cmd: formData.cmd.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => line.trim()),
      unexpected: ["%Invalid", "%Error", "%Wrong", "%Refuse", "%Conflict", "%Failed"]
    }
    
    // 只有当setup不为空时才添加setup字段
    const setupArray = formData.setup.split('\n').filter(line => line.trim() !== '')
    if (setupArray.length > 0) {
      taskConfig.setup = setupArray.map(line => line.trim())
    }
    
    // 只有当teardown不为空时才添加teardown字段
    const teardownArray = formData.teardown.split('\n').filter(line => line.trim() !== '')
    if (teardownArray.length > 0) {
      taskConfig.teardown = teardownArray.map(line => line.trim())
    }
    
    // 使用YAML库将对象转换为YAML格式的字符串
    const yamlContent = YAML.stringify(taskConfig)
    
    // 发送到主进程保存文件
    await window.api.invoke('save-task', {
      name: formData.name,
      content: yamlContent
    })
    
    // 关闭弹窗并刷新任务列表
    createTaskVisible.value = false
    loadTaskList()
  } catch (error) {
    console.error('创建任务失败:', error)
  }
}

// 选择并执行任务方法
const selectAndExecuteTask = (name) => {
  // 获取任务路径
  const configsDir = 'configs'
  const taskPath = `${configsDir}/${name}.yaml`
  
  // 发送任务名称到主进程
  window.api.send('task-name', { name })
  // 发送任务路径到主进程
  window.api.send('task-path', { path: taskPath })
  // 关闭任务管理弹窗
  taskManagerVisible.value = false
}

const deleteTask = async (name) => {
  try {
    // 调用预加载脚本中暴露的删除任务方法
    await window.api.invoke('delete-task', name)
    // 刷新任务列表
    loadTaskList()
  } catch (error) {
    console.error('删除任务失败:', error)
  }
}

// 修改任务方法
const editTask = async (name) => {
  try {
    // 获取任务内容
    const result = await window.api.invoke('get-task-content', name)
    
    if (result.success) {
      // 解析YAML内容
      const taskConfig = YAML.parse(result.content)
      
      // 填充表单数据
      taskForm.value = {
        name: name,
        loop: taskConfig.loop || 10,
        cmd_timeout: taskConfig.cmd_timeout || 10,
        setup: taskConfig.setup ? taskConfig.setup.join('\n') : '',
        cmd: taskConfig.cmd ? taskConfig.cmd.join('\n') : '',
        teardown: taskConfig.teardown ? taskConfig.teardown.join('\n') : ''
      }
      
      // 重置步骤到第一步
      currentStep.value = 0
      
      // 打开创建任务对话框
      createTaskVisible.value = true
    } else {
      console.error('获取任务内容失败:', result.error)
    }
  } catch (error) {
    console.error('修改任务失败:', error)
  }
}

// 打开配置文件文件夹
const openConfigsDir = () => {
  window.api.send('open-config-dir')
}
</script>

<template>
  <!-- 任务管理按钮 -->
  <t-button @click="toggleTaskManager">
    <template #icon>
      <t-icon name="view-list" />
    </template>
    任务管理
  </t-button>

  <!-- 任务管理弹出框 -->
  <t-dialog
    v-model:visible="taskManagerVisible"
    header="任务管理"
    :on-close="toggleTaskManager"
    :on-cancel="toggleTaskManager"
    :footer="false"
    width="1000px"
  >
    <div class="task-manager-container">
      <div class="task-manager-header">
        <t-space>
          <t-button theme="primary" @click="toggleCreateTask">
            <template #icon>
              <t-icon name="add" />
            </template>
            新建
          </t-button>
          <t-button @click="loadTaskList">
            <template #icon>
              <t-icon name="refresh" />
            </template>
            刷新
          </t-button>
          <t-button theme="default" @click="openConfigsDir">
            <template #icon>
              <t-icon name="folder" />
            </template>
            配置文件夹
          </t-button>
        </t-space>
      </div>
      
      <t-table
        :data="taskList"
        :columns="[
          { colKey: 'name', title: '任务名称', width: '200' },
          { colKey: 'operation', title: '操作', width: '52' }
        ]"
        row-key="name"
        size="medium"
        bordered
        stripe
        empty="暂无任务"
      >
        <template #operation="{ row }">
          <t-space>
            <t-button theme="primary" size="small" @click="selectAndExecuteTask(row.name)">
              选中
            </t-button>
            <t-button theme="warning" size="small" @click="editTask(row.name)">
              修改
            </t-button>
            <t-button theme="danger" size="small" @click="deleteTask(row.name)">
              删除
            </t-button>
          </t-space>
        </template>
      </t-table>
    </div>
  </t-dialog>
  
  <!-- 新建任务弹出框 -->
  <t-dialog
    v-model:visible="createTaskVisible"
    header="新建任务"
    :on-close="toggleCreateTask"
    :footer="false"
    width="900px"
    class="create-task-dialog"
  >
    <!-- 步骤条 -->
    <t-steps :current="currentStep" class="task-steps">
      <t-step-item
        v-for="step in steps"
        :key="step.value"
        :title="step.label"
        :content="step.content"
      />
    </t-steps>
    
    <t-divider></t-divider>
    
    <t-form :data="taskForm" :rules="rules" @submit="createTask" class="task-form">
      <!-- 步骤1：基本信息 - 任务名称和命令超时时间 -->
      <div v-show="currentStep === 0">
        <t-form-item label="任务名称" name="name">
          <t-input v-model="taskForm.name" placeholder="请输入任务名称"></t-input>
        </t-form-item>
        <t-form-item label="命令超时时间(秒)" name="cmd_timeout">
          <t-input-number v-model="taskForm.cmd_timeout" placeholder="请输入超时时间" :min="1"></t-input-number>
        </t-form-item>
      </div>
      
      <!-- 步骤2：前置命令 -->
      <div v-show="currentStep === 1">
        <t-form-item label="前置命令" name="setup">
          <t-textarea v-model="taskForm.setup" placeholder="请输入前置命令，每行一条命令" :autosize="{ minRows: 5, maxRows: 15 }" class="command-textarea"></t-textarea>
        </t-form-item>
      </div>
      
      <!-- 步骤3：循环次数和执行命令 -->
      <div v-show="currentStep === 2">
        <t-form-item label="循环次数" name="loop">
          <t-input-number v-model="taskForm.loop" placeholder="请输入循环次数" :min="1"></t-input-number>
        </t-form-item>
        
        <t-form-item label="执行命令 (必填)" name="cmd">
          <t-textarea v-model="taskForm.cmd" placeholder="请输入执行命令，每行一条命令" :autosize="{ minRows: 5, maxRows: 15 }" class="command-textarea"></t-textarea>
        </t-form-item>
      </div>
      
      <!-- 步骤4：后置命令 -->
      <div v-show="currentStep === 3">
        <t-form-item label="后置命令" name="teardown">
          <t-textarea v-model="taskForm.teardown" placeholder="请输入后置命令，每行一条命令" :autosize="{ minRows: 5, maxRows: 15 }" class="command-textarea"></t-textarea>
        </t-form-item>
      </div>
      
      <!-- 步骤导航按钮 -->
      <div class="step-actions">
        <t-space>
          <t-button theme="default" @click="toggleCreateTask">取消</t-button>
          <t-button v-if="currentStep > 0" @click="prevStep">上一步</t-button>
          <t-button v-if="currentStep < steps.length - 1" theme="primary" @click="nextStep">下一步</t-button>
          <t-button v-if="currentStep === steps.length - 1" theme="primary" @click="createTask(taskForm)">创建任务</t-button>
        </t-space>
      </div>
    </t-form>
  </t-dialog>
</template>

<style scoped>
.task-manager-container {
  padding: 10px 0;
}

.task-manager-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 15px;
}

.command-textarea {
  width: 100%;
  font-family: monospace;
  min-height: 80px;
  line-height: 1.5;
  max-height: 200px;
  overflow-y: auto;
}

:deep(.t-textarea__inner) {
  padding: 8px 12px;
  font-size: 14px;
}

.task-form {
  padding: 10px;
}

.task-steps {
  margin: 20px 0;
  display: flex;
  justify-content: flex-start;
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e7e7e7;
}

.confirmation-card {
  margin: 20px 0;
}

.command-preview {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

/* 增加表单标签右侧距离，防止与输入框内容重叠 */
:deep(.t-form__label) {
  padding-right: 130px;
}
</style>