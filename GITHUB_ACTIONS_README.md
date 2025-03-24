# GitHub Actions 自动构建与自动更新配置说明

本文档说明了如何使用GitHub Actions自动构建Windows版本并发布到Releases，以及如何配置自动更新功能。

## 已完成的配置

已经为您配置了以下内容：

1. 创建了GitHub Actions工作流文件 `.github/workflows/build-and-release.yml`
2. 更新了 `electron-builder.yml` 中的发布配置
3. 更新了 `dev-app-update.yml` 中的更新服务器配置
4. 创建了自动更新模块 `src/main/auto-updater.js`

## 如何使用

### 发布新版本

1. 更新 `package.json` 中的版本号
2. 提交并推送更改到GitHub
3. 创建一个新的标签，格式为 `v*`（例如 `v1.0.1`）
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
4. GitHub Actions将自动构建Windows版本并发布到Releases

### 集成自动更新功能

要在应用中集成自动更新功能，请在 `src/main/index.js` 中添加以下代码：

```javascript
// 导入自动更新模块
import { setupAutoUpdater, checkForUpdates } from './auto-updater'

// 在app.whenReady()后调用setupAutoUpdater
app.whenReady().then(() => {
  // 现有代码...
  
  // 设置自动更新
  setupAutoUpdater()
})

// 可选：添加手动检查更新的IPC处理程序
ipcMain.on('check-for-updates', () => {
  checkForUpdates()
})
```

然后在渲染进程中添加检查更新的按钮或菜单项：

```javascript
// 在渲染进程中
const checkForUpdates = () => {
  window.electron.ipcRenderer.send('check-for-updates')
}

// 添加到UI中的某个按钮事件
checkUpdateButton.addEventListener('click', checkForUpdates)
```

## 注意事项

1. 确保GitHub仓库中已添加 `GITHUB_TOKEN` 密钥（通常GitHub Actions已自动配置）
2. 首次发布时，需要手动创建一个Release，后续发布将自动创建
3. 自动更新功能需要安装 `electron-log` 包：`npm install electron-log --save`

## 故障排除

如果自动更新不工作，请检查：

1. 确认应用已正确签名（生产环境）
2. 检查GitHub Releases中是否有正确的发布文件
3. 查看应用日志中是否有更新相关的错误信息