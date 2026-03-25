import type { SelectorConfig } from './selectors'

export interface ExtractionResult<T> {
  value: T | null
  usedSelector: string | null
  success: boolean
}

export type SelectorSuccessTracker = Map<string, number>

const SUCCESS_TRACKER_KEY = 'bilibili_selector_success'

function getSuccessTracker(): SelectorSuccessTracker {
  try {
    const stored = localStorage.getItem(SUCCESS_TRACKER_KEY)
    if (stored) {
      return new Map(JSON.parse(stored))
    }
  } catch {
    // ignore
  }
  return new Map()
}

function saveSuccessTracker(tracker: SelectorSuccessTracker): void {
  try {
    localStorage.setItem(SUCCESS_TRACKER_KEY, JSON.stringify([...tracker.entries()]))
  } catch {
    // ignore
  }
}

export function extractWithFallback<T>(
  element: Element,
  selectors: SelectorConfig[],
  extractor: (el: Element | null) => T | null,
  successTracker?: SelectorSuccessTracker
): ExtractionResult<T> {
  const tracker = successTracker || getSuccessTracker()
  
  const sortedSelectors = [...selectors].sort((a, b) => {
    const successA = tracker.get(a.selector) || 0
    const successB = tracker.get(b.selector) || 0
    if (successA !== successB) {
      return successB - successA
    }
    return a.priority - b.priority
  })
  
  for (const config of sortedSelectors) {
    const el = element.querySelector(config.selector)
    const value = extractor(el)
    
    if (value !== null && value !== undefined && value !== '') {
      tracker.set(config.selector, (tracker.get(config.selector) || 0) + 1)
      saveSuccessTracker(tracker)
      
      return {
        value,
        usedSelector: config.selector,
        success: true,
      }
    }
  }
  
  return {
    value: null,
    usedSelector: null,
    success: false,
  }
}

export function extractText(element: Element | null): string | null {
  if (!element) return null
  const text = element.textContent?.trim()
  return text && text.length > 0 ? text : null
}

export function extractAttribute(attr: string): (element: Element | null) => string | null {
  return (element: Element | null) => {
    if (!element) return null
    const value = element.getAttribute(attr)
    return value && value.length > 0 ? value : null
  }
}

export function extractHref(element: Element | null): string | null {
  if (!element) return null
  const href = element.getAttribute('href') || (element as HTMLAnchorElement).href
  if (!href) return null
  if (href.startsWith('//')) {
    return 'https:' + href
  }
  if (href.startsWith('/')) {
    return 'https://www.bilibili.com' + href
  }
  return href
}

export function extractSrc(element: Element | null): string | null {
  if (!element) return null
  const img = element as HTMLImageElement
  const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original')
  if (!src) return null
  if (src.startsWith('https://')) {
    return src
  }
  if (src.startsWith('http://')) {
    return 'https://' + src.slice('http://'.length)
  }
  if (src.startsWith('//')) {
    return 'https:' + src
  }
  return src
}

export function extractBvidFromUrl(url: string): string | null {
  const bvMatch = url.match(/BV[a-zA-Z0-9]+/)
  if (bvMatch) return bvMatch[0]
  
  const avMatch = url.match(/av(\d+)/)
  if (avMatch) return `av${avMatch[1]}`
  
  return null
}

export function extractBvidFromElement(element: Element | null): string | null {
  if (!element) return null
  
  const bvidAttr = element.getAttribute('data-bvid')
  if (bvidAttr) return bvidAttr
  
  const href = extractHref(element)
  if (href) {
    return extractBvidFromUrl(href)
  }
  
  return null
}

export function extractMultipleElements<T>(
  container: Element,
  containerSelectors: SelectorConfig[],
  itemExtractor: (item: Element) => T | null
): T[] {
  const results: T[] = []
  
  for (const config of containerSelectors) {
    const items = container.querySelectorAll(config.selector)
    if (items.length > 0) {
      items.forEach(item => {
        const result = itemExtractor(item)
        if (result) {
          results.push(result)
        }
      })
      if (results.length > 0) {
        break
      }
    }
  }
  
  return results
}
