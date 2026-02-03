import { useState, useEffect, useMemo } from 'react'
import { Layout, Menu, message } from 'antd'
import {
  SettingOutlined,
  PictureOutlined,
  FolderOutlined,
  FileTextOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import ConfigPanel from './components/ConfigPanel'
import ComparisonView from './components/ComparisonView'
import LargeImageView from './components/LargeImageView'
import FileMatcherPanel from './components/FileMatcherPanel'
import FileSearchPanel from './components/FileSearchPanel'
import { useConfigStore } from './store/configStore'
import { useImageStore } from './store/imageStore'
import { useAnnotationStore } from './store/annotationStore'
import './App.css'

const { Header, Content, Sider } = Layout

type MenuItem = 'config' | 'compare' | 'large-view' | 'file-matcher' | 'file-search'

function App() {
  const [currentMenu, setCurrentMenu] = useState<MenuItem>('config')
  const { config } = useConfigStore()
  const { groups, totalCount } = useImageStore()

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

      const { nextImage, prevImage, setQKeyPressed, setWKeyPressed } = useImageStore.getState()
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
        case 'w':
        case 'W':
          e.preventDefault()
          setWKeyPressed(true)  // 按下W键，除第一张图外，剩余图片与第一张图切换
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

      const { setQKeyPressed, setWKeyPressed } = useImageStore.getState()

      // 松开Q键，恢复原始位置
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault()
        setQKeyPressed(false)
      }

      // 松开W键，恢复原始位置
      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        setWKeyPressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [currentMenu, groups])

  // 使用 useMemo 缓存页面组件，避免重复创建
  const emptyView = useMemo(() => (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <PictureOutlined style={{ fontSize: '64px', color: '#ccc' }} />
      <p style={{ marginTop: '16px', color: '#999' }}>
        还没有加载图片，请先配置并加载图片
      </p>
    </div>
  ), [])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
          文件管理
        </div>
      </Header>

      <Layout>
        <Sider width={200} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[currentMenu]}
            onClick={(e) => setCurrentMenu(e.key as MenuItem)}
            items={[
              {
                key: 'data-cleaning',
                icon: <FolderOutlined />,
                label: '数据清洗',
                children: [
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
                ],
              },
              {
                key: 'file-matcher',
                icon: <FileTextOutlined />,
                label: '文件匹配',
              },
              {
                key: 'file-search',
                icon: <SearchOutlined />,
                label: '文件检索',
              },
            ]}
          />
        </Sider>

        <Content style={{ background: '#f0f2f5', overflow: 'auto' }}>
          {/* 使用 display 控制显示/隐藏，而不是条件渲染，避免组件销毁和重建 */}
          <div style={{ display: currentMenu === 'config' ? 'block' : 'none', height: '100%' }}>
            <ConfigPanel />
          </div>

          <div style={{ display: currentMenu === 'compare' ? 'block' : 'none', height: '100%' }}>
            {groups.length === 0 ? emptyView : <ComparisonView />}
          </div>

          <div style={{ display: currentMenu === 'large-view' ? 'block' : 'none', height: '100%' }}>
            {groups.length === 0 ? emptyView : <LargeImageView />}
          </div>

          <div style={{ display: currentMenu === 'file-matcher' ? 'block' : 'none', height: '100%' }}>
            <FileMatcherPanel />
          </div>

          <div style={{ display: currentMenu === 'file-search' ? 'block' : 'none', height: '100%' }}>
            <FileSearchPanel />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
