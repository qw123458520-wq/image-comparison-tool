/**
 * 缩略图列表组件 - 优化版本
 */

import { memo, useMemo } from 'react'
import { List, Card, Badge } from 'antd'
import {
  CheckCircleFilled,
  CloseCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { useAnnotationStore } from '../store/annotationStore'
import type { ImageGroup } from '../types'

interface ThumbnailListProps {
  groups: ImageGroup[]
  currentIndex: number
  onSelect: (index: number) => void
}

// 单个缩略图项组件（使用 memo 优化）
const ThumbnailItem = memo(
  ({
    group,
    index,
    isSelected,
    onSelect,
  }: {
    group: ImageGroup
    index: number
    isSelected: boolean
    onSelect: () => void
  }) => {
    const { getAnnotation } = useAnnotationStore()

    const getStatusIcon = () => {
      const annotation = getAnnotation(group.id)

      if (!annotation?.labels || annotation.labels.length === 0) {
        return <QuestionCircleOutlined style={{ color: '#999' }} />
      }

      const allPassed = annotation.labels.every(
        (item) => item.label === '通过'
      )
      if (allPassed) {
        return <CheckCircleFilled style={{ color: '#52c41a' }} />
      }

      const hasFailed = annotation.labels.some(
        (item) => item.label === '不通过'
      )
      if (hasFailed) {
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      }

      return <QuestionCircleOutlined style={{ color: '#faad14' }} />
    }

    const getFileName = (path: string) => {
      const parts = path.split('/')
      return parts[parts.length - 1]
    }

    return (
      <List.Item
        style={{
          padding: 0,
          marginBottom: 8,
          cursor: 'pointer',
        }}
        onClick={onSelect}
      >
        <Badge
          count={group.derivatives.length}
          size="small"
          style={{ backgroundColor: '#1890ff' }}
        >
          <Card
            size="small"
            hoverable
            bodyStyle={{
              padding: 8,
              background: isSelected ? '#e6f7ff' : 'white',
              border:
                isSelected
                  ? '2px solid #1890ff'
                  : '1px solid #d9d9d9',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {getStatusIcon()}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight:
                      isSelected ? 'bold' : 'normal',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {index + 1}. {getFileName(group.original)}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#999',
                    marginTop: 2,
                  }}
                >
                  {group.derivatives.length} 张派生图
                </div>
              </div>
            </div>
          </Card>
        </Badge>
      </List.Item>
    )
  }
)

ThumbnailItem.displayName = 'ThumbnailItem'

export default function ThumbnailList({
  groups,
  currentIndex,
  onSelect,
}: ThumbnailListProps) {
  // 使用 useMemo 优化数据源
  const dataSource = useMemo(() => groups, [groups])

  return (
    <div
      style={{
        height: '100%',
        overflow: 'auto',
        background: '#fafafa',
        padding: '8px',
      }}
    >
      <List
        dataSource={dataSource}
        renderItem={(group, index) => (
          <ThumbnailItem
            key={group.id}
            group={group}
            index={index}
            isSelected={currentIndex === index}
            onSelect={() => onSelect(index)}
          />
        )}
      />
    </div>
  )
}
