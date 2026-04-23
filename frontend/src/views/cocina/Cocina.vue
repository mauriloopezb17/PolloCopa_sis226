<template>
  <div class="oc-root">
    <!-- Header -->
    <header class="oc-header">
      <div class="oc-logo">Lista</div>
      <h1 class="oc-title">Seccion cocina</h1>
      <div class="oc-clock">{{ clock }}</div>
    </header>
    <main class="oc-body">
      <div class="oc-panel">
        <div class="oc-panel-title">Lista ingredientes</div>

        <div class="oc-panel-body">
          <IngredientItem
            v-for="ingredient in ingredients"
            :key="ingredient.id"
            :ingredient="ingredient"
            :loading="togglingId === ingredient.id"
            @toggle="handleToggle"
          />
        </div>
      </div>
      <div class="status-bar">
        <span class="status-text">Stock Resumen:</span>
        <span class="status-count" :class="{ green: outCount === 0 }">
          {{ outCount === 0 ? 'Todo disponible' : `${outCount} Falta${outCount > 1 ? 'n' : ''}` }}
        </span>
      </div>
    </main>
    <footer class="oc-footer">
      <button class="btn-footer" @click="refreshIngredients">actualizar lista</button>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import IngredientItem from './Ingredientitem.vue'
import { fetchIngredients, toggleIngredient } from '../../router/Ingredientservice.js'

const ingredients = ref([])
const loadingAll = ref(true)
const togglingId = ref(null)
const error = ref(null)
const clock = ref('')

const outCount = computed(() => ingredients.value.filter((i) => i.out).length)

function updateClock() {
  const now = new Date()
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  clock.value = `${h}:${m}`
}

async function loadIngredients() {
  try {
    error.value = null
    ingredients.value = await fetchIngredients()
  } catch (e) {
    error.value = 'Could not load ingredients. Is the server running?'
  } finally {
    loadingAll.value = false
  }
}

async function handleToggle(id) {
  togglingId.value = id
  try {
    const updated = await toggleIngredient(id)
    const idx = ingredients.value.findIndex((i) => i.id === id)
    if (idx !== -1) ingredients.value[idx] = updated
  } catch (e) {
    error.value = 'Failed to update ingredient. Please try again.'
  } finally {
    togglingId.value = null
  }
}

async function refreshIngredients() {
  loadingAll.value = true
  await loadIngredients()
}

let clockInterval
onMounted(() => {
  loadIngredients()
  updateClock()
  clockInterval = setInterval(updateClock, 30000)
})
onUnmounted(() => clearInterval(clockInterval))
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap');

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #ffffff;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.oc-root {
  background: #f2f2f2;
  border-radius: 16px;
  overflow: hidden;
  font-family: 'Fredoka One', cursive;
  width: 100%;
  max-width: 560px;
}

.oc-header {
  background: #eb1a20;
  border-bottom: 4px solid #f2cb05;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.oc-logo {
  background: #eb1a20;
  color: #f2f2f2;
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 8px;
  border: 3px solid #f2f2f2;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.oc-title {
  color: #f2f2f2;
  font-size: 22px;
  letter-spacing: 1px;
  font-weight: 400;
}

.oc-clock {
  margin-left: auto;
  background: #eb1a20;
  color: #f2f2f2;
  font-size: 13px;
  padding: 5px 14px;
  border-radius: 20px;
  border: 3px solid #f2f2f2;
}

.oc-body {
  padding: 18px;
}

.oc-panel {
  background: #f2f2f2;
  border-radius: 14px;
  overflow: hidden;
}

.oc-panel-title {
  background: #f2f2f2;
  color: #eb1a20;
  font-size: 14px;
  letter-spacing: 0.5px;
  padding: 8px 16px;
  text-transform: uppercase;
}

.oc-panel-body {
  padding: 14px;
}

.state-message {
  color: #d4a07a;
  font-size: 14px;
  text-align: center;
  padding: 20px 0;
}
.state-message.error {
  color: #230c0c;
}

.status-bar {
  margin-top: 14px;
  background: #eb1a20;
  border: 2px solid #f2f2f2;
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-text {
  color: #f2f2f2;
  font-size: 13px;
}

.status-count {
  background: #eb1a20;
  color: #f2f2f2;
  font-size: 13px;
  padding: 3px 12px;
  border-radius: 8px;
  border: 2px solid #f2f2f2;
  min-width: 80px;
  text-align: center;
  transition:
    background 0.3s,
    border-color 0.3s;
}
.status-count.green {
  background: #eb1a20;
  border-color: #f2f2f2;
}

.oc-footer {
  background: #eb1a20;
  border-top: 3px solid #f2cb05;
  padding: 10px 18px;
  display: flex;
  justify-content: flex-end;
}

.btn-footer {
  background: #eb1a20;
  color: #f2f2f2;
  border: 3px solid #f2f2f2;
  border-radius: 10px;
  font-family: 'Fredoka One', cursive;
  font-size: 13px;
  padding: 7px 18px;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.15s;
}
.btn-footer:hover {
  background: #e0cfd2;
  transform: scale(0.97);
}
</style>
