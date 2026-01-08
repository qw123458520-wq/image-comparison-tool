/**
 * 图片查看器组件 - 支持缩放和平移
 */

import { useState, useRef, useEffect } from 'react'
import { Card, Button, Space } from 'antd'
import { ZoomInOutlined, ZoomOutOutlined, CheckCircleFilled, RedoOutlined } from '@ant-design/icons'

interface ImageViewerProps {
  src: string
  alt: string
  title?: string
  isSelected?: boolean
  onSelect?: () => void
  onDeselect?: () => void
  scale: number
  position: { x: number; y: number }
  onScaleChange: (scale: number) => void
  onPositionChange: (position: { x: number; y: number }) => void
  onResetView: () => void
  rowCount: number  // 图片组需要的总行数
  labelNumber?: number  // 标签对应的数字（1-10，其中10显示为0）
  alternateSrc?: string  // 备用图片源（用于Q键切换）
  showAlternate?: boolean  // 是否显示备用图片
  fixedHeightMode?: boolean  // 是否使用固定高度模式（大图标注界面专用）
}

export default function ImageViewer({
  src,
  alt,
  title,
  isSelected = false,
  onSelect,
  onDeselect,
  scale,
  position,
  onScaleChange,
  onPositionChange,
  onResetView,
  rowCount,
  labelNumber,
  alternateSrc,
  showAlternate = false,
  fixedHeightMode = false
}: ImageViewerProps) {
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [clickStart, setClickStart] = useState({ x: 0, y: 0 })  // 记录点击起始位置
  const imgRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  // 使用原生事件监听器处理滚轮缩放（避免被动监听器问题）
  useEffect(() => {
    const element = imgRef.current
    if (!element) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      // 如果已经有等待中的RAF，取消它
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }

      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.1, Math.min(5, scale * delta))

      // 使用RAF节流，确保每帧最多更新一次
      rafRef.current = requestAnimationFrame(() => {
        onScaleChange(newScale)
        rafRef.current = null
      })
    }

    // 添加非被动的wheel事件监听器
    element.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      element.removeEventListener('wheel', handleWheel)
    }
  }, [scale, onScaleChange])

  // 开始拖拽或选择
  const handleMouseDown = (e: React.MouseEvent) => {
    // 左键点击
    if (e.button === 0) {
      // 记录点击起始位置（用于判断是点击还是拖拽）
      setClickStart({ x: e.clientX, y: e.clientY })

      // 如果缩放了，准备拖拽
      if (scale > 1) {
        setDragging(true)
        setDragStart({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        })
      }
    }
  }

  // 拖拽移动（使用requestAnimationFrame优化）
  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      requestAnimationFrame(() => {
        onPositionChange({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        })
      })
    }
  }

  // 结束拖拽或执行选择
  const handleMouseUp = (e: React.MouseEvent) => {
    // 计算鼠标移动距离
    const moveDistance = Math.sqrt(
      Math.pow(e.clientX - clickStart.x, 2) + Math.pow(e.clientY - clickStart.y, 2)
    )

    // 如果移动距离小于5像素，认为是点击而不是拖拽
    const isClick = moveDistance < 5

    if (isClick) {
      // 执行选中/取消选中操作
      if (isSelected) {
        if (onDeselect) {
          onDeselect()
        }
      } else {
        if (onSelect) {
          onSelect()
        }
      }
    }

    setDragging(false)
  }

  return (
    <Card
      size="small"
      title={title}
      extra={
        <Space size="small">
          <div style={{ fontSize: '12px', color: '#666' }}>
            <ZoomOutOutlined style={{ marginRight: 4 }} />
            {Math.round(scale * 100)}%
            <ZoomInOutlined style={{ marginLeft: 4 }} />
          </div>
          <Button
            size="small"
            icon={<RedoOutlined />}
            onClick={onResetView}
            title="重置所有图片"
          />
        </Space>
      }
      bodyStyle={{
        padding: 0,
        height: fixedHeightMode && rowCount <= 2 ? '250px' : `calc((100vh - 250px) / ${rowCount})`,
        minHeight: '200px',
        overflow: 'hidden',
        position: 'relative',
        background: '#fafafa',
      }}
      style={{
        border: isSelected ? '3px solid #1890ff' : undefined,  // 选中：蓝色边框
        boxShadow: isSelected ? '0 0 8px rgba(24, 144, 255, 0.5)' : undefined,
      }}
    >
      {/* 标签数字标记（单图标注模式） */}
      {labelNumber !== undefined && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 10,
            background: '#52c41a',
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            border: '2px solid white',
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>
            {labelNumber}
          </span>
        </div>
      )}

      {/* 选中状态图标 */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
            background: '#1890ff',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          <CheckCircleFilled style={{ fontSize: 24, color: 'white' }} />
        </div>
      )}

      <div
        ref={imgRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: dragging ? 'grabbing' : scale > 1 ? 'grab' : 'pointer',
          position: 'relative',
        }}
      >
        {/* 主图片 */}
        <img
          src={`local://${src}`}
          alt={alt}
          draggable={false}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            transform: `translate3d(${position.x / scale}px, ${position.y / scale}px, 0) scale(${scale})`,
            transformOrigin: 'center center',
            transition: dragging ? 'none' : 'transform 0.05s ease-out',
            userSelect: 'none',
            opacity: alternateSrc && showAlternate ? 0 : 1,
            position: alternateSrc ? 'absolute' : 'static',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
          }}
        />

        {/* 备用图片（如果提供） */}
        {alternateSrc && (
          <img
            src={`local://${alternateSrc}`}
            alt={`${alt} (alternate)`}
            draggable={false}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              transform: `translate3d(${position.x / scale}px, ${position.y / scale}px, 0) scale(${scale})`,
              transformOrigin: 'center center',
              transition: dragging ? 'none' : 'transform 0.05s ease-out',
              userSelect: 'none',
              opacity: showAlternate ? 1 : 0,
              position: 'absolute',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
            }}
          />
        )}
      </div>
    </Card>
  )
}
