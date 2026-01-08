/**
 * SQLite 数据库管理模块
 * 用于持久化标注数据和历史记录
 */

import path from 'path'
import { app } from 'electron'
import Database from 'better-sqlite3'
import type { ImageGroup, AnnotationMode } from './types'

let db: Database.Database | null = null

/**
 * 数据库路径
 */
function getDatabasePath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'annotations.db')
}

/**
 * 初始化数据库
 */
export function initDatabase(): void {
  const dbPath = getDatabasePath()
  db = new Database(dbPath)

  console.log('Initializing database at:', dbPath)

  // 创建表结构
  db.exec(`
    -- 图片组表
    CREATE TABLE IF NOT EXISTS image_groups (
      id TEXT PRIMARY KEY,
      original TEXT NOT NULL,
      derivatives TEXT NOT NULL,  -- JSON 数组
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 标注记录表
    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id TEXT NOT NULL,
      mode TEXT NOT NULL,  -- 'group' | 'individual' | 'pair'
      target TEXT NOT NULL,  -- 被标注的目标（图片路径或组合键）
      label TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES image_groups(id)
    );

    -- 标注历史表（用于撤销/重做）
    CREATE TABLE IF NOT EXISTS annotation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      action TEXT NOT NULL,  -- 'add' | 'update' | 'delete'
      target TEXT NOT NULL,
      label TEXT,
      previous_label TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 文件操作记录表
    CREATE TABLE IF NOT EXISTS file_operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id TEXT NOT NULL,
      source_path TEXT NOT NULL,
      destination_path TEXT NOT NULL,
      operation_type TEXT NOT NULL,  -- 'move' | 'copy'
      status TEXT NOT NULL,  -- 'success' | 'failed'
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 会话表（每次打开应用为一个会话）
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      images_processed INTEGER DEFAULT 0,
      annotations_count INTEGER DEFAULT 0
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_annotations_group_id ON annotations(group_id);
    CREATE INDEX IF NOT EXISTS idx_annotations_created_at ON annotations(created_at);
    CREATE INDEX IF NOT EXISTS idx_file_operations_group_id ON file_operations(group_id);
    CREATE INDEX IF NOT EXISTS idx_annotation_history_group_id ON annotation_history(group_id);
  `)

  console.log('Database initialized successfully at:', dbPath)
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('Database closed')
  }
}

/**
 * 保存图片组
 */
export function saveImageGroup(group: ImageGroup): void {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO image_groups (id, original, derivatives, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `)

  stmt.run(group.id, group.original, JSON.stringify(group.derivatives))
}

/**
 * 保存标注
 */
export function saveAnnotation(
  groupId: string,
  mode: AnnotationMode,
  target: string,
  label: string
): void {
  if (!db) throw new Error('Database not initialized')

  // 检查是否已存在
  const existing = db
    .prepare(
      'SELECT id, label FROM annotations WHERE group_id = ? AND target = ?'
    )
    .get(groupId, target) as { id: number; label: string } | undefined

  if (existing) {
    // 更新现有标注
    db.prepare(
      'UPDATE annotations SET label = ?, mode = ? WHERE id = ?'
    ).run(label, mode, existing.id)

    // 记录历史
    db.prepare(`
      INSERT INTO annotation_history (group_id, mode, action, target, label, previous_label)
      VALUES (?, ?, 'update', ?, ?, ?)
    `).run(groupId, mode, target, label, existing.label)
  } else {
    // 插入新标注
    db.prepare(`
      INSERT INTO annotations (group_id, mode, target, label)
      VALUES (?, ?, ?, ?)
    `).run(groupId, mode, target, label)

    // 记录历史
    db.prepare(`
      INSERT INTO annotation_history (group_id, mode, action, target, label)
      VALUES (?, ?, 'add', ?, ?)
    `).run(groupId, mode, target, label)
  }
}

/**
 * 获取图片组的所有标注
 */
export function getAnnotations(groupId: string): Array<{
  target: string
  label: string
  mode: AnnotationMode
}> {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare(`
    SELECT target, label, mode
    FROM annotations
    WHERE group_id = ?
    ORDER BY created_at DESC
  `)

  return stmt.all(groupId) as Array<{
    target: string
    label: string
    mode: AnnotationMode
  }>
}

/**
 * 删除标注
 */
export function deleteAnnotation(groupId: string, target: string): void {
  if (!db) throw new Error('Database not initialized')

  const existing = db
    .prepare('SELECT label FROM annotations WHERE group_id = ? AND target = ?')
    .get(groupId, target) as { label: string } | undefined

  if (existing) {
    db.prepare(
      'DELETE FROM annotations WHERE group_id = ? AND target = ?'
    ).run(groupId, target)

    // 记录历史
    db.prepare(`
      INSERT INTO annotation_history (group_id, mode, action, target, previous_label)
      VALUES (?, '', 'delete', ?, ?)
    `).run(groupId, target, existing.label)
  }
}

/**
 * 清空图片组的所有标注
 */
export function clearAnnotations(groupId: string): void {
  if (!db) throw new Error('Database not initialized')

  db.prepare('DELETE FROM annotations WHERE group_id = ?').run(groupId)
}

/**
 * 记录文件操作
 */
export function logFileOperation(
  groupId: string,
  sourcePath: string,
  destinationPath: string,
  operationType: 'move' | 'copy',
  status: 'success' | 'failed',
  errorMessage?: string
): void {
  if (!db) throw new Error('Database not initialized')

  db.prepare(`
    INSERT INTO file_operations
    (group_id, source_path, destination_path, operation_type, status, error_message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    groupId,
    sourcePath,
    destinationPath,
    operationType,
    status,
    errorMessage || null
  )
}

/**
 * 获取统计信息
 */
export function getStatistics(): {
  totalGroups: number
  totalAnnotations: number
  totalFileOperations: number
  successfulOperations: number
  failedOperations: number
} {
  if (!db) throw new Error('Database not initialized')

  const totalGroups = (
    db.prepare('SELECT COUNT(*) as count FROM image_groups').get() as {
      count: number
    }
  ).count

  const totalAnnotations = (
    db.prepare('SELECT COUNT(*) as count FROM annotations').get() as {
      count: number
    }
  ).count

  const totalFileOperations = (
    db.prepare('SELECT COUNT(*) as count FROM file_operations').get() as {
      count: number
    }
  ).count

  const successfulOperations = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM file_operations WHERE status = 'success'"
      )
      .get() as { count: number }
  ).count

  const failedOperations = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM file_operations WHERE status = 'failed'"
      )
      .get() as { count: number }
  ).count

  return {
    totalGroups,
    totalAnnotations,
    totalFileOperations,
    successfulOperations,
    failedOperations,
  }
}

