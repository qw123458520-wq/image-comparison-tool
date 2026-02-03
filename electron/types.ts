/**
 * 类型定义文件
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
    sourceFolder?: string  // 单文件夹模式下的源文件夹
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
  original: string  // 原图路径
  derivatives: string[]  // 派生图路径列表
  annotations?: {
    mode: AnnotationMode
    labels: {
      target: string  // 被标注的图片路径
      label: string   // 标签
    }[]
  }
}

// 文件匹配结果
export interface MatchResult {
  groups: ImageGroup[]
  totalCount: number
}

// 文件匹配工具相关类型
export interface FileMatcherResult {
  success: number
  failed: Array<{ path: string; error: string }>
}

export interface SourceFileMatcherConfig {
  sourceDir: string      // 结果图文件夹
  targetDir: string      // 原图文件夹
  outputDir: string      // 输出文件夹
  stripSuffixes: string[] // 需要剥离的后缀列表
  recursive?: boolean     // 是否递归扫描子文件夹（默认：true）
  useMove?: boolean       // 是否移动文件（默认：false，即复制）
}

export interface DerivedFileMatcherConfig {
  baseDir: string        // 基准文件夹（源文件夹）
  targetDir: string      // 派生文件夹
  outputDir: string      // 输出文件夹
  stripSuffixes: string[] // 需要剥离的后缀列表
  recursive?: boolean    // 是否递归扫描子文件夹（默认：true）
  useMove?: boolean      // 是否移动文件（默认：false，即复制）
}

export interface FileClassifierConfig {
  sourceDir: string      // 源文件夹
  outputDir: string      // 输出根文件夹
  derivedSuffixes: string[] // 派生后缀列表
  recursive?: boolean    // 是否递归扫描子文件夹（默认：true）
  useMove?: boolean      // 是否移动文件（默认：false，即复制）
}

export interface FileClassifierResult {
  success: number
  failed: Array<{ path: string; error: string }>
  csvPath?: string       // CSV日志文件路径
}

// 抽取指定后缀文件配置
export interface SuffixExtractorConfig {
  sourceDir: string        // 源文件夹
  outputDir: string        // 输出根文件夹
  derivedSuffixes: string[] // 需要匹配的派生后缀列表
  recursive?: boolean      // 是否递归扫描子文件夹（默认：true）
  useMove?: boolean        // 是否移动文件（默认：false，即复制）
}

// 抽取指定后缀文件结果（结构与 FileMatcherResult 一致）
export interface SuffixExtractorResult {
  success: number
  failed: Array<{ path: string; error: string }>
}

// 文件名检索
export type FileSearchMatchMode = 'contains' | 'startsWith' | 'endsWith' | 'regex'

export type FileSearchTypeFilter =
  | 'all'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'archive'
  | 'custom'

export interface FileSearchQuery {
  rootDir: string
  keyword: string
  matchMode: FileSearchMatchMode
  // 拆分后的多关键字（可选），用于全部匹配
  keywords?: string[]
  // 是否要求所有关键字都匹配（true：全部匹配；false：任意一个匹配）
  matchAll?: boolean
  caseSensitive?: boolean
  includeSubdirs?: boolean
  typeFilter?: FileSearchTypeFilter
  customExtensions?: string[]
  maxResults?: number
}

export interface FileSearchResultItem {
  path: string
  name: string
  size: number
  modified: string
  ext: string
  isDirectory: boolean
}

export interface FileSearchResult {
  items: FileSearchResultItem[]
  total: number
}
