<script setup lang="ts">
import { ref } from 'vue'
import { Play, Clock, TrendingUp } from 'lucide-vue-next'

const recentPlays = ref([
  { id: 1, title: 'Sample Video 1', author: 'UP Owner 1', duration: '10:30' },
  { id: 2, title: 'Sample Video 2', author: 'UP Owner 2', duration: '15:45' },
  { id: 3, title: 'Sample Video 3', author: 'UP Owner 3', duration: '8:20' }
])

const recommendations = ref([
  { id: 1, title: 'Recommended Video 1', author: 'UP Owner A', views: '100K' },
  { id: 2, title: 'Recommended Video 2', author: 'UP Owner B', views: '50K' },
  { id: 3, title: 'Recommended Video 3', author: 'UP Owner C', views: '200K' },
  { id: 4, title: 'Recommended Video 4', author: 'UP Owner D', views: '80K' }
])
</script>

<template>
  <div class="home-view">
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">
          <Clock :size="20" />
          Recently Played
        </h2>
      </div>
      <div class="video-grid" v-if="recentPlays.length > 0">
        <div
          v-for="video in recentPlays"
          :key="video.id"
          class="video-card"
        >
          <div class="video-cover">
            <div class="cover-placeholder">
              <Play :size="32" />
            </div>
            <div class="video-cover-overlay">
              <button class="play-btn-overlay">
                <Play :size="24" />
              </button>
            </div>
            <span class="video-duration">{{ video.duration }}</span>
          </div>
          <div class="video-info">
            <h3 class="video-title">{{ video.title }}</h3>
            <span class="video-author">{{ video.author }}</span>
          </div>
        </div>
      </div>
      <div class="empty-state" v-else>
        <p>No recent plays</p>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h2 class="section-title">
          <TrendingUp :size="20" />
          Trending
        </h2>
      </div>
      <div class="video-grid">
        <div
          v-for="video in recommendations"
          :key="video.id"
          class="video-card"
        >
          <div class="video-cover">
            <div class="cover-placeholder">
              <Play :size="32" />
            </div>
            <div class="video-cover-overlay">
              <button class="play-btn-overlay">
                <Play :size="24" />
              </button>
            </div>
          </div>
          <div class="video-info">
            <h3 class="video-title">{{ video.title }}</h3>
            <span class="video-author">{{ video.author }}</span>
            <span class="video-views">{{ video.views }} views</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
}

.video-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.video-card:hover {
  background: var(--bg-card);
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.video-cover {
  position: relative;
  width: 100%;
  padding-top: 56.25%;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-card);
}

.video-cover img,
.cover-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.video-card:hover .cover-placeholder {
  color: var(--accent);
}

.video-card:hover .video-cover img,
.video-card:hover .cover-placeholder {
  transform: scale(1.05);
}

.video-cover-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.video-card:hover .video-cover-overlay {
  opacity: 1;
}

.play-btn-overlay {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.play-btn-overlay:hover {
  transform: scale(1.1);
}

.video-duration {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 4px;
  font-size: 12px;
  color: white;
}

.video-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.video-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-author {
  font-size: 12px;
  color: var(--text-secondary);
}

.video-views {
  font-size: 11px;
  color: var(--text-secondary);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: var(--text-secondary);
  font-size: 14px;
}

@media (max-width: 768px) {
  .video-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 16px;
  }
}
</style>
