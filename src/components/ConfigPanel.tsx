/**
 * 配置面板组件
 */

import { useEffect, useState } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Tag,
  Radio,
  message,
  Divider,
  List,
} from 'antd'
import {
  FolderOpenOutlined,
  PlusOutlined,
  UpOutlined,
  DownOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useConfigStore } from '../store/configStore'
import type { MatchMode } from '../types'

export default function ConfigPanel() {
  const {
    config,
    loading,
    loadConfig,
    updateConfig,
    setSourceFolder,
    setOutputFolder,
    addFolderToList,
    removeFolderFromList,
    moveFolderUp,
    moveFolderDown,
  } = useConfigStore()
  const [newSuffix, setNewSuffix] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [groupSize, setGroupSize] = useState<number | undefined>(undefined)

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // 同步 config 中的 groupSize 到本地状态
  useEffect(() => {
    if (config?.matchRules.groupSize !== undefined) {
      setGroupSize(config.matchRules.groupSize)
    }
  }, [config?.matchRules.groupSize])

  const handleSelectFolder = async () => {
    try {
      const folder = await window.electronAPI.dialog.selectFolder()
      if (folder) {
        await setSourceFolder(folder)
        message.success('源文件夹设置成功')
      }
    } catch (error) {
      message.error('设置源文件夹失败')
    }
  }

  const handleSelectOutputFolder = async () => {
    try {
      const folder = await window.electronAPI.dialog.selectFolder()
      if (folder) {
        await setOutputFolder(folder)
        message.success('输出文件夹设置成功')
      }
    } catch (error) {
      message.error('设置输出文件夹失败')
    }
  }

  const handleAddSuffix = async () => {
    if (!newSuffix.trim()) return

    try {
      const { addSuffixPattern } = useConfigStore.getState()
      await addSuffixPattern(newSuffix.trim())
      setNewSuffix('')
      message.success('后缀添加成功')
    } catch (error) {
      message.error('添加后缀失败')
    }
  }

  const handleRemoveSuffix = async (suffix: string) => {
    try {
      const { removeSuffixPattern } = useConfigStore.getState()
      await removeSuffixPattern(suffix)
      message.success('后缀删除成功')
    } catch (error) {
      message.error('删除后缀失败')
    }
  }

  const handleAddLabel = async () => {
    if (!newLabel.trim()) return

    try {
      const { addPresetLabel } = useConfigStore.getState()
      await addPresetLabel(newLabel.trim())
      setNewLabel('')
      message.success('标签添加成功')
    } catch (error) {
      message.error('添加标签失败')
    }
  }

  const handleRemoveLabel = async (label: string) => {
    try {
      const { removePresetLabel } = useConfigStore.getState()
      await removePresetLabel(label)
      message.success('标签删除成功')
    } catch (error) {
      message.error('删除标签失败')
    }
  }

  const handleMatchModeChange = async (mode: MatchMode) => {
    if (!config) return

    // 避免重复更新
    if (config.matchRules.mode === mode) return

    try {
      await updateConfig({
        matchRules: {
          ...config.matchRules,
          mode,
        },
      })
      message.success('匹配模式已更新', 1.5) // 缩短显示时间
    } catch (error) {
      message.error('更新模式失败')
    }
  }

  const handleGroupSizeChange = async () => {
    if (!config || groupSize === undefined) return

    const value = Math.max(1, Math.min(100, groupSize))

    // 只有当值真正改变时才保存
    if (value !== config.matchRules.groupSize) {
      try {
        // 更新值到本地状态（确保显示正确）
        setGroupSize(value)

        await updateConfig({
          matchRules: {
            ...config.matchRules,
            groupSize: value,
          },
        })
        // 缩短消息显示时间，减少干扰
        message.success('分组大小已更新', 1)
      } catch (error) {
        message.error('更新分组大小失败')
      }
    }
  }

  if (!config) {
    return <div>加载配置中...</div>
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      <Card title="基础配置" loading={loading}>
        <Form layout="vertical">
          {/* 匹配模式 */}
          <Form.Item label="匹配模式">
            <Radio.Group
              value={config.matchRules.mode}
              onChange={(e) => handleMatchModeChange(e.target.value)}
            >
              <Radio value="single-folder-derivatives">
                单文件夹派生模式
              </Radio>
              <Radio value="fixed-group-size">
                固定分组模式
              </Radio>
              <Radio value="folder-to-folder">文件夹对文件夹模式</Radio>
            </Radio.Group>
          </Form.Item>

          {/* 源文件夹 - 单文件夹派生模式 */}
          {config.matchRules.mode === 'single-folder-derivatives' && (
            <Form.Item label="源文件夹">
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={config.matchRules.sourceFolder || ''}
                  placeholder="选择包含图片的文件夹"
                  readOnly
                />
                <Button
                  icon={<FolderOpenOutlined />}
                  onClick={handleSelectFolder}
                >
                  选择
                </Button>
              </Space.Compact>
            </Form.Item>
          )}

          {/* 固定分组模式配置 */}
          {config.matchRules.mode === 'fixed-group-size' && (
            <>
              <Form.Item label="源文件夹">
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    value={config.matchRules.sourceFolder || ''}
                    placeholder="选择包含图片的文件夹"
                    readOnly
                  />
                  <Button
                    icon={<FolderOpenOutlined />}
                    onClick={handleSelectFolder}
                  >
                    选择
                  </Button>
                </Space.Compact>
              </Form.Item>

              <Form.Item
                label="每组图片数量"
                extra="设置每组包含的图片数量，例如：3表示每组3张图片；1表示每张图片独立成组"
              >
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={groupSize ?? 3}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    if (!isNaN(value)) {
                      setGroupSize(value)
                    }
                  }}
                  onBlur={handleGroupSizeChange}
                  onPressEnter={handleGroupSizeChange}
                  style={{ width: '200px' }}
                />
              </Form.Item>
            </>
          )}

          {/* 文件夹列表 - 文件夹对文件夹模式 */}
          {config.matchRules.mode === 'folder-to-folder' && (
            <>
              <Form.Item
                label="文件夹列表"
                extra="每个文件夹按文件名排序后抽取对应索引的图片。第1个文件夹的图片作为原图，其余文件夹的图片作为派生图。可以通过上移/下移调整文件夹顺序。"
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {/* 文件夹列表 */}
                  {config.matchRules.folderList && config.matchRules.folderList.length > 0 ? (
                    <List
                      size="small"
                      bordered
                      dataSource={config.matchRules.folderList}
                      renderItem={(folder, index) => (
                        <List.Item
                          actions={[
                            <Button
                              key="up"
                              type="text"
                              size="small"
                              icon={<UpOutlined />}
                              disabled={index === 0}
                              onClick={() => moveFolderUp(index)}
                            />,
                            <Button
                              key="down"
                              type="text"
                              size="small"
                              icon={<DownOutlined />}
                              disabled={index === config.matchRules.folderList!.length - 1}
                              onClick={() => moveFolderDown(index)}
                            />,
                            <Button
                              key="delete"
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={async () => {
                                await removeFolderFromList(index)
                                message.success('文件夹已删除')
                              }}
                            />,
                          ]}
                        >
                          <Space>
                            <Tag color={index === 0 ? 'blue' : 'default'}>
                              {index === 0 ? '原图' : `派生图${index}`}
                            </Tag>
                            <span style={{ fontSize: 12 }}>{folder}</span>
                          </Space>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <div style={{ padding: 12, background: '#f0f2f5', borderRadius: 4, textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 12, color: '#999' }}>
                        还没有添加文件夹，请点击下方按钮添加
                      </p>
                    </div>
                  )}

                  {/* 添加文件夹按钮 */}
                  <Button
                    icon={<FolderOpenOutlined />}
                    onClick={async () => {
                      try {
                        const folder = await window.electronAPI.dialog.selectFolder()
                        if (folder) {
                          await addFolderToList(folder)
                          message.success('文件夹已添加')
                        }
                      } catch (error) {
                        message.error('添加文件夹失败')
                      }
                    }}
                    block
                  >
                    添加文件夹
                  </Button>
                </Space>
              </Form.Item>
            </>
          )}

          {/* 派生文件后缀 - 仅单文件夹派生模式需要 */}
          {config.matchRules.mode === 'single-folder-derivatives' && (
            <>
              <Divider />

              <Form.Item
                label="派生文件后缀"
                extra="例如：原图 image.jpg，派生图 image_ACD3.jpg"
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space wrap>
                    {config.matchRules.suffixPatterns.map((suffix) => (
                      <Tag
                        key={suffix}
                        closable
                        onClose={() => handleRemoveSuffix(suffix)}
                      >
                        {suffix}
                      </Tag>
                    ))}
                  </Space>

                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      placeholder="输入新后缀，如 _ACD3"
                      value={newSuffix}
                      onChange={(e) => setNewSuffix(e.target.value)}
                      onPressEnter={handleAddSuffix}
                    />
                    <Button icon={<PlusOutlined />} onClick={handleAddSuffix}>
                      添加
                    </Button>
                  </Space.Compact>
                </Space>
              </Form.Item>
            </>
          )}

          <Divider />

          {/* 输出文件夹 */}
          <Form.Item
            label="输出文件夹"
            extra="应用标注时，会在此文件夹下自动创建以标签命名的子文件夹"
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={config.output.outputFolder || ''}
                placeholder="选择输出文件夹"
                readOnly
              />
              <Button
                icon={<FolderOpenOutlined />}
                onClick={handleSelectOutputFolder}
              >
                选择
              </Button>
            </Space.Compact>
          </Form.Item>

          <Divider />

          {/* 预设标签 */}
          <Form.Item label="预设标签">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space wrap>
                {config.labels.preset.map((label) => (
                  <Tag
                    key={label}
                    color="blue"
                    closable
                    onClose={() => handleRemoveLabel(label)}
                  >
                    {label}
                  </Tag>
                ))}
              </Space>

              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="输入新标签"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onPressEnter={handleAddLabel}
                />
                <Button icon={<PlusOutlined />} onClick={handleAddLabel}>
                  添加
                </Button>
              </Space.Compact>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
