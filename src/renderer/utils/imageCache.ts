/**
 * 图片缓存工具 - 使用 IndexedDB 缓存封面图片
 * 缓存策略：LRU（最近最少使用）
 * 缓存大小限制：50MB
 * 缓存过期时间：7天
 */

const DB_NAME = 'BliPodImageCache'
const DB_VERSION = 1
const STORE_NAME = 'images'
const MAX_CACHE_SIZE = 50 * 1024 * 1024 // 50MB
const CACHE_EXPIRY_DAYS = 7

interface CacheEntry {
  url: string
  blob: Blob
  size: number
  timestamp: number
  accessCount: number
  lastAccessed: number
}

let db: IDBDatabase | null = null

/**
 * 初始化 IndexedDB 数据库
 */
async function initDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'url' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('lastAccessed', 'lastAccessed', { unique: false })
      }
    }
  })
}

/**
 * 获取当前缓存总大小
 */
async function getCacheSize(): Promise<number> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      const entries: CacheEntry[] = request.result
      const totalSize = entries.reduce((sum, entry) => sum + (entry.size || 0), 0)
      resolve(totalSize)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * 清理过期缓存
 */
async function cleanExpiredCache(): Promise<void> {
  const database = await initDB()
  const expiryTime = Date.now() - CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('timestamp')
    const range = IDBKeyRange.upperBound(expiryTime)
    const request = index.openCursor(range)

    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        store.delete(cursor.primaryKey)
        cursor.continue()
      }
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

/**
 * 使用 LRU 策略清理缓存，直到满足空间要求
 */
async function cleanLRUCache(requiredSpace: number): Promise<void> {
  const database = await initDB()
  const currentSize = await getCacheSize()

  if (currentSize + requiredSpace <= MAX_CACHE_SIZE) {
    return
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('lastAccessed')
    const request = index.openCursor()

    let freedSpace = 0
    const spaceToFree = currentSize + requiredSpace - MAX_CACHE_SIZE

    request.onsuccess = () => {
      const cursor = request.result
      if (cursor && freedSpace < spaceToFree) {
        const entry = cursor.value as CacheEntry
        freedSpace += entry.size
        store.delete(cursor.primaryKey)
        cursor.continue()
      }
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

/**
 * 从缓存获取图片
 * @param url 图片 URL
 * @returns Blob 或 null
 */
export async function getCachedImage(url: string): Promise<Blob | null> {
  if (!url) return null

  try {
    await cleanExpiredCache()
    const database = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(url)

      request.onsuccess = () => {
        const entry: CacheEntry | undefined = request.result
        if (entry) {
          // 更新访问记录
          entry.accessCount++
          entry.lastAccessed = Date.now()
          store.put(entry)
          resolve(entry.blob)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[ImageCache] Failed to get cached image:', error)
    return null
  }
}

/**
 * 将图片添加到缓存
 * @param url 图片 URL
 * @param blob 图片 Blob
 */
export async function cacheImage(url: string, blob: Blob): Promise<void> {
  if (!url || !blob) return

  try {
    // 确保有足够空间
    await cleanLRUCache(blob.size)

    const database = await initDB()
    const entry: CacheEntry = {
      url,
      blob,
      size: blob.size,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
    }

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(entry)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[ImageCache] Failed to cache image:', error)
  }
}

/**
 * 获取图片（优先从缓存读取）
 * @param url 图片 URL
 * @returns Blob URL
 */
export async function getImage(url: string): Promise<string> {
  if (!url) return ''

  // 1. 尝试从缓存获取
  const cached = await getCachedImage(url)
  if (cached) {
    return URL.createObjectURL(cached)
  }

  // 2. 从网络加载
  try {
    const response = await fetch(url, {
      headers: {
        Referer: 'https://www.bilibili.com/',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const blob = await response.blob()

    // 3. 存入缓存
    await cacheImage(url, blob)

    return URL.createObjectURL(blob)
  } catch (error) {
    console.warn('[ImageCache] Failed to load image:', error)
    return url // 返回原始 URL 作为 fallback
  }
}

/**
 * 预加载图片到缓存
 * @param urls 图片 URL 数组
 */
export async function preloadImages(urls: string[]): Promise<void> {
  const validUrls = urls.filter((url) => url && url.includes('hdslb.com'))

  // 限制并发数
  const CONCURRENT_LIMIT = 5
  const chunks: string[][] = []

  for (let i = 0; i < validUrls.length; i += CONCURRENT_LIMIT) {
    chunks.push(validUrls.slice(i, i + CONCURRENT_LIMIT))
  }

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async (url) => {
        try {
          const cached = await getCachedImage(url)
          if (!cached) {
            const response = await fetch(url, {
              headers: {
                Referer: 'https://www.bilibili.com/',
              },
            })
            if (response.ok) {
              const blob = await response.blob()
              await cacheImage(url, blob)
            }
          }
        } catch {
          // 静默处理预加载错误
        }
      })
    )
  }
}

/**
 * 清除所有缓存
 */
export async function clearCache(): Promise<void> {
  try {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('[ImageCache] Failed to clear cache:', err)
  }
}

/**
 * 获取缓存统计信息
 */
export async function getCacheStats(): Promise<{
  size: number
  count: number
  maxSize: number
}> {
  try {
    const database = await initDB()
    const size = await getCacheSize()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.count()

      request.onsuccess = () => {
        resolve({
          size,
          count: request.result,
          maxSize: MAX_CACHE_SIZE,
        })
      }
      request.onerror = () => reject(request.error)
    })
  } catch {
    return { size: 0, count: 0, maxSize: MAX_CACHE_SIZE }
  }
}
