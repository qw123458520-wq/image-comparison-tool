import { useState, DragEvent } from 'react'
import { message } from 'antd'

interface UseFolderDropOptions {
  onFolderSelected: (folderPath: string) => void | Promise<void>
  successMessage?: string
}

export function useFolderDrop(options: UseFolderDropOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const { onFolderSelected, successMessage } = options

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()  // 必须阻止默认行为
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    try {
      const files = Array.from(e.dataTransfer.files)

      if (files.length === 0) {
        message.warning('未检测到拖入的文件或文件夹')
        return
      }

      if (files.length > 1) {
        message.warning('一次只能拖入一个文件夹')
        return
      }

      // 使用 Electron 的 webUtils API 获取路径（最可靠的方式）
      const file = files[0]
      let droppedPath: string

      try {
        droppedPath = window.electronAPI.files.getPathForFile(file)
        console.log('成功获取拖拽路径:', droppedPath)
      } catch (error) {
        console.error('获取路径失败:', error)
        message.error('无法获取文件路径，请使用点击选择的方式')
        return
      }

      if (!droppedPath) {
        message.error('无法获取文件路径，请使用点击选择的方式')
        return
      }

      const stats = await window.electronAPI.files.getStats(droppedPath)

      if (stats.error) {
        message.error(stats.error)
        return
      }

      if (!stats.isDirectory) {
        message.error('请拖入文件夹而不是文件')
        return
      }

      await onFolderSelected(droppedPath)

      if (successMessage) {
        message.success(successMessage)
      }
    } catch (error) {
      console.error('处理拖拽失败:', error)
      message.error('拖拽处理失败')
    }
  }

  return {
    isDragging,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  }
}
