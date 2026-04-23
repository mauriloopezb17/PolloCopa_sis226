<template>
  <aside class="pedido-panel">
    <!-- Encabezado -->
    <div class="pedido-header">
      <h2 class="pedido-titulo">Pedido actual</h2>
      <span class="pedido-ticket">{{ ticket }}</span>
    </div>

    <!-- Lista de items -->
    <div class="pedido-items" v-if="items.length > 0">
      <div
        v-for="(item, idx) in items"
        :key="idx"
        class="pedido-item"
      >
        <div class="item-info">
          <span class="item-nombre">{{ item.nombre }}</span>
          <span class="item-tipo">{{ etiquetaTipo(item.tipo_precio) }}</span>
        </div>

        <div class="item-controls">
          <button class="btn-qty" @click="$emit('decrementar', idx)">−</button>
          <span class="item-qty">{{ item.cantidad }}</span>
          <button class="btn-qty" @click="$emit('incrementar', idx)">+</button>
        </div>

        <div class="item-subtotal">
          Bs {{ formatPrecio(item.subtotal) }}
        </div>

        <button class="btn-remove" @click="$emit('eliminar', idx)" title="Quitar">✕</button>
      </div>
    </div>

    <!-- Vacío -->
    <div v-else class="pedido-vacio">
      <span class="vacio-icono">—</span>
      <p>Aún no hay productos en el pedido.</p>
    </div>

    <!-- Totales + Pago (solo cuando hay items) -->
    <template v-if="items.length > 0">
      <!-- Totales -->
      <div class="pedido-totales">
        <div class="total-row">
          <span>Subtotal</span>
          <span>Bs {{ formatPrecio(subtotal) }}</span>
        </div>
        <div class="total-row total-final">
          <span>Total</span>
          <span>Bs {{ formatPrecio(subtotal) }}</span>
        </div>
      </div>

      <!-- Componente de pago -->
      <CajaPaymentSection 
        ref="paymentSectionRef"
        :subtotal="subtotal" 
        :metodos-pago="metodosPago"
        @updatePago="handlePagoUpdate"
      />

      <!-- Acciones -->
      <div class="pedido-acciones">
        <button class="btn-cancelar" @click="handleCancelar">Cancelar</button>
        <button
          class="btn-confirmar"
          :disabled="!pagoData.valido"
          @click="emitConfirmar"
        >
          Confirmar pedido
        </button>
      </div>
    </template>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import CajaPaymentSection from './CajaPaymentSection.vue'

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  ticket: {
    type: String,
    default: '---',
  },
  metodosPago: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['incrementar', 'decrementar', 'eliminar', 'cancelar', 'confirmar'])

const paymentSectionRef = ref(null)

const pagoData = ref({
  id_metodo:    null,
  monto_pagado: null,
  valido:       false,
  NIT:          null,
  razon_social: null,
})

const subtotal = computed(() =>
  props.items.reduce((sum, item) => sum + Number(item.subtotal), 0)
)

function handlePagoUpdate(data) {
  pagoData.value = data
}

function handleCancelar() {
  resetPago()
  emit('cancelar')
}

function resetPago() {
  if (paymentSectionRef.value) {
    paymentSectionRef.value.reset()
  }
}

function emitConfirmar() {
  emit('confirmar', {
    id_metodo:    pagoData.value.id_metodo,
    monto_pagado: pagoData.value.monto_pagado,
    NIT:          pagoData.value.NIT,
    razon_social: pagoData.value.razon_social,
  })
}

defineExpose({ resetPago })

function formatPrecio(val) {
  return Number(val).toFixed(2)
}

function etiquetaTipo(tipo) {
  const map = { COMBO: 'Combo', CON_PAPA: 'Con papa', SOLO: 'Solo' }
  return map[tipo] || tipo
}
</script>

<style scoped>
.pedido-panel {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-left: 1px solid #e8e8e8;
  height: 100%;
  min-width: 320px;
  max-width: 360px;
}

/* --- Header --- */
.pedido-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 2px solid #F2CB05;
}

.pedido-titulo {
  font-size: 16px;
  font-weight: 800;
  color: #222;
}

.pedido-ticket {
  font-size: 12px;
  font-weight: 700;
  color: #5c4a00;
  background: #F2E205;
  padding: 2px 10px;
  border-radius: 12px;
}

/* --- Items list --- */
.pedido-items {
  flex: 1;
  overflow-y: auto;
  padding: 10px 18px;
}

.pedido-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-nombre {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #222;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-tipo {
  font-size: 11px;
  color: #888;
  font-weight: 600;
}

/* Qty controls */
.item-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-qty {
  width: 24px;
  height: 24px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fafafa;
  font-size: 14px;
  font-weight: 700;
  color: #555;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}

.btn-qty:hover {
  background: #eee;
}

.item-qty {
  font-size: 13px;
  font-weight: 800;
  color: #222;
  min-width: 18px;
  text-align: center;
}

.item-subtotal {
  font-size: 13px;
  font-weight: 700;
  color: #222;
  white-space: nowrap;
}

.btn-remove {
  background: none;
  border: none;
  font-size: 14px;
  color: #ccc;
  cursor: pointer;
  padding: 2px 4px;
  transition: color 0.15s ease;
}

.btn-remove:hover {
  color: #D90B31;
}

/* --- Vacío --- */
.pedido-vacio {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #bbb;
  gap: 8px;
}

.vacio-icono {
  font-size: 32px;
  color: #ccc;
  font-weight: 300;
}

.pedido-vacio p {
  font-size: 13px;
  font-weight: 600;
}

/* --- Totales --- */
.pedido-totales {
  padding: 14px 18px 8px;
  border-top: 1px solid #e8e8e8;
}

.total-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
}

.total-final {
  font-size: 16px;
  font-weight: 800;
  color: #222;
  margin-top: 4px;
  padding-top: 6px;
  border-top: 2px solid #F2CB05;
}

/* --- Acciones --- */
.pedido-acciones {
  display: flex;
  gap: 8px;
  padding: 14px 18px;
  border-top: 1px solid #e8e8e8;
}

.btn-cancelar,
.btn-confirmar {
  flex: 1;
  padding: 10px 0;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.btn-cancelar {
  background: #fff;
  border: 1px solid #ddd;
  color: #666;
}

.btn-cancelar:hover {
  background: #f5f5f5;
  color: #222;
}

.btn-confirmar {
  background: #D90B31;
  border: 1px solid #D90B31;
  color: #F2CB05;
}

.btn-confirmar:hover:not(:disabled) {
  background: #b80929;
}

.btn-confirmar:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
