<template>
  <div class="caja-producto-card" :class="{ 'no-disponible': !producto.disponible }">
    <!-- Imagen pequeña a la izquierda -->
    <div class="card-img-wrap">
      <img
        v-if="producto.imagen_url"
        :src="producto.imagen_url"
        :alt="producto.nombre"
        class="card-img"
      />
      <div v-else class="card-img-placeholder">{{ producto.nombre.charAt(0) }}</div>
    </div>

    <!-- Info principal -->
    <div class="card-body">
      <div class="card-header-row">
        <span class="card-codigo">{{ producto.codigo }}</span>
        <span class="card-categoria">{{ producto.categoria }}</span>
      </div>

      <h3 class="card-nombre">{{ producto.nombre }}</h3>
      <p v-if="producto.descripcion" class="card-desc">{{ producto.descripcion }}</p>

      <!-- Precios y botones de añadir -->
      <div class="card-precios">
        <button
          v-if="producto.precio_combo != null"
          class="btn-precio"
          :disabled="!producto.disponible"
          @click="$emit('añadir', producto, 'COMBO')"
        >
          <span class="precio-tipo">Combo</span>
          <span class="precio-valor">Bs {{ formatPrecio(producto.precio_combo) }}</span>
          <span class="precio-add">Añadir</span>
        </button>

        <button
          v-if="producto.precio_con_papa != null"
          class="btn-precio"
          :disabled="!producto.disponible"
          @click="$emit('añadir', producto, 'CON_PAPA')"
        >
          <span class="precio-tipo">Con papa</span>
          <span class="precio-valor">Bs {{ formatPrecio(producto.precio_con_papa) }}</span>
          <span class="precio-add">Añadir</span>
        </button>

        <button
          v-if="producto.precio_solo != null"
          class="btn-precio"
          :disabled="!producto.disponible"
          @click="$emit('añadir', producto, 'SOLO')"
        >
          <span class="precio-tipo">Solo</span>
          <span class="precio-valor">Bs {{ formatPrecio(producto.precio_solo) }}</span>
          <span class="precio-add">Añadir</span>
        </button>
      </div>

      <span v-if="!producto.disponible" class="badge-agotado">No disponible</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  producto: {
    type: Object,
    required: true,
  },
})

defineEmits(['añadir'])

function formatPrecio(val) {
  return Number(val).toFixed(2)
}
</script>

<style scoped>
.caja-producto-card {
  display: flex;
  gap: 14px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.caja-producto-card:hover {
  border-color: #F2CB05;
  box-shadow: 0 2px 8px rgba(242, 203, 5, 0.2);
}

.caja-producto-card.no-disponible {
  opacity: 0.5;
  pointer-events: none;
}

/* --- Imagen --- */
.card-img-wrap {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 6px;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-img-placeholder {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  background: #F2CB05;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
}

/* --- Body --- */
.card-body {
  flex: 1;
  min-width: 0;
}

.card-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.card-codigo {
  font-size: 11px;
  font-weight: 700;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-categoria {
  font-size: 10px;
  font-weight: 700;
  color: #7a6200;
  background: rgba(242, 203, 5, 0.25);
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.card-nombre {
  font-size: 15px;
  font-weight: 700;
  color: #222;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-desc {
  font-size: 12px;
  color: #777;
  margin-bottom: 8px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* --- Precios / botones añadir --- */
.card-precios {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.btn-precio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fafafa;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.btn-precio:hover {
  background: #D90B31;
  border-color: #D90B31;
}

.btn-precio:hover .precio-tipo,
.btn-precio:hover .precio-valor,
.btn-precio:hover .precio-add {
  color: #fff;
}

.precio-tipo {
  font-size: 10px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  transition: color 0.15s ease;
}

.precio-valor {
  font-size: 13px;
  font-weight: 800;
  color: #222;
  transition: color 0.15s ease;
}

.precio-add {
  font-size: 10px;
  font-weight: 700;
  color: #c9a800;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  transition: color 0.15s ease;
}

.btn-precio:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.badge-agotado {
  display: inline-block;
  margin-top: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #D90B31;
  background: rgba(217, 11, 49, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}
</style>
