/**
 * 图片匹配引擎 - 根据配置规则匹配原图和派生图
 */

import * as path from 'path'
import { scanImages, fileExists } from './fileManager'
import type { Config, ImageGroup, MatchResult } from './types'
import { nanoid } from 'nanoid'

/**
 * 根据后缀模式查找派生文件
 * 支持跨格式匹配
 * 例如: image.jpg -> image_a.jpg, image_a.png, image_b.jpg
 */
async function findDerivatives(
  originalPath: string,
  suffixPatterns: string[],
  fileExtensions: string[]
): Promise<string[]> {
  const parsed = path.parse(originalPath)
  const derivatives: string[] = []

  // 遍历所有后缀模式和文件扩展名的组合
  for (const suffix of suffixPatterns) {
    for (const ext of fileExtensions) {
      const derivativePath = path.join(
        parsed.dir,
        `${parsed.name}${suffix}${ext}`
      )

      if (await fileExists(derivativePath)) {
        derivatives.push(derivativePath)
      }
    }
  }

  return derivatives
}

/**
 * 检查文件名是否包含派生后缀
 */
function hasDerivativeSuffix(
  filename: string,
  suffixPatterns: string[]
): boolean {
  const nameWithoutExt = path.parse(filename).name
  return suffixPatterns.some((suffix) => nameWithoutExt.endsWith(suffix))
}

/**
 * 单文件夹派生模式匹配
 * 在同一个文件夹中查找原图及其派生图
 */
async function matchSingleFolderDerivatives(
  config: Config
): Promise<ImageGroup[]> {
  const { sourceFolder } = config.matchRules
  const { suffixPatterns, fileExtensions } = config.matchRules

  if (!sourceFolder) {
    throw new Error('Source folder is required for single-folder mode')
  }

  // 扫描所有图片
  const allImages = await scanImages(sourceFolder, fileExtensions)

  // 过滤出原图（不包含派生后缀的文件）
  const originalImages = allImages.filter(
    (img) => !hasDerivativeSuffix(path.basename(img), suffixPatterns)
  )

  // 为每张原图查找派生图
  const groups: ImageGroup[] = []

  for (const original of originalImages) {
    const derivatives = await findDerivatives(
      original,
      suffixPatterns,
      fileExtensions
    )

    // 只有存在派生图的原图才创建分组
    if (derivatives.length > 0) {
      groups.push({
        id: nanoid(),
        original,
        derivatives,
      })
    }
  }

  return groups
}

/**
 * 固定分组模式匹配
 * 将文件夹中的图片按固定数量分组
 */
async function matchFixedGroupSize(
  config: Config
): Promise<ImageGroup[]> {
  const { sourceFolder, groupSize, fileExtensions } = config.matchRules

  if (!sourceFolder) {
    throw new Error('源文件夹未配置，请在配置中设置源文件夹路径')
  }

  if (!groupSize || groupSize < 1) {
    throw new Error('分组数量必须至少为1')
  }

  // 扫描所有图片
  const allImages = await scanImages(sourceFolder, fileExtensions)

  // 按文件名排序
  const sortedImages = allImages.sort((a, b) => {
    const aName = path.basename(a)
    const bName = path.basename(b)
    return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' })
  })

  // 按固定数量分组
  const groups: ImageGroup[] = []

  for (let i = 0; i < sortedImages.length; i += groupSize) {
    const groupImages = sortedImages.slice(i, i + groupSize)

    // 只要组内有至少1张图就创建分组
    if (groupImages.length >= 1) {
      const original = groupImages[0]
      const derivatives = groupImages.slice(1)

      groups.push({
        id: nanoid(),
        original,
        derivatives,
      })
    }
  }

  return groups
}

/**
 * 文件夹对文件夹模式匹配
 * 从多个文件夹中按顺序抽取图片组合成图片组
 * 每个文件夹按文件名排序后抽取对应索引的图片
 */
async function matchFolderToFolder(
  config: Config
): Promise<ImageGroup[]> {
  const { folderList, fileExtensions } = config.matchRules

  if (!folderList || folderList.length === 0) {
    throw new Error('文件夹列表未配置，请在配置中添加至少一个文件夹')
  }

  if (folderList.length < 1) {
    throw new Error('至少需要配置1个文件夹')
  }

  // 扫描所有文件夹并按文件名排序
  const folderImages: string[][] = []
  for (const folder of folderList) {
    const images = await scanImages(folder, fileExtensions)

    // 按文件名排序（自然排序，支持数字）
    const sortedImages = images.sort((a, b) => {
      const aName = path.basename(a)
      const bName = path.basename(b)
      return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' })
    })

    folderImages.push(sortedImages)
  }

  // 找出最小的图片数量（以图片最少的文件夹为准）
  const minImageCount = Math.min(...folderImages.map(imgs => imgs.length))

  if (minImageCount === 0) {
    throw new Error('所有文件夹中都没有找到图片')
  }

  // 按索引组合图片：第i组 = 第1个文件夹的第i张 + 第2个文件夹的第i张 + ...
  const groups: ImageGroup[] = []
  for (let i = 0; i < minImageCount; i++) {
    const original = folderImages[0][i]  // 第一个文件夹的图片作为原图
    const derivatives = folderImages.slice(1).map(imgs => imgs[i])  // 其余文件夹的图片作为派生图

    groups.push({
      id: nanoid(),
      original,
      derivatives,
    })
  }

  return groups
}

/**
 * 主匹配函数 - 根据配置的模式执行相应的匹配
 */
export async function matchImages(config: Config): Promise<MatchResult> {
  try {
    let groups: ImageGroup[] = []

    switch (config.matchRules.mode) {
      case 'single-folder-derivatives':
        groups = await matchSingleFolderDerivatives(config)
        break

      case 'fixed-group-size':
        groups = await matchFixedGroupSize(config)
        break

      case 'folder-to-folder':
        groups = await matchFolderToFolder(config)
        break

      default:
        throw new Error(`Unknown match mode: ${config.matchRules.mode}`)
    }

    return {
      groups,
      totalCount: groups.length,
    }
  } catch (error) {
    console.error('Failed to match images:', error)
    throw error
  }
}

/**
 * 重新扫描并匹配图片（用于刷新）
 */
export async function refreshMatches(config: Config): Promise<MatchResult> {
  return matchImages(config)
}
