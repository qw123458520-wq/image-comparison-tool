/**
 * 人脸分析状态管理
 */

import { create } from 'zustand'

interface FaceAnalysisState {
  // 环境状态
  pythonAvailable: boolean
  pythonPath?: string
  deepfaceInstalled: boolean
  environmentChecked: boolean

  // 分析状态
  isAnalyzing: boolean
  progress: {
    total: number
    current: number
    currentFile: string
  } | null

  // 分析结果
  results: Map<string, any>  // imagePath -> FaceAnalysisResult

  // 配置
  config: {
    enableSecondaryClassification: boolean
    inputFolder?: string
    outputFolder?: string
    ageRanges: string[]
  }

  // 操作
  checkEnvironment: () => Promise<void>
  analyzeBatch: (imagePaths: string[]) => Promise<void>
  updateConfig: (updates: Partial<FaceAnalysisState['config']>) => void
  clearResults: () => void
}

export const useFaceAnalysisStore = create<FaceAnalysisState>((set, get) => ({
  // 初始状态
  pythonAvailable: false,
  deepfaceInstalled: false,
  environmentChecked: false,
  isAnalyzing: false,
  progress: null,
  results: new Map(),
  config: {
    enableSecondaryClassification: false,
    ageRanges: ['0-18', '19-30', '31-45', '46-60', '60+']
  },

  // 检查环境
  checkEnvironment: async () => {
    try {
      const result = await window.electronAPI.face.checkEnvironment()
      set({
        pythonAvailable: result.available,
        pythonPath: result.pythonPath,
        deepfaceInstalled: result.deepfaceInstalled || false,
        environmentChecked: true
      })
    } catch (error) {
      console.error('Environment check failed:', error)
      set({ environmentChecked: true })
    }
  },

  // 批量分析
  analyzeBatch: async (imagePaths: string[]) => {
    const { config, pythonPath } = get()

    console.log('📤 Frontend analyzeBatch called with:', {
      imageCount: imagePaths.length,
      outputFolder: config.outputFolder,
      pythonPath,
      enableSecondaryClassification: config.enableSecondaryClassification,
      firstImage: imagePaths[0]
    })

    set({ isAnalyzing: true, progress: { total: imagePaths.length, current: 0, currentFile: '' } })

    try {
      // 监听进度事件
      window.electronAPI.face.onProgress((progress: any) => {
        console.log('📊 Progress update:', progress)
        set({ progress })
      })

      console.log('🔄 Calling window.electronAPI.face.analyzeBatch...')

      // 执行分析
      const results = await window.electronAPI.face.analyzeBatch({
        imagePaths,
        outputFolder: config.outputFolder || '',
        enableSecondaryClassification: config.enableSecondaryClassification,
        ageRanges: config.ageRanges,
        pythonPath
      })

      console.log('✅ Received results from backend:', results.length, 'items')

      // 保存结果
      const resultsMap = new Map()
      results.forEach((item: any) => {
        resultsMap.set(item.imagePath, item)
      })

      console.log('💾 Saved results to store:', resultsMap.size, 'items')
      set({ results: resultsMap, isAnalyzing: false })
    } catch (error) {
      console.error('❌ Batch analysis failed:', error)
      set({ isAnalyzing: false })
    }
  },

  // 更新配置
  updateConfig: (updates) => {
    set((state) => ({
      config: { ...state.config, ...updates }
    }))
  },

  // 清除结果
  clearResults: () => {
    set({ results: new Map() })
  }
}))
