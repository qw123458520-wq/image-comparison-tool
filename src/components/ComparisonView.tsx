/**
 * 对比标注主视图
 */

import { useState, useEffect } from 'react'
import { Layout, Button, Space, Progress, message, Modal, Dropdown, Card, InputNumber } from 'antd'
import type { MenuProps } from 'antd'
import {
  LeftOutlined,
  RightOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  ExportOutlined,
  DownOutlined,
  UpOutlined,
  CloseOutlined,
  ClearOutlined,
} from '@ant-design/icons'
import { useImageStore } from '../store/imageStore'
import { useAnnotationStore } from '../store/annotationStore'
import { useConfigStore } from '../store/configStore'
import ThumbnailList from './ThumbnailList'
import ImageComparison from './ImageComparison'
import AnnotationPanel from './AnnotationPanel'

const { Sider, Content } = Layout

export default function ComparisonView() {
  const {
    groups,
    currentIndex,
    totalCount,
    setCurrentIndex,
    nextImage,
    prevImage,
    getCurrentGroup,
  } = useImageStore()

  const { annotations, mode, clearAllAnnotations } = useAnnotationStore()
  const { config } = useConfigStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAnnotationPanelOpen, setIsAnnotationPanelOpen] = useState(true)

  // 从 store 获取选中状态（替代本地状态）
  const { selectedImages, selectImage, deselectImage, clearSelection } = useImageStore()

  const currentGroup = getCurrentGroup()

  if (!currentGroup) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <p>没有可显示的图片组</p>
      </div>
    )
  }

  // 计算已标注数量
  const annotatedCount = Array.from(annotations.values()).filter(
    (ann) => ann.labels.length > 0
  ).length

  const progress = totalCount > 0 ? (annotatedCount / totalCount) * 100 : 0

  const handleSave = () => {
    message.success(`已标注 ${annotatedCount}/${totalCount} 组图片`)
    console.log('标注数据:', Array.from(annotations.entries()))
  }

  const handleReset = () => {
    // 检查是否有标注数据
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

  const handleExportReport = async (format: 'json' | 'csv' | 'summary') => {
    try {
      // 准备标注数据（转换 Map 为对象以便传递）
      const annotationsObj = Object.fromEntries(annotations.entries())

      let result
      switch (format) {
        case 'json':
          result = await window.electronAPI.report.exportJSON(
            groups,
            annotationsObj
          )
          break
        case 'csv':
          result = await window.electronAPI.report.exportCSV(
            groups,
            annotationsObj
          )
          break
        case 'summary':
          result = await window.electronAPI.report.exportSummary(
            groups,
            annotationsObj
          )
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

  const handleApplyAnnotations = async () => {
    // 检查是否有标注数据
    if (annotatedCount === 0) {
      message.warning('还没有任何标注数据')
      return
    }

    // 检查配置是否完整
    if (!config) {
      message.error('配置信息不完整')
      return
    }

    // 检查是否启用了文件移动
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
          // 准备带有标注的图片组数据
          const groupsWithAnnotations = groups.map((group) => ({
            ...group,
            annotations: annotations.get(group.id),
          }))

          // 调用后端处理标注
          const result = await window.electronAPI.annotation.process(
            groupsWithAnnotations,
            config
          )

          if (result.success) {
            message.success(
              `成功处理 ${result.operations.length} 个文件操作`
            )
            console.log('文件移动结果:', result)

            // 可选：清空已处理的标注
            // 或者重新加载图片列表
          } else {
            message.error(`处理失败，共 ${result.errors.length} 个错误`)
            console.error('错误信息:', result.errors)

            // 显示错误详情
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

  return (
    <Layout style={{ height: '100%' }}>
      {/* 主内容区 - 全宽布局 */}
      <Content style={{ display: 'flex', flexDirection: 'column' }}>
        {/* 顶部工具栏 */}
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

        {/* 图片对比区域 */}
        <div
          style={{
            flex: 1,
            padding: '16px',
            overflow: 'auto',
            background: '#f0f2f5',
            position: 'relative',
          }}
        >
          <ImageComparison
            group={currentGroup}
            selectedImages={selectedImages}
            onSelectImage={selectImage}
            onDeselectImage={deselectImage}
          />

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
                // 隐藏滚动条，但保留滚动功能
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
      </Content>
    </Layout>
  )
}
