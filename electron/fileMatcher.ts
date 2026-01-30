/**
 * 文件匹配模块 - 实现文件匹配和复制功能
 * 参考 Python 脚本：匹配源文件.py 和 匹配派生文件.py
 */

import * as path from 'path'
import { scanImages, copyFile, moveFile } from './fileManager'
import * as fs from 'fs-extra'

// 支持的文件扩展名
const SUPPORTED_EXTS = ['.jpg', '.jpeg', '.png', '.psd']

/**
 * 提取主体名（匹配源文件模式）
 * 支持多个可配置后缀，只在结尾匹配时才剥离
 */
function getSubjectForSourceFile(name: string, stripSuffixes: string[]): string {
  let normalized = name.trim().toLowerCase()

  // 按长度从长到短排序，优先匹配更长的后缀
  const sortedSuffixes = [...stripSuffixes].sort((a, b) => b.length - a.length)

  for (const suffix of sortedSuffixes) {
    if (normalized.endsWith(suffix.toLowerCase())) {
      return normalized.slice(0, -suffix.length)
    }
  }

  return normalized
}

/**
 * 提取主体名（匹配派生文件模式）
 * 只去掉 _e 后缀（如果存在）
 */
function getSubjectForDerivedFile(name: string): string {
  const normalized = name.trim().toLowerCase()
  if (normalized.endsWith('_e')) {
    return normalized.slice(0, -2)
  }
  return normalized
}

/**
 * 匹配源文件
 * 从源文件夹（结果图）和目标文件夹（原图）中匹配文件
 * 根据主体名（剥离可配置后缀）进行匹配并复制
 */
