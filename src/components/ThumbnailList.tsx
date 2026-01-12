/**
 * 缩略图列表组件 - 使用虚拟滚动优化性能
 */

import { memo } from 'react'
import { Card, Badge } from 'antd'
import { FixedSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
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
      <div
        style={{
          padding: '4px 8px',
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
              border: isSelected
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
                    fontWeight: isSelected ? 'bold' : 'normal',
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
      </div>
    )
  }
)

ThumbnailItem.displayName = 'ThumbnailItem'

export default function ThumbnailList({
  groups,
  currentIndex,
  onSelect,
}: ThumbnailListProps) {
  // 渲染单个行
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <ThumbnailItem
        group={groups[index]}
        index={index}
        isSelected={currentIndex === index}
        onSelect={() => onSelect(index)}
      />
    </div>
  )

  return (
    <div
      style={{
        height: '100%',
        background: '#fafafa',
      }}
    >
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={groups.length}
            itemSize={80} // 每项高度
            width={width}
            overscanCount={5} // 预渲染额外的项
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  )
}
