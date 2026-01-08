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
}

// 配置文件路径
const CONFIG_DIR = path.join(app.getPath('userData'), 'config')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

/**
 * 确保配置目录存在
 */
async function ensureConfigDir(): Promise<void> {
  await fs.ensureDir(CONFIG_DIR)
}

/**
 * 读取配置文件
 */
export async function loadConfig(): Promise<Config> {
  try {
    await ensureConfigDir()

    if (await fs.pathExists(CONFIG_FILE)) {
      const data = await fs.readJson(CONFIG_FILE)
      // 合并默认配置和用户配置
      return { ...DEFAULT_CONFIG, ...data }
    }

    // 如果配置文件不存在，创建默认配置
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
  try {
    await ensureConfigDir()
    await fs.writeJson(CONFIG_FILE, config, { spaces: 2 })
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
  const currentConfig = await loadConfig()
  const newConfig = { ...currentConfig, ...updates }
  await saveConfig(newConfig)
  return newConfig
}

/**
 * 重置为默认配置
 */
export async function resetConfig(): Promise<Config> {
  await saveConfig(DEFAULT_CONFIG)
  return DEFAULT_CONFIG
}
