/**
 * 文件匹配工具面板组件
 * 包含两个功能模块：匹配源文件和匹配派生文件
 */

import { useState } from 'react'
import {
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Space,
  Tag,
  message,
  Divider,
  Alert,
  Switch,
  Modal,
  Radio,
} from 'antd'
import {
  FolderOpenOutlined,
  PlusOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import { useFolderDrop } from '../hooks/useFolderDrop'
import type {
  SourceFileMatcherConfig,
  DerivedFileMatcherConfig,
  FileMatcherResult,
  FileClassifierConfig,
  FileClassifierResult,
  SuffixExtractorConfig,
  SuffixExtractorResult,
} from '../types'

export default function FileMatcherPanel() {
  // 匹配源文件模块状态
  const [sourceConfig, setSourceConfig] = useState<SourceFileMatcherConfig>({
    sourceDir: '',
    targetDir: '',
    outputDir: '',
    stripSuffixes: [],
    recursive: true,
    useMove: false,
  })
  const [newSuffix, setNewSuffix] = useState('')
  const [sourceResult, setSourceResult] = useState<FileMatcherResult | null>(null)
  const [sourceLoading, setSourceLoading] = useState(false)

  // 匹配派生文件模块状态
  const [derivedConfig, setDerivedConfig] = useState<DerivedFileMatcherConfig>({
    baseDir: '',
    targetDir: '',
    outputDir: '',
    stripSuffixes: [],
    recursive: true,
    useMove: false,
  })
  const [newDerivedMatchSuffix, setNewDerivedMatchSuffix] = useState('')
  const [derivedResult, setDerivedResult] = useState<FileMatcherResult | null>(null)
  const [derivedLoading, setDerivedLoading] = useState(false)

  // 文件分类模块状态
  const [classifierConfig, setClassifierConfig] = useState<FileClassifierConfig>({
    sourceDir: '',
    outputDir: '',
    derivedSuffixes: [],
    recursive: true,
    useMove: false,
  })
  const [newClassifierSuffix, setNewClassifierSuffix] = useState('')
  const [classifierResult, setClassifierResult] = useState<FileClassifierResult | null>(null)
  const [classifierLoading, setClassifierLoading] = useState(false)

  // 抽取指定后缀文件模块状态
  const [extractorConfig, setExtractorConfig] = useState<SuffixExtractorConfig>({
    sourceDir: '',
    outputDir: '',
    derivedSuffixes: [],
    recursive: true,
    useMove: false,
  })
  const [newExtractorSuffix, setNewExtractorSuffix] = useState('')
  const [extractorResult, setExtractorResult] = useState<SuffixExtractorResult | null>(null)
  const [extractorLoading, setExtractorLoading] = useState(false)

  // 派生文件夹拖拽（匹配源文件）
  const sourceDirDrop = useFolderDrop({
    onFolderSelected: (folder) => {
      setSourceConfig({ ...sourceConfig, sourceDir: folder })
      message.success('派生文件夹（结果图）设置成功')
    },
    successMessage: '',
  })

  // 源文件夹拖拽（匹配源文件）
  const targetDirDrop = useFolderDrop({
    onFolderSelected: (folder) => {
      setSourceConfig({ ...sourceConfig, targetDir: folder })
      message.success('源文件夹（原图）设置成功')
    },
    successMessage: '',
  })

  // 输出文件夹拖拽（匹配源文件）
  const outputDirDrop = useFolderDrop({
    onFolderSelected: (folder) => {
      setSourceConfig({ ...sourceConfig, outputDir: folder })
      message.success('输出文件夹设置成功')
    },
    successMessage: '',
  })

  // 源文件夹拖拽（匹配派生文件）
  const baseDirDrop = useFolderDrop({
    onFolderSelected: (folder) => {
      setDerivedConfig({ ...derivedConfig, baseDir: folder })
      message.success('源文件夹（原图）设置成功')
    },
    successMessage: '',
  })

  // 派生文件夹拖拽（匹配派生文件）
  const derivedTargetDirDrop = useFolderDrop({
    onFolderSelected: (folder) => {
      setDerivedConfig({ ...derivedConfig, targetDir: folder })
      message.success('派生文件夹（结果图）设置成功')
    },
    successMessage: '',
  })

  // 输出文件夹拖拽（匹配派生文件）
  const derivedOutputDirDrop = useFolderDrop({
    onFolderSelected: (folder) => {
      setDerivedConfig({ ...derivedConfig, outputDir: folder })
      message.success('输出文件夹设置成功')
    },
    successMessage: '',
  })

  // 源文件夹拖拽（文件分类）
  const classifierSourceDirDrop = useFolderDrop({
    onFolderSelected: (folder) => {
      setClassifierConfig({ ...classifierConfig, sourceDir: folder })
      message.success('源文件夹设置成功')
    },
    successMessage: '',
  })

  // 输出文件夹拖拽（文件分类）
  const classifierOutputDirDrop = useFolderDrop({
    onFolderSelected: (folder) => {
      setClassifierConfig({ ...classifierConfig, outputDir: folder })
      message.success('输出文件夹设置成功')
    },
    successMessage: '',
  })

  // 源文件夹拖拽（抽取指定后缀文件）
  const extractorSourceDirDrop = useFolderDrop({
    onFolderSelected: (folder) => {
      setExtractorConfig({ ...extractorConfig, sourceDir: folder })
      message.success('源文件夹设置成功')
    },
    successMessage: '',
  })

  // 输出文件夹拖拽（抽取指定后缀文件）
  const extractorOutputDirDrop = useFolderDrop({
    onFolderSelected: (folder) => {
      setExtractorConfig({ ...extractorConfig, outputDir: folder })
      message.success('输出文件夹设置成功')
    },
    successMessage: '',
  })

  // 添加派生文件匹配后缀
  const handleAddDerivedMatchSuffix = () => {
    if (!newDerivedMatchSuffix.trim()) return
    if (derivedConfig.stripSuffixes.includes(newDerivedMatchSuffix.trim())) {
      message.warning('该后缀已存在')
      return
    }
    setDerivedConfig({
      ...derivedConfig,
      stripSuffixes: [...derivedConfig.stripSuffixes, newDerivedMatchSuffix.trim()],
    })
    setNewDerivedMatchSuffix('')
    message.success('后缀添加成功')
  }

  // 删除派生文件匹配后缀
  const handleRemoveDerivedMatchSuffix = (suffix: string) => {
    setDerivedConfig({
      ...derivedConfig,
      stripSuffixes: derivedConfig.stripSuffixes.filter((s) => s !== suffix),
    })
    message.success('后缀删除成功')
  }

  // 添加分类后缀（文件分类）
  const handleAddClassifierSuffix = () => {
    if (!newClassifierSuffix.trim()) return
    if (classifierConfig.derivedSuffixes.includes(newClassifierSuffix.trim())) {
      message.warning('该后缀已存在')
      return
    }
    setClassifierConfig({
      ...classifierConfig,
      derivedSuffixes: [...classifierConfig.derivedSuffixes, newClassifierSuffix.trim()],
    })
    setNewClassifierSuffix('')
    message.success('后缀添加成功')
  }

  // 删除分类后缀（文件分类）
  const handleRemoveClassifierSuffix = (suffix: string) => {
    setClassifierConfig({
      ...classifierConfig,
      derivedSuffixes: classifierConfig.derivedSuffixes.filter((s) => s !== suffix),
    })
    message.success('后缀删除成功')
  }

  // 添加抽取后缀（抽取指定后缀文件）
  const handleAddExtractorSuffix = () => {
    if (!newExtractorSuffix.trim()) return
    if (extractorConfig.derivedSuffixes.includes(newExtractorSuffix.trim())) {
      message.warning('该后缀已存在')
      return
    }
    setExtractorConfig({
      ...extractorConfig,
      derivedSuffixes: [...extractorConfig.derivedSuffixes, newExtractorSuffix.trim()],
    })
    setNewExtractorSuffix('')
    message.success('后缀添加成功')
  }

  // 删除抽取后缀（抽取指定后缀文件）
  const handleRemoveExtractorSuffix = (suffix: string) => {
    setExtractorConfig({
      ...extractorConfig,
      derivedSuffixes: extractorConfig.derivedSuffixes.filter((s) => s !== suffix),
    })
    message.success('后缀删除成功')
  }

  // 执行文件分类（带移动确认）
  const handleClassifyFiles = async () => {
    if (!classifierConfig.sourceDir || !classifierConfig.outputDir) {
      message.error('请先配置所有必需的文件夹')
      return
    }

    // 检查是否已添加派生后缀
    if (classifierConfig.derivedSuffixes.length === 0) {
      Modal.warning({
        title: '未设置派生后缀',
        content: '您还没有添加任何派生后缀。如果不添加后缀，所有非PSD文件都会被归类到 originals 文件夹。是否继续执行分类？',
        okText: '继续执行',
        cancelText: '取消',
        onOk: async () => {
          if (classifierConfig.useMove) {
            Modal.confirm({
              title: '确认移动文件',
              content: '您选择了移动文件模式，源文件将被移动到目标位置。此操作不可撤销，确定要继续吗？',
              okText: '确定移动',
              cancelText: '取消',
              okType: 'danger',
              onOk: async () => {
                await executeClassifyFiles()
              },
            })
          } else {
            await executeClassifyFiles()
          }
        },
      })
      return
    }

    // 如果选择移动，需要二次确认
    if (classifierConfig.useMove) {
      Modal.confirm({
        title: '确认移动文件',
        content: '您选择了移动文件模式，源文件将被移动到目标位置。此操作不可撤销，确定要继续吗？',
        okText: '确定移动',
        cancelText: '取消',
        okType: 'danger',
        onOk: async () => {
          await executeClassifyFiles()
        },
      })
    } else {
      await executeClassifyFiles()
    }
  }

  const executeClassifyFiles = async () => {
    setClassifierLoading(true)
    setClassifierResult(null)

    try {
      const result = await window.electronAPI.fileMatcher.classifyFiles(classifierConfig)
      setClassifierResult(result)
      if (result.failed.length > 0) {
        message.warning(`分类完成，成功 ${result.success} 个，失败 ${result.failed.length} 个`)
      } else {
        const action = classifierConfig.useMove ? '移动' : '复制'
        message.success(`成功${action}并分类 ${result.success} 个文件`)
        if (result.csvPath) {
          message.info(`CSV日志已保存至: ${result.csvPath}`)
        }
      }
    } catch (error) {
      message.error(`分类失败: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setClassifierLoading(false)
    }
  }

  // 执行抽取指定后缀文件（带移动确认）
  const handleExtractBySuffix = async () => {
    if (!extractorConfig.sourceDir || !extractorConfig.outputDir) {
      message.error('请先配置源文件夹和输出文件夹')
      return
    }

    // 检查是否已添加后缀
    if (extractorConfig.derivedSuffixes.length === 0) {
      Modal.warning({
        title: '未设置派生后缀',
        content: '您还没有添加任何派生后缀。如果不添加后缀，将不会抽取任何文件。是否继续执行？',
        okText: '继续执行',
        cancelText: '取消',
        onOk: async () => {
          if (extractorConfig.useMove) {
            Modal.confirm({
              title: '确认移动文件',
              content: '您选择了移动文件模式，源文件将被移动到目标位置。此操作不可撤销，确定要继续吗？',
              okText: '确定移动',
              cancelText: '取消',
              okType: 'danger',
              onOk: async () => {
                await executeExtractBySuffix()
              },
            })
          } else {
            await executeExtractBySuffix()
          }
        },
      })
      return
    }

    // 如果选择移动，需要二次确认
    if (extractorConfig.useMove) {
      Modal.confirm({
        title: '确认移动文件',
        content: '您选择了移动文件模式，源文件将被移动到目标位置。此操作不可撤销，确定要继续吗？',
        okText: '确定移动',
        cancelText: '取消',
        okType: 'danger',
        onOk: async () => {
          await executeExtractBySuffix()
        },
      })
    } else {
      await executeExtractBySuffix()
    }
  }

  const executeExtractBySuffix = async () => {
    setExtractorLoading(true)
    setExtractorResult(null)

    try {
      const result = await window.electronAPI.fileMatcher.extractBySuffix(extractorConfig)
      setExtractorResult(result)
      if (result.failed.length > 0) {
        message.warning(`抽取完成，成功 ${result.success} 个，失败 ${result.failed.length} 个`)
      } else {
        const action = extractorConfig.useMove ? '移动' : '复制'
        message.success(`成功${action}并抽取 ${result.success} 个文件`)
      }
    } catch (error) {
      message.error(`抽取失败: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setExtractorLoading(false)
    }
  }

  // 选择文件夹
  const handleSelectFolder = async (type: string) => {
    try {
      const folder = await window.electronAPI.dialog.selectFolder()
      if (folder) {
        if (type.startsWith('source-')) {
          const key = type.replace('source-', '') as keyof SourceFileMatcherConfig
          setSourceConfig({ ...sourceConfig, [key]: folder })
        } else if (type.startsWith('derived-')) {
          const key = type.replace('derived-', '') as keyof DerivedFileMatcherConfig
          setDerivedConfig({ ...derivedConfig, [key]: folder })
        } else if (type.startsWith('classifier-')) {
          const key = type.replace('classifier-', '') as keyof FileClassifierConfig
          setClassifierConfig({ ...classifierConfig, [key]: folder })
        } else if (type.startsWith('extractor-')) {
          const key = type.replace('extractor-', '') as keyof SuffixExtractorConfig
          setExtractorConfig({ ...extractorConfig, [key]: folder })
        }
        message.success('文件夹设置成功')
      }
    } catch (error) {
      message.error('设置文件夹失败')
    }
  }

  // 添加后缀
  const handleAddSuffix = () => {
    if (!newSuffix.trim()) return
    if (sourceConfig.stripSuffixes.includes(newSuffix.trim())) {
      message.warning('该后缀已存在')
      return
    }
    setSourceConfig({
      ...sourceConfig,
      stripSuffixes: [...sourceConfig.stripSuffixes, newSuffix.trim()],
    })
    setNewSuffix('')
    message.success('后缀添加成功')
  }

  // 删除后缀
  const handleRemoveSuffix = (suffix: string) => {
    setSourceConfig({
      ...sourceConfig,
      stripSuffixes: sourceConfig.stripSuffixes.filter((s) => s !== suffix),
    })
    message.success('后缀删除成功')
  }

  // 执行匹配源文件（带移动确认）
  const handleMatchSourceFiles = async () => {
    if (!sourceConfig.sourceDir || !sourceConfig.targetDir || !sourceConfig.outputDir) {
      message.error('请先配置所有必需的文件夹')
      return
    }

    // 检查是否已添加可剥离的后缀
    if (sourceConfig.stripSuffixes.length === 0) {
      Modal.warning({
        title: '未设置可剥离的后缀',
        content: '您还没有添加任何可剥离的后缀。如果不添加后缀，匹配时不会剥离文件名后缀，可能导致匹配失败。是否继续执行匹配？',
        okText: '继续执行',
        cancelText: '取消',
        onOk: async () => {
          if (sourceConfig.useMove) {
            Modal.confirm({
              title: '确认移动文件',
              content: '您选择了移动文件模式，源文件将被移动到目标位置。此操作不可撤销，确定要继续吗？',
              okText: '确定移动',
              cancelText: '取消',
              okType: 'danger',
              onOk: async () => {
                await executeMatchSourceFiles()
              },
            })
          } else {
            await executeMatchSourceFiles()
          }
        },
      })
      return
    }

    // 如果选择移动，需要二次确认
    if (sourceConfig.useMove) {
      Modal.confirm({
        title: '确认移动文件',
        content: '您选择了移动文件模式，源文件将被移动到目标位置。此操作不可撤销，确定要继续吗？',
        okText: '确定移动',
        cancelText: '取消',
        okType: 'danger',
        onOk: async () => {
          await executeMatchSourceFiles()
        },
      })
    } else {
      await executeMatchSourceFiles()
    }
  }

  const executeMatchSourceFiles = async () => {
    setSourceLoading(true)
    setSourceResult(null)

    try {
      const result = await window.electronAPI.fileMatcher.matchSourceFiles(sourceConfig)
      setSourceResult(result)
      if (result.failed.length > 0) {
        message.warning(`匹配完成，成功 ${result.success} 个，失败 ${result.failed.length} 个`)
      } else {
        const action = sourceConfig.useMove ? '移动' : '复制'
        message.success(`成功匹配并${action} ${result.success} 个文件`)
      }
    } catch (error) {
      message.error(`匹配失败: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setSourceLoading(false)
    }
  }

  // 执行匹配派生文件（带移动确认）
  const handleMatchDerivedFiles = async () => {
    if (!derivedConfig.baseDir || !derivedConfig.targetDir || !derivedConfig.outputDir) {
      message.error('请先配置所有必需的文件夹')
      return
    }

    // 检查是否已添加可剥离的后缀
    if (derivedConfig.stripSuffixes.length === 0) {
      Modal.warning({
        title: '未设置可剥离的后缀',
        content: '您还没有添加任何可剥离的后缀。如果不添加后缀，匹配时不会剥离文件名后缀，可能导致匹配失败。是否继续执行匹配？',
        okText: '继续执行',
        cancelText: '取消',
        onOk: async () => {
          if (derivedConfig.useMove) {
            Modal.confirm({
              title: '确认移动文件',
              content: '您选择了移动文件模式，源文件将被移动到目标位置。此操作不可撤销，确定要继续吗？',
              okText: '确定移动',
              cancelText: '取消',
              okType: 'danger',
              onOk: async () => {
                await executeMatchDerivedFiles()
              },
            })
          } else {
            await executeMatchDerivedFiles()
          }
        },
      })
      return
    }

    // 如果选择移动，需要二次确认
    if (derivedConfig.useMove) {
      Modal.confirm({
        title: '确认移动文件',
        content: '您选择了移动文件模式，源文件将被移动到目标位置。此操作不可撤销，确定要继续吗？',
        okText: '确定移动',
        cancelText: '取消',
        okType: 'danger',
        onOk: async () => {
          await executeMatchDerivedFiles()
        },
      })
    } else {
      await executeMatchDerivedFiles()
    }
  }

  const executeMatchDerivedFiles = async () => {
    setDerivedLoading(true)
    setDerivedResult(null)

    try {
      const result = await window.electronAPI.fileMatcher.matchDerivedFiles(derivedConfig)
      setDerivedResult(result)
      if (result.failed.length > 0) {
        message.warning(`匹配完成，成功 ${result.success} 个，失败 ${result.failed.length} 个`)
      } else {
        const action = derivedConfig.useMove ? '移动' : '复制'
        message.success(`成功${action} ${result.success} 个匹配文件`)
      }
    } catch (error) {
      message.error(`匹配失败: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setDerivedLoading(false)
    }
  }

  // 匹配源文件 Tab 内容
  const sourceTabContent = (
            <Form layout="vertical">
              <Alert
                message="功能说明"
                description="从派生文件夹（结果图）和源文件夹（原图）中匹配文件，根据主体名（剥离可配置后缀）进行匹配并复制/移动到输出文件夹，同一主体只复制一次。"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Form.Item label="派生文件夹（结果图）">
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    value={sourceConfig.sourceDir}
                    placeholder="选择派生文件夹（结果图）或拖拽至此"
                    readOnly
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      height: '40px',
                      fontSize: '14px',
                      ...(sourceDirDrop.isDragging ? {
                        borderColor: '#1890ff',
                        borderWidth: 2,
                        backgroundColor: '#e6f7ff',
                        boxShadow: '0 0 8px rgba(24, 144, 255, 0.3)',
                      } : {}),
                    }}
                    {...sourceDirDrop.dragHandlers}
                  />
                  <Button
                    icon={<FolderOpenOutlined />}
                    onClick={() => handleSelectFolder('source-sourceDir')}
                    style={{ height: '40px' }}
                  >
                    选择
                  </Button>
                </Space.Compact>
              </Form.Item>

              <Form.Item label="源文件夹（原图）">
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    value={sourceConfig.targetDir}
                    placeholder="选择源文件夹（原图）或拖拽至此"
                    readOnly
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      height: '40px',
                      fontSize: '14px',
                      ...(targetDirDrop.isDragging ? {
                        borderColor: '#1890ff',
                        borderWidth: 2,
                        backgroundColor: '#e6f7ff',
                        boxShadow: '0 0 8px rgba(24, 144, 255, 0.3)',
                      } : {}),
                    }}
                    {...targetDirDrop.dragHandlers}
                  />
                  <Button
                    icon={<FolderOpenOutlined />}
                    onClick={() => handleSelectFolder('source-targetDir')}
                    style={{ height: '40px' }}
                  >
                    选择
                  </Button>
                </Space.Compact>
              </Form.Item>

              <Form.Item label="输出文件夹">
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    value={sourceConfig.outputDir}
                    placeholder="选择输出文件夹或拖拽至此"
                    readOnly
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      height: '40px',
                      fontSize: '14px',
                      ...(outputDirDrop.isDragging ? {
                        borderColor: '#1890ff',
                        borderWidth: 2,
                        backgroundColor: '#e6f7ff',
                        boxShadow: '0 0 8px rgba(24, 144, 255, 0.3)',
                      } : {}),
                    }}
                    {...outputDirDrop.dragHandlers}
                  />
                  <Button
                    icon={<FolderOpenOutlined />}
                    onClick={() => handleSelectFolder('source-outputDir')}
                    style={{ height: '40px' }}
                  >
                    选择
                  </Button>
                </Space.Compact>
              </Form.Item>

              <Divider />

              <Form.Item
                label="扫描选项"
                extra="是否递归扫描子文件夹"
              >
                <Switch
                  checked={sourceConfig.recursive !== false}
                  onChange={(checked) => {
                    setSourceConfig({ ...sourceConfig, recursive: checked })
                  }}
                  checkedChildren="递归扫描"
                  unCheckedChildren="仅当前文件夹"
                />
              </Form.Item>

              <Form.Item
                label="操作模式"
                extra="选择复制或移动文件"
              >
                <Radio.Group
                  value={sourceConfig.useMove ? 'move' : 'copy'}
                  onChange={(e) => {
                    setSourceConfig({ ...sourceConfig, useMove: e.target.value === 'move' })
                  }}
                >
                  <Radio value="copy">复制（默认）</Radio>
                  <Radio value="move">移动（需确认）</Radio>
                </Radio.Group>
              </Form.Item>

              <Divider />

              <Form.Item
                label="可剥离的后缀"
                extra={
                  <div>
                    <div style={{ color: sourceConfig.stripSuffixes.length === 0 ? '#ff4d4f' : '#666' }}>
                      {sourceConfig.stripSuffixes.length === 0 
                        ? '⚠️ 请先添加可剥离的后缀！如果不添加后缀，匹配时不会剥离文件名后缀，可能导致匹配失败。'
                        : '只在文件名结尾匹配时才剥离，不误伤中间的下划线'}
                    </div>
                    {sourceConfig.stripSuffixes.length > 0 && (
                      <div style={{ marginTop: 4, fontSize: 12, color: '#52c41a' }}>
                        ✓ 已设置 {sourceConfig.stripSuffixes.length} 个后缀
                      </div>
                    )}
                  </div>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space wrap>
                    {sourceConfig.stripSuffixes.map((suffix) => (
                      <Tag
                        key={suffix}
                        closable
                        onClose={() => handleRemoveSuffix(suffix)}
                      >
                        {suffix}
                      </Tag>
                    ))}
                  </Space>

                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      placeholder="输入新后缀，如 _e"
                      value={newSuffix}
                      onChange={(e) => setNewSuffix(e.target.value)}
                      onPressEnter={handleAddSuffix}
                    />
                    <Button icon={<PlusOutlined />} onClick={handleAddSuffix}>
                      添加
                    </Button>
                  </Space.Compact>
                </Space>
              </Form.Item>

              <Divider />

              <div style={{ textAlign: 'center' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<PlayCircleOutlined />}
                  onClick={handleMatchSourceFiles}
                  loading={sourceLoading}
                >
                  执行匹配
                </Button>
              </div>

              {sourceResult && (
                <div style={{ marginTop: 24 }}>
                  <Alert
                    message={`匹配完成：成功 ${sourceResult.success} 个，失败 ${sourceResult.failed.length} 个`}
                    type={sourceResult.failed.length > 0 ? 'warning' : 'success'}
                    showIcon
                  />
                  {sourceResult.failed.length > 0 && (
                    <div style={{ marginTop: 12, maxHeight: 200, overflow: 'auto' }}>
                      <div style={{ fontSize: 12, color: '#999' }}>失败文件：</div>
                      {sourceResult.failed.map((item, index) => (
                        <div key={index} style={{ fontSize: 12, marginTop: 4 }}>
                          {item.path}: {item.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Form>
  )

  // 匹配派生文件 Tab 内容
  const derivedTabContent = (
            <Form layout="vertical">
              <Alert
                message="功能说明"
                description="从源文件夹（原图）和派生文件夹（结果图）中匹配文件，根据主体名（剥离可配置后缀）进行匹配并复制/移动到输出文件夹。"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Form.Item label="源文件夹（原图）">
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    value={derivedConfig.baseDir}
                    placeholder="选择源文件夹（原图）或拖拽至此"
                    readOnly
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      height: '40px',
                      fontSize: '14px',
                      ...(baseDirDrop.isDragging ? {
                        borderColor: '#1890ff',
                        borderWidth: 2,
                        backgroundColor: '#e6f7ff',
                        boxShadow: '0 0 8px rgba(24, 144, 255, 0.3)',
                      } : {}),
                    }}
                    {...baseDirDrop.dragHandlers}
                  />
                  <Button
                    icon={<FolderOpenOutlined />}
                    onClick={() => handleSelectFolder('derived-baseDir')}
                    style={{ height: '40px' }}
                  >
                    选择
                  </Button>
                </Space.Compact>
              </Form.Item>

              <Form.Item label="派生文件夹（结果图）">
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    value={derivedConfig.targetDir}
                    placeholder="选择派生文件夹（结果图）或拖拽至此"
                    readOnly
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      height: '40px',
                      fontSize: '14px',
                      ...(derivedTargetDirDrop.isDragging ? {
                        borderColor: '#1890ff',
                        borderWidth: 2,
                        backgroundColor: '#e6f7ff',
                        boxShadow: '0 0 8px rgba(24, 144, 255, 0.3)',
                      } : {}),
                    }}
                    {...derivedTargetDirDrop.dragHandlers}
                  />
                  <Button
                    icon={<FolderOpenOutlined />}
                    onClick={() => handleSelectFolder('derived-targetDir')}
                    style={{ height: '40px' }}
                  >
                    选择
                  </Button>
                </Space.Compact>
              </Form.Item>

              <Form.Item label="输出文件夹">
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    value={derivedConfig.outputDir}
                    placeholder="选择输出文件夹或拖拽至此"
                    readOnly
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      height: '40px',
                      fontSize: '14px',
                      ...(derivedOutputDirDrop.isDragging ? {
                        borderColor: '#1890ff',
                        borderWidth: 2,
                        backgroundColor: '#e6f7ff',
                        boxShadow: '0 0 8px rgba(24, 144, 255, 0.3)',
                      } : {}),
                    }}
                    {...derivedOutputDirDrop.dragHandlers}
                  />
                  <Button
                    icon={<FolderOpenOutlined />}
                    onClick={() => handleSelectFolder('derived-outputDir')}
                    style={{ height: '40px' }}
                  >
                    选择
                  </Button>
                </Space.Compact>
              </Form.Item>

              <Divider />

              <Form.Item
                label="扫描选项"
                extra="是否递归扫描子文件夹"
              >
                <Switch
                  checked={derivedConfig.recursive !== false}
                  onChange={(checked) => {
                    setDerivedConfig({ ...derivedConfig, recursive: checked })
                  }}
                  checkedChildren="递归扫描"
                  unCheckedChildren="仅当前文件夹"
                />
              </Form.Item>

              <Form.Item
                label="操作模式"
                extra="选择复制或移动文件"
              >
                <Radio.Group
                  value={derivedConfig.useMove ? 'move' : 'copy'}
                  onChange={(e) => {
                    setDerivedConfig({ ...derivedConfig, useMove: e.target.value === 'move' })
                  }}
                >
                  <Radio value="copy">复制（默认）</Radio>
                  <Radio value="move">移动（需确认）</Radio>
                </Radio.Group>
              </Form.Item>

              <Divider />

              <Form.Item
                label="可剥离的后缀"
                extra={
                  <div>
                    <div style={{ color: derivedConfig.stripSuffixes.length === 0 ? '#ff4d4f' : '#666' }}>
                      {derivedConfig.stripSuffixes.length === 0 
                        ? '⚠️ 请先添加可剥离的后缀！如果不添加后缀，匹配时不会剥离文件名后缀，可能导致匹配失败。'
                        : '只在文件名结尾匹配时才剥离，不误伤中间的下划线'}
                    </div>
                    {derivedConfig.stripSuffixes.length > 0 && (
                      <div style={{ marginTop: 4, fontSize: 12, color: '#52c41a' }}>
                        ✓ 已设置 {derivedConfig.stripSuffixes.length} 个后缀
                      </div>
                    )}
                  </div>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space wrap>
                    {derivedConfig.stripSuffixes.map((suffix) => (
                      <Tag
                        key={suffix}
                        closable
                        onClose={() => handleRemoveDerivedMatchSuffix(suffix)}
                      >
                        {suffix}
                      </Tag>
                    ))}
                  </Space>

                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      placeholder="输入新后缀，如 _e"
                      value={newDerivedMatchSuffix}
                      onChange={(e) => setNewDerivedMatchSuffix(e.target.value)}
                      onPressEnter={handleAddDerivedMatchSuffix}
                    />
                    <Button icon={<PlusOutlined />} onClick={handleAddDerivedMatchSuffix}>
                      添加
                    </Button>
                  </Space.Compact>
                </Space>
              </Form.Item>

              <Divider />

              <div style={{ textAlign: 'center' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<PlayCircleOutlined />}
                  onClick={handleMatchDerivedFiles}
                  loading={derivedLoading}
                >
                  执行匹配
                </Button>
              </div>

              {derivedResult && (
                <div style={{ marginTop: 24 }}>
                  <Alert
                    message={`匹配完成：成功 ${derivedResult.success} 个，失败 ${derivedResult.failed.length} 个`}
                    type={derivedResult.failed.length > 0 ? 'warning' : 'success'}
                    showIcon
                  />
                  {derivedResult.failed.length > 0 && (
                    <div style={{ marginTop: 12, maxHeight: 200, overflow: 'auto' }}>
                      <div style={{ fontSize: 12, color: '#999' }}>失败文件：</div>
                      {derivedResult.failed.map((item, index) => (
                        <div key={index} style={{ fontSize: 12, marginTop: 4 }}>
                          {item.path}: {item.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Form>
  )

  // 文件分类 Tab 内容
  const classifierTabContent = (
    <Form layout="vertical">
      <Alert
        message="功能说明"
        description="根据文件类型和命名规则自动分类文件：PSD文件 → psd子文件夹，带派生后缀的文件 → 对应后缀的子文件夹，其他文件 → originals子文件夹。分类完成后会生成CSV日志。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form.Item label="源文件夹">
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={classifierConfig.sourceDir}
            placeholder="选择源文件夹或拖拽至此"
            readOnly
            style={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              height: '40px',
              fontSize: '14px',
              ...(classifierSourceDirDrop.isDragging ? {
                borderColor: '#1890ff',
                borderWidth: 2,
                backgroundColor: '#e6f7ff',
                boxShadow: '0 0 8px rgba(24, 144, 255, 0.3)',
              } : {}),
            }}
            {...classifierSourceDirDrop.dragHandlers}
          />
          <Button
            icon={<FolderOpenOutlined />}
            onClick={() => handleSelectFolder('classifier-sourceDir')}
            style={{ height: '40px' }}
          >
            选择
          </Button>
        </Space.Compact>
      </Form.Item>

      <Form.Item label="输出文件夹">
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={classifierConfig.outputDir}
            placeholder="选择输出文件夹或拖拽至此"
            readOnly
            style={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              height: '40px',
              fontSize: '14px',
              ...(classifierOutputDirDrop.isDragging ? {
                borderColor: '#1890ff',
                borderWidth: 2,
                backgroundColor: '#e6f7ff',
                boxShadow: '0 0 8px rgba(24, 144, 255, 0.3)',
              } : {}),
            }}
            {...classifierOutputDirDrop.dragHandlers}
          />
          <Button
            icon={<FolderOpenOutlined />}
            onClick={() => handleSelectFolder('classifier-outputDir')}
            style={{ height: '40px' }}
          >
            选择
          </Button>
        </Space.Compact>
      </Form.Item>

      <Divider />

      <Form.Item
        label="扫描选项"
        extra="是否递归扫描子文件夹"
      >
        <Switch
          checked={classifierConfig.recursive !== false}
          onChange={(checked) => {
            setClassifierConfig({ ...classifierConfig, recursive: checked })
          }}
          checkedChildren="递归扫描"
          unCheckedChildren="仅当前文件夹"
        />
      </Form.Item>

      <Form.Item
        label="操作模式"
        extra="选择复制或移动文件"
      >
        <Radio.Group
          value={classifierConfig.useMove ? 'move' : 'copy'}
          onChange={(e) => {
            setClassifierConfig({ ...classifierConfig, useMove: e.target.value === 'move' })
          }}
        >
          <Radio value="copy">复制（默认）</Radio>
          <Radio value="move">移动（需确认）</Radio>
        </Radio.Group>
      </Form.Item>

      <Divider />

      <Form.Item
        label="派生后缀"
        extra={
          <div>
            <div style={{ color: classifierConfig.derivedSuffixes.length === 0 ? '#ff4d4f' : '#666' }}>
              {classifierConfig.derivedSuffixes.length === 0 
                ? '⚠️ 请先添加派生后缀！如果不添加后缀，所有非PSD文件都会被归类到 originals 文件夹。'
                : '只在文件名结尾匹配时才识别，不误伤中间的下划线'}
            </div>
            {classifierConfig.derivedSuffixes.length > 0 && (
              <div style={{ marginTop: 4, fontSize: 12, color: '#52c41a' }}>
                ✓ 已设置 {classifierConfig.derivedSuffixes.length} 个后缀
              </div>
            )}
          </div>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space wrap>
            {classifierConfig.derivedSuffixes.map((suffix) => (
              <Tag
                key={suffix}
                closable
                onClose={() => handleRemoveClassifierSuffix(suffix)}
              >
                {suffix}
              </Tag>
            ))}
          </Space>

          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="输入新后缀，如 _a1"
              value={newClassifierSuffix}
              onChange={(e) => setNewClassifierSuffix(e.target.value)}
              onPressEnter={handleAddClassifierSuffix}
            />
            <Button icon={<PlusOutlined />} onClick={handleAddClassifierSuffix}>
              添加
            </Button>
          </Space.Compact>
        </Space>
      </Form.Item>

      <Divider />

      <div style={{ textAlign: 'center' }}>
        <Button
          type="primary"
          size="large"
          icon={<PlayCircleOutlined />}
          onClick={handleClassifyFiles}
          loading={classifierLoading}
        >
          执行分类
        </Button>
      </div>

      {classifierResult && (
        <div style={{ marginTop: 24 }}>
          <Alert
            message={`分类完成：成功 ${classifierResult.success} 个，失败 ${classifierResult.failed.length} 个`}
            type={classifierResult.failed.length > 0 ? 'warning' : 'success'}
            showIcon
          />
          {classifierResult.csvPath && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
              CSV日志路径：{classifierResult.csvPath}
            </div>
          )}
          {classifierResult.failed.length > 0 && (
            <div style={{ marginTop: 12, maxHeight: 200, overflow: 'auto' }}>
              <div style={{ fontSize: 12, color: '#999' }}>失败文件：</div>
              {classifierResult.failed.map((item, index) => (
                <div key={index} style={{ fontSize: 12, marginTop: 4 }}>
                  {item.path}: {item.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Form>
  )

  // 抽取指定后缀文件 Tab 内容
  const extractorTabContent = (
    <Form layout="vertical">
      <Alert
        message="功能说明"
        description="从源文件夹中扫描所有图片，根据文件名是否以指定后缀结尾，将匹配到的文件按后缀分别复制/移动到输出文件夹中的子文件夹（如 _a1、_a2 等）。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form.Item label="源文件夹">
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={extractorConfig.sourceDir}
            placeholder="选择源文件夹或拖拽至此"
            readOnly
            style={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              height: '40px',
              fontSize: '14px',
              ...(extractorSourceDirDrop.isDragging ? {
                borderColor: '#1890ff',
                borderWidth: 2,
                backgroundColor: '#e6f7ff',
                boxShadow: '0 0 8px rgba(24, 144, 255, 0.3)',
              } : {}),
            }}
            {...extractorSourceDirDrop.dragHandlers}
          />
          <Button
            icon={<FolderOpenOutlined />}
            onClick={() => handleSelectFolder('extractor-sourceDir')}
            style={{ height: '40px' }}
          >
            选择
          </Button>
        </Space.Compact>
      </Form.Item>

      <Form.Item label="输出文件夹">
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={extractorConfig.outputDir}
            placeholder="选择输出文件夹或拖拽至此"
            readOnly
            style={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              height: '40px',
              fontSize: '14px',
              ...(extractorOutputDirDrop.isDragging ? {
                borderColor: '#1890ff',
                borderWidth: 2,
                backgroundColor: '#e6f7ff',
                boxShadow: '0 0 8px rgba(24, 144, 255, 0.3)',
              } : {}),
            }}
            {...extractorOutputDirDrop.dragHandlers}
          />
          <Button
            icon={<FolderOpenOutlined />}
            onClick={() => handleSelectFolder('extractor-outputDir')}
            style={{ height: '40px' }}
          >
            选择
          </Button>
        </Space.Compact>
      </Form.Item>

      <Divider />

      <Form.Item
        label="扫描选项"
        extra="是否递归扫描子文件夹"
      >
        <Switch
          checked={extractorConfig.recursive !== false}
          onChange={(checked) => {
            setExtractorConfig({ ...extractorConfig, recursive: checked })
          }}
          checkedChildren="递归扫描"
          unCheckedChildren="仅当前文件夹"
        />
      </Form.Item>

      <Form.Item
        label="操作模式"
        extra="选择复制或移动文件"
      >
        <Radio.Group
          value={extractorConfig.useMove ? 'move' : 'copy'}
          onChange={(e) => {
            setExtractorConfig({ ...extractorConfig, useMove: e.target.value === 'move' })
          }}
        >
          <Radio value="copy">复制（默认）</Radio>
          <Radio value="move">移动（需确认）</Radio>
        </Radio.Group>
      </Form.Item>

      <Divider />

      <Form.Item
        label="派生后缀"
        extra={
          <div>
            <div style={{ color: extractorConfig.derivedSuffixes.length === 0 ? '#ff4d4f' : '#666' }}>
              {extractorConfig.derivedSuffixes.length === 0
                ? '⚠️ 请先添加派生后缀！如果不添加后缀，将不会抽取任何文件。'
                : '只在文件名结尾匹配时才识别，不误伤中间的下划线'}
            </div>
            {extractorConfig.derivedSuffixes.length > 0 && (
              <div style={{ marginTop: 4, fontSize: 12, color: '#52c41a' }}>
                ✓ 已设置 {extractorConfig.derivedSuffixes.length} 个后缀
              </div>
            )}
          </div>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space wrap>
            {extractorConfig.derivedSuffixes.map((suffix) => (
              <Tag
                key={suffix}
                closable
                onClose={() => handleRemoveExtractorSuffix(suffix)}
              >
                {suffix}
              </Tag>
            ))}
          </Space>

          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="输入新后缀，如 _a1"
              value={newExtractorSuffix}
              onChange={(e) => setNewExtractorSuffix(e.target.value)}
              onPressEnter={handleAddExtractorSuffix}
            />
            <Button icon={<PlusOutlined />} onClick={handleAddExtractorSuffix}>
              添加
            </Button>
          </Space.Compact>
        </Space>
      </Form.Item>

      <Divider />

      <div style={{ textAlign: 'center' }}>
        <Button
          type="primary"
          size="large"
          icon={<PlayCircleOutlined />}
          onClick={handleExtractBySuffix}
          loading={extractorLoading}
        >
          执行抽取
        </Button>
      </div>

      {extractorResult && (
        <div style={{ marginTop: 24 }}>
          <Alert
            message={`抽取完成：成功 ${extractorResult.success} 个，失败 ${extractorResult.failed.length} 个`}
            type={extractorResult.failed.length > 0 ? 'warning' : 'success'}
            showIcon
          />
          {extractorResult.failed.length > 0 && (
            <div style={{ marginTop: 12, maxHeight: 200, overflow: 'auto' }}>
              <div style={{ fontSize: 12, color: '#999' }}>失败文件：</div>
              {extractorResult.failed.map((item, index) => (
                <div key={index} style={{ fontSize: 12, marginTop: 4 }}>
                  {item.path}: {item.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Form>
  )

  return (
    <div style={{ padding: '24px', maxWidth: '1000px' }}>
      <Card title="文件匹配">
        <Tabs
          defaultActiveKey="classifier"
          items={[
            {
              key: 'classifier',
              label: '文件分类',
              children: classifierTabContent,
            },
            {
              key: 'extractor',
              label: '抽取指定后缀文件',
              children: extractorTabContent,
            },
            {
              key: 'source',
              label: '匹配源文件',
              children: sourceTabContent,
            },
            {
              key: 'derived',
              label: '匹配派生文件',
              children: derivedTabContent,
            },
          ]}
        />
      </Card>
    </div>
  )
}
