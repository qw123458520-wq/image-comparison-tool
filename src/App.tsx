import { useState, useEffect } from 'react'
import { Layout, Menu, Button, message, Modal } from 'antd'
import {
  SettingOutlined,
  PictureOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import ConfigPanel from './components/ConfigPanel'
import ComparisonView from './components/ComparisonView'
import LargeImageView from './components/LargeImageView'
import { useConfigStore } from './store/configStore'
import { useImageStore } from './store/imageStore'
import { useAnnotationStore } from './store/annotationStore'
import './App.css'

const { Header, Content, Sider } = Layout

type MenuItem = 'config' | 'compare' | 'large-view'

function App() {
  const [currentMenu, setCurrentMenu] = useState<MenuItem>('config')
  const { config } = useConfigStore()
  const { loadImages, groups, totalCount, loading } = useImageStore()

  // 数字键快速标注处理函数
  const handleNumberKeyAnnotation = (key: string) => {
    const { mode, addAnnotation } = useAnnotationStore.getState()
    const {
      getCurrentGroup,
      selectedImages,
      clearSelection,
      nextImage,
    } = useImageStore.getState()

    if (!config) {
      message.warning('配置未加载')
      return
    }

    const currentGroup = getCurrentGroup()
    if (!currentGroup) return

    // 映射标签索引：1→0, 2→1, ..., 0→9
    const labelIndex = key === '0' ? 9 : parseInt(key) - 1
    const label = config.labels.preset[labelIndex]

    if (!label) {
      message.warning(
        `快捷键${key}未配置标签（当前只有${config.labels.preset.length}个标签）`
      )
      return
    }

    // 根据模式执行标注
    if (mode === 'group') {
      // 整组标注
      addAnnotation(currentGroup.id, currentGroup.original, label)
      message.success(`已为整组打上"${label}"标签 (快捷键${key})`, 2)

      // 整组标注模式下，标注完成后立即跳转到下一组
      nextImage()
    } else if (mode === 'individual') {
      // 单张模式
      if (selectedImages.size > 0) {
        // 批量标注选中的图片
        let count = 0
        selectedImages.forEach((imagePath) => {
          addAnnotation(currentGroup.id, imagePath, label)
          count++
        })
        message.success(`已为${count}张图片打上"${label}"标签 (快捷键${key})`, 2)
        clearSelection()
      } else {
        // 无选中图片，提示用户
        message.warning('请选择目标图片')
      }
    }
  }

  // 添加键盘导航支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只在对比页面和大图标注页面生效
      if ((currentMenu !== 'compare' && currentMenu !== 'large-view') || groups.length === 0) return

      // 避免在输入框中触发
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      // 避免与浏览器快捷键冲突
      if (e.ctrlKey || e.metaKey || e.altKey) return

      // 处理数字键 1-0
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        handleNumberKeyAnnotation(e.key)
        return
      }

      const { nextImage, prevImage, setQKeyPressed } = useImageStore.getState()
      const { mode, setMode } = useAnnotationStore.getState()

      switch (e.key) {
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault()
          nextImage()
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault()
          prevImage()
          break
        case 'q':
        case 'Q':
          e.preventDefault()
          setQKeyPressed(true)  // 按下Q键，图片位置循环前移
          break
        case 'Tab':
          e.preventDefault()
          // 切换标注模式
          const newMode = mode === 'group' ? 'individual' : 'group'
          setMode(newMode)
          const modeText = newMode === 'group' ? '整组标注' : '单张标注'
          message.info(`已切换到${modeText}模式`, 1.5)
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // 只在对比页面和大图标注页面生效
      if ((currentMenu !== 'compare' && currentMenu !== 'large-view') || groups.length === 0) return

      const { setQKeyPressed } = useImageStore.getState()

      // 松开Q键，恢复原始位置
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault()
        setQKeyPressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [currentMenu, groups])

  const handleLoadImages = async () => {
    if (!config) {
      message.error('请先配置文件夹和后缀模式')
      return
    }

    if (!config.matchRules.sourceFolder) {
      message.error('请选择源文件夹')
      return
    }

    try {
      await loadImages(config)
      message.success(`成功加载 ${totalCount} 组图片`)
      setCurrentMenu('compare')
    } catch (error) {
      message.error('加载图片失败')
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
          图像对比标注工具
        </div>
        <div style={{ flex: 1 }} />
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleLoadImages}
          loading={loading}
        >
          加载图片
        </Button>
      </Header>

      <Layout>
        <Sider width={200} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[currentMenu]}
            onClick={(e) => setCurrentMenu(e.key as MenuItem)}
            items={[
              {
                key: 'config',
                icon: <SettingOutlined />,
                label: '配置',
              },
              {
                key: 'compare',
                icon: <PictureOutlined />,
                label: `界面一 ${totalCount > 0 ? `(${totalCount})` : ''}`,
              },
              {
                key: 'large-view',
                icon: <PictureOutlined />,
                label: `界面二 ${totalCount > 0 ? `(${totalCount})` : ''}`,
              },
            ]}
          />
        </Sider>

        <Content style={{ background: '#f0f2f5', overflow: 'auto' }}>
          {currentMenu === 'config' && <ConfigPanel />}

          {currentMenu === 'compare' && (
            <>
              {groups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <PictureOutlined style={{ fontSize: '64px', color: '#ccc' }} />
                  <p style={{ marginTop: '16px', color: '#999' }}>
                    还没有加载图片，请先配置并加载图片
                  </p>
                </div>
              ) : (
                <ComparisonView />
              )}
            </>
          )}

          {currentMenu === 'large-view' && (
            <>
              {groups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <PictureOutlined style={{ fontSize: '64px', color: '#ccc' }} />
                  <p style={{ marginTop: '16px', color: '#999' }}>
                    还没有加载图片，请先配置并加载图片
                  </p>
                </div>
              ) : (
                <LargeImageView />
              )}
            </>
          )}
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
