/**
 * Python 脚本调用管理器
 * 负责调用 Python 人脸分析脚本
 */

import { spawn } from 'child_process'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as fs from 'fs-extra'
import { app } from 'electron'

// ES Module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Python 脚本路径（修复开发模式下的路径问题）
// 在开发模式下，__dirname 指向 dist-electron，需要回到项目根目录
const isDev = !app.isPackaged
const projectRoot = isDev ? path.join(__dirname, '..') : path.dirname(app.getPath('exe'))
const PYTHON_SCRIPT_DIR = isDev
  ? path.join(projectRoot, 'electron', 'python')
  : path.join(process.resourcesPath, 'python')
const FACE_ANALYZER_SCRIPT = path.join(PYTHON_SCRIPT_DIR, 'face_analyzer.py')

console.log('🐍 Python script path:', FACE_ANALYZER_SCRIPT)

// Python 可执行文件路径（支持多平台）
const PYTHON_EXECUTABLES = ['python3', 'python']

/**
 * 人脸分析结果接口
 */
export interface FaceAnalysisResult {
  success: boolean
  image_path?: string
  face_count?: number
  faces?: Array<{
    face_id: number
    gender: 'male' | 'female'
    gender_confidence: number
    age_range: string
    age_estimated: number
    region?: any
  }>
  processing_time?: number
  error?: string
  error_code?: string
}

/**
 * 批量分析进度回调
 */
export interface AnalysisProgress {
  total: number
  current: number
  currentFile: string
  result?: FaceAnalysisResult
}

/**
 * 分类配置
 */
export interface ClassificationConfig {
  outputFolder: string
  enableSecondaryClassification: boolean
  ageRanges: string[]
}

/**
 * 检查 Python 环境
 */
export async function checkPythonEnvironment(): Promise<{
  available: boolean
  pythonPath?: string
  version?: string
  deepfaceInstalled?: boolean
  error?: string
}> {
  // 尝试找到可用的 Python
  for (const pythonCmd of PYTHON_EXECUTABLES) {
    try {
      const versionResult = await execPython(pythonCmd, ['--version'])

      if (versionResult.success) {
        // 检查 deepface 是否安装
        const checkResult = await execPython(pythonCmd, [
          '-c',
          'import deepface; print(deepface.__version__)'
        ])

        return {
          available: true,
          pythonPath: pythonCmd,
          version: versionResult.stdout?.trim(),
          deepfaceInstalled: checkResult.success
        }
      }
    } catch (error) {
      continue
    }
  }

  return {
    available: false,
    error: 'Python 未找到或 deepface 未安装'
  }
}

/**
 * 执行 Python 命令
 */
function execPython(
  pythonPath: string,
  args: string[],
  timeout: number = 10000
): Promise<{
  success: boolean
  stdout?: string
  stderr?: string
  error?: string
}> {
  return new Promise((resolve) => {
    const process = spawn(pythonPath, args)

    let stdout = ''
    let stderr = ''
    let timeoutId: NodeJS.Timeout | null = null

    // 设置超时
    timeoutId = setTimeout(() => {
      process.kill()
      resolve({
        success: false,
        error: 'Process timeout'
      })
    }, timeout)

    process.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    process.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    process.on('close', (code) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      resolve({
        success: code === 0,
        stdout,
        stderr
      })
    })

    process.on('error', (error) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      resolve({
        success: false,
        error: error.message
      })
    })
  })
}

/**
 * 分析单张图片
 */
