/**
 * 测试生产构建性能的临时脚本
 * 直接加载已构建的 dist 文件，无需完整打包
 */

const { app, BrowserWindow } = require('electron')
const path = require('path')

app.whenReady().then(() => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'dist-electron/preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // 加载生产构建的 HTML
  mainWindow.loadFile(path.join(__dirname, 'dist/index.html'))

  // 打开开发者工具查看性能日志
  mainWindow.webContents.openDevTools()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
