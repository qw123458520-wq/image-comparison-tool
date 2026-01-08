/**
 * 报告导出模块
 * 支持导出 JSON 和 CSV 格式的标注报告
 */

import path from 'path'
import fs from 'fs-extra'
import { app, dialog } from 'electron'
import dayjs from 'dayjs'
import type { ImageGroup } from './types'

/**
 * 导出 JSON 格式报告
 */
export async function exportJSONReport(
  groups: ImageGroup[],
  annotations: Map<string, ImageGroup['annotations']>
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    // 准备导出数据
    const reportData = {
      exportedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      totalGroups: groups.length,
      annotatedGroups: Array.from(annotations.values()).filter(
        (ann) => ann && ann.labels.length > 0
      ).length,
      groups: groups.map((group) => ({
        id: group.id,
        original: group.original,
        derivatives: group.derivatives,
        annotations: annotations.get(group.id),
      })),
    }

    // 选择保存位置
    const result = await dialog.showSaveDialog({
      title: '导出 JSON 报告',
      defaultPath: path.join(
        app.getPath('downloads'),
        `annotation-report-${dayjs().format('YYYYMMDD-HHmmss')}.json`
      ),
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: '用户取消导出' }
    }

    // 写入文件
    await fs.writeJSON(result.filePath, reportData, { spaces: 2 })

    return { success: true, filePath: result.filePath }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: `导出失败: ${message}` }
  }
}

/**
 * 导出 CSV 格式报告
 */
export async function exportCSVReport(
  groups: ImageGroup[],
  annotations: Map<string, ImageGroup['annotations']>
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    // 准备 CSV 数据
    const rows: string[][] = []

    // 添加表头
    rows.push([
      'Group ID',
      'Original Image',
      'Derivative Image',
      'Annotation Mode',
      'Target',
      'Label',
    ])

    // 遍历所有图片组
    groups.forEach((group) => {
      const annotation = annotations.get(group.id)

      if (annotation && annotation.labels.length > 0) {
        // 有标注数据
        annotation.labels.forEach((label) => {
          // 确定派生图名称
          let derivativeName = ''
          if (annotation.mode === 'individual') {
            derivativeName = path.basename(label.target)
          } else {
            // group mode
            derivativeName = 'All derivatives'
          }

          rows.push([
            group.id,
            path.basename(group.original),
            derivativeName,
            annotation.mode,
            label.target,
            label.label,
          ])
        })
      } else {
        // 无标注数据
        rows.push([
          group.id,
          path.basename(group.original),
          '',
          '',
          '',
          'Not annotated',
        ])
      }
    })

    // 转换为 CSV 字符串
    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n')

    // 选择保存位置
    const result = await dialog.showSaveDialog({
      title: '导出 CSV 报告',
      defaultPath: path.join(
        app.getPath('downloads'),
        `annotation-report-${dayjs().format('YYYYMMDD-HHmmss')}.csv`
      ),
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: '用户取消导出' }
    }

    // 写入文件（添加 UTF-8 BOM 以便 Excel 正确识别中文）
    const bom = '\uFEFF'
    await fs.writeFile(result.filePath, bom + csvContent, 'utf8')

    return { success: true, filePath: result.filePath }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: `导出失败: ${message}` }
  }
}

/**
 * 导出统计摘要报告
 */
export async function exportSummaryReport(
  groups: ImageGroup[],
  annotations: Map<string, ImageGroup['annotations']>
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    // 统计数据
    const totalGroups = groups.length
    const annotatedGroups = Array.from(annotations.values()).filter(
      (ann) => ann && ann.labels.length > 0
    ).length
    const unannotatedGroups = totalGroups - annotatedGroups

    // 按标签统计
    const labelCounts: Record<string, number> = {}
    annotations.forEach((annotation) => {
      if (annotation && annotation.labels.length > 0) {
        annotation.labels.forEach((label) => {
          labelCounts[label.label] = (labelCounts[label.label] || 0) + 1
        })
      }
    })

    // 按模式统计
    const modeCounts: Record<string, number> = {
      group: 0,
      individual: 0,
    }
    annotations.forEach((annotation) => {
      if (annotation && annotation.labels.length > 0) {
        modeCounts[annotation.mode] = (modeCounts[annotation.mode] || 0) + 1
      }
    })

    // 生成摘要文本
    const summary = `
图片标注摘要报告
====================

导出时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}

## 基本统计

总图片组数: ${totalGroups}
已标注组数: ${annotatedGroups}
未标注组数: ${unannotatedGroups}
标注完成率: ${totalGroups > 0 ? ((annotatedGroups / totalGroups) * 100).toFixed(2) : 0}%

## 标签分布

${Object.entries(labelCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([label, count]) => `- ${label}: ${count}`)
  .join('\n')}

## 标注模式分布

- 整组标注: ${modeCounts.group}
- 单张标注: ${modeCounts.individual}

## 详细列表

${groups
  .map((group) => {
    const annotation = annotations.get(group.id)
    if (annotation && annotation.labels.length > 0) {
      return `${path.basename(group.original)}\n  模式: ${annotation.mode}\n  标签: ${annotation.labels
        .map((l) => l.label)
        .join(', ')}`
    } else {
      return `${path.basename(group.original)}\n  状态: 未标注`
    }
  })
  .join('\n\n')}
`.trim()

    // 选择保存位置
    const result = await dialog.showSaveDialog({
      title: '导出摘要报告',
      defaultPath: path.join(
        app.getPath('downloads'),
        `annotation-summary-${dayjs().format('YYYYMMDD-HHmmss')}.txt`
      ),
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: '用户取消导出' }
    }

    // 写入文件
    await fs.writeFile(result.filePath, summary, 'utf8')

    return { success: true, filePath: result.filePath }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: `导出失败: ${message}` }
  }
}
