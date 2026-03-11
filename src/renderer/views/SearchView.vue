<script setup lang="ts">
import { Search, Loader2 } from 'lucide-vue-next'
import { ref } from 'vue'

const searchQuery = ref('')
const isSearching = ref(false)
const searchResults = ref<any[]>([])

function handleSearch() {
  if (!searchQuery.value.trim()) return
  
  isSearching.value = true
  
  setTimeout(() => {
    searchResults.value = [
      { id: 'BV1xx', title: '搜索结果示例1', author: 'UP主A', duration: '10:30', plays: '10万' },
      { id: 'BV2xx', title: '搜索结果示例2', author: 'UP主B', duration: '15:45', plays: '5万' },
      { id: 'BV3xx', title: '搜索结果示例3', author: 'UP主C', duration: '8:20', plays: '20万' }
    ]
    isSearching.value = false
  }, 1000)
}
</script>

<template>
  <div class="search-view">
    <div class="search-header">
      <h1 class="page-title">搜索</h1>
      <p class="page-desc">搜索B站视频内容</p>
    </div>

    <div class="search-box">
      <div class="search-input-wrapper">
        <Search :size="20" class="search-icon" />
        <input
          type="text"
          class="search-input"
          placeholder="输入关键词搜索..."
          v-model="searchQuery"
          @keyup.enter="handleSearch"
        />
      </div>
      <button class="search-btn" @click="handleSearch" :disabled="isSearching">
        <Loader2 v-if="isSearching" :size="18" class="animate-spin" />
        <span v-else>搜索</span>
      </button>
    </div>

    <div class="search-results" v-if="searchResults.length > 0">
      <div class="results-header">
        <span class="results-count">找到 {{ searchResults.length }} 个结果</span>
      </div>
      
      <div class="results-list">
        <div
          v-for="result in searchResults"
          :key="result.id"
          class="result-item"
        >
          <div class="result-cover">
            <div class="cover-placeholder">🎵</div>
          </div>
          <div class="result-info">
            <h3 class="result-title">{{ result.title }}</h3>
            <div class="result-meta">
              <span class="meta-item">{{ result.author }}</span>
              <span class="meta-divider">•</span>
              <span class="meta-item">{{ result.duration }}</span>
              <span class="meta-divider">•</span>
              <span class="meta-item">{{ result.plays }}次播放</span>
            </div>
          </div>
          <button class="play-btn">
            <span>▶</span>
          </button>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else-if="!isSearching">
      <Search :size="48" class="empty-icon" />
      <h3>搜索B站视频</h3>
      <p>输入关键词开始搜索</p>
    </div>
  </div>
</template>

<style scoped>
.search-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 900px;
}

.search-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.page-desc {
  font-size: 14px;
  color: var(--text-secondary);
}

.search-box {
  display: flex;
  gap: 12px;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: all 0.2s;
}

.search-input-wrapper:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.15);
}

.search-icon {
  color: var(--text-secondary);
}

.search-input {
  flex: 1;
  height: 48px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 15px;
  outline: none;
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 24px;
  height: 48px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.search-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.search-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.results-header {
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.results-count {
  font-size: 14px;
  color: var(--text-secondary);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 8px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.result-item:hover {
  background: var(--bg-card);
}

.result-cover {
  width: 80px;
  height: 50px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-card);
  flex-shrink: 0;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 20px;
}

.result-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.result-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.meta-divider {
  color: var(--border);
}

.play-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.result-item:hover .play-btn {
  opacity: 1;
}

.play-btn:hover {
  transform: scale(1.1);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 32px;
  color: var(--text-secondary);
  text-align: center;
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
}
</style>
