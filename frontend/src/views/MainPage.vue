<template>
  <div class="app-wrapper">

    <!-- ===== NAVBAR ===== -->
    <header class="navbar">
      <div class="navbar-left">
        <div class="logo-block">
          <img src="./logo.png" alt="Pollos Copacabana" class="logo-img" />
          <div class="logo-text">
            <span class="logo-main">Pollos</span>
            <span class="logo-sub">Copacabana</span>
          </div>
        </div>
      </div>

      <nav class="navbar-center">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="nav-tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <span class="tab-label">{{ tab.label }}</span>
          <span class="tab-active-bar" v-if="activeTab === tab.id"></span>
        </button>
      </nav>

      <div class="navbar-right">
        <div class="time-badge">
          <span class="time-dot"></span>
          <span class="time-text">{{ currentTime }}</span>
        </div>
      </div>
    </header>

    <!-- ===== CONTENT AREA ===== -->
    <main class="content-area">
      <transition name="fade-slide" mode="out-in">
        <div :key="activeTab" class="content-panel">
          <CajaTab v-if="activeTab === 'caja'" />
        
          <InventarioView v-if="activeTab === 'inventario'" />
        </div>
      </transition>
    </main>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import CajaTab from './caja/CajaTab.vue'
import InventarioView from './InventarioView.vue'

const tabs = [
  { id: 'inventario', label: 'Inventario' },
  { id: 'caja',       label: 'Caja'       },
  { id: 'cocina',     label: 'Cocina'     },
]

const activeTab = ref('inventario')
const currentTime = ref('')

function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

let timer
onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.app-wrapper {
  min-height: 100vh;
  background: #F2F2F2;
  font-family: 'Segoe UI', 'Helvetica Neue', sans-serif;
  display: flex;
  flex-direction: column;
}

/* NAVBAR */
.navbar {
  background: #D90B31;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  box-shadow: 0 4px 20px rgba(217, 11, 49, 0.35);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo-block {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.logo-img {
  height: 56px;
  width: 56px;
  object-fit: cover;
  border-radius: 10px;
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.logo-main {
  font-size: 17px;
  font-weight: 800;
  color: #F2E205;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.logo-sub {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.navbar-center {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-tab {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 24px 12px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
  border-radius: 8px 8px 0 0;
}

.nav-tab:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.nav-tab.active {
  color: #F2E205;
  background: rgba(242, 226, 5, 0.12);
}

.tab-label {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.tab-active-bar {
  display: block;
  position: absolute;
  bottom: 0;
  left: 20%;
  width: 60%;
  height: 3px;
  background: #F2CB05;
  border-radius: 2px 2px 0 0;
  animation: bar-in 0.22s ease;
}

@keyframes bar-in {
  from { width: 0; opacity: 0; }
  to   { width: 60%; opacity: 1; }
}

.navbar-right {
  display: flex;
  align-items: center;
}

.time-badge {
  display: flex;
  align-items: center;
  gap: 7px;
  background: rgba(255, 255, 255, 0.13);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 5px 14px;
}

.time-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #F2E205;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1;   transform: scale(1);   }
  50%       { opacity: 0.4; transform: scale(0.75); }
}

.time-text {
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
}

/* CONTENT */
.content-area {
  flex: 1;
  background: #F2F2F2;
}

.content-panel {
  min-height: calc(100vh - 68px);
}

/* TRANSITIONS */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>