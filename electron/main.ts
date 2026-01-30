import { app, BrowserWindow, ipcMain, dialog, protocol, shell } from 'electron'
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
import { initDatabase, closeDatabase, getAnnotationsForGroups, saveAnnotation, deleteAnnotation, clearAnnotations } from './database'
import {
  checkPythonEnvironment,
  analyzeBatchImages,
  generateClassificationPath,
  scanImagesInFolder,
} from './pythonManager'
import {
  matchSourceFiles,
  matchDerivedFiles,
  classifyFiles,
  extractFilesBySuffix,
} from './fileMatcher'
import { searchFilesByName, transferFiles } from './fileSearch'
import type { Config, ImageGroup } from './types'

// ES Module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ===========================================
// GPU 和性能优化配置
// ===========================================

// macOS 特定优化：针对图像密集型应用
if (process.platform === 'darwin') {
  // 禁用后台节流，保持应用流畅
  app.commandLine.appendSwitch('disable-renderer-backgrounding')
  app.commandLine.appendSwitch('disable-background-timer-throttling')

  // GPU 光栅化优化（提升图像渲染性能）
  app.commandLine.appendSwitch('enable-gpu-rasterization')
  app.commandLine.appendSwitch('enable-native-gpu-memory-buffers')
  app.commandLine.appendSwitch('num-raster-threads', '4')

  console.log('✓ [GPU] macOS 性能优化参数已应用')
}

// 启用硬件加速以提升性能
// app.disableHardwareAcceleration() // 已注释 - 硬件加速可显著提升图像渲染性能

// 全局窗口引用（避免被垃圾回收）
let mainWindow: BrowserWindow | null = null

// 存储允许访问的文件夹路径（白名单）
const allowedPaths = new Set<string>()

// 路径安全检查缓存（性能优化）
const pathSafetyCache = new Map<string, boolean>()
const MAX_CACHE_SIZE = 10000
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'])

// 添加允许访问的路径
export function addAllowedPath(folderPath: string) {
  // 规范化路径并添加到白名单
  const normalized = path.normalize(path.resolve(folderPath))
  allowedPaths.add(normalized)
  console.log('Added allowed path:', normalized)

  // 清除路径缓存（因为白名单变化了）
  pathSafetyCache.clear()
  console.log('✓ 路径安全缓存已清除')
}

