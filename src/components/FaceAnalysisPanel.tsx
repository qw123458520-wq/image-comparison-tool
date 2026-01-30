/**
 * 人脸分析面板组件
 */

import React, { useEffect, useState } from 'react'
import { Card, Button, Switch, Select, Input, Progress, Alert, Table, Space, Tag, message } from 'antd'
import { PlayCircleOutlined, FolderOutlined } from '@ant-design/icons'
import { useFaceAnalysisStore } from '../store/faceAnalysisStore'
import { useImageStore } from '../store/imageStore'
import { useFolderDrop } from '../hooks/useFolderDrop'

const FaceAnalysisPanel: React.FC = () => {
  const {
    pythonAvailable,
    deepfaceInstalled,
    environmentChecked,
    isAnalyzing,
    progress,
    results,
    config,
    checkEnvironment,
    analyzeBatch,
    updateConfig,
  } = useFaceAnalysisStore()

  const [inputFolder, setInputFolder] = useState<string>('')
  const [outputFolder, setOutputFolder] = useState<string>('')

  // 输入文件夹拖拽
  const inputFolderDrop = useFolderDrop({
    onFolderSelected: async (folder) => {
      setInputFolder(folder)
      updateConfig({ inputFolder: folder })
    },
    successMessage: '输入文件夹选择成功',
  })

  // 输出文件夹拖拽
  const outputFolderDrop = useFolderDrop({
    onFolderSelected: async (folder) => {
      setOutputFolder(folder)
      updateConfig({ outputFolder: folder })
    },
    successMessage: '输出文件夹选择成功',
  })

  // 组件加载时检查环境
  useEffect(() => {
    if (!environmentChecked) {
      checkEnvironment()
    }
  }, [])

  // 选择输入文件夹
  const handleSelectInputFolder = async () => {
    const folder = await window.electronAPI.dialog.selectFolder()
    if (folder) {
      setInputFolder(folder)
      updateConfig({ inputFolder: folder })
    }
  }

  // 选择输出文件夹
  const handleSelectOutputFolder = async () => {
    const folder = await window.electronAPI.dialog.selectFolder()
    if (folder) {
      setOutputFolder(folder)
      updateConfig({ outputFolder: folder })
    }
  }

  // 开始分析
  const handleStartAnalysis = async () => {
    if (!inputFolder) {
      message.error('请先选择输入文件夹')
      return
    }

    if (!outputFolder) {
      message.error('请先选择输出文件夹')
      return
    }

    try {
      // 扫描输入文件夹中的图片
      const imagePaths = await window.electronAPI.face.scanImages(inputFolder)

      if (imagePaths.length === 0) {
        message.error('输入文件夹中没有找到图片文件')
        return
      }

      await analyzeBatch(imagePaths)
      message.success('分析完成！')
    } catch (error) {
      message.error('分析失败')
    }
  }

  // 执行文件移动
  const handleMoveFiles = async () => {
    if (results.size === 0) {
      message.error('没有分析结果')
      return
    }

    const operations = Array.from(results.values()).map((item: any) => ({
      sourcePath: item.imagePath,
      targetPath: item.targetPath,
    }))

    try {
      const moveResults = await window.electronAPI.face.classifyAndMove(operations)

      const successCount = moveResults.filter((r: any) => r.success).length
      const failCount = moveResults.filter((r: any) => !r.success).length

      if (failCount > 0) {
        message.warning(`移动完成：成功 ${successCount} 个，失败 ${failCount} 个`)
      } else {
        message.success(`成功移动 ${successCount} 个文件！`)
      }
    } catch (error) {
      message.error('文件移动失败')
    }
  }

  // 渲染环境检查状态
  const renderEnvironmentStatus = () => {
    if (!environmentChecked) {
      return <Alert message="正在检查 Python 环境..." type="info" showIcon />
    }

    if (!pythonAvailable) {
      return (
        <Alert
          message="Python 环境未就绪"
          description={
            <div>
              <p>请安装 Python 3，然后安装依赖：</p>
              <code>cd electron/python && pip3 install -r requirements.txt</code>
            </div>
          }
          type="error"
          showIcon
        />
      )
    }

    if (!deepfaceInstalled) {
      return (
        <Alert
          message="DeepFace 未安装"
          description={
            <div>
              <p>请运行以下命令安装：</p>
              <code>pip3 install deepface</code>
            </div>
          }
          type="warning"
          showIcon
        />
      )
    }

    return (
      <Alert
        message="环境检查通过"
        description="Python 和 DeepFace 已就绪，可以开始人脸分析"
        type="success"
        showIcon
      />
    )
  }

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      <Card title="人脸识别与智能分类" style={{ marginBottom: '16px' }}>
        {renderEnvironmentStatus()}

        <div style={{ marginTop: '24px' }}>
          <h3>配置</h3>

          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 输入文件夹 */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>输入文件夹：</label>
              <Input
                value={inputFolder}
                readOnly
                placeholder="点击选择包含图片的文件夹或拖拽至此"
                onClick={handleSelectInputFolder}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  height: '40px',
                  fontSize: '14px',
                  ...(inputFolderDrop.isDragging ? {
                    borderColor: '#1890ff',
                    borderWidth: 2,
                    backgroundColor: '#e6f7ff',
                    boxShadow: '0 0 8px rgba(24, 144, 255, 0.3)',
                  } : {}),
                }}
                suffix={<FolderOutlined />}
                {...inputFolderDrop.dragHandlers}
              />
            </div>

            {/* 输出文件夹 */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>输出文件夹：</label>
              <Input
                value={outputFolder}
                readOnly
                placeholder="点击选择分类结果输出文件夹或拖拽至此"
                onClick={handleSelectOutputFolder}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  height: '40px',
                  fontSize: '14px',
                  ...(outputFolderDrop.isDragging ? {
                    borderColor: '#1890ff',
                    borderWidth: 2,
                    backgroundColor: '#e6f7ff',
                    boxShadow: '0 0 8px rgba(24, 144, 255, 0.3)',
                  } : {}),
                }}
                suffix={<FolderOutlined />}
                {...outputFolderDrop.dragHandlers}
              />
            </div>

            {/* 二级分类开关 */}
            <div>
              <label style={{ marginRight: '12px' }}>启用二级分类（性别 + 年龄）：</label>
              <Switch
                checked={config.enableSecondaryClassification}
                onChange={(checked) => updateConfig({ enableSecondaryClassification: checked })}
              />
              <div style={{ marginTop: '8px', color: '#666', fontSize: '12px' }}>
                启用后将按"人脸数量 → 性别 → 年龄段"的层级分类
              </div>
            </div>

            {/* 年龄段配置 */}
            {config.enableSecondaryClassification && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px' }}>年龄段：</label>
                <Select
                  mode="tags"
                  style={{ width: '100%' }}
                  value={config.ageRanges}
                  onChange={(ranges) => updateConfig({ ageRanges: ranges })}
                  placeholder="配置年龄段"
                />
              </div>
            )}
          </Space>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={handleStartAnalysis}
            disabled={!pythonAvailable || !deepfaceInstalled || isAnalyzing}
            loading={isAnalyzing}
          >
            开始分析并分类
          </Button>

          {results.size > 0 && (
            <Button size="large" onClick={handleMoveFiles} disabled={isAnalyzing}>
              执行文件移动
            </Button>
          )}
        </div>

        {/* 进度显示 */}
        {isAnalyzing && progress && (
          <div style={{ marginTop: '24px' }}>
            <Progress
              percent={Math.round((progress.current / progress.total) * 100)}
              status="active"
            />
            <p style={{ marginTop: '8px', color: '#666' }}>
              正在处理：{progress.currentFile}
            </p>
            <p style={{ color: '#999' }}>
              {progress.current} / {progress.total}
            </p>
          </div>
        )}

        {/* 结果展示 */}
        {results.size > 0 && !isAnalyzing && (
          <div style={{ marginTop: '24px' }}>
            <h3>分析结果</h3>
            <Table
              dataSource={Array.from(results.values()).map((data: any, index) => ({
                key: index,
                ...data,
              }))}
              columns={[
                {
                  title: '图片路径',
                  dataIndex: 'imagePath',
                  key: 'imagePath',
                  ellipsis: true,
                  width: 300,
                },
                {
                  title: '人脸数量',
                  dataIndex: ['result', 'face_count'],
                  key: 'faceCount',
                  width: 120,
                  render: (count: number) => {
                    const color = count === 0 ? 'default' : count === 1 ? 'blue' : 'green'
                    return <Tag color={color}>{count}人脸</Tag>
                  },
                },
                {
                  title: '性别/年龄',
                  key: 'details',
                  width: 200,
                  render: (_, record: any) => {
                    if (!record.result.success || !record.result.faces || record.result.faces.length === 0) {
                      return '-'
                    }
                    return record.result.faces.map((face: any, i: number) => (
                      <div key={i} style={{ marginBottom: '4px' }}>
                        <Tag>{face.gender === 'male' ? '男' : '女'}</Tag>
                        <span>{face.age_range}</span>
                      </div>
                    ))
                  },
                },
                {
                  title: '分类路径',
                  dataIndex: 'targetPath',
                  key: 'targetPath',
                  ellipsis: true,
                },
              ]}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </div>
        )}
      </Card>
    </div>
  )
}

export default FaceAnalysisPanel
