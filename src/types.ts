/**
 * 前端类型定义
 */

// 标注模式
export type AnnotationMode = 'group' | 'individual'

// 匹配模式
export type MatchMode = 'folder-to-folder' | 'single-folder-derivatives' | 'fixed-group-size'

// 配置文件结构
export interface Config {
  matchRules: {
    mode: MatchMode
    folderPairs?: {
      leftFolder: string
      rightFolder: string
    }[]
    folderList?: string[]  // 文件夹对文件夹模式：有序的文件夹列表
    suffixPatterns: string[]
    fileExtensions: string[]
    sourceFolder?: string
    groupSize?: number  // 固定分组模式：每组图片数量
  }
  annotationMode: AnnotationMode
  labels: {
    preset: string[]
    allowCustom: boolean
  }
  output: {
    moveFiles: boolean
    moveBothOriginalAndDerivatives: boolean
    generateReport: boolean
    outputFolder?: string  // 输出文件夹根目录
    targetFolders: Record<string, string>
  }
}

// 图片组
export interface ImageGroup {
  id: string
  original: string
  derivatives: string[]
  annotations?: {
    mode: AnnotationMode
    labels: {
      target: string
      label: string
    }[]
  }
}

// 匹配结果
export interface MatchResult {
  groups: ImageGroup[]
  totalCount: number
}
