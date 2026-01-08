/**
 * 标签选择器组件
 */

import { useState } from 'react'
import { Space, Button, Input, Tag, message } from 'antd'
import { PlusOutlined, CheckOutlined } from '@ant-design/icons'
import { useConfigStore } from '../store/configStore'
import { useAnnotationStore } from '../store/annotationStore'
import type { AnnotationMode } from '../types'

interface LabelSelectorProps {
  groupId: string
  target: string
  targetName: string
  currentLabel?: string
  mode: AnnotationMode
  onSelect: (label: string) => void
}

export default function LabelSelector({
  groupId,
  target,
  targetName,
  currentLabel,
  mode,
  onSelect,
}: LabelSelectorProps) {
  const { config } = useConfigStore()
  const [customLabel, setCustomLabel] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const handleSelect = (label: string) => {
    onSelect(label)
    message.success(`已标注"${targetName}"为"${label}"`)
  }

  const handleCustomLabel = () => {
    if (!customLabel.trim()) {
      message.warning('请输入标签名称')
      return
    }

    handleSelect(customLabel.trim())
    setCustomLabel('')
    setShowCustomInput(false)
  }

  const presetLabels = config?.labels.preset || []
  const allowCustom = config?.labels.allowCustom ?? true

  return (
    <div>
      {/* 目标名称 */}
      {mode !== 'group' && (
        <div style={{ marginBottom: 8 }}>
          <Tag color="blue">{targetName}</Tag>
        </div>
      )}

      {/* 预设标签 */}
      <Space wrap>
        {presetLabels.map((label) => (
          <Button
            key={label}
            type={currentLabel === label ? 'primary' : 'default'}
            icon={currentLabel === label ? <CheckOutlined /> : undefined}
            onClick={() => handleSelect(label)}
          >
            {label}
          </Button>
        ))}

        {/* 自定义标签按钮 */}
        {allowCustom && !showCustomInput && (
          <Button
            icon={<PlusOutlined />}
            onClick={() => setShowCustomInput(true)}
          >
            自定义
          </Button>
        )}
      </Space>

      {/* 自定义标签输入 */}
      {showCustomInput && (
        <Space.Compact style={{ marginTop: 8, width: '300px' }}>
          <Input
            placeholder="输入自定义标签"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onPressEnter={handleCustomLabel}
            autoFocus
          />
          <Button type="primary" onClick={handleCustomLabel}>
            确定
          </Button>
          <Button onClick={() => setShowCustomInput(false)}>取消</Button>
        </Space.Compact>
      )}
    </div>
  )
}
