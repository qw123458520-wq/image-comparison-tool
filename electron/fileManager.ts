/**
 * 文件管理模块 - 处理文件扫描、移动、复制等操作
 */

import * as fs from 'fs-extra'
import * as path from 'path'

/**
 * 扫描目录获取所有图片文件
 * @param folderPath 目录路径
 * @param extensions 支持的文件扩展名
 * @param recursive 是否递归扫描子文件夹（默认：true）
 */
export async function scanImages(
  folderPath: string,
  extensions: string[],
  recursive: boolean = true
): Promise<string[]> {
  try {
    if (!(await fs.pathExists(folderPath))) {
      throw new Error(`Directory not found: ${folderPath}`)
    }

    const imagePaths: string[] = []

    async function scanDirectory(dir: string) {
      const files = await fs.readdir(dir)

      for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = await fs.stat(filePath)

        if (stat.isFile()) {
          const ext = path.extname(file).toLowerCase()
          if (extensions.includes(ext)) {
            imagePaths.push(filePath)
          }
        } else if (stat.isDirectory() && recursive) {
          // 递归扫描子文件夹
          await scanDirectory(filePath)
        }
      }
    }

    await scanDirectory(folderPath)
    return imagePaths.sort()
  } catch (error) {
    console.error('Failed to scan images:', error)
    throw error
  }
}

/**
 * 移动文件到目标位置
 */
export async function moveFile(
  sourcePath: string,
  targetDir: string,
  filename?: string
): Promise<string> {
  try {
    await fs.ensureDir(targetDir)

    const targetFilename = filename || path.basename(sourcePath)
    const targetPath = path.join(targetDir, targetFilename)

    // 如果目标文件已存在，添加序号后缀
    let finalTargetPath = targetPath
    let counter = 1
    while (await fs.pathExists(finalTargetPath)) {
      const ext = path.extname(targetFilename)
      const nameWithoutExt = path.basename(targetFilename, ext)
      finalTargetPath = path.join(
        targetDir,
        `${nameWithoutExt}_${counter}${ext}`
      )
      counter++
    }

    await fs.move(sourcePath, finalTargetPath)
    return finalTargetPath
  } catch (error) {
    console.error('Failed to move file:', error)
    throw error
  }
}

/**
 * 复制文件到目标位置
 * 如果目标文件已存在，自动添加数字后缀
 */
export async function copyFile(
  sourcePath: string,
  targetDir: string,
  filename?: string
): Promise<string> {
  try {
    await fs.ensureDir(targetDir)

    const targetFilename = filename || path.basename(sourcePath)
    const targetPath = path.join(targetDir, targetFilename)

    // 如果目标文件已存在，添加序号后缀
    let finalTargetPath = targetPath
    let counter = 1
    while (await fs.pathExists(finalTargetPath)) {
      const ext = path.extname(targetFilename)
      const nameWithoutExt = path.basename(targetFilename, ext)
      finalTargetPath = path.join(
        targetDir,
        `${nameWithoutExt}_${counter}${ext}`
      )
      counter++
    }

    await fs.copy(sourcePath, finalTargetPath)
    return finalTargetPath
  } catch (error) {
    console.error('Failed to copy file:', error)
    throw error
  }
}

/**
 * 检查文件是否存在
 */
export async function fileExists(filePath: string): Promise<boolean> {
  return fs.pathExists(filePath)
}

/**
 * 获取文件信息
 */
export async function getFileInfo(filePath: string) {
  try {
    const stat = await fs.stat(filePath)
    return {
      path: filePath,
      name: path.basename(filePath),
      size: stat.size,
      modified: stat.mtime,
      isFile: stat.isFile(),
      isDirectory: stat.isDirectory(),
    }
  } catch (error) {
    console.error('Failed to get file info:', error)
    throw error
  }
}

/**
 * 批量移动文件
 */
export async function moveFiles(
  operations: Array<{ source: string; target: string }>
): Promise<{ success: string[]; failed: Array<{ path: string; error: string }> }> {
  const success: string[] = []
  const failed: Array<{ path: string; error: string }> = []

  for (const op of operations) {
    try {
      const targetDir = path.dirname(op.target)
      await moveFile(op.source, targetDir, path.basename(op.target))
      success.push(op.source)
    } catch (error) {
      failed.push({
        path: op.source,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { success, failed }
}
