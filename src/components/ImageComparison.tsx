/**
 * 图片对比组件 - 显示原图和派生图对比
 */

import { useState, useEffect } from 'react'
import { Row, Col, Typography, Space, Card } from 'antd'
import { FileImageOutlined } from '@ant-design/icons'
import ImageViewer from './ImageViewer'
import { useImageStore } from '../store/imageStore'
import { useAnnotationStore } from '../store/annotationStore'
import { useConfigStore } from '../store/configStore'
import type { ImageGroup } from '../types'

const { Text } = Typography

interface ImageComparisonProps {
  group: ImageGroup
  selectedImages: Set<string>
  onSelectImage: (imagePath: string) => void
  onDeselectImage: (imagePath: string) => void
}

export default function ImageComparison({
  group,
  selectedImages,
  onSelectImage,
  onDeselectImage
}: ImageComparisonProps) {
  const { original, derivatives } = group

  // 获取Q键和W键按下状态
  const { isQKeyPressed, isWKeyPressed } = useImageStore()

  // 获取当前标注模式和标注数据
  const { mode, getAnnotation } = useAnnotationStore()

  // 获取配置（用于标签索引映射）
  const { config } = useConfigStore()

  // 只有在单张模式下才允许选中图片
  const allowSelection = mode === 'individual'

  // 获取当前组的标注信息
  const annotation = getAnnotation(group.id)

  // 获取图片的标签索引（1-10）
  const getLabelNumber = (imagePath: string): number | undefined => {
    // 显示标签数字的条件：
    // - 单张标注模式：显示每张图片自己的标签数字
    // - 整组标注模式：整组有标签时，在本组所有图片上显示同一个数字
    const shouldShowLabel = mode === 'individual' || mode === 'group'

    if (!shouldShowLabel || !annotation || !config) return undefined

    // 在整组模式下，标注的 target 固定为 original；在单张模式下为 imagePath
    const targetToFind = mode === 'group' ? original : imagePath
    const labelItem = annotation.labels.find((item) => item.target === targetToFind)

    if (!labelItem) return undefined

    const labelIndex = config.labels.preset.indexOf(labelItem.label)
    if (labelIndex === -1) return undefined

    // 映射到 1-10：索引0→1, 索引1→2, ..., 索引9→0
    return labelIndex === 9 ? 0 : labelIndex + 1
  }

  // 共享的缩放和平移状态（所有图片同步）
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // 根据Q键和W键状态决定显示的图片
  const allImages = [original, ...derivatives]
  let displayImages: string[]
  
  if (isQKeyPressed) {
    // Q键按下：所有图片向前移动一个位置
    displayImages = [...derivatives, original]  // 派生图1, 派生图2, ..., 原图
  } else if (isWKeyPressed) {
    // W键按下：除第一张图外，剩余图片与第一张图切换
    // 第一张图保持原图，其他位置都显示原图
    displayImages = [original, ...derivatives.map(() => original)]  // 原图, 原图, 原图, ...
  } else {
    // 正常状态：原图, 派生图1, 派生图2, ...
    displayImages = allImages
  }

  // 当图片组切换时，重置缩放和平移
  useEffect(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [group.id])

  // 重置所有图片的视图
  const handleResetView = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  // 计算布局：1张原图 + N张派生图
  const totalImages = 1 + derivatives.length

  // 每张图的列宽度：根据图片数量自适应
  // 1-4张图：均分24列；5张图：使用flex布局均匀分配；6+张图：每行最多6张（每张4列）
  let colSpan: number | undefined
  let useFlexLayout = false
  
  if (totalImages <= 4) {
    colSpan = Math.floor(24 / totalImages)
  } else if (totalImages === 5) {
    // 5张图：使用flex布局，让每张图均匀分配宽度
    useFlexLayout = true
    colSpan = undefined
  } else {
    colSpan = 4 // 6+张图：每行最多6张，每张4列
  }

  const rowCount = useFlexLayout ? 1 : Math.ceil(totalImages / (24 / (colSpan || 4)))

  // 提取文件名
  const getFileName = (path: string) => {
    const parts = path.split('/')
    return parts[parts.length - 1]
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 文件信息 - 紧凑布局 */}
      <Card
        size="small"
        style={{ marginBottom: 12 }}
        bodyStyle={{ padding: '8px 12px' }}
      >
        {config?.matchRules.mode === 'fixed-group-size' ? (
          // 固定分组模式：只显示图片总数
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '12px' }}>
            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <FileImageOutlined style={{ marginRight: 6 }} />
              <Text strong style={{ fontSize: '12px' }}>本组图片:</Text>
              <Text style={{ marginLeft: 6, fontSize: '12px' }}>{allImages.length} 张</Text>
            </div>
            <div>
              <Text style={{ fontSize: '12px', color: '#999' }}>
                {allImages.map((img, idx) => getFileName(img)).join(', ')}
              </Text>
            </div>
          </div>
        ) : (
          // 其他模式：显示原图和派生图
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '12px' }}>
            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <FileImageOutlined style={{ marginRight: 6 }} />
              <Text strong style={{ fontSize: '12px' }}>原图:</Text>
              <Text style={{ marginLeft: 6, fontSize: '12px' }} copyable>{original}</Text>
            </div>
            <div>
              <Text strong style={{ fontSize: '12px' }}>派生图:</Text>
              <Text style={{ marginLeft: 6, fontSize: '12px' }}>{derivatives.length} 张</Text>
            </div>
          </div>
        )}
      </Card>

      {/* 图片对比视图 - Ant Design Row/Col布局 */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '0',
        }}
      >
        {useFlexLayout ? (
          // 5张图时使用flex布局，均匀分配宽度
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            {allImages.map((imagePath, index) => {
              // 根据Q键或W键状态，决定这个位置应该显示的图片
              const alternateImagePath = displayImages[index]

              // 找到该图片在原始数组中的位置，用于标题显示
              const isOriginal = imagePath === original
              const derivativeIndex = derivatives.indexOf(imagePath)

              // 根据匹配模式决定标题显示方式
              const matchMode = config?.matchRules.mode
              let title: string
              let alt: string

              if (matchMode === 'fixed-group-size') {
                // 固定分组模式：显示图片序号，不区分原图和派生图
                const imageIndex = index + 1
                title = `图片 ${imageIndex}: ${getFileName(imagePath)}`
                alt = `图片 ${imageIndex}`
              } else {
                // 其他模式：显示原图/派生图
                title = isOriginal
                  ? `原图: ${getFileName(imagePath)}`
                  : `派生图 ${derivativeIndex + 1}: ${getFileName(imagePath)}`
                alt = isOriginal ? '原图' : `派生图 ${derivativeIndex + 1}`
              }

              return (
                <div key={imagePath} style={{ flex: 1, minWidth: 0 }}>
                  <ImageViewer
                    src={imagePath}
                    alt={alt}
                    title={title}
                    isSelected={allowSelection ? selectedImages.has(imagePath) : false}
                    onSelect={allowSelection ? () => onSelectImage(imagePath) : undefined}
                    onDeselect={allowSelection ? () => onDeselectImage(imagePath) : undefined}
                    scale={scale}
                    position={position}
                    onScaleChange={setScale}
                    onPositionChange={setPosition}
                    onResetView={handleResetView}
                    rowCount={rowCount}
                    labelNumber={getLabelNumber(imagePath)}
                    alternateSrc={alternateImagePath !== imagePath ? alternateImagePath : undefined}
                    showAlternate={isQKeyPressed || isWKeyPressed}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          // 其他情况使用Row/Col布局
          <Row 
            gutter={[12, 12]} 
            style={{ margin: 0 }}
          >
            {allImages.map((imagePath, index) => {
              // 根据Q键或W键状态，决定这个位置应该显示的图片
              const alternateImagePath = displayImages[index]

              // 找到该图片在原始数组中的位置，用于标题显示
              const isOriginal = imagePath === original
              const derivativeIndex = derivatives.indexOf(imagePath)

              // 根据匹配模式决定标题显示方式
              const matchMode = config?.matchRules.mode
              let title: string
              let alt: string

              if (matchMode === 'fixed-group-size') {
                // 固定分组模式：显示图片序号，不区分原图和派生图
                const imageIndex = index + 1
                title = `图片 ${imageIndex}: ${getFileName(imagePath)}`
                alt = `图片 ${imageIndex}`
              } else {
                // 其他模式：显示原图/派生图
                title = isOriginal
                  ? `原图: ${getFileName(imagePath)}`
                  : `派生图 ${derivativeIndex + 1}: ${getFileName(imagePath)}`
                alt = isOriginal ? '原图' : `派生图 ${derivativeIndex + 1}`
              }

              return (
                <Col key={imagePath} span={colSpan}>
                <ImageViewer
                  src={imagePath}
                  alt={alt}
                  title={title}
                  isSelected={allowSelection ? selectedImages.has(imagePath) : false}
                  onSelect={allowSelection ? () => onSelectImage(imagePath) : undefined}
                  onDeselect={allowSelection ? () => onDeselectImage(imagePath) : undefined}
                  scale={scale}
                  position={position}
                  onScaleChange={setScale}
                  onPositionChange={setPosition}
                  onResetView={handleResetView}
                  rowCount={rowCount}
                  labelNumber={getLabelNumber(imagePath)}
                  alternateSrc={alternateImagePath !== imagePath ? alternateImagePath : undefined}
                  showAlternate={isQKeyPressed || isWKeyPressed}
                />
                </Col>
              )
            })}
          </Row>
        )}
      </div>

      {/* 提示信息 */}
      {allImages.length > 5 && (
        <div style={{ marginTop: 16, textAlign: 'center', color: '#999' }}>
          <Text type="secondary">
            {config?.matchRules.mode === 'fixed-group-size'
              ? `当前显示 ${allImages.length} 张图片`
              : `当前显示 1 张原图和 ${derivatives.length} 张派生图`}
          </Text>
        </div>
      )}
    </div>
  )
}
