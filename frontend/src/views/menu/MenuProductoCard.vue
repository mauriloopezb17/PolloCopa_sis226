<template>
  <div class="menu-card" :class="{ 'card-locked': !canOrder, 'card-disabled': !producto.disponible }">
    <div class="card-img-container">
      <img
        v-if="producto.imagen_url"
        :src="producto.imagen_url"
        :alt="producto.nombre"
        class="card-img"
      />
      <div v-else class="card-img-placeholder">
        <span>{{ producto.nombre.charAt(0) }}</span>
      </div>
      <div v-if="!producto.disponible" class="badge-agotado">Agotado</div>
      <div v-else class="card-badge">{{ producto.categoria }}</div>
    </div>

    <div class="card-content">
      <div class="title-row">
        <h3 class="card-title">{{ producto.nombre }}</h3>
        <span class="card-code">{{ producto.codigo }}</span>
      </div>
      
      <p class="card-description">
        {{ producto.descripcion || 'Prueba nuestro delicioso sabor tradicional.' }}
      </p>

      <div class="card-actions">
        <!-- COMBO -->
        <div v-if="producto.precio_combo" class="price-group">
          <div class="price-meta">
            <span class="price-type">Combo</span>
            <span class="price-val">Bs {{ formatPrecio(producto.precio_combo) }}</span>
          </div>
          <button 
            class="add-btn" 
            @click="$emit('añadir', producto, 'COMBO')" 
            :disabled="!canOrder || !producto.disponible"
            title="Añadir al pedido"
          >
            +
          </button>
        </div>

        <!-- CON PAPA -->
        <div v-if="producto.precio_con_papa" class="price-group">
          <div class="price-meta">
            <span class="price-type">Con Papa</span>
            <span class="price-val">Bs {{ formatPrecio(producto.precio_con_papa) }}</span>
          </div>
          <button 
            class="add-btn" 
            @click="$emit('añadir', producto, 'CON_PAPA')" 
            :disabled="!canOrder || !producto.disponible"
            title="Añadir al pedido"
          >
            +
          </button>
        </div>

        <!-- SOLO -->
        <div v-if="producto.precio_solo" class="price-group">
          <div class="price-meta">
            <span class="price-type">Solo</span>
            <span class="price-val">Bs {{ formatPrecio(producto.precio_solo) }}</span>
          </div>
          <button 
            class="add-btn" 
            @click="$emit('añadir', producto, 'SOLO')" 
            :disabled="!canOrder || !producto.disponible"
            title="Añadir al pedido"
          >
            +
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  producto: { type: Object, required: true },
  canOrder: { type: Boolean, default: false }
})

defineEmits(['añadir'])

function formatPrecio(val) {
  return Number(val).toFixed(2)
}
</script>

<style scoped>
.menu-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid #f0f0f0;
}

.menu-card:hover:not(.card-locked) {
  transform: translateY(-6px);
  box-shadow: 0 12px 30px rgba(217, 11, 49, 0.12);
  border-color: rgba(217, 11, 49, 0.1);
}

.card-img-container {
  position: relative;
  width: 100%;
  height: 220px;
  background: #f8f8f8;
  overflow: hidden;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.menu-card:hover .card-img {
  transform: scale(1.05);
}

.card-img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #F2CB05 0%, #D90B31 100%);
  color: #fff;
  font-size: 64px;
  font-weight: 900;
}

.card-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.95);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 800;
  color: #D90B31;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.badge-agotado {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 900;
  font-size: 24px;
  text-transform: uppercase;
  letter-spacing: 2px;
  backdrop-filter: blur(2px);
}

.card-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.card-title {
  font-size: 19px;
  font-weight: 800;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.2;
}

.card-code {
  font-size: 10px;
  color: #bbb;
  font-weight: 700;
}

.card-description {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 20px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-actions {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.price-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f9f9f9;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #eee;
  transition: all 0.2s ease;
}

.price-group:hover:not(.card-locked *) {
  background: #fff;
  border-color: #F2CB05;
}

.price-meta {
  display: flex;
  flex-direction: column;
}

.price-type {
  font-size: 10px;
  text-transform: uppercase;
  color: #888;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.price-val {
  font-size: 15px;
  font-weight: 800;
  color: #1a1a1a;
}

.add-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #D90B31;
  color: #F2CB05;
  font-size: 20px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(217, 11, 49, 0.3);
}

.add-btn:hover:not(:disabled) {
  transform: scale(1.1) rotate(90deg);
  background: #b80929;
}

.add-btn:disabled {
  background: #eee;
  color: #ccc;
  cursor: not-allowed;
  box-shadow: none;
}

.card-locked {
  filter: grayscale(0.2);
}

.card-disabled {
  opacity: 0.7;
}
</style>
