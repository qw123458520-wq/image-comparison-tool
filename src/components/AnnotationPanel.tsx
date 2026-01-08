/**
 * 标注面板组件 - 支持三种标注模式
 */

import { Card, Radio, Space, Divider, Alert, Button, Tag, message } from 'antd'
import {
  AppstoreOutlined,
  FileImageOutlined,
  SwitcherOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import LabelSelector from './LabelSelector'
import { useAnnotationStore } from '../store/annotationStore'
import { useConfigStore } from '../store/configStore'
import { useImageStore } from '../store/imageStore'
import type { ImageGroup, AnnotationMode } from '../types'

interface AnnotationPanelProps {
  group: ImageGroup
  selectedImages?: Set<string>
  onClearSelection?: () => void
}

export default function AnnotationPanel({
  group,
  selectedImages = new Set(),
  onClearSelection
}: AnnotationPanelProps) {
  const { mode, setMode, addAnnotation, getAnnotation, removeAnnotation, clearAnnotation } =
    useAnnotationStore()
  const { config } = useConfigStore()
  const { nextImage } = useImageStore()

  const annotation = getAnnotation(group.id)

  const handleLabelSelect = (target: string, label: string) => {
    addAnnotation(group.id, target, label)

    // 自动跳转逻辑：
    // 1. 整组标注模式下，标注完成后立即跳转到下一组
    // 2. 固定分组模式且每组只有1张图片时，无论什么模式都自动跳转
    const shouldAutoJump =
      mode === 'group' ||
      (config?.matchRules.mode === 'fixed-group-size' && config?.matchRules.groupSize === 1)

    if (shouldAutoJump) {
      nextImage()
    }
  }

  // 批量标注处理
  const handleBatchLabelSelect = (label: string) => {
    if (selectedImages.size === 0) return

    selectedImages.forEach((imagePath) => {
      addAnnotation(group.id, imagePath, label)
    })

    message.success(`已为 ${selectedImages.size} 张图片打上"${label}"标签`)

    // 清空选择
    if (onClearSelection) {
      onClearSelection()
    }

    // 固定分组模式且每组只有1张图片时，批量标注后也自动跳转
    if (config?.matchRules.mode === 'fixed-group-size' && config?.matchRules.groupSize === 1) {
      nextImage()
    }
  }

  const getCurrentLabel = (target: string): string | undefined => {
    return annotation?.labels.find((item) => item.target === target)?.label
  }

  const getFileName = (path: string) => {
    const parts = path.split('/')
    return parts[parts.length - 1]
  }

  // 处理单个标注删除
  const handleRemoveAnnotation = (target: string) => {
    removeAnnotation(group.id, target)
    message.success('已删除标注')
  }

  // 处理清空所有标注
  const handleClearAllAnnotations = () => {
    clearAnnotation(group.id)
    message.success('已清空所有标注')
  }

  // 检查是否显示批量标注面板
  const showBatchPanel = mode === 'individual' && selectedImages.size > 0

  return (
    <Card>
      {/* 模式切换 */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <strong>标注模式:</strong>
          <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
            <Radio.Button value="group">
              <AppstoreOutlined /> 整组标注
            </Radio.Button>
            <Radio.Button value="individual">
              <FileImageOutlined /> 单张标注
            </Radio.Button>
          </Radio.Group>
        </Space>
      </div>

      {/* 模式说明 */}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={
          mode === 'group'
            ? '整组标注：对所有图片应用相同的标签'
            : mode === 'individual'
            ? '单张标注：对每张派生图分别打标签'
            : '对比对标注：对原图和每张派生图的组合分别打标签'
        }
      />

      <Divider />

      {/* 标注选择器 */}
      <div>
        {mode === 'group' && (
          // 整组标注模式
          <LabelSelector
            groupId={group.id}
            target={group.original}
            targetName="整组图片"
            currentLabel={getCurrentLabel(group.original)}
            mode={mode}
            onSelect={(label) => handleLabelSelect(group.original, label)}
          />
        )}

        {mode === 'individual' && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 批量标注面板 - 有选中图片时显示 */}
            {showBatchPanel && (
              <div
                style={{
                  background: '#e6f7ff',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '2px solid #1890ff',
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <Space>
                    <strong style={{ color: '#1890ff' }}>
                      批量标注 ({selectedImages.size} 张图片)
                    </strong>
                    <Button
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={onClearSelection}
                    >
                      清空选择
                    </Button>
                  </Space>
                </div>

                {/* 显示选中的图片列表 */}
                <div style={{ marginBottom: 12, maxHeight: '120px', overflow: 'auto' }}>
                  <Space wrap size={[4, 4]}>
                    {Array.from(selectedImages).map((imagePath) => (
                      <Tag key={imagePath} color="blue">
                        {getFileName(imagePath)}
                      </Tag>
                    ))}
                  </Space>
                </div>

                {/* 批量标注选择器 */}
                <LabelSelector
                  groupId={group.id}
                  target=""
                  targetName="批量标注"
                  mode={mode}
                  onSelect={handleBatchLabelSelect}
                />
              </div>
            )}

            {/* 单张派生图标注模式 */}
            {!showBatchPanel && group.derivatives.map((derivative) => (
              <div key={derivative}>
                <LabelSelector
                  groupId={group.id}
                  target={derivative}
                  targetName={getFileName(derivative)}
                  currentLabel={getCurrentLabel(derivative)}
                  mode={mode}
                  onSelect={(label) => handleLabelSelect(derivative, label)}
                />
              </div>
            ))}
          </Space>
        )}
      </div>

      {/* 当前标注状态 */}
      {annotation && annotation.labels.length > 0 && (
        <>
          <Divider />
          <div style={{ fontSize: '12px', color: '#666' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong>已标注 ({annotation.labels.length}):</strong>
              <Button
                size="small"
                danger
                type="text"
                icon={<CloseOutlined />}
                onClick={handleClearAllAnnotations}
              >
                全部清除
              </Button>
            </div>
            <div>
              {annotation.labels.map((item, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    background: '#f5f5f5',
                    borderRadius: 4,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <Tag color="blue">{item.label}</Tag>
                    {mode !== 'group' && (
                      <span style={{ color: '#999', fontSize: '11px' }}>
                        {getFileName(item.target)}
                      </span>
                    )}
                  </div>
                  <Button
                    size="small"
                    danger
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={() => handleRemoveAnnotation(item.target)}
                    title="删除此标注"
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
