/**
 * 标注结果处理模块 - 根据标注移动文件
 */

import path from 'path'
import fs from 'fs-extra'
import type { Config, ImageGroup } from './types'

export interface MoveOperation {
  source: string
  destination: string
  type: 'original' | 'derivative'
}

export interface ProcessResult {
  success: boolean
  operations: MoveOperation[]
  errors: string[]
}

/**
 * 处理整组标注模式的文件移动
 */
function processGroupMode(
  group: ImageGroup,
  config: Config
): MoveOperation[] {
  const operations: MoveOperation[] = []

  if (!group.annotations || group.annotations.labels.length === 0) {
    return operations
  }

  // 整组模式只有一个标签
  const label = group.annotations.labels[0].label
  let targetFolder = config.output.targetFolders[label]

  // 如果目标文件夹未配置，自动创建以标签命名的文件夹
  if (!targetFolder) {
    if (!config.output.outputFolder) {
      throw new Error(`未配置输出文件夹，无法为标签"${label}"创建目标文件夹。请在配置中设置输出文件夹路径。`)
    }
    targetFolder = path.join(config.output.outputFolder, label)
  }

  // 移动原图
  if (config.output.moveBothOriginalAndDerivatives) {
    operations.push({
      source: group.original,
      destination: path.join(targetFolder, path.basename(group.original)),
      type: 'original',
    })
  }

  // 移动所有派生图
  group.derivatives.forEach((derivative) => {
    operations.push({
      source: derivative,
      destination: path.join(targetFolder, path.basename(derivative)),
      type: 'derivative',
    })
  })

  return operations
}

/**
 * 处理单图标注模式的文件移动
 */
function processIndividualMode(
  group: ImageGroup,
  config: Config
): MoveOperation[] {
  const operations: MoveOperation[] = []

  if (!group.annotations || group.annotations.labels.length === 0) {
    return operations
  }

  // 单图模式：每个派生图可能有不同的标签
  group.annotations.labels.forEach((item) => {
    let targetFolder = config.output.targetFolders[item.label]

    // 如果目标文件夹未配置，自动创建以标签命名的文件夹
    if (!targetFolder) {
      if (!config.output.outputFolder) {
        throw new Error(`未配置输出文件夹，无法为标签"${item.label}"创建目标文件夹。请在配置中设置输出文件夹路径。`)
      }
      targetFolder = path.join(config.output.outputFolder, item.label)
    }

    // item.target 是派生图路径
    operations.push({
      source: item.target,
      destination: path.join(targetFolder, path.basename(item.target)),
      type: 'derivative',
    })
  })

  return operations
}

/**
 * 处理单个图片组的标注
 */
export function processAnnotation(
  group: ImageGroup,
  config: Config
): MoveOperation[] {
  if (!group.annotations) {
    return []
  }

  const mode = group.annotations.mode

  switch (mode) {
    case 'group':
      return processGroupMode(group, config)
    case 'individual':
      return processIndividualMode(group, config)
    default:
      throw new Error(`未知的标注模式: ${mode}`)
  }
}

/**
 * 执行文件移动操作
 */
export async function executeOperations(
  operations: MoveOperation[]
): Promise<ProcessResult> {
  const errors: string[] = []
  const completed: MoveOperation[] = []

  for (const op of operations) {
    try {
      // 确保目标文件夹存在
      await fs.ensureDir(path.dirname(op.destination))

      // 检查源文件是否存在
      if (!(await fs.pathExists(op.source))) {
        errors.push(`源文件不存在: ${op.source}`)
        continue
      }

      // 检查目标文件是否已存在
      if (await fs.pathExists(op.destination)) {
        // 如果存在，添加数字后缀
        const parsed = path.parse(op.destination)
        let counter = 1
        let newDestination = op.destination

        while (await fs.pathExists(newDestination)) {
          newDestination = path.join(
            parsed.dir,
            `${parsed.name}_${counter}${parsed.ext}`
          )
          counter++
        }

        op.destination = newDestination
      }

      // 移动文件
      await fs.move(op.source, op.destination)
      completed.push(op)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error)
      errors.push(`移动文件失败 ${op.source}: ${message}`)
    }
  }

  return {
    success: errors.length === 0,
    operations: completed,
    errors,
  }
}

/**
 * 批量处理多个图片组
 */
export async function processBatch(
  groups: ImageGroup[],
  config: Config
): Promise<ProcessResult> {
  const allOperations: MoveOperation[] = []
  const errors: string[] = []

  // 收集所有需要执行的操作
  for (const group of groups) {
    try {
      const operations = processAnnotation(group, config)
      allOperations.push(...operations)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error)
      errors.push(`处理图片组 ${group.id} 失败: ${message}`)
    }
  }

  // 执行所有操作
  const result = await executeOperations(allOperations)

  // 合并错误信息
  return {
    success: result.success && errors.length === 0,
    operations: result.operations,
    errors: [...errors, ...result.errors],
  }
}
