import { contextBridge, ipcRenderer, webUtils } from 'electron'

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 配置管理
  config: {
    load: () => ipcRenderer.invoke('config:load'),
    save: (config: any) => ipcRenderer.invoke('config:save', config),
    update: (updates: any) => ipcRenderer.invoke('config:update', updates),
  },

  // 对话框
  dialog: {
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  },

  // 图片加载
  images: {
    load: (config: any) => ipcRenderer.invoke('images:load', config),
  },

  // 文件操作
  files: {
    move: (operations: any) => ipcRenderer.invoke('files:move', operations),
    getStats: (filePath: string) => ipcRenderer.invoke('files:getStats', filePath),
    getPathForFile: (file: File) => webUtils.getPathForFile(file),
  },

  // 标注处理
  annotation: {
    process: (groups: any, config: any) =>
      ipcRenderer.invoke('annotation:process', groups, config),
    // 从数据库批量加载指定图片组的历史标注
    loadForGroups: (groupIds: string[]) =>
      ipcRenderer.invoke('annotation:loadForGroups', groupIds),
    // 将单条标注保存到数据库
    save: (groupId: string, mode: any, target: string, label: string) =>
      ipcRenderer.invoke('annotation:save', { groupId, mode, target, label }),
    // 删除单条标注
    delete: (groupId: string, target: string) =>
      ipcRenderer.invoke('annotation:delete', { groupId, target }),
    // 清空某个图片组的全部标注
    clearGroup: (groupId: string) =>
      ipcRenderer.invoke('annotation:clearGroup', { groupId }),
  },

  // 报告导出
  report: {
    exportJSON: (groups: any, annotations: any) =>
      ipcRenderer.invoke('report:exportJSON', groups, annotations),
    exportCSV: (groups: any, annotations: any) =>
      ipcRenderer.invoke('report:exportCSV', groups, annotations),
    exportSummary: (groups: any, annotations: any) =>
      ipcRenderer.invoke('report:exportSummary', groups, annotations),
  },

  // 文件匹配工具
  fileMatcher: {
    matchSourceFiles: (config: any) => ipcRenderer.invoke('fileMatcher:matchSourceFiles', config),
    matchDerivedFiles: (config: any) => ipcRenderer.invoke('fileMatcher:matchDerivedFiles', config),
    classifyFiles: (config: any) => ipcRenderer.invoke('fileMatcher:classifyFiles', config),
    extractBySuffix: (config: any) => ipcRenderer.invoke('fileMatcher:extractBySuffix', config),
  },

  // 文件名检索
  fileSearch: {
    searchByName: (query: any) => ipcRenderer.invoke('fileSearch:searchByName', query),
    copyFiles: (payload: any) => ipcRenderer.invoke('fileSearch:copyFiles', payload),
    openInFinder: (filePath: string) => ipcRenderer.invoke('fileSearch:openInFinder', filePath),
  },

  // 获取平台信息
  platform: process.platform,
})

// TypeScript 类型声明（用于渲染进程）
export interface ElectronAPI {
  config: {
    load: () => Promise<any>
    save: (config: any) => Promise<void>
    update: (updates: any) => Promise<any>
  }
  dialog: {
    selectFolder: () => Promise<string | undefined>
  }
  images: {
    load: (config: any) => Promise<any>
  }
  files: {
    move: (operations: any) => Promise<any>
    getStats: (filePath: string) => Promise<{
      isDirectory?: boolean
      isFile?: boolean
      path?: string
      error?: string
    }>
    getPathForFile: (file: File) => string
  }
  annotation: {
    process: (groups: any, config: any) => Promise<any>
    loadForGroups: (
      groupIds: string[]
    ) => Promise<
      Record<
        string,
        {
          mode: string
          labels: { target: string; label: string }[]
        }
      >
    >
    save: (groupId: string, mode: any, target: string, label: string) => Promise<any>
    delete: (groupId: string, target: string) => Promise<any>
    clearGroup: (groupId: string) => Promise<any>
  }
  report: {
    exportJSON: (groups: any, annotations: any) => Promise<any>
    exportCSV: (groups: any, annotations: any) => Promise<any>
    exportSummary: (groups: any, annotations: any) => Promise<any>
  }
  fileMatcher: {
    matchSourceFiles: (config: any) => Promise<any>
    matchDerivedFiles: (config: any) => Promise<any>
    classifyFiles: (config: any) => Promise<any>
    extractBySuffix: (config: any) => Promise<any>
  }
  fileSearch: {
    searchByName: (query: any) => Promise<any>
    copyFiles: (payload: any) => Promise<any>
    openInFinder: (filePath: string) => Promise<{ success: boolean }>
  }
  platform: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
