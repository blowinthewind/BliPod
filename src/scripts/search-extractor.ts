import { BILIBILI_SELECTORS, SEARCH_PAGE_SELECTORS } from './selectors'
import {
  extractWithFallback,
  extractText,
  extractHref,
  extractSrc,
  extractBvidFromElement,
  extractBvidFromUrl,
} from './selector-utils'

export interface ExtractedVideo {
  bvid: string
  title: string
  cover: string
  author: string
  authorLink: string
  duration: string
  playCount: string
  videoLink: string
}

export interface SearchResult {
  success: boolean
  videos: ExtractedVideo[]
  hasMore: boolean
  error?: string
  extractedAt: number
  pageUrl: string
  currentPage: number
  nextOffset: number | null
}

export interface ClickNextPageResult {
  success: boolean
  hasMore: boolean
  error?: string
}

function extractVideoFromCard(card: Element): ExtractedVideo | null {
  const titleResult = extractWithFallback(card, BILIBILI_SELECTORS.title, extractText)
  const coverResult = extractWithFallback(card, BILIBILI_SELECTORS.cover, extractSrc)
  const authorResult = extractWithFallback(card, BILIBILI_SELECTORS.author, extractText)
  const authorLinkResult = extractWithFallback(card, BILIBILI_SELECTORS.authorLink, extractHref)
  const durationResult = extractWithFallback(card, BILIBILI_SELECTORS.duration, extractText)
  const playCountResult = extractWithFallback(card, BILIBILI_SELECTORS.playCount, extractText)
  const videoLinkResult = extractWithFallback(card, BILIBILI_SELECTORS.videoLink, extractHref)
  const bvidResult = extractWithFallback(card, BILIBILI_SELECTORS.bvid, extractBvidFromElement)
  
  let bvid = bvidResult.value
  if (!bvid && videoLinkResult.value) {
    bvid = extractBvidFromUrl(videoLinkResult.value)
  }
  
  if (!bvid || !titleResult.value) {
    return null
  }
  
  return {
    bvid,
    title: titleResult.value,
    cover: coverResult.value || '',
    author: authorResult.value || '未知UP主',
    authorLink: authorLinkResult.value || '',
    duration: durationResult.value || '',
    playCount: playCountResult.value || '',
    videoLink: videoLinkResult.value || `https://www.bilibili.com/video/${bvid}`,
  }
}

function checkNoResult(): boolean {
  for (const config of SEARCH_PAGE_SELECTORS.noResult) {
    const el = document.querySelector(config.selector)
    if (el) {
      return true
    }
  }
  return false
}

function checkHasMore(): boolean {
  for (const config of SEARCH_PAGE_SELECTORS.loadMore) {
    const el = document.querySelector(config.selector)
    if (el && !el.classList.contains('hidden') && !el.classList.contains('disabled')) {
      return true
    }
  }
  
  for (const config of SEARCH_PAGE_SELECTORS.nextPageButton) {
    const btn = document.querySelector(config.selector)
    if (btn && !btn.classList.contains('disabled')) {
      return true
    }
  }
  
  return false
}

function extractPageInfo(): { currentPage: number; nextOffset: number | null } {
  const url = new URL(window.location.href)
  const params = url.searchParams
  
  const pageStr = params.get('page')
  const oStr = params.get('o')
  
  const currentPage = pageStr ? parseInt(pageStr, 10) : 1
  const currentOffset = oStr ? parseInt(oStr, 10) : 0
  
  const videoCount = document.querySelectorAll('.bili-video-card, .video-list .video-item, [data-mod="search_list"] .video-item').length
  
  let nextOffset: number | null = null
  
  if (currentPage === 1 && currentOffset === 0) {
    nextOffset = videoCount > 0 ? videoCount : null
  } else if (currentOffset > 0) {
    nextOffset = currentOffset + videoCount
  }
  
  return { currentPage, nextOffset }
}

export function extractSearchResults(): SearchResult {
  const pageUrl = window.location.href
  
  try {
    if (checkNoResult()) {
      return {
        success: true,
        videos: [],
        hasMore: false,
        extractedAt: Date.now(),
        pageUrl,
        currentPage: 1,
        nextOffset: null,
      }
    }
    
    const videos: ExtractedVideo[] = []
    
    for (const config of BILIBILI_SELECTORS.container) {
      const cards = document.querySelectorAll(config.selector)
      
      if (cards.length > 0) {
        cards.forEach(card => {
          const video = extractVideoFromCard(card)
          if (video && !videos.find(v => v.bvid === video.bvid)) {
            videos.push(video)
          }
        })
        
        if (videos.length > 0) {
          break
        }
      }
    }
    
    const { currentPage, nextOffset } = extractPageInfo()
    
    return {
      success: true,
      videos,
      hasMore: checkHasMore(),
      extractedAt: Date.now(),
      pageUrl,
      currentPage,
      nextOffset,
    }
  } catch (error) {
    return {
      success: false,
      videos: [],
      hasMore: false,
      error: error instanceof Error ? error.message : '未知错误',
      extractedAt: Date.now(),
      pageUrl,
      currentPage: 1,
      nextOffset: null,
    }
  }
}

export function clickNextPageButton(): ClickNextPageResult {
  try {
    for (const config of SEARCH_PAGE_SELECTORS.nextPageButton) {
      const btn = document.querySelector(config.selector) as HTMLElement
      if (btn && !btn.classList.contains('disabled')) {
        btn.click()
        return {
          success: true,
          hasMore: true,
        }
      }
    }
    
    return {
      success: false,
      hasMore: false,
      error: 'No next page button found or button is disabled',
    }
  } catch (error) {
    return {
      success: false,
      hasMore: false,
      error: error instanceof Error ? error.message : 'Failed to click next page button',
    }
  }
}

export function injectSearchExtractor(): void {
  window.__BILI_EXTRACT_SEARCH__ = extractSearchResults
  window.__BILI_CLICK_NEXT_PAGE__ = clickNextPageButton
}

declare global {
  interface Window {
    __BILI_EXTRACT_SEARCH__?: typeof extractSearchResults
    __BILI_CLICK_NEXT_PAGE__?: typeof clickNextPageButton
  }
}
