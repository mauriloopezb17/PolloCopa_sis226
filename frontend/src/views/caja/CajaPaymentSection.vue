<template>
  <div class="pago-section">
    <label class="pago-label">Método de pago</label>
    <select v-model="metodoSeleccionado" class="pago-select">
      <option :value="null" disabled>Seleccionar...</option>
      <option
        v-for="m in metodosPago"
        :key="m.id_metodo"
        :value="m.id_metodo"
      >
        {{ m.nombre }}
      </option>
    </select>

    <label class="pago-label">Monto recibido (Bs)</label>
    <input
      type="number"
      v-model.number="montoPagado"
      class="pago-input"
      min="0"
      step="0.50"
      placeholder="0.00"
    />

    <div class="cambio-row" :class="{ 'cambio-error': cambio < 0 }">
      <span>Cambio:</span>
      <span class="cambio-valor">Bs {{ formatPrecio(Math.max(cambio, 0)) }}</span>
    </div>
    <p v-if="cambio < 0" class="cambio-advertencia">
      Monto insuficiente (faltan Bs {{ formatPrecio(Math.abs(cambio)) }})
    </p>

    <div class="factura-separator">
      <span>Datos de facturación <em>(opcional)</em></span>
    </div>

    <label class="pago-label">NIT</label>
    <input
      type="text"
      inputmode="numeric"
      v-model.trim="nit"
      class="pago-input"
      placeholder="Sin NIT"
      maxlength="15"
    />

    <label class="pago-label">Razón Social</label>
    <input
      type="text"
      v-model.trim="razonSocial"
      class="pago-input"
      placeholder="Sin razón social"
      maxlength="100"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  subtotal: {
    type: Number,
    required: true
  },
  metodosPago: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['updatePago'])

const metodoSeleccionado = ref(null)
const montoPagado        = ref(null)
const nit                = ref('')
const razonSocial        = ref('')

const cambio = computed(() => {
  if (montoPagado.value == null || montoPagado.value === '') return 0
  return montoPagado.value - props.subtotal
})

const valido = computed(() => {
  return metodoSeleccionado.value != null &&
         montoPagado.value != null &&
         montoPagado.value > 0 &&
         cambio.value >= 0
})

watch([metodoSeleccionado, montoPagado, valido, nit, razonSocial], () => {
  emit('updatePago', {
    id_metodo:    metodoSeleccionado.value,
    monto_pagado: montoPagado.value,
    valido:       valido.value,
    NIT:          nit.value || null,
    razon_social: razonSocial.value || null,
  })
})

function reset() {
  metodoSeleccionado.value = null
  montoPagado.value        = null
  nit.value                = ''
  razonSocial.value        = ''
}

function formatPrecio(val) {
  return Number(val).toFixed(2)
}

defineExpose({ reset })
</script>

<style scoped>
.pago-section {
  padding: 10px 18px 8px;
  border-top: 1px solid #e8e8e8;
}

.pago-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 4px;
  margin-top: 8px;
}

.pago-label:first-child {
  margin-top: 0;
}

.pago-select,
.pago-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #222;
  background: #fafafa;
  outline: none;
  transition: border-color 0.15s ease;
}

.pago-select:focus,
.pago-input:focus {
  border-color: #F2CB05;
}

.pago-input {
  font-variant-numeric: tabular-nums;
}

.cambio-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding: 8px 10px;
  background: rgba(242, 203, 5, 0.12);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #5c4a00;
}

.cambio-valor {
  font-size: 16px;
  font-weight: 800;
}

.cambio-error {
  background: rgba(217, 11, 49, 0.08);
  color: #D90B31;
}

.cambio-advertencia {
  font-size: 11px;
  color: #D90B31;
  font-weight: 600;
  margin-top: 4px;
  text-align: right;
}

.factura-separator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #bbb;
}

.factura-separator::before,
.factura-separator::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e8e8e8;
}

.factura-separator em {
  font-style: normal;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
}
</style>