export async function matchSourceFiles(
  sourceDir: string,      // 结果图文件夹
  targetDir: string,       // 原图文件夹
  outputDir: string,       // 输出文件夹
  stripSuffixes: string[],   // 需要剥离的后缀列表
  recursive: boolean = true,  // 是否递归扫描子文件夹（默认：true）
  useMove: boolean = false   // 是否移动文件（默认：false，即复制）
): Promise<{ success: number; failed: Array<{ path: string; error: string }> }> {
  const failed: Array<{ path: string; error: string }> = []
  let success = 0

  try {
    // ① 收集源文件夹中的文件
    const sourceFiles = await scanImages(sourceDir, SUPPORTED_EXTS, recursive)
    
    // 收集源文件夹中的主体名（已剥离后缀）
    const sourceSubjects = new Set<string>()
    for (const file of sourceFiles) {
      const name = path.parse(path.basename(file)).name
      const subject = getSubjectForSourceFile(name, stripSuffixes)
      sourceSubjects.add(subject)
    }

    // ② 扫描目标文件夹，匹配主体名
    const targetFiles = await scanImages(targetDir, SUPPORTED_EXTS, recursive)
    const copiedSubjects = new Set<string>()

    for (const targetFile of targetFiles) {
      try {
        const name = path.parse(path.basename(targetFile)).name
        const subject = getSubjectForSourceFile(name, stripSuffixes)

        // 同一主体只复制一次
        if (copiedSubjects.has(subject)) {
          continue
        }

        // 如果主体名在源文件夹中存在，则复制或移动
        if (sourceSubjects.has(subject)) {
          if (useMove) {
            await moveFile(targetFile, outputDir)
          } else {
            await copyFile(targetFile, outputDir)
          }
          copiedSubjects.add(subject)
          success++
        }
      } catch (error) {
        failed.push({
          path: targetFile,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { success, failed }
  } catch (error) {
    throw new Error(
      `匹配源文件失败: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * 匹配派生文件
 * 从基准文件夹和派生文件夹中匹配文件
 * 根据主体名（剥离可配置后缀）进行匹配并复制
 */
export async function matchDerivedFiles(
  baseDir: string,         // 基准文件夹（源文件夹）
  targetDir: string,       // 派生文件夹
  outputDir: string,        // 输出文件夹
  stripSuffixes: string[],   // 需要剥离的后缀列表
  recursive: boolean = true, // 是否递归扫描子文件夹（默认：true）
  useMove: boolean = false   // 是否移动文件（默认：false，即复制）
): Promise<{ success: number; failed: Array<{ path: string; error: string }> }> {
  const failed: Array<{ path: string; error: string }> = []
  let success = 0

  try {
    // ① 收集基准文件夹中的文件，建立主体名集合
    const baseFiles = await scanImages(baseDir, SUPPORTED_EXTS, recursive)
    const baseSubjects = new Set<string>()

    for (const file of baseFiles) {
      const name = path.parse(path.basename(file)).name
      const subject = getSubjectForSourceFile(name, stripSuffixes)
      baseSubjects.add(subject)
    }

    // ② 扫描派生文件夹，只复制命中的文件
    const targetFiles = await scanImages(targetDir, SUPPORTED_EXTS, recursive)

    for (const targetFile of targetFiles) {
      try {
        const name = path.parse(path.basename(targetFile)).name
        const subject = getSubjectForSourceFile(name, stripSuffixes)

        // 如果主体名在基准文件夹中存在，则复制或移动
        if (baseSubjects.has(subject)) {
          if (useMove) {
            await moveFile(targetFile, outputDir)
          } else {
            await copyFile(targetFile, outputDir)
          }
          success++
        }
      } catch (error) {
        failed.push({
          path: targetFile,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { success, failed }
  } catch (error) {
    throw new Error(
      `匹配派生文件失败: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * 获取派生后缀（严格按照 Python 脚本实现）
 * 返回匹配的派生后缀；否则返回 null
 */
function getDerivedSuffix(filename: string, derivedSuffixes: string[]): string | null {
  const parsed = path.parse(filename)
  const name = parsed.name  // 不含扩展名的文件名
  const ext = parsed.ext.toLowerCase()  // 扩展名（小写）

  // 检查扩展名是否在支持列表中
  if (!SUPPORTED_EXTS.includes(ext)) {
    return null
  }

  // 遍历派生后缀列表，检查文件名是否以某个后缀结尾（区分大小写）
  for (const suffix of derivedSuffixes) {
    if (name.endsWith(suffix)) {
      return suffix
    }
  }

  return null
}

/**
 * 文件分类功能
 * 严格按照 Python 脚本 区分.py 的逻辑实现
 * - PSD文件 → psd子文件夹
 * - 带派生后缀的文件 → 对应后缀的子文件夹
 * - 其他文件 → originals子文件夹
 */
export async function classifyFiles(
  sourceDir: string,           // 源文件夹
  outputDir: string,           // 输出根文件夹
  derivedSuffixes: string[],   // 派生后缀列表
  recursive: boolean = true,   // 是否递归扫描子文件夹（默认：true）
  useMove: boolean = false     // 是否移动文件（默认：false，即复制）
): Promise<{ success: number; failed: Array<{ path: string; error: string }>; csvPath?: string }> {
  const failed: Array<{ path: string; error: string }> = []
  let success = 0
  const csvRecords: Array<{
    filename: string
    type: string
    matched_suffix: string
    source_path: string
    target_path: string
  }> = []

  try {
    // 创建输出子文件夹
    const originalsDir = path.join(outputDir, 'originals')
    const psdDir = path.join(outputDir, 'psd')
    await fs.ensureDir(originalsDir)
    await fs.ensureDir(psdDir)

    // 为每个派生后缀创建子文件夹
    for (const suffix of derivedSuffixes) {
      await fs.ensureDir(path.join(outputDir, suffix))
    }

    // 扫描所有文件（递归或非递归）
    const allFiles = await scanImages(sourceDir, SUPPORTED_EXTS, recursive)

    // 严格按照 Python 脚本的逻辑处理每个文件
    for (const filePath of allFiles) {
      try {
        const filename = path.basename(filePath)  // 获取文件名（不含路径）
        const parsed = path.parse(filename)
        const name = parsed.name  // 不含扩展名的文件名
        const ext = parsed.ext.toLowerCase()  // 扩展名（小写）

        // 只处理支持的格式（scanImages 已经过滤，但这里再次检查以确保一致性）
        if (!SUPPORTED_EXTS.includes(ext)) {
          continue
        }

        let targetDir: string
        let fileType: string
        let matchedSuffix = ''

        // 1️⃣ PSD 优先分流（与 Python 脚本完全一致）
        if (ext === '.psd') {
          targetDir = psdDir
          fileType = 'psd'
        } else {
          // 2️⃣ 非 PSD：判断是否派生图（严格按照 Python 脚本的 get_derived_suffix 逻辑）
          const suffix = getDerivedSuffix(filename, derivedSuffixes)
          if (suffix) {
            // 有匹配的后缀，放到对应后缀的文件夹
            targetDir = path.join(outputDir, suffix)
            fileType = 'derived'
            matchedSuffix = suffix
          } else {
            // 3️⃣ 原生图
            targetDir = originalsDir
            fileType = 'original'
          }
        }

        // 执行复制或移动
        let finalTargetPath: string
        if (useMove) {
          finalTargetPath = await moveFile(filePath, targetDir)
        } else {
          finalTargetPath = await copyFile(filePath, targetDir)
        }

        csvRecords.push({
          filename,
          type: fileType,
          matched_suffix: matchedSuffix,
          source_path: filePath,
          target_path: finalTargetPath,
        })

        success++
      } catch (error) {
        failed.push({
          path: filePath,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // 生成 CSV 日志（使用 UTF-8 BOM 编码，兼容 Excel）
    const csvPath = path.join(outputDir, 'classify_log.csv')
    const csvContent = [
      ['filename', 'type', 'matched_suffix', 'source_path', 'target_path'].join(','),
      ...csvRecords.map((record) =>
        [
          `"${record.filename.replace(/"/g, '""')}"`,
          `"${record.type}"`,
          `"${record.matched_suffix}"`,
          `"${record.source_path.replace(/"/g, '""')}"`,
          `"${record.target_path.replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ].join('\n')

    // 添加 UTF-8 BOM 以便 Excel 正确识别中文
    const csvWithBOM = '\uFEFF' + csvContent
    await fs.writeFile(csvPath, csvWithBOM, 'utf-8')

    return { success, failed, csvPath }
  } catch (error) {
    throw new Error(
      `文件分类失败: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * 抽取指定后缀文件
 * 参考 Python 脚本：抽取指定后缀文件.py
 * - 只处理带指定后缀的文件
 * - 每个后缀对应一个子文件夹：outputDir/<suffix>
 * - 支持复制或移动，与其他模块保持一致
 */
export async function extractFilesBySuffix(
  sourceDir: string,          // 源文件夹
  outputDir: string,          // 输出根目录
  derivedSuffixes: string[],  // 需要匹配的派生后缀列表
  recursive: boolean = true,  // 是否递归扫描子文件夹（默认：true）
  useMove: boolean = false    // 是否移动文件（默认：false，即复制）
): Promise<{ success: number; failed: Array<{ path: string; error: string }> }> {
  const failed: Array<{ path: string; error: string }> = []
  let success = 0

  try {
    if (!Array.isArray(derivedSuffixes) || derivedSuffixes.length === 0) {
      // 如果没有配置任何后缀，直接返回
      return { success: 0, failed: [] }
    }

    // 为每个派生后缀创建子文件夹
    for (const suffix of derivedSuffixes) {
      await fs.ensureDir(path.join(outputDir, suffix))
    }

    // 扫描所有支持的文件
    const allFiles = await scanImages(sourceDir, SUPPORTED_EXTS, recursive)

    for (const filePath of allFiles) {
      try {
        const filename = path.basename(filePath)
        const suffix = getDerivedSuffix(filename, derivedSuffixes)

        // 只处理命中后缀的文件
        if (!suffix) {
          continue
        }

        const targetDir = path.join(outputDir, suffix)

        // 执行复制或移动，内部已处理重名冲突
        if (useMove) {
          await moveFile(filePath, targetDir)
        } else {
          await copyFile(filePath, targetDir)
        }

        success++
      } catch (error) {
        failed.push({
          path: filePath,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { success, failed }
  } catch (error) {
    throw new Error(
      `抽取指定后缀文件失败: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
