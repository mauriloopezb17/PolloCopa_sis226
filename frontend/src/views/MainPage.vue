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
          v-for="tab in visibleTabs"
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
          <MenuTab v-if="activeTab === 'menu'" />
          <InventarioTab v-else-if="activeTab === 'inventario'" />
          <CajaTab v-else-if="activeTab === 'caja'" />
          <CocinaTab v-else-if="activeTab === 'cocina'" />
          <MenuAdminTab v-else-if="activeTab === 'menuAdmin'" />
        </div>
      </transition>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import MenuTab from './menu/MenuTab.vue'
import InventarioTab from './inventario/InventarioView.vue'
import CajaTab from './caja/CajaTab.vue'
import CocinaTab from './cocina/CocinaPedidos.vue'
import MenuAdminTab from './admin/MenuAdmin.vue'

const tabs = [
  { id: 'menu',      label: 'Menu'      },
  { id: 'inventario', label: 'Inventario' },
  { id: 'caja',      label: 'Caja'      },
  { id: 'cocina',    label: 'Cocina'    },
  { id: 'menuAdmin', label: 'Recetas' },
]

const activeTab = ref('menu')
const currentTime = ref('')

// ── Konami Code (Security by Obscurity) ───────────────────
const isAdmin = ref(false)
const konamiSequence = [
  'ArrowUp', 'ArrowUp', 
  'ArrowDown', 'ArrowDown', 
  'ArrowLeft', 'ArrowRight', 
  'ArrowLeft', 'ArrowRight', 
  'b', 'a', 'Enter'
]
let konamiIndex = 0

function handleKeydown(e) {
  // Ignorar si se está escribiendo en un input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

  if (e.key === konamiSequence[konamiIndex]) {
    konamiIndex++
    if (konamiIndex === konamiSequence.length) {
      isAdmin.value = true
      konamiIndex = 0
    }
  } else {
    konamiIndex = 0
  }
}

const visibleTabs = computed(() => {
  if (isAdmin.value) return tabs
  return tabs.filter(t => t.id === 'menu')
})

function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

let timer = null

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
  window.addEventListener('keydown', handleKeydown)
  
  // ── Testing Helper: window.restock() ─────────────────────
  window.restock = async () => {
    const hardcoded = {
      1: 150, 2: 80,  3: 50,  4: 90,  5: 200, 6: 40,  7: 10,  8: 12,
      9: 8,  10: 500, 11: 5,  12: 6,  13: 4,  14: 3,  15: 8,  16: 3,
      17: 5,  18: 6,  19: 5,  20: 3,  21: 2,  22: 20, 23: 200, 24: 200,
      25: 300, 26: 300, 27: 200, 28: 150, 29: 30, 30: 40, 31: 10000
    }
    console.log("%c🚀 Iniciando reabastecimiento...", "color: #F2CB05; font-weight: bold;")

    const ings = await fetch('https://pollocopa.62344037.xyz/api/inventario/ingredientes').then(r => r.json())
    const missing = ings.filter(i => !(i.id_insumo in hardcoded))
    if (missing.length > 0) {
      console.warn('⚠️ Ingredientes sin valor hardcodeado (no serán reseteados):\n' +
        missing.map(i => `  id=${i.id_insumo}  ${i.nombre}`).join('\n'))
    }

    for (const [id, stock] of Object.entries(hardcoded)) {
      await fetch(`https://pollocopa.62344037.xyz/api/inventario/ingredientes/${id}/force-stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock }),
      })
    }

    console.log("%c✨ ¡Inventario reseteado!", "color: #2a9d5c; font-weight: bold;")
    alert("Reabastecimiento completado.")
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  window.removeEventListener('keydown', handleKeydown)
  delete window.restock
})
</script>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.app-wrapper {
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

/* ======================================
   NAVBAR
====================================== */
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

/* Logo */
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

/* Nav tabs */
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
  from {
    width: 0;
    opacity: 0;
  }
  to {
    width: 60%;
    opacity: 1;
  }
}

/* Right */
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
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.75);
  }
}

.time-text {
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
}

/* ======================================
   CONTENT
====================================== */
.content-area {
  flex: 1;
  background: #ffffff;
}

.content-panel {
  min-height: calc(100vh - 68px);
}

/* ======================================
   TRANSITIONS
====================================== */
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

/* ======================================
   RESPONSIVENESS
====================================== */
@media (max-width: 768px) {
  .navbar {
    height: 60px;
    padding: 0 12px;
  }

  .logo-text, .time-badge {
    display: none;
  }

  .logo-img {
    height: 40px;
    width: 40px;
  }

  .navbar-center {
    flex: 1;
    justify-content: center;
    gap: 0;
  }

  .nav-tab {
    padding: 8px 12px 10px;
  }

  .tab-label {
    font-size: 11px;
  }

  .content-panel {
    min-height: calc(100vh - 60px);
  }
}
</style>