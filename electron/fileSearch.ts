/**
 * 文件名检索模块
 */

import * as fs from 'fs-extra'
import * as path from 'path'
import { copyFile, moveFile } from './fileManager'
import type { FileSearchQuery, FileSearchResult, FileSearchResultItem } from './types'

// 常用文件类型映射（与前端保持一致）
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.psd', '.heic']
const VIDEO_EXTS = ['.mp4', '.mov', '.avi', '.mkv', '.wmv']
const AUDIO_EXTS = ['.mp3', '.wav', '.flac', '.aac', '.m4a']
const DOCUMENT_EXTS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.rtf']
const ARCHIVE_EXTS = ['.zip', '.rar', '.7z', '.tar', '.gz']

function getExtensionsByType(
  typeFilter: FileSearchQuery['typeFilter'],
  customExtensions?: string[]
): string[] | undefined {
  switch (typeFilter) {
    case 'image':
      return IMAGE_EXTS
    case 'video':
      return VIDEO_EXTS
    case 'audio':
      return AUDIO_EXTS
    case 'document':
      return DOCUMENT_EXTS
    case 'archive':
      return ARCHIVE_EXTS
    case 'custom':
      if (!customExtensions || customExtensions.length === 0) return undefined
      return customExtensions.map((ext) => (ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`))
    case 'all':
    default:
      return undefined
  }
}

/**
 * 通用文件扫描
 */
export async function scanFiles(
  rootDir: string,
  includeSubdirs: boolean,
  extensions?: string[]
): Promise<FileSearchResultItem[]> {
  const results: FileSearchResultItem[] = []

  async function walk(dir: string) {
    const entries = await fs.readdir(dir)

    for (const entry of entries) {
      const fullPath = path.join(dir, entry)
      const stat = await fs.stat(fullPath)

      if (stat.isDirectory()) {
        if (includeSubdirs) {
          await walk(fullPath)
        }
      } else if (stat.isFile()) {
        const ext = path.extname(entry).toLowerCase()
        if (!extensions || extensions.length === 0 || extensions.includes(ext)) {
          results.push({
            path: fullPath,
            name: entry,
            size: stat.size,
            modified: stat.mtime.toISOString(),
            ext,
            isDirectory: false,
          })
        }
      }
    }
  }

  await walk(rootDir)
  return results
}

/**
 * 按文件名关键字检索文件
 */
export async function searchFilesByName(query: FileSearchQuery): Promise<FileSearchResult> {
  const {
    rootDir,
    keyword,
    matchMode,
    caseSensitive = false,
    includeSubdirs = true,
    typeFilter = 'all',
    customExtensions,
    maxResults = 5000,
  } = query

  if (!(await fs.pathExists(rootDir))) {
    throw new Error(`目录不存在: ${rootDir}`)
  }

  const extensions = getExtensionsByType(typeFilter, customExtensions)
  const allFiles = await scanFiles(rootDir, includeSubdirs, extensions)

  // 处理多关键字：优先使用 query.keywords，其次退回到单个 keyword
  const rawKeywords = Array.isArray(query.keywords)
    ? query.keywords.filter((k) => !!k && k.trim().length > 0)
    : (keyword ? [keyword] : [])

  // 多关键字匹配方式：默认“任意一个匹配”（OR）
  const matchAll = query.matchAll === true

  const normalizedKeywords = rawKeywords.map((k) =>
    caseSensitive ? k.trim() : k.trim().toLowerCase()
  )

  let regexList: RegExp[] | null = null

  if (matchMode === 'regex' && rawKeywords.length > 0) {
    try {
      regexList = rawKeywords.map(
        (k) => new RegExp(k, caseSensitive ? undefined : 'i')
      )
    } catch (e) {
      throw new Error(`无效的正则表达式: ${String(e)}`)
    }
  }

  const matched: FileSearchResultItem[] = []

  for (const item of allFiles) {
    const nameToCheck = caseSensitive ? item.name : item.name.toLowerCase()

    let isMatch = false

    // 无关键字且非正则：认为所有文件都匹配（仅受类型过滤限制）
    if (normalizedKeywords.length === 0 && matchMode !== 'regex') {
      isMatch = true
    } else if (matchMode === 'regex') {
      if (regexList && regexList.length > 0) {
        const matcher = (re: RegExp) => re.test(item.name)
        isMatch = matchAll
          ? regexList.every(matcher)
          : regexList.some(matcher)
      }
    } else {
      const matcher = (kw: string) => {
        switch (matchMode) {
          case 'startsWith':
            return nameToCheck.startsWith(kw)
          case 'endsWith':
            return nameToCheck.endsWith(kw)
          case 'contains':
          default:
            return nameToCheck.includes(kw)
        }
      }

      if (normalizedKeywords.length > 0) {
        isMatch = matchAll
          ? normalizedKeywords.every(matcher)
          : normalizedKeywords.some(matcher)
      }
    }

    if (isMatch) {
      matched.push(item)
      if (matched.length >= maxResults) {
        break
      }
    }
  }

  return {
    items: matched,
    total: matched.length,
  }
}

/**
 * 将指定文件复制/移动到目标文件夹
 */
export async function transferFiles(
  sourcePaths: string[],
  targetDir: string,
  useMove: boolean = false
): Promise<{ success: number; failed: Array<{ path: string; error: string }> }> {
  const failed: Array<{ path: string; error: string }> = []
  let success = 0

  try {
    await fs.ensureDir(targetDir)

    for (const src of sourcePaths) {
      try {
        if (useMove) {
          await moveFile(src, targetDir)
        } else {
          await copyFile(src, targetDir)
        }
        success++
      } catch (error) {
        failed.push({
          path: src,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { success, failed }
  } catch (error) {
    throw new Error(
      `复制/移动文件失败: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