export async function analyzeSingleImage(
  imagePath: string,
  pythonPath: string = 'python3'
): Promise<FaceAnalysisResult> {
  try {
    // 验证图片文件存在
    if (!(await fs.pathExists(imagePath))) {
      return {
        success: false,
        error: 'Image file not found',
        error_code: 'FILE_NOT_FOUND'
      }
    }

    // 验证脚本文件存在
    if (!(await fs.pathExists(FACE_ANALYZER_SCRIPT))) {
      return {
        success: false,
        error: 'Python script not found',
        error_code: 'SCRIPT_NOT_FOUND'
      }
    }

    // 执行 Python 脚本（超时时间延长到 60 秒，因为人脸分析比较慢）
    const result = await execPython(pythonPath, [FACE_ANALYZER_SCRIPT, imagePath], 60000)

    if (!result.success) {
      console.error('❌ Python execution failed:', {
        imagePath,
        stderr: result.stderr,
        error: result.error
      })
      return {
        success: false,
        error: result.stderr || result.error,
        error_code: 'EXECUTION_ERROR'
      }
    }

    // 解析 JSON 输出
    try {
      const analysisResult: FaceAnalysisResult = JSON.parse(result.stdout!)
      console.log('✅ Python analysis success:', imagePath, 'faces:', analysisResult.face_count)
      return analysisResult
    } catch (parseError) {
      console.error('❌ JSON parse error:', {
        imagePath,
        stdout: result.stdout,
        parseError
      })
      return {
        success: false,
        error: 'Failed to parse Python output: ' + result.stdout,
        error_code: 'PARSE_ERROR'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      error_code: 'UNKNOWN_ERROR'
    }
  }
}

/**
 * 批量分析图片
 */
export async function analyzeBatchImages(
  imagePaths: string[],
  onProgress?: (progress: AnalysisProgress) => void,
  pythonPath: string = 'python3'
): Promise<Map<string, FaceAnalysisResult>> {
  console.log('🔍 Starting batch analysis:', {
    totalImages: imagePaths.length,
    pythonPath,
    firstImage: imagePaths[0]
  })

  const results = new Map<string, FaceAnalysisResult>()
  const total = imagePaths.length

  for (let i = 0; i < imagePaths.length; i++) {
    const imagePath = imagePaths[i]

    console.log(`🔍 Analyzing image ${i + 1}/${total}:`, imagePath)

    // 发送进度通知
    if (onProgress) {
      onProgress({
        total,
        current: i + 1,
        currentFile: imagePath
      })
    }

    // 分析图片
    const result = await analyzeSingleImage(imagePath, pythonPath)
    results.set(imagePath, result)

    // 发送结果通知
    if (onProgress) {
      onProgress({
        total,
        current: i + 1,
        currentFile: imagePath,
        result
      })
    }
  }

  return results
}

/**
 * 根据分析结果生成分类路径
 */
export function generateClassificationPath(
  result: FaceAnalysisResult,
  config: ClassificationConfig
): string {
  if (!result.success || result.face_count === undefined) {
    return path.join(config.outputFolder, '分析失败')
  }

  const faceCount = result.face_count
  let classPath = path.join(config.outputFolder, `${faceCount}人脸`)

  // 如果没有检测到人脸或不启用二级分类，直接返回
  if (faceCount === 0 || !config.enableSecondaryClassification) {
    return classPath
  }

  // 如果启用二级分类且有人脸
  if (result.faces && result.faces.length > 0) {
    // 按性别分类
    const genders = result.faces.map((f) => f.gender)
    let genderCategory: string

    if (faceCount === 1) {
      // 单人脸：直接使用性别
      genderCategory = genders[0] === 'male' ? '男性' : '女性'
    } else {
      // 多人脸：判断是全男、全女还是混合
      const maleCount = genders.filter((g) => g === 'male').length
      const femaleCount = genders.filter((g) => g === 'female').length

      if (maleCount === faceCount) {
        genderCategory = '男性'
      } else if (femaleCount === faceCount) {
        genderCategory = '女性'
      } else {
        genderCategory = '混合'
      }
    }

    classPath = path.join(classPath, genderCategory)

    // 按年龄段分类（取第一个人脸的年龄段）
    if (result.faces[0].age_range) {
      classPath = path.join(classPath, result.faces[0].age_range)
    }
  }

  return classPath
}

/**
 * 扫描文件夹中的图片文件
 */
export async function scanImagesInFolder(folderPath: string): Promise<string[]> {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp']
  const imagePaths: string[] = []

  try {
    // 检查文件夹是否存在
    if (!(await fs.pathExists(folderPath))) {
      throw new Error('Folder not found: ' + folderPath)
    }

    // 读取文件夹中的所有文件
    const files = await fs.readdir(folderPath)

    // 过滤出图片文件
    for (const file of files) {
      const ext = path.extname(file).toLowerCase()
      if (imageExtensions.includes(ext)) {
        imagePaths.push(path.join(folderPath, file))
      }
    }

    return imagePaths
  } catch (error) {
    console.error('Error scanning folder:', error)
    throw error
  }
}