/**
 * 导出标注数据为 JSON
 */
export function exportAnnotationsToJSON(): string {
  if (!db) throw new Error('Database not initialized')

  const annotations = db
    .prepare(
      `
    SELECT
      a.group_id,
      a.mode,
      a.target,
      a.label,
      a.created_at,
      g.original,
      g.derivatives
    FROM annotations a
    LEFT JOIN image_groups g ON a.group_id = g.id
    ORDER BY a.created_at DESC
  `
    )
    .all()

  return JSON.stringify(annotations, null, 2)
}

/**
 * 导出标注数据为 CSV
 */
export function exportAnnotationsToCSV(): string {
  if (!db) throw new Error('Database not initialized')

  const annotations = db
    .prepare(
      `
    SELECT
      a.group_id,
      a.mode,
      a.target,
      a.label,
      a.created_at,
      g.original
    FROM annotations a
    LEFT JOIN image_groups g ON a.group_id = g.id
    ORDER BY a.created_at DESC
  `
    )
    .all() as Array<{
    group_id: string
    mode: string
    target: string
    label: string
    created_at: string
    original: string
  }>

  // CSV 头部
  const headers = ['Group ID', 'Mode', 'Target', 'Label', 'Created At', 'Original']
  const rows = annotations.map((a) => [
    a.group_id,
    a.mode,
    a.target,
    a.label,
    a.created_at,
    a.original,
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n')

  return csvContent
}

/**
 * 获取标注历史
 */
export function getAnnotationHistory(
  groupId?: string,
  limit: number = 100
): Array<{
  id: number
  group_id: string
  mode: string
  action: string
  target: string
  label: string | null
  previous_label: string | null
  created_at: string
}> {
  if (!db) throw new Error('Database not initialized')

  let query = `
    SELECT * FROM annotation_history
  `

  if (groupId) {
    query += ` WHERE group_id = ?`
  }

  query += ` ORDER BY created_at DESC LIMIT ?`

  const stmt = db.prepare(query)
  const params = groupId ? [groupId, limit] : [limit]

  return stmt.all(...params) as Array<{
    id: number
    group_id: string
    mode: string
    action: string
    target: string
    label: string | null
    previous_label: string | null
    created_at: string
  }>
}

/**
 * 开始新会话
 */
export function startSession(): number {
  if (!db) throw new Error('Database not initialized')

  const result = db
    .prepare('INSERT INTO sessions DEFAULT VALUES')
    .run()

  return result.lastInsertRowid as number
}

/**
 * 结束会话
 */
export function endSession(
  sessionId: number,
  imagesProcessed: number,
  annotationsCount: number
): void {
  if (!db) throw new Error('Database not initialized')

  db.prepare(`
    UPDATE sessions
    SET ended_at = CURRENT_TIMESTAMP,
        images_processed = ?,
        annotations_count = ?
    WHERE id = ?
  `).run(imagesProcessed, annotationsCount, sessionId)
}
