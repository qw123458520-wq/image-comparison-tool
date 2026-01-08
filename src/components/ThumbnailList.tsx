/**
 * 缩略图列表组件
 */

import { List, Card, Badge } from 'antd'
import {
  CheckCircleOutlined,
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

export default function ThumbnailList({
  groups,
  currentIndex,
  onSelect,
}: ThumbnailListProps) {
  const { getAnnotation } = useAnnotationStore()

  const getStatusIcon = (group: ImageGroup) => {
    const annotation = getAnnotation(group.id)

    if (!annotation?.labels || annotation.labels.length === 0) {
      return <QuestionCircleOutlined style={{ color: '#999' }} />
    }

    // 检查是否所有标签都是"通过"
    const allPassed = annotation.labels.every(
      (item) => item.label === '通过'
    )
    if (allPassed) {
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />
    }

    // 检查是否有"不通过"
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
        height: '100%',
        overflow: 'auto',
        background: '#fafafa',
        padding: '8px',
      }}
    >
      <List
        dataSource={groups}
        renderItem={(group, index) => (
          <List.Item
            style={{
              padding: 0,
              marginBottom: 8,
              cursor: 'pointer',
            }}
            onClick={() => onSelect(index)}
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
                  background: currentIndex === index ? '#e6f7ff' : 'white',
                  border:
                    currentIndex === index
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
                  {getStatusIcon(group)}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight:
                          currentIndex === index ? 'bold' : 'normal',
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
        )}
      />
    </div>
  )
}
