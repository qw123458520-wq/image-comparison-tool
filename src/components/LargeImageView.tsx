/**
 * 大图+网格标注视图
 * 顶部显示原图（大图，独立缩放平移）
 * 底部显示派生图网格（小图，同步缩放，独立平移）
 */

import { useState, useEffect } from 'react'
import { Row, Col, Card, Space, Button, Progress, message, Modal, Dropdown, InputNumber } from 'antd'
import type { MenuProps } from 'antd'
import {
  LeftOutlined,
  RightOutlined,
  CloseOutlined,
  UpOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  ExportOutlined,
  DownOutlined,
  ClearOutlined,
} from '@ant-design/icons'
import ImageViewer from './ImageViewer'
import AnnotationPanel from './AnnotationPanel'
import { useImageStore } from '../store/imageStore'
import { useAnnotationStore } from '../store/annotationStore'
import { useConfigStore } from '../store/configStore'

export default function LargeImageView() {
  const {
    getCurrentGroup,
    currentIndex,
    totalCount,
    setCurrentIndex,
    prevImage,
    nextImage,
    selectedImages,
    selectImage,
    deselectImage,
    clearSelection,
    isQKeyPressed,
  } = useImageStore()

  const { annotations, clearAllAnnotations, mode } = useAnnotationStore()
  const { config } = useConfigStore()
  const [isProcessing, setIsProcessing] = useState(false)

  const currentGroup = getCurrentGroup()

  // 只有在单张模式下才允许选中图片
  const allowSelection = mode === 'individual'

  // 所有图片共享缩放和位置状态（同步缩放和拖拽）
  const [sharedScale, setSharedScale] = useState(1)
  const [sharedPosition, setSharedPosition] = useState({ x: 0, y: 0 })

  // 标注面板展开/折叠状态
  const [isAnnotationPanelOpen, setIsAnnotationPanelOpen] = useState(true)

  // 根据派生图数量动态计算初始上下比例
  const getInitialTopHeight = () => {
    const derivativeCount = currentGroup?.derivatives.length || 0
    if (derivativeCount <= 4) return 40  // 少量派生图：原图占40%
    if (derivativeCount <= 8) return 30  // 中等派生图：原图占30%
    if (derivativeCount <= 16) return 25 // 较多派生图：原图占25%
    return 20 // 大量派生图：原图占20%
  }

  // 分割条拖拽状态
  const [topHeight, setTopHeight] = useState(getInitialTopHeight())
  const [isDragging, setIsDragging] = useState(false)

  // 图片组切换时重置所有状态
  useEffect(() => {
    setSharedScale(1)
    setSharedPosition({ x: 0, y: 0 })
    setTopHeight(getInitialTopHeight()) // 根据新图片组的派生图数量重置比例
  }, [currentGroup?.id])

  // 处理分割条拖拽
  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)

    const startY = e.clientY
    const startHeight = topHeight

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY
      const viewportHeight = window.innerHeight - 120 // 减去工具栏等固定高度
      const deltaVh = (deltaY / viewportHeight) * 100

      // 限制范围：原图最小 15vh，最大 70vh
      const newHeight = Math.max(15, Math.min(70, startHeight + deltaVh))
      setTopHeight(newHeight)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  if (!currentGroup) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <p>没有可显示的图片组</p>
      </div>
    )
  }

  // 计算布局：每行最多4张
  const derivativeCount = currentGroup.derivatives.length
  const colsPerRow = derivativeCount <= 4 ? Math.max(1, derivativeCount) : 4
  const gridRowCount = Math.max(1, Math.ceil(derivativeCount / colsPerRow))

  // 单行高度固定为 190px
  const singleRowHeight = 190

  // 保存进度
  const handleSave = () => {
    message.success(`已标注 ${annotatedCount}/${totalCount} 组图片`)
    console.log('标注数据:', Array.from(annotations.entries()))
  }

  // 初始化（清空标注）
  const handleReset = () => {
    if (annotatedCount === 0) {
      message.info('当前没有标注数据')
      return
    }

    Modal.confirm({
      title: '确认初始化',
      content: `即将清空所有未应用的标注数据（${annotatedCount} 组），所有图片将恢复到未标注状态，此操作不可撤销，是否继续？`,
      okText: '确认初始化',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        clearAllAnnotations()
        message.success('已初始化所有标注数据')
      },
    })
  }

  // 导出报告
  const handleExportReport = async (format: 'json' | 'csv' | 'summary') => {
    try {
      const annotationsObj = Object.fromEntries(annotations.entries())

      let result
      switch (format) {
        case 'json':
          result = await window.electronAPI.report.exportJSON(groups, annotationsObj)
          break
        case 'csv':
          result = await window.electronAPI.report.exportCSV(groups, annotationsObj)
          break
        case 'summary':
          result = await window.electronAPI.report.exportSummary(groups, annotationsObj)
          break
      }

      if (result.success) {
        message.success(`报告已导出至: ${result.filePath}`)
      } else if (result.error && !result.error.includes('取消')) {
        message.error(result.error)
      }
    } catch (error) {
      console.error('导出报告失败:', error)
      message.error(`导出失败: ${error}`)
    }
  }

  // 应用标注
  const handleApplyAnnotations = async () => {
    if (annotatedCount === 0) {
      message.warning('还没有任何标注数据')
      return
    }

    if (!config) {
      message.error('配置信息不完整')
      return
    }

    if (!config.output.moveFiles) {
      message.warning('当前配置未启用文件移动功能，请在配置面板中启用')
      return
    }

    Modal.confirm({
      title: '确认应用标注',
      content: `即将根据标注移动 ${annotatedCount} 组图片的文件，此操作不可撤销，是否继续？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        setIsProcessing(true)
        try {
          const groupsWithAnnotations = groups.map((group) => ({
            ...group,
            annotations: annotations.get(group.id),
          }))

          const result = await window.electronAPI.annotation.process(
            groupsWithAnnotations,
            config
          )

          if (result.success) {
            message.success(`成功处理 ${result.operations.length} 个文件操作`)
            console.log('文件移动结果:', result)
          } else {
            message.error(`处理失败，共 ${result.errors.length} 个错误`)
            console.error('错误信息:', result.errors)

            Modal.error({
              title: '处理失败',
              content: (
                <div>
                  <p>以下操作失败:</p>
                  <ul>
                    {result.errors.map((error, index) => (
                      <li key={index} style={{ fontSize: '12px' }}>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              ),
              width: 600,
            })
          }
        } catch (error) {
          console.error('应用标注失败:', error)
          message.error(`应用标注失败: ${error}`)
        } finally {
          setIsProcessing(false)
        }
      },
    })
  }

  // 导出菜单项
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'json',
      label: 'JSON 格式',
      onClick: () => handleExportReport('json'),
    },
    {
      key: 'csv',
      label: 'CSV 格式（Excel）',
      onClick: () => handleExportReport('csv'),
    },
    {
      key: 'summary',
      label: '摘要报告（TXT）',
      onClick: () => handleExportReport('summary'),
    },
  ]

  // 辅助函数：提取文件名
  const getFileName = (path: string) => {
    const parts = path.split('/')
    return parts[parts.length - 1]
  }

  // 辅助函数：获取标签数字（用于单张标注模式）
  const getLabelNumber = (imagePath: string): number | undefined => {
    const { mode } = useAnnotationStore.getState()
    if (mode !== 'individual') return undefined

    const annotation = annotations.get(currentGroup.id)
    if (!annotation) return undefined

    const labelItem = annotation.labels.find((item) => item.target === imagePath)
    if (!labelItem) return undefined

    // 根据预设标签查找索引（1-10，10显示为0）
    if (!config) return undefined

    const labelIndex = config.labels.preset.indexOf(labelItem.label)
    if (labelIndex === -1) return undefined

    return labelIndex === 9 ? 0 : labelIndex + 1
  }

  // 计算已标注数量
  const annotatedCount = Array.from(annotations.values()).filter(
    (ann) => ann.labels.length > 0
  ).length
  const progress = totalCount > 0 ? (annotatedCount / totalCount) * 100 : 0

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 工具栏 */}
      <div
        style={{
          padding: '8px 16px',
          background: 'white',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Space>
          <Button
            icon={<LeftOutlined />}
            onClick={prevImage}
            disabled={currentIndex === 0}
          >
            上一组
          </Button>
          <div style={{ minWidth: 200, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <InputNumber
                min={1}
                max={totalCount}
                value={currentIndex + 1}
                onChange={(value) => {
                  if (value && value >= 1 && value <= totalCount) {
                    setCurrentIndex(value - 1)
                  }
                }}
                style={{ width: 70 }}
                size="small"
              />
              <strong>/ {totalCount}</strong>
            </div>
            <div style={{ fontSize: '12px', color: '#52c41a', marginTop: 4 }}>
              已标注: {annotatedCount}
            </div>
          </div>
          <Button
            icon={<RightOutlined />}
            onClick={nextImage}
            disabled={currentIndex === totalCount - 1}
          >
            下一组
          </Button>
        </Space>

        <div style={{ flex: 1 }}>
          <Progress
            percent={progress}
            showInfo={false}
            strokeColor="#52c41a"
            size="small"
          />
        </div>

        <Space>
          <Button icon={<SaveOutlined />} onClick={handleSave}>
            保存进度
          </Button>
          <Button
            danger
            icon={<ClearOutlined />}
            onClick={handleReset}
            disabled={annotatedCount === 0}
          >
            初始化
          </Button>
          <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
            <Button icon={<ExportOutlined />}>
              导出报告 <DownOutlined />
            </Button>
          </Dropdown>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleApplyAnnotations}
            loading={isProcessing}
            disabled={annotatedCount === 0}
          >
            应用标注
          </Button>
        </Space>
      </div>

      {/* 顶部原图区域 - 与底部派生图保持一致的宽度（25%） */}
      <div
        style={{
          height: `${topHeight}vh`,
          minHeight: '180px',
          padding: '16px',
          background: '#fafafa',
          overflow: 'hidden',
        }}
      >
        <Row gutter={[12, 12]} justify="center" style={{ height: '100%' }}>
          <Col span={6}>
            <ImageViewer
              src={currentGroup.original}
              alt="原图"
              title={`原图: ${getFileName(currentGroup.original)}`}
              isSelected={false}
              onSelect={undefined}
              onDeselect={undefined}
              scale={sharedScale}
              position={sharedPosition}
              onScaleChange={setSharedScale}
              onPositionChange={setSharedPosition}
              onResetView={() => {
                setSharedScale(1)
                setSharedPosition({ x: 0, y: 0 })
              }}
              rowCount={gridRowCount}
              labelNumber={undefined}
              fixedHeightMode={true}
            />
          </Col>
        </Row>
      </div>

      {/* 可拖拽的分割条 */}
      <div
        onMouseDown={handleDividerMouseDown}
        style={{
          height: '8px',
          background: isDragging ? '#1890ff' : '#e8e8e8',
          cursor: 'ns-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: isDragging ? 'none' : 'background 0.2s',
          position: 'relative',
          userSelect: 'none',
        }}
      >
        {/* 拖拽手柄指示器 */}
        <div
          style={{
            width: '60px',
            height: '4px',
            background: isDragging ? '#ffffff' : '#bfbfbf',
            borderRadius: '2px',
            transition: 'background 0.2s',
          }}
        />
      </div>

      {/* 底部网格区域 - CSS Grid布局，每行最多4张 */}
      <div
        style={{
          flex: 1,
          height: 'auto',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px',
          background: '#fafafa',
          minHeight: 0,
        }}
      >
        {currentGroup.derivatives.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              color: '#999',
              background: '#fff',
              borderRadius: '8px',
            }}
          >
            当前图片组没有派生图
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${colsPerRow}, 1fr)`,
              gap: '12px',
              padding: '2px',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            {currentGroup.derivatives.map((derivative, index) => (
              <div key={derivative} style={{ minWidth: 0 }}>
                <ImageViewer
                  src={derivative}
                  alt={`派生图 ${index + 1}`}
                  title={`派生图 ${index + 1}: ${getFileName(derivative)}`}
                  isSelected={allowSelection ? selectedImages.has(derivative) : false}
                  onSelect={allowSelection ? () => selectImage(derivative) : undefined}
                  onDeselect={allowSelection ? () => deselectImage(derivative) : undefined}
                  scale={sharedScale}
                  position={sharedPosition}
                  onScaleChange={setSharedScale}
                  onPositionChange={setSharedPosition}
                  onResetView={() => {
                    setSharedScale(1)
                    setSharedPosition({ x: 0, y: 0 })
                  }}
                  rowCount={gridRowCount}
                  labelNumber={getLabelNumber(derivative)}
                  alternateSrc={currentGroup.original}
                  showAlternate={isQKeyPressed}
                  fixedHeightMode={true}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 浮动标注面板 */}
      {isAnnotationPanelOpen ? (
        <Card
          size="small"
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            width: 500,
            maxHeight: '60vh',
            overflow: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
          }}
          className="hide-scrollbar"
          extra={
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={() => setIsAnnotationPanelOpen(false)}
              title="收起标注面板"
            />
          }
          title="标注面板"
        >
          <AnnotationPanel
            group={currentGroup}
            selectedImages={selectedImages}
            onClearSelection={clearSelection}
          />
        </Card>
      ) : (
        <Button
          type="primary"
          size="large"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            height: 56,
            width: 56,
            borderRadius: '50%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
          icon={<UpOutlined />}
          onClick={() => setIsAnnotationPanelOpen(true)}
          title="打开标注面板"
        />
      )}
    </div>
  )
}
