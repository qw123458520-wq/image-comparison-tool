/**
 * 配置状态管理
 */

import { create } from 'zustand'
import type { Config } from '../types'

interface ConfigState {
  config: Config | null
  loading: boolean
  error: string | null

  // 操作
  loadConfig: () => Promise<void>
  updateConfig: (updates: Partial<Config>) => Promise<void>
  setSourceFolder: (folder: string) => Promise<void>
  setOutputFolder: (folder: string) => Promise<void>
  addSuffixPattern: (pattern: string) => Promise<void>
  removeSuffixPattern: (pattern: string) => Promise<void>
  addPresetLabel: (label: string) => Promise<void>
  removePresetLabel: (label: string) => Promise<void>

  // 文件夹列表管理（文件夹对文件夹模式）
  addFolderToList: (folder: string) => Promise<void>
  removeFolderFromList: (index: number) => Promise<void>
  moveFolderUp: (index: number) => Promise<void>
  moveFolderDown: (index: number) => Promise<void>
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  loading: false,
  error: null,

  loadConfig: async () => {
    set({ loading: true, error: null })
    try {
      const config = await window.electronAPI.config.load()
      set({ config, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
        loading: false,
      })
    }
  },

  updateConfig: async (updates) => {
    set({ loading: true, error: null })
    try {
      const newConfig = await window.electronAPI.config.update(updates)
      set({ config: newConfig, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
        loading: false,
      })
    }
  },

  setSourceFolder: async (folder) => {
    const { config, updateConfig } = get()
    if (!config) return

    await updateConfig({
      matchRules: {
        ...config.matchRules,
        sourceFolder: folder,
      },
    })
  },

  setOutputFolder: async (folder) => {
    const { config, updateConfig } = get()
    if (!config) return

    await updateConfig({
      output: {
        ...config.output,
        outputFolder: folder,
      },
    })
  },

  addSuffixPattern: async (pattern) => {
    const { config, updateConfig } = get()
    if (!config) return

    const patterns = [...config.matchRules.suffixPatterns, pattern]
    await updateConfig({
      matchRules: {
        ...config.matchRules,
        suffixPatterns: patterns,
      },
    })
  },

  removeSuffixPattern: async (pattern) => {
    const { config, updateConfig } = get()
    if (!config) return

    const patterns = config.matchRules.suffixPatterns.filter((p) => p !== pattern)
    await updateConfig({
      matchRules: {
        ...config.matchRules,
        suffixPatterns: patterns,
      },
    })
  },

  addPresetLabel: async (label) => {
    const { config, updateConfig } = get()
    if (!config) return

    const labels = [...config.labels.preset, label]
    await updateConfig({
      labels: {
        ...config.labels,
        preset: labels,
      },
    })
  },

  removePresetLabel: async (label) => {
    const { config, updateConfig } = get()
    if (!config) return

    const labels = config.labels.preset.filter((l) => l !== label)
    await updateConfig({
      labels: {
        ...config.labels,
        preset: labels,
      },
    })
  },

  // 文件夹列表管理
  addFolderToList: async (folder) => {
    const { config, updateConfig } = get()
    if (!config) return

    const folderList = [...(config.matchRules.folderList || []), folder]
    await updateConfig({
      matchRules: {
        ...config.matchRules,
        folderList,
      },
    })
  },

  removeFolderFromList: async (index) => {
    const { config, updateConfig } = get()
    if (!config || !config.matchRules.folderList) return

    const folderList = config.matchRules.folderList.filter((_, i) => i !== index)
    await updateConfig({
      matchRules: {
        ...config.matchRules,
        folderList,
      },
    })
  },

  moveFolderUp: async (index) => {
    const { config, updateConfig } = get()
    if (!config || !config.matchRules.folderList || index <= 0) return

    const folderList = [...config.matchRules.folderList]
    ;[folderList[index - 1], folderList[index]] = [folderList[index], folderList[index - 1]]

    await updateConfig({
      matchRules: {
        ...config.matchRules,
        folderList,
      },
    })
  },

  moveFolderDown: async (index) => {
    const { config, updateConfig } = get()
    if (!config || !config.matchRules.folderList || index >= config.matchRules.folderList.length - 1) return

    const folderList = [...config.matchRules.folderList]
    ;[folderList[index], folderList[index + 1]] = [folderList[index + 1], folderList[index]]

    await updateConfig({
      matchRules: {
        ...config.matchRules,
        folderList,
      },
    })
  },
}))