// 检查文件路径是否安全（带缓存优化）
function isPathSafe(filePath: string): boolean {
  // 1. 先查缓存（最快路径）
  if (pathSafetyCache.has(filePath)) {
    return pathSafetyCache.get(filePath)!
  }

  const startTime = performance.now()

  try {
    // 2. 规范化路径
    const normalizedPath = path.normalize(path.resolve(filePath))
    const ext = path.extname(normalizedPath).toLowerCase()

    // 3. 快速路径：扩展名检查前置（避免不必要的路径匹配）
    if (!allowedExtensions.has(ext)) {
      pathSafetyCache.set(filePath, false)
      console.warn('Blocked: invalid extension:', ext)
      return false
    }

    // 4. 检查文件是否在允许的路径内
    const isAllowed = Array.from(allowedPaths).some(
      allowedPath => normalizedPath.startsWith(allowedPath)
    )

    // 5. 缓存结果
    if (pathSafetyCache.size >= MAX_CACHE_SIZE) {
      // 清理最旧的 50% 缓存（简单 LRU）
      const entriesToDelete = Array.from(pathSafetyCache.keys()).slice(0, MAX_CACHE_SIZE / 2)
      entriesToDelete.forEach(key => pathSafetyCache.delete(key))
      console.log(`✓ [缓存] 清理了 ${entriesToDelete.length} 条旧缓存`)
    }
    pathSafetyCache.set(filePath, isAllowed)

    const duration = performance.now() - startTime
    if (duration > 1) {
      console.warn(`⚠️ [性能] isPathSafe 耗时: ${duration.toFixed(2)}ms (allowedPaths size: ${allowedPaths.size})`)
    }

    if (!isAllowed) {
      console.warn('Blocked access to unsafe path:', normalizedPath)
    }

    return isAllowed
  } catch (error) {
    console.error('Path validation error:', error)
    pathSafetyCache.set(filePath, false)
    return false
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
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

  // 关闭窗口前统一二次确认，防止误操作退出工具
  mainWindow.on('close', (event) => {
    // 如果已经在退出流程中（例如代码调用 app.quit），则不再弹窗
    if ((app as any).isQuitting) {
      return
    }

    event.preventDefault()

    const result = dialog.showMessageBoxSync(mainWindow!, {
      type: 'question',
      buttons: ['取消', '退出'],
      defaultId: 0,
      cancelId: 0,
      title: '确认关闭工具',
      message: '确定要关闭图像比对工具吗？',
      detail: '关闭后将退出当前工具窗口。已保存到本地数据库的数据不会丢失。',
    })

    if (result === 1) {
      ;(app as any).isQuitting = true
      // 用户确认后真正关闭窗口
      mainWindow?.destroy()
    }
  })
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

  // 获取文件/文件夹统计信息（用于拖拽验证）
  ipcMain.handle('files:getStats', async (_event, filePath: string) => {
    try {
      const stats = fs.statSync(filePath)
      const normalized = path.normalize(path.resolve(filePath))

      if (stats.isDirectory()) {
        addAllowedPath(normalized)  // 自动添加到白名单
      }

      return {
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        path: normalized,
      }
    } catch (error) {
      return { error: '无法访问路径,请检查权限' }
    }
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

  // ============================================
  // 标注持久化相关 IPC handlers（仅操作数据库，不触发文件移动）
  // ============================================

  // 批量加载指定图片组的历史标注
  ipcMain.handle('annotation:loadForGroups', async (_event, groupIds: string[]) => {
    try {
      if (!Array.isArray(groupIds) || groupIds.length === 0) {
        return {}
      }
      return getAnnotationsForGroups(groupIds)
    } catch (error) {
      console.error('Failed to load annotations for groups:', error)
      throw error
    }
  })

  // 保存（新增 / 更新）单条标注
  ipcMain.handle(
    'annotation:save',
    async (_event, payload: { groupId: string; mode: any; target: string; label: string }) => {
      try {
        const { groupId, mode, target, label } = payload
        saveAnnotation(groupId, mode, target, label)
        return { success: true }
      } catch (error) {
        console.error('Failed to save annotation:', error)
        return { success: false, error: error instanceof Error ? error.message : String(error) }
      }
    }
  )

  // 删除单条标注
  ipcMain.handle(
    'annotation:delete',
    async (_event, payload: { groupId: string; target: string }) => {
      try {
        const { groupId, target } = payload
        deleteAnnotation(groupId, target)
        return { success: true }
      } catch (error) {
        console.error('Failed to delete annotation:', error)
        return { success: false, error: error instanceof Error ? error.message : String(error) }
      }
    }
  )

  // 清空某个图片组的全部标注
  ipcMain.handle(
    'annotation:clearGroup',
    async (_event, payload: { groupId: string }) => {
      try {
        const { groupId } = payload
        clearAnnotations(groupId)
        return { success: true }
      } catch (error) {
        console.error('Failed to clear annotations for group:', error)
        return { success: false, error: error instanceof Error ? error.message : String(error) }
      }
    }
  )

  // ============================================
  // 人脸识别相关 IPC handlers
  // ============================================

  // 检查 Python 环境
  ipcMain.handle('face:checkEnvironment', async () => {
    return await checkPythonEnvironment()
  })

  // 批量分析图片
  ipcMain.handle('face:analyzeBatch', async (event, config) => {
    console.log('🚀 IPC face:analyzeBatch handler called with config:', {
      imageCount: config.imagePaths?.length || 0,
      outputFolder: config.outputFolder,
      pythonPath: config.pythonPath,
      enableSecondaryClassification: config.enableSecondaryClassification
    })

    const results = []

    // 将输出文件夹添加到白名单
    if (config.outputFolder) {
      addAllowedPath(config.outputFolder)
    }

    console.log('🔄 Calling analyzeBatchImages with', config.imagePaths.length, 'images')

    // 批量分析
    const analysisResults = await analyzeBatchImages(
      config.imagePaths,
      (progress) => {
        // 发送进度到渲染进程
        event.sender.send('face:analysisProgress', progress)
      },
      config.pythonPath
    )

    console.log('✅ analyzeBatchImages completed, processing', analysisResults.size, 'results')

    // 生成分类路径
    for (const [imagePath, result] of analysisResults) {
      const targetPath = generateClassificationPath(result, config)
      results.push({ imagePath, result, targetPath })
    }

    console.log('📤 Returning', results.length, 'results to renderer')
    return results
  })

  // 执行文件分类移动
  ipcMain.handle('face:classifyAndMove', async (_event, operations) => {
    const moveResults = []

    for (const op of operations) {
      try {
        const fse = await import('fs-extra')
        await fse.ensureDir(op.targetPath)
        const targetFile = path.join(op.targetPath, path.basename(op.sourcePath))
        await fse.move(op.sourcePath, targetFile, { overwrite: false })

        moveResults.push({
          success: true,
          source: op.sourcePath,
          target: targetFile
        })
      } catch (error) {
        moveResults.push({
          success: false,
          source: op.sourcePath,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return moveResults
  })

  // 扫描文件夹中的图片
  ipcMain.handle('face:scanImages', async (_event, folderPath: string) => {
    try {
      const imagePaths = await scanImagesInFolder(folderPath)
      return imagePaths
    } catch (error) {
      console.error('Error scanning images:', error)
      throw error
    }
  })

  // ============================================
  // 文件匹配工具相关 IPC handlers
  // ============================================

  // 匹配源文件
  ipcMain.handle('fileMatcher:matchSourceFiles', async (_event, config) => {
    const { sourceDir, targetDir, outputDir, stripSuffixes, recursive = true, useMove = false } = config

    // 将文件夹添加到白名单
    addAllowedPath(sourceDir)
    addAllowedPath(targetDir)
    addAllowedPath(outputDir)

    try {
      const result = await matchSourceFiles(sourceDir, targetDir, outputDir, stripSuffixes, recursive, useMove)
      return result
    } catch (error) {
      console.error('Error matching source files:', error)
      throw error
    }
  })

  // 匹配派生文件
  ipcMain.handle('fileMatcher:matchDerivedFiles', async (_event, config) => {
    const { baseDir, targetDir, outputDir, stripSuffixes, recursive = true, useMove = false } = config

    // 将文件夹添加到白名单
    addAllowedPath(baseDir)
    addAllowedPath(targetDir)
    addAllowedPath(outputDir)

    try {
      const result = await matchDerivedFiles(baseDir, targetDir, outputDir, stripSuffixes, recursive, useMove)
      return result
    } catch (error) {
      console.error('Error matching derived files:', error)
      throw error
    }
  })

  // 文件分类
  ipcMain.handle('fileMatcher:classifyFiles', async (_event, config) => {
    const { sourceDir, outputDir, derivedSuffixes, recursive = true, useMove = false } = config

    // 将文件夹添加到白名单
    addAllowedPath(sourceDir)
    addAllowedPath(outputDir)

    try {
      const result = await classifyFiles(sourceDir, outputDir, derivedSuffixes, recursive, useMove)
      return result
    } catch (error) {
      console.error('Error classifying files:', error)
      throw error
    }
  })

  // 抽取指定后缀文件
  ipcMain.handle('fileMatcher:extractBySuffix', async (_event, config) => {
    const { sourceDir, outputDir, derivedSuffixes, recursive = true, useMove = false } = config

    // 将文件夹添加到白名单
    addAllowedPath(sourceDir)
    addAllowedPath(outputDir)

    try {
      const result = await extractFilesBySuffix(sourceDir, outputDir, derivedSuffixes, recursive, useMove)
      return result
    } catch (error) {
      console.error('Error extracting files by suffix:', error)
      throw error
    }
  })

  // 文件名检索
  ipcMain.handle('fileSearch:searchByName', async (_event, query) => {
    const { rootDir } = query || {}

    if (!rootDir) {
      throw new Error('rootDir 不能为空')
    }

    // 将搜索根目录加入白名单，限制访问范围
    addAllowedPath(rootDir)

    try {
      const result = await searchFilesByName(query)
      return result
    } catch (error) {
      console.error('Error searching files by name:', error)
      throw error
    }
  })

  // 将检索结果复制/移动到指定文件夹
  ipcMain.handle('fileSearch:copyFiles', async (_event, payload) => {
    const { sourcePaths, targetDir, useMove = false } = payload || {}

    if (!Array.isArray(sourcePaths) || sourcePaths.length === 0) {
      throw new Error('sourcePaths 不能为空')
    }
    if (!targetDir) {
      throw new Error('targetDir 不能为空')
    }

    addAllowedPath(targetDir)

    try {
      const result = await transferFiles(sourcePaths, targetDir, useMove)
      return result
    } catch (error) {
      console.error('Error copying files from search results:', error)
      throw error
    }
  })

  // 在 Finder/资源管理器中打开文件所在文件夹并选中文件
  ipcMain.handle('fileSearch:openInFinder', async (_event, filePath: string) => {
    if (!filePath) {
      throw new Error('filePath 不能为空')
    }

    // 验证路径是否安全（必须在白名单中）
    const normalizedPath = path.normalize(path.resolve(filePath))
    const isAllowed = Array.from(allowedPaths).some(
      allowedPath => normalizedPath.startsWith(allowedPath)
    )

    if (!isAllowed) {
      throw new Error('无权访问该文件路径')
    }

    try {
      // 使用 shell.showItemInFolder 在 Finder/资源管理器中打开并选中文件
      shell.showItemInFolder(normalizedPath)
      return { success: true }
    } catch (error) {
      console.error('Error opening file in Finder:', error)
      throw error
    }
  })
}

// ===========================================
// GPU 崩溃恢复机制
// ===========================================

// GPU 进程崩溃恢复
app.on('gpu-process-crashed', (event, killed) => {
  console.error('⚠️ [GPU] GPU 进程崩溃，正在恢复...', { killed })

  if (mainWindow && !mainWindow.isDestroyed()) {
    // 重新加载窗口
    mainWindow.reload()
    console.log('✓ [GPU] 窗口已重新加载')
  }
})

// 渲染进程崩溃恢复
app.on('render-process-gone', (event, webContents, details) => {
  console.error('⚠️ [渲染] 渲染进程异常退出:', details)

  if (mainWindow && !mainWindow.isDestroyed()) {
    if (details.reason === 'crashed') {
      console.warn('⚠️ [GPU] 检测到崩溃，禁用硬件加速后重启')
      // 禁用硬件加速后重新加载
      app.disableHardwareAcceleration()
      mainWindow.reload()
    }
  }
})

// 子进程异常退出
app.on('child-process-gone', (event, details) => {
  console.error('⚠️ [子进程] 子进程异常退出:', details)
})

// 当 Electron 完成初始化时创建窗口
app.whenReady().then(() => {
  // 初始化数据库
  try {
    initDatabase()
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }

  // 注册自定义协议以访问本地文件（带安全验证）
  let protocolCallCount = 0
  protocol.registerFileProtocol('local', (request, callback) => {
    const startTime = performance.now()
    const url = request.url.replace('local://', '')
    try {
      const filePath = decodeURIComponent(url)

      // 安全检查：验证路径是否安全
      if (!isPathSafe(filePath)) {
        console.error('Access denied: unsafe path', filePath)
        return callback({ error: -10 }) // 返回错误
      }

      const duration = performance.now() - startTime
      protocolCallCount++

      if (duration > 5) {
        console.warn(`⚠️ [性能] local:// 协议处理耗时: ${duration.toFixed(2)}ms (#${protocolCallCount})`)
      }

      // 每100次调用输出一次统计
      if (protocolCallCount % 100 === 0) {
        console.log(`📊 [统计] local:// 协议已调用 ${protocolCallCount} 次`)
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
    // 在 macOS 上，当点击 dock 图标时显示窗口
    if (mainWindow) {
      mainWindow.show()
    } else {
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
  app.isQuitting = true
  closeDatabase()
})
