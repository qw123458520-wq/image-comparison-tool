import { useState } from 'react'
import { Form, Input, Button, Alert, Space, Switch, Radio, Select, Card, Typography, Table, message, Modal } from 'antd'
import { FolderOpenOutlined, SearchOutlined, FolderOutlined } from '@ant-design/icons'
import type {
  FileSearchQuery,
  FileSearchResult,
  FileSearchMatchMode,
  FileSearchTypeFilter,
} from '../types'
import { useFolderDrop } from '../hooks/useFolderDrop'

const { Text } = Typography

const matchModeOptions: { label: string; value: FileSearchMatchMode }[] = [
  { label: '包含', value: 'contains' },
  { label: '前缀', value: 'startsWith' },
  { label: '后缀', value: 'endsWith' },
  { label: '正则', value: 'regex' },
]

const typeFilterOptions: { label: string; value: FileSearchTypeFilter }[] = [
  { label: '全部文件', value: 'all' },
  { label: '图片', value: 'image' },
  { label: '文档', value: 'document' },
  { label: '视频', value: 'video' },
  { label: '音频', value: 'audio' },
  { label: '压缩包', value: 'archive' },
  { label: '自定义扩展名', value: 'custom' },
]

export default function FileSearchPanel() {
  const [rootDir, setRootDir] = useState('')
  const [keyword, setKeyword] = useState('')
  const [matchMode, setMatchMode] = useState<FileSearchMatchMode>('contains')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [includeSubdirs, setIncludeSubdirs] = useState(true)
  const [typeFilter, setTypeFilter] = useState<FileSearchTypeFilter>('all')
  const [customExtensions, setCustomExtensions] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FileSearchResult | null>(null)
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])

  const rootDirDrop = useFolderDrop({
    onFolderSelected: (folder) => {
      setRootDir(folder)
      message.success('根目录设置成功')
    },
    successMessage: '',
  })

  const handleSelectRootDir = async () => {
    try {
      const folder = await window.electronAPI.dialog.selectFolder()
      if (folder) {
        setRootDir(folder)
        message.success('根目录设置成功')
      }
    } catch {
      message.error('选择文件夹失败')
    }
  }

  const parseCustomExtensions = (): string[] | undefined => {
    if (typeFilter !== 'custom') return undefined
    const trimmed = customExtensions.trim()
    if (!trimmed) return undefined
    return trimmed
      .split(/[,\s;]+/)
      .map((ext) => ext.trim())
      .filter((ext) => !!ext)
  }

  const handleSearch = async () => {
    if (!rootDir) {
      message.error('请先选择根目录')
      return
    }

    if (!keyword && matchMode !== 'regex') {
      Modal.confirm({
        title: '未输入关键字',
        content: '未输入关键字将列出匹配类型下的所有文件，可能结果很多，确定要继续吗？',
        okText: '继续',
        cancelText: '取消',
        onOk: () => {
          void doSearch()
        },
      })
    } else {
      await doSearch()
    }
  }

  const doSearch = async () => {
    try {
      setLoading(true)
      setResult(null)
      setSelectedPaths([])

      const keywords = keyword
        .split(/[,\s;]+/)
        .map((k) => k.trim())
        .filter((k) => k.length > 0)

      const query: FileSearchQuery = {
        rootDir,
        keyword,
        matchMode,
        keywords,
        // 不设置 matchAll，后端默认使用“任意一个匹配（OR）”
        caseSensitive,
        includeSubdirs,
        typeFilter,
        customExtensions: parseCustomExtensions(),
        maxResults: 5000,
      }

      const res = await window.electronAPI.fileSearch.searchByName(query)
      setResult(res)

      if (!res.items || res.items.length === 0) {
        message.info('未找到匹配的文件')
      } else {
        message.success(`找到 ${res.total} 个匹配文件（最多显示前 5000 条）`)
      }
    } catch (error) {
      message.error(`检索失败: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.path}
          </Text>
        </Space>
      ),
    },
    {
      title: '扩展名',
      dataIndex: 'ext',
      key: 'ext',
      width: 100,
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (size: number) => formatSize(size),
    },
    {
      title: '修改时间',
      dataIndex: 'modified',
      key: 'modified',
      width: 200,
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: any) => (
        <Button
          type="link"
          size="small"
          icon={<FolderOutlined />}
          onClick={() => handleOpenInFinder(record.path)}
        >
          在 Finder 中打开
        </Button>
      ),
    },
  ]

  const handleOpenInFinder = async (filePath: string) => {
    try {
      await window.electronAPI.fileSearch.openInFinder(filePath)
      message.success('已在 Finder 中打开文件位置')
    } catch (error) {
      message.error(`打开失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const formatSize = (size: number) => {
    if (size <= 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
    const value = size / Math.pow(1024, index)
    return `${value.toFixed(1)} ${units[index]}`
  }

  const handleTransferSelected = async (move: boolean) => {
    if (!result || selectedPaths.length === 0) {
      message.warning('请先勾选要处理的文件')
      return
    }

    const doTransfer = async (targetDir: string) => {
      try {
        const res = await window.electronAPI.fileSearch.copyFiles({
          sourcePaths: selectedPaths,
          targetDir,
          useMove: move,
        })

        if (res.failed && res.failed.length > 0) {
          message.warning(`完成，成功 ${res.success} 个，失败 ${res.failed.length} 个`)
        } else {
          const action = move ? '移动' : '复制'
          message.success(`成功${action} ${res.success} 个文件`)
        }
      } catch (error) {
        message.error(`操作失败: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    try {
      const folder = await window.electronAPI.dialog.selectFolder()
      if (!folder) return

      if (move) {
        Modal.confirm({
          title: '确认移动文件',
          content: '您选择了移动模式，源文件将被移动到目标位置。此操作不可撤销，确定要继续吗？',
          okText: '确定移动',
          cancelText: '取消',
          okType: 'danger',
          onOk: () => {
            void doTransfer(folder)
          },
        })
      } else {
        await doTransfer(folder)
      }
    } catch {
      message.error('选择目标文件夹失败')
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Card title="文件检索">
        <Alert
          message="功能说明"
          description="以指定根目录为起点，根据文件名关键字快速检索该目录及其子目录中的文件。支持全部文件、图片、文档等类型过滤。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form layout="vertical">
          <Form.Item label="根目录">
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={rootDir}
                placeholder="选择根目录或拖拽文件夹至此"
                readOnly
                style={{
                  cursor: 'pointer',
                  height: 40,
                  ...(rootDirDrop.isDragging
                    ? {
                        borderColor: '#1890ff',
                        borderWidth: 2,
                        backgroundColor: '#e6f7ff',
                        boxShadow: '0 0 8px rgba(24, 144, 255, 0.3)',
                      }
                    : {}),
                }}
                {...rootDirDrop.dragHandlers}
              />
              <Button
                icon={<FolderOpenOutlined />}
                onClick={handleSelectRootDir}
                style={{ height: 40 }}
              >
                选择
              </Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item
            label="关键字"
            extra="用空格、逗号、分号或换行分隔。"
          >
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="支持多个文件名/关键词，只要文件名包含其中任意一个文件名/关键词即命中"
              onPressEnter={handleSearch}
            />
          </Form.Item>

          <Form.Item label="匹配方式">
            <Radio.Group
              options={matchModeOptions}
              value={matchMode}
              onChange={(e) => setMatchMode(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            />
          </Form.Item>

          <Form.Item label="其他选项">
            <Space size="large">
              <Space>
                <span>区分大小写</span>
                <Switch
                  checked={caseSensitive}
                  onChange={setCaseSensitive}
                />
              </Space>

              <Space>
                <span>递归子目录</span>
                <Switch
                  checked={includeSubdirs}
                  onChange={setIncludeSubdirs}
                />
              </Space>
            </Space>
          </Form.Item>

          <Form.Item label="文件类型">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Select
                value={typeFilter}
                options={typeFilterOptions}
                onChange={(value) => setTypeFilter(value)}
                style={{ width: 260 }}
              />
              {typeFilter === 'custom' && (
                <Input
                  value={customExtensions}
                  onChange={(e) => setCustomExtensions(e.target.value)}
                  placeholder="输入扩展名列表，例如：.psd,.heic,.kra（逗号或空格分隔）"
                />
              )}
            </Space>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={loading}
            >
              开始检索
            </Button>
          </Form.Item>
        </Form>

        {result && (
          <div style={{ marginTop: 24 }}>
            <Alert
              message={
                result.total > 0
                  ? `共找到 ${result.total} 个匹配文件（最多显示前 5000 条）`
                  : '未找到匹配的文件'
              }
              type={result.total > 0 ? 'success' : 'info'}
              showIcon
              style={{ marginBottom: 16 }}
            />

            {result.total > 0 && (
              <div
                style={{
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Space>
                  <Button onClick={() => handleTransferSelected(false)} disabled={selectedPaths.length === 0}>
                    复制到文件夹
                  </Button>
                  <Button onClick={() => handleTransferSelected(true)} disabled={selectedPaths.length === 0}>
                    移动到文件夹（需确认）
                  </Button>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  已选中 {selectedPaths.length} 个文件
                </Text>
              </div>
            )}

            <Table
              rowKey="path"
              size="small"
              dataSource={result.items}
              columns={columns as any}
              rowSelection={{
                selectedRowKeys: selectedPaths,
                onChange: (keys) => setSelectedPaths(keys as string[]),
              }}
              pagination={{
                pageSize: 100,
                showSizeChanger: false,
              }}
              scroll={{ y: 420 }}
            />
          </div>
        )}
      </Card>
    </div>
  )
}

