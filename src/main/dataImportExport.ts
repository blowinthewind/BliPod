import { dialog } from 'electron'
import { writeFile, readFile } from 'fs/promises'
import { app } from 'electron'
import {
  getRegisteredCategories,
  getDataCategory,
  getCategoryStats,
  type CategoryStats
} from './dataCategories'

const CURRENT_EXPORT_VERSION = '2.0.0'

export interface ExportDataV2 {
  version: string
  exportedAt: number
  appVersion: string
  categories: string[]
  data: Record<string, unknown>
}

interface ExportDataV1 {
  version: string
  exportedAt: number
  appVersion: string
  favorites: unknown[]
  playlists: unknown[]
  userQueue?: unknown[]
}

export type ImportStrategy = 'merge' | 'overwrite'

export interface ExportOptions {
  categories?: string[]
}

export interface ImportOptionsV2 {
  categories?: string[]
  strategy: ImportStrategy
}

export interface ExportResult {
  success: boolean
  error?: string
  filePath?: string
}

export interface ImportResult {
  success: boolean
  error?: string
  stats?: Record<string, { imported: number; total: number }>
}

function isV1Format(data: unknown): data is ExportDataV1 {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return (
    typeof d.version === 'string' &&
    d.version.startsWith('1.') &&
    typeof d.exportedAt === 'number' &&
    Array.isArray(d.favorites) &&
    Array.isArray(d.playlists)
  )
}

function migrateV1ToV2(data: ExportDataV1): ExportDataV2 {
  return {
    version: CURRENT_EXPORT_VERSION,
    exportedAt: data.exportedAt,
    appVersion: data.appVersion,
    categories: ['favorites', 'playlists', 'userQueue'],
    data: {
      favorites: data.favorites,
      playlists: data.playlists,
      userQueue: data.userQueue || []
    }
  }
}

function validateExportData(data: unknown): ExportDataV2 | { error: string } {
  if (!data || typeof data !== 'object') {
    return { error: 'Invalid export file: not an object' }
  }

  const d = data as Record<string, unknown>

  if (isV1Format(data)) {
    return migrateV1ToV2(data)
  }

  if (typeof d.version !== 'string') {
    return { error: 'Invalid export file: missing version' }
  }

  if (typeof d.exportedAt !== 'number') {
    return { error: 'Invalid export file: missing exportedAt' }
  }

  if (!Array.isArray(d.categories)) {
    return { error: 'Invalid export file: missing categories array' }
  }

  if (!d.data || typeof d.data !== 'object') {
    return { error: 'Invalid export file: missing data object' }
  }

  const [major] = (d.version as string).split('.')
  const [currentMajor] = CURRENT_EXPORT_VERSION.split('.')

  if (major !== currentMajor) {
    return { error: `Incompatible export version: ${d.version}` }
  }

  return data as ExportDataV2
}

export async function exportDataToFile(options?: ExportOptions): Promise<ExportResult> {
  try {
    const result = await dialog.showSaveDialog({
      title: 'Export BliPod Data',
      defaultPath: `blipod-export-${new Date().toISOString().split('T')[0]}.json`,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export cancelled' }
    }

    const categories = getRegisteredCategories()
    const selectedCategories = options?.categories
      ? categories.filter(c => options.categories!.includes(c.key))
      : categories

    const exportData: ExportDataV2 = {
      version: CURRENT_EXPORT_VERSION,
      exportedAt: Date.now(),
      appVersion: app.getVersion(),
      categories: selectedCategories.map(c => c.key),
      data: {}
    }

    for (const category of selectedCategories) {
      exportData.data[category.key] = category.get()
    }

    await writeFile(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8')

    return { success: true, filePath: result.filePath }
  } catch (error) {
    console.error('[BliPod] Export error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    }
  }
}

export async function importDataFromFile(options: ImportOptionsV2): Promise<ImportResult> {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Import BliPod Data',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Import cancelled' }
    }

    const filePath = result.filePaths[0]
    const content = await readFile(filePath, 'utf-8')
    const rawData = JSON.parse(content)

    const validatedData = validateExportData(rawData)
    if ('error' in validatedData) {
      return { success: false, error: validatedData.error }
    }

    const data = validatedData
    const stats: Record<string, { imported: number; total: number }> = {}

    const categoriesToImport = options.categories
      ? data.categories.filter(key => options.categories!.includes(key))
      : data.categories

    for (const categoryKey of categoriesToImport) {
      const category = getDataCategory(categoryKey)
      if (!category) {
        console.warn(`[BliPod] Unknown category: ${categoryKey}`)
        continue
      }

      const importedData = data.data[categoryKey]
      if (importedData === undefined) {
        continue
      }

      if (!category.validate(importedData)) {
        console.warn(`[BliPod] Invalid data for category: ${categoryKey}`)
        continue
      }

      const existingData = category.get()
      const beforeCount = category.getStats(existingData)

      if (options.strategy === 'overwrite' || !category.merge) {
        category.set(importedData)
        stats[categoryKey] = {
          imported: category.getStats(importedData),
          total: category.getStats(importedData)
        }
      } else {
        const mergedData = category.merge(existingData, importedData)
        category.set(mergedData)
        const afterCount = category.getStats(mergedData)
        stats[categoryKey] = {
          imported: afterCount - beforeCount,
          total: afterCount
        }
      }
    }

    return { success: true, stats }
  } catch (error) {
    console.error('[BliPod] Import error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Import failed'
    }
  }
}

export function getDataStats(): {
  favoritesCount: number
  playlistsCount: number
  totalVideosInPlaylists: number
} {
  const stats = getCategoryStats()
  const favoritesStat = stats.find(s => s.key === 'favorites')
  const playlistsStat = stats.find(s => s.key === 'playlists')

  const playlistsCategory = getDataCategory('playlists')
  let totalVideosInPlaylists = 0
  if (playlistsCategory) {
    const playlists = playlistsCategory.get() as Array<{ videos: unknown[] }>
    totalVideosInPlaylists = playlists.reduce((sum, p) => sum + p.videos.length, 0)
  }

  return {
    favoritesCount: favoritesStat?.count || 0,
    playlistsCount: playlistsStat?.count || 0,
    totalVideosInPlaylists
  }
}

export { getCategoryStats }
export type { CategoryStats }
