import { contextBridge, ipcRenderer } from 'electron'

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
  },

  // 标注处理
  annotation: {
    process: (groups: any, config: any) =>
      ipcRenderer.invoke('annotation:process', groups, config),
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
  }
  annotation: {
    process: (groups: any, config: any) => Promise<any>
  }
  report: {
    exportJSON: (groups: any, annotations: any) => Promise<any>
    exportCSV: (groups: any, annotations: any) => Promise<any>
    exportSummary: (groups: any, annotations: any) => Promise<any>
  }
  platform: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
