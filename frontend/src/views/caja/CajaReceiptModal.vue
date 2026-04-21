<template>
  <div v-if="show" class="modal-overlay">
    <div class="modal-content receipt-card">
      <div class="receipt-print-area">
        <div class="receipt-header">
          <h3>Pollo Copacabana</h3>
          <p>Comprobante de Pago</p>
        </div>

        <div class="receipt-info" v-if="ticket">
          <p><strong>Ticket:</strong> {{ ticket.numero_ticket }}</p>
          <p><strong>Fecha:</strong> {{ formatearFecha(ticket.hora_pedido) }}</p>
          <p><strong>Método de Pago:</strong> {{ metodoNombre }}</p>
        </div>

        <div class="receipt-items">
          <div v-for="(item, idx) in items" :key="idx" class="receipt-item">
            <span class="item-desc">{{ item.cantidad }}x {{ item.nombre }} ({{ etiquetaTipo(item.tipo_precio) }})</span>
            <span class="item-price">Bs {{ formatPrecio(item.subtotal) }}</span>
          </div>
        </div>

        <div class="receipt-totals" v-if="ticket">
          <div class="total-row">
            <span>Total:</span>
            <span>Bs {{ formatPrecio(ticket.total) }}</span>
          </div>
          <div class="total-row">
            <span>Pagado:</span>
            <span>Bs {{ formatPrecio(ticket.monto_pagado) }}</span>
          </div>
          <div class="total-row total-cambio">
            <span>Cambio:</span>
            <span>Bs {{ formatPrecio(ticket.monto_cambio) }}</span>
          </div>
        </div>
        
        <div class="receipt-footer">
          <p>¡Gracias por su compra!</p>
        </div>
      </div>

      <div class="modal-actions no-print">
        <button class="btn-print" @click="imprimir">Imprimir</button>
        <button class="btn-close" @click="cerrar">Cerrar y Nuevo Pedido</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  ticket: { type: Object, default: null },
  items: { type: Array, default: () => [] },
  metodosPago: { type: Array, default: () => [] },
  idMetodoPago: { type: Number, default: null }
})

const emit = defineEmits(['close'])

const metodoNombre = computed(() => {
  if (!props.idMetodoPago) return '---'
  const m = props.metodosPago.find(x => x.id_metodo === props.idMetodoPago)
  return m ? m.nombre : '---'
})

function imprimir() {
  window.print()
}

function cerrar() {
  emit('close')
}

function formatearFecha(isoStr) {
  if (!isoStr) return ''
  const date = new Date(isoStr)
  return date.toLocaleString('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatPrecio(val) {
  return Number(val || 0).toFixed(2)
}

function etiquetaTipo(tipo) {
  const map = { COMBO: 'Combo', CON_PAPA: 'Con papa', SOLO: 'Solo' }
  return map[tipo] || tipo
}
</script>

<style scoped>
/* Modal overlay styling */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
}

/* Receipt styles */
.receipt-print-area {
  font-family: 'Courier New', Courier, monospace;
  color: #333;
}

.receipt-header {
  text-align: center;
  margin-bottom: 16px;
  border-bottom: 1px dashed #ccc;
  padding-bottom: 12px;
}

.receipt-header h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: bold;
}

.receipt-header p {
  margin: 0;
  font-size: 14px;
}

.receipt-info {
  margin-bottom: 16px;
  font-size: 13px;
}

.receipt-info p {
  margin: 2px 0;
}

.receipt-items {
  border-bottom: 1px dashed #ccc;
  padding-bottom: 12px;
  margin-bottom: 12px;
}

.receipt-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 4px;
}

.item-desc {
  flex: 1;
  padding-right: 8px;
}

.item-price {
  font-weight: bold;
}

.receipt-totals {
  border-bottom: 1px dashed #ccc;
  padding-bottom: 12px;
  margin-bottom: 16px;
  font-size: 14px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.total-cambio {
  font-weight: bold;
  font-size: 15px;
  margin-top: 8px;
}

.receipt-footer {
  text-align: center;
  font-size: 13px;
  margin-bottom: 24px;
}

/* Actions */
.modal-actions {
  display: flex;
  gap: 12px;
}

.btn-print {
  flex: 1;
  padding: 10px;
  background: #D90B31;
  border: 1px solid #D90B31;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  color: #F2CB05;
}

.btn-print:hover {
  background: #b80929;
}

.btn-close {
  flex: 1;
  padding: 10px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  color: #555;
}

.btn-close:hover {
  background: #e5e5e5;
}

/* PRINT STYLES */
@media print {
  body * {
    visibility: hidden;
  }
  
  /* Reset some basic layout properties */
  @page {
    margin: 0;
  }
  
  html, body {
    height: 100%;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff;
  }
  
  .receipt-print-area, .receipt-print-area * {
    visibility: visible;
  }
  
  .receipt-print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    max-width: 300px;
    margin: 0;
    padding: 10px;
    box-sizing: border-box;
  }
  
  .no-print {
    display: none !important;
  }
}
</style>
