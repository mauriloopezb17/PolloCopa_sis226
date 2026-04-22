<template>
  <div class="ingredient-item" :class="{ out: ingredient.out }">
    <div class="ingredient-name">
      <span class="ingredient-icon">{{ ingredient.icon }}</span>
      {{ ingredient.name }}
      <span v-if="ingredient.out" class="out-badge">Ya no hay</span>
    </div>
    <button
      class="btn-stock"
      :class="ingredient.out ? 'restore' : 'available'"
      :disabled="loading"
      @click="$emit('toggle', ingredient.id)"
    >
      {{ ingredient.out ? 'Hay' : 'No hay' }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  ingredient: { type: Object, required: true },
  loading:    { type: Boolean, default: false },
})
defineEmits(['toggle'])
</script>

<style scoped>
.ingredient-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #FFCA07;
  border: 2px solid #D90404;
  border-radius: 10px;
  padding: 11px 14px;
  margin-bottom: 10px;
  transition: all 0.2s;
}
.ingredient-item:last-child { margin-bottom: 0; }
.ingredient-item.out {
  background: #ecc434;
  border-color: #D90404;
  opacity: 0.78;
}

.ingredient-name {
  color: #F2F2F2;
  font-family: 'Fredoka One', cursive;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-stock {
  font-family: 'Fredoka One', cursive;
  font-size: 13px;
  padding: 7px 16px;
  border-radius: 9px;
  border: 3px solid;
  cursor: pointer;
  transition: all 0.15s;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}
.btn-stock:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-stock.available {
  background: #EB1A20;
  color: #e5e5e5;
  border-color: #8a0825;
}
.btn-stock.available:hover:not(:disabled) { background: #a00025; transform: scale(0.97); }

.btn-stock.restore {
  background: #2d5a1a;
  color: #a8f07a;
  border-color: #8a0825;
}
.btn-stock.restore:hover:not(:disabled) { background: #1a3a0a; transform: scale(0.97); }
</style>