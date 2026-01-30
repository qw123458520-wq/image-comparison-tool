/**
 * 图片数据状态管理
 */

import { create } from 'zustand'
import type { ImageGroup, MatchResult, Config } from '../types'

interface ImageState {
  groups: ImageGroup[]
  currentIndex: number
  totalCount: number
  loading: boolean
  error: string | null

  // 新增：快捷键功能相关状态
  isQKeyPressed: boolean         // Q键是否按下（用于图片位置循环对比）
  isWKeyPressed: boolean         // W键是否按下（用于除第一张图外，剩余图片与第一张图切换）
  selectedImages: Set<string>    // 选中的图片路径集合

  // 操作
  loadImages: (config: Config) => Promise<number>  // 返回加载的图片组数量
  setCurrentIndex: (index: number) => void
  nextImage: () => void
  prevImage: () => void
  getCurrentGroup: () => ImageGroup | null

  // 新增：快捷键功能相关操作
  setQKeyPressed: (pressed: boolean) => void
  setWKeyPressed: (pressed: boolean) => void
  selectImage: (imagePath: string) => void
  deselectImage: (imagePath: string) => void
  clearSelection: () => void
}

export const useImageStore = create<ImageState>((set, get) => ({
  groups: [],
  currentIndex: 0,
  totalCount: 0,
  loading: false,
  error: null,

  // 新增状态初始化
  isQKeyPressed: false,
  isWKeyPressed: false,
  selectedImages: new Set<string>(),

  loadImages: async (config) => {
    set({ loading: true, error: null })
    try {
      const result: MatchResult = await window.electronAPI.images.load(config)

      const groups = result.groups
      const totalCount = result.totalCount

      set({
        groups,
        totalCount,
        currentIndex: 0,
        loading: false,
      })

      // 加载完成后，从数据库恢复这些图片组的历史标注
      if (groups.length > 0) {
        const groupIds = groups.map((g) => g.id)
        try {
          const persisted = await window.electronAPI.annotation.loadForGroups(groupIds)
          // 动态引入标注 store，避免循环依赖
          const module = await import('./annotationStore')
          const annotationStore = module.useAnnotationStore
          const { hydrateFromDB } = annotationStore.getState()
          hydrateFromDB(persisted)
        } catch (error) {
          console.error('Failed to load persisted annotations:', error)
        }
      }

      // 返回实际加载的数量
      return totalCount
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
        loading: false,
      })
      throw error
    }
  },

  setCurrentIndex: (index) => {
    const { totalCount } = get()
    if (index >= 0 && index < totalCount) {
      set({ currentIndex: index })
    }
  },

  nextImage: () => {
    const { currentIndex, totalCount } = get()
    if (currentIndex < totalCount - 1) {
      set({
        currentIndex: currentIndex + 1,
        selectedImages: new Set(),  // 清空选择
        isQKeyPressed: false,  // 重置Q键状态
        isWKeyPressed: false  // 重置W键状态
      })
    }
  },

  prevImage: () => {
    const { currentIndex } = get()
    if (currentIndex > 0) {
      set({
        currentIndex: currentIndex - 1,
        selectedImages: new Set(),  // 清空选择
        isQKeyPressed: false,  // 重置Q键状态
        isWKeyPressed: false  // 重置W键状态
      })
    }
  },

  getCurrentGroup: () => {
    const { groups, currentIndex } = get()
    return groups[currentIndex] || null
  },

  // === 新增方法实现 ===

  // 设置Q键按下状态
  setQKeyPressed: (pressed) => {
    set({ isQKeyPressed: pressed })
  },

  // 设置W键按下状态
  setWKeyPressed: (pressed) => {
    set({ isWKeyPressed: pressed })
  },

  // 选择图片
  selectImage: (imagePath) => {
    const newSet = new Set(get().selectedImages)
    newSet.add(imagePath)
    set({ selectedImages: newSet })
  },

  // 取消选择图片
  deselectImage: (imagePath) => {
    const newSet = new Set(get().selectedImages)
    newSet.delete(imagePath)
    set({ selectedImages: newSet })
  },

  // 清空所有选择
  clearSelection: () => {
    set({ selectedImages: new Set() })
  },
}))
