/**
 * 配置文件管理模块
 */

import * as fs from 'fs-extra'
import * as path from 'path'
import { app } from 'electron'
import type { Config } from './types'

// 默认配置
const DEFAULT_CONFIG: Config = {
  matchRules: {
    mode: 'single-folder-derivatives',
    suffixPatterns: ['_ACD3', '_C25E', '_v2'],
    fileExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  annotationMode: 'group',
  labels: {
    preset: ['通过', '不通过', '需要修改'],
    allowCustom: true,
  },
  output: {
    moveFiles: true,
    moveBothOriginalAndDerivatives: true,
    generateReport: true,
    targetFolders: {},
  },
  faceAnalysis: {
    enabled: false,
    enableSecondaryClassification: false,
    ageRanges: ['0-18', '19-30', '31-45', '46-60', '60+'],
  },
}

// 配置文件路径
const CONFIG_DIR = path.join(app.getPath('userData'), 'config')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

// 配置缓存（性能优化 - 避免频繁读取 asar）
let configCache: Config | null = null
let configCacheTime = 0
const CACHE_TTL = 5000 // 5秒缓存

/**
 * 确保配置目录存在
 */
async function ensureConfigDir(): Promise<void> {
  await fs.ensureDir(CONFIG_DIR)
}

/**
 * 读取配置文件（带内存缓存）
 */
export async function loadConfig(): Promise<Config> {
  const now = Date.now()

  // 使用缓存，避免频繁读取文件系统
  if (configCache && now - configCacheTime < CACHE_TTL) {
    console.log('✓ [缓存] 使用配置缓存')
    return configCache
  }

  const startTime = performance.now()
  try {
    await ensureConfigDir()

    if (await fs.pathExists(CONFIG_FILE)) {
      const data = await fs.readJson(CONFIG_FILE)
      const duration = performance.now() - startTime
      console.log(`✓ [性能] 配置读取耗时: ${duration.toFixed(2)}ms`)

      // 合并默认配置和用户配置
      configCache = { ...DEFAULT_CONFIG, ...data }
      configCacheTime = now
      return configCache
    }

    // 如果配置文件不存在，创建默认配置
    configCache = DEFAULT_CONFIG
    configCacheTime = now
    await saveConfig(DEFAULT_CONFIG)
    return DEFAULT_CONFIG
  } catch (error) {
    console.error('Failed to load config:', error)
    return DEFAULT_CONFIG
  }
}

/**
 * 保存配置文件
 */
export async function saveConfig(config: Config): Promise<void> {
  const startTime = performance.now()
  try {
    await ensureConfigDir()
    await fs.writeJson(CONFIG_FILE, config, { spaces: 2 })

    // 清除缓存，下次读取时重新加载
    configCache = null
    configCacheTime = 0

    const duration = performance.now() - startTime
    if (duration > 50) {
      console.warn(`⚠️ [性能] 配置保存耗时: ${duration.toFixed(2)}ms (超过50ms阈值)`)
    } else {
      console.log(`✓ [性能] 配置保存耗时: ${duration.toFixed(2)}ms`)
    }
  } catch (error) {
    console.error('Failed to save config:', error)
    throw error
  }
}

/**
 * 更新部分配置
 */
export async function updateConfig(
  updates: Partial<Config>
): Promise<Config> {
  const startTime = performance.now()
  const currentConfig = await loadConfig()
  const newConfig = { ...currentConfig, ...updates }
  await saveConfig(newConfig)
  const duration = performance.now() - startTime
  console.log(`✓ [性能] 配置更新总耗时: ${duration.toFixed(2)}ms (读取+保存)`)
  if (duration > 100) {
    console.warn(`⚠️ [性能警告] 配置更新耗时超过100ms，可能影响用户体验`)
  }
  return newConfig
}

/**
 * 重置为默认配置
 */
export async function resetConfig(): Promise<Config> {
  await saveConfig(DEFAULT_CONFIG)
  return DEFAULT_CONFIG
}
