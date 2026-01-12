import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as fs from 'fs'
import { loadConfig, saveConfig, updateConfig } from './config'
import { matchImages } from './matcher'
import { moveFiles } from './fileManager'
import { processBatch } from './annotationProcessor'
import {
  exportJSONReport,
  exportCSVReport,
  exportSummaryReport,
} from './reportExporter'
import { initDatabase, closeDatabase } from './database'
import type { Config, ImageGroup } from './types'

// ES Module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 启用硬件加速以提升性能
// app.disableHardwareAcceleration() // 已注释 - 硬件加速可显著提升图像渲染性能

// 存储允许访问的文件夹路径（白名单）
const allowedPaths = new Set<string>()

// 添加允许访问的路径
export function addAllowedPath(folderPath: string) {
  // 规范化路径并添加到白名单
  const normalized = path.normalize(path.resolve(folderPath))
  allowedPaths.add(normalized)
  console.log('Added allowed path:', normalized)
}

// 检查文件路径是否安全
function isPathSafe(filePath: string): boolean {
  try {
    // 规范化路径
    const normalizedPath = path.normalize(path.resolve(filePath))

    // 检查文件是否在允许的路径内
    for (const allowedPath of allowedPaths) {
      if (normalizedPath.startsWith(allowedPath)) {
        // 检查文件扩展名（只允许图片格式）
        const ext = path.extname(normalizedPath).toLowerCase()
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff']
        if (allowedExtensions.includes(ext)) {
          return true
        }
      }
    }

    console.warn('Blocked access to unsafe path:', normalizedPath)
    return false
  } catch (error) {
    console.error('Path validation error:', error)
    return false
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      // 隐私保护：禁用网络功能
      webSecurity: true, // 启用 web 安全
      allowRunningInsecureContent: false, // 禁止不安全内容
      // 禁用外部导航
      navigateOnDragDrop: false,
      // 性能优化
      backgroundThrottling: false, // 禁用后台节流，保持流畅
      enableWebSQL: false, // 禁用不需要的功能
    },
  })

  // 设置网络请求拦截器 - 仅生产环境拦截外部请求
  if (!process.env.VITE_DEV_SERVER_URL) {
    // 生产环境：完全禁止外部网络请求
    mainWindow.webContents.session.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*'] },
      (details, callback) => {
        console.warn('Blocked external request:', details.url)
        callback({ cancel: true })
      }
    )
  } else {
    // 开发环境：仅允许本地开发服务器
    mainWindow.webContents.session.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*'] },
      (details, callback) => {
        const url = new URL(details.url)
        const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1'

        if (!isLocalhost) {
          console.warn('Blocked external request in dev mode:', details.url)
          callback({ cancel: true })
        } else {
          callback({})
        }
      }
    )
  }

  // 设置 CSP 响应头
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: local:; " +
            "font-src 'self' data:; " +
            "connect-src 'none'; " + // 禁止所有网络连接
            "frame-src 'none'; " +
            "object-src 'none';"
          ]
        }
      })
    }
  )

  // 开发环境加载 Vite 开发服务器
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    // 打开开发者工具
    mainWindow.webContents.openDevTools()
  } else {
    // 生产环境加载构建后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// 设置 IPC 处理器
function setupIpcHandlers() {
  // 加载配置
  ipcMain.handle('config:load', async () => {
    const config = await loadConfig()

    // 将配置中的文件夹添加到安全白名单
    if (config.matchRules.sourceFolder) {
      addAllowedPath(config.matchRules.sourceFolder)
    }

    // 如果有文件夹对配置，也添加到白名单
    if (config.matchRules.folderPairs) {
      config.matchRules.folderPairs.forEach(pair => {
        addAllowedPath(pair.leftFolder)
        addAllowedPath(pair.rightFolder)
      })
    }

    return config
  })

  // 保存配置
  ipcMain.handle('config:save', async (_event, config: Config) => {
    await saveConfig(config)

    // 将配置中的文件夹添加到安全白名单
    if (config.matchRules.sourceFolder) {
      addAllowedPath(config.matchRules.sourceFolder)
    }

    // 如果有文件夹对配置，也添加到白名单
    if (config.matchRules.folderPairs) {
      config.matchRules.folderPairs.forEach(pair => {
        addAllowedPath(pair.leftFolder)
        addAllowedPath(pair.rightFolder)
      })
    }

    return
  })

  // 更新配置
  ipcMain.handle('config:update', async (_event, updates: Partial<Config>) => {
    const config = await updateConfig(updates)

    // 将配置中的文件夹添加到安全白名单
    if (config.matchRules.sourceFolder) {
      addAllowedPath(config.matchRules.sourceFolder)
    }

    // 如果有文件夹对配置，也添加到白名单
    if (config.matchRules.folderPairs) {
      config.matchRules.folderPairs.forEach(pair => {
        addAllowedPath(pair.leftFolder)
        addAllowedPath(pair.rightFolder)
      })
    }

    return config
  })

  // 选择文件夹
  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    const folderPath = result.filePaths[0]

    // 将选中的文件夹添加到安全白名单
    if (folderPath) {
      addAllowedPath(folderPath)
    }

    return folderPath
  })

  // 加载图片（匹配原图和派生图）
  ipcMain.handle('images:load', async (_event, config: Config) => {
    // 将配置中的文件夹添加到安全白名单
    if (config.matchRules.sourceFolder) {
      addAllowedPath(config.matchRules.sourceFolder)
    }

    // 如果有文件夹对配置，也添加到白名单
    if (config.matchRules.folderPairs) {
      config.matchRules.folderPairs.forEach(pair => {
        addAllowedPath(pair.leftFolder)
        addAllowedPath(pair.rightFolder)
      })
    }

    return await matchImages(config)
  })

  // 移动文件
  ipcMain.handle('files:move', async (_event, operations) => {
    return await moveFiles(operations)
  })

  // 处理标注并移动文件
  ipcMain.handle(
    'annotation:process',
    async (_event, groups: ImageGroup[], config: Config) => {
      return await processBatch(groups, config)
    }
  )

  // 导出 JSON 报告
  ipcMain.handle(
    'report:exportJSON',
    async (_event, groups: ImageGroup[], annotations: any) => {
      const annotationsMap = new Map(Object.entries(annotations))
      return await exportJSONReport(groups, annotationsMap)
    }
  )

  // 导出 CSV 报告
  ipcMain.handle(
    'report:exportCSV',
    async (_event, groups: ImageGroup[], annotations: any) => {
      const annotationsMap = new Map(Object.entries(annotations))
      return await exportCSVReport(groups, annotationsMap)
    }
  )

  // 导出摘要报告
  ipcMain.handle(
    'report:exportSummary',
    async (_event, groups: ImageGroup[], annotations: any) => {
      const annotationsMap = new Map(Object.entries(annotations))
      return await exportSummaryReport(groups, annotationsMap)
    }
  )
}

// 当 Electron 完成初始化时创建窗口
app.whenReady().then(() => {
  // 初始化数据库
  try {
    initDatabase()
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }

  // 注册自定义协议以访问本地文件（带安全验证）
  protocol.registerFileProtocol('local', (request, callback) => {
    const url = request.url.replace('local://', '')
    try {
      const filePath = decodeURIComponent(url)

      // 安全检查：验证路径是否安全
      if (!isPathSafe(filePath)) {
        console.error('Access denied: unsafe path', filePath)
        return callback({ error: -10 }) // 返回错误
      }

      return callback(filePath)
    } catch (error) {
      console.error('Failed to load local file:', error)
      return callback({ error: -2 })
    }
  })

  setupIpcHandlers()
  createWindow()

  app.on('activate', () => {
    // 在 macOS 上，当点击 dock 图标且没有其他窗口打开时，重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 当所有窗口都被关闭时退出应用（Windows 和 Linux）
app.on('window-all-closed', () => {
  // 关闭数据库连接
  closeDatabase()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前关闭数据库
app.on('before-quit', () => {
  closeDatabase()
})
