/**
 * 标注状态管理
 */

import { create } from 'zustand'
import type { AnnotationMode, ImageGroup } from '../types'

interface AnnotationState {
  mode: AnnotationMode
  annotations: Map<string, ImageGroup['annotations']>

  // 操作
  setMode: (mode: AnnotationMode) => void
  addAnnotation: (
    groupId: string,
    target: string,
    label: string
  ) => void
  removeAnnotation: (groupId: string, target: string) => void  // 移除单个标注
  removeAnnotations: (groupId: string, targets: string[]) => void  // 批量移除标注
  getAnnotation: (groupId: string) => ImageGroup['annotations'] | undefined
  clearAnnotation: (groupId: string) => void
  clearAllAnnotations: () => void  // 清空所有标注
  hasAnnotation: (groupId: string) => boolean

  // 从数据库恢复标注
  hydrateFromDB: (data: Record<string, {
    mode: AnnotationMode | string
    labels: { target: string; label: string }[]
  }>) => void
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  mode: 'group',
  annotations: new Map(),

  setMode: (mode) => set({ mode }),

  addAnnotation: (groupId, target, label) => {
    const { annotations, mode } = get()
    const newAnnotations = new Map(annotations)

    const existing = newAnnotations.get(groupId) || {
      mode,
      labels: [],
    }

    // 根据模式处理标注
    if (mode === 'group') {
      // 整组模式：覆盖所有标注
      existing.labels = [{ target, label }]
    } else {
      // 单图/对比对模式：添加或更新特定图片的标注
      const existingIndex = existing.labels.findIndex(
        (item) => item.target === target
      )
      if (existingIndex >= 0) {
        existing.labels[existingIndex].label = label
      } else {
        existing.labels.push({ target, label })
      }
    }

    newAnnotations.set(groupId, existing)
    set({ annotations: newAnnotations })

    // 持久化到数据库（忽略异常，避免阻塞 UI）
    void window.electronAPI.annotation
      .save(groupId, mode, target, label)
      .catch((error) => {
        console.error('Failed to persist annotation:', error)
      })
  },

  getAnnotation: (groupId) => {
    return get().annotations.get(groupId)
  },

  clearAnnotation: (groupId) => {
    const { annotations } = get()
    const newAnnotations = new Map(annotations)
    newAnnotations.delete(groupId)
    set({ annotations: newAnnotations })

    // 清空该组在数据库中的标注
    void window.electronAPI.annotation
      .clearGroup(groupId)
      .catch((error) => {
        console.error('Failed to clear annotations for group in DB:', error)
      })
  },

  hasAnnotation: (groupId) => {
    const annotation = get().annotations.get(groupId)
    return !!(annotation && annotation.labels.length > 0)
  },

  removeAnnotation: (groupId, target) => {
    const { annotations } = get()
    const newAnnotations = new Map(annotations)
    const existing = newAnnotations.get(groupId)

    if (existing) {
      // 过滤掉指定目标的标注
      existing.labels = existing.labels.filter((item) => item.target !== target)

      // 如果没有剩余标注，删除整个组
      if (existing.labels.length === 0) {
        newAnnotations.delete(groupId)
      } else {
        newAnnotations.set(groupId, existing)
      }

      set({ annotations: newAnnotations })

      // 同步删除数据库中的对应标注
      void window.electronAPI.annotation
        .delete(groupId, target)
        .catch((error) => {
          console.error('Failed to delete annotation in DB:', error)
        })
    }
  },

  removeAnnotations: (groupId, targets) => {
    const { annotations } = get()
    const newAnnotations = new Map(annotations)
    const existing = newAnnotations.get(groupId)

    if (existing) {
      // 批量过滤掉指定目标的标注
      existing.labels = existing.labels.filter(
        (item) => !targets.includes(item.target)
      )

      // 如果没有剩余标注，删除整个组
      if (existing.labels.length === 0) {
        newAnnotations.delete(groupId)
      } else {
        newAnnotations.set(groupId, existing)
      }

      set({ annotations: newAnnotations })

      // 批量删除数据库中的标注
      targets.forEach((target) => {
        void window.electronAPI.annotation
          .delete(groupId, target)
          .catch((error) => {
            console.error('Failed to delete annotation in DB:', error)
          })
      })
    }
  },

  clearAllAnnotations: () => {
    const { annotations } = get()
    const groupIds = Array.from(annotations.keys())

    set({ annotations: new Map() })

    // 清空所有组在数据库中的标注（逐组清理，避免新增全清接口）
    groupIds.forEach((groupId) => {
      void window.electronAPI.annotation
        .clearGroup(groupId)
        .catch((error) => {
          console.error('Failed to clear annotations for group in DB:', error)
        })
    })
  },

  // 从数据库恢复标注到内存
  hydrateFromDB: (data) => {
    const map = new Map<string, ImageGroup['annotations']>()

    Object.entries(data).forEach(([groupId, value]) => {
      if (!value || !Array.isArray(value.labels) || value.labels.length === 0) {
        return
      }

      map.set(groupId, {
        mode: (value.mode as AnnotationMode) || 'group',
        labels: value.labels.map((item) => ({
          target: item.target,
          label: item.label,
        })),
      })
    })

    if (map.size > 0) {
      set({ annotations: map })
    }
  },
}))
