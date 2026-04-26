<template>
  <div class="historial-overlay" @click.self="$emit('close')">
    <div class="historial-panel">

      <div class="historial-header">
        <h2 class="historial-titulo">Historial de pedidos</h2>
        <button class="btn-cerrar" @click="$emit('close')">✕</button>
      </div>

      <div class="historial-body">
        <div v-if="cargando" class="estado-msg">Cargando...</div>
        <div v-else-if="error" class="estado-msg error-msg">{{ error }}</div>
        <div v-else-if="pedidos.length === 0" class="estado-msg">No hay pedidos registrados.</div>

        <div v-else class="pedidos-lista">
          <div
            v-for="pedido in pedidos"
            :key="pedido.id_pedido"
            class="pedido-card"
            :class="{ anulado: pedido.estado === 'ANULADO' }"
          >
            <div class="card-top">
              <div class="card-id-block">
                <span class="card-ticket">{{ pedido.numero_ticket }}</span>
                <span class="card-hora">{{ formatHora(pedido.hora_pedido) }}</span>
              </div>
              <span class="estado-badge" :class="estadoClass(pedido.estado)">{{ pedido.estado }}</span>
            </div>

            <div class="card-items">
              <div v-for="(item, i) in pedido.items" :key="i" class="item-row">
                <span class="item-qty">{{ item.cantidad }}×</span>
                <span class="item-nombre">{{ item.nombre }}</span>
                <span class="item-tipo">{{ etiquetaTipo(item.tipo_precio) }}</span>
                <span class="item-sub">Bs {{ fmt(item.subtotal) }}</span>
              </div>
            </div>

            <div class="card-footer">
              <div class="footer-meta">
                <span class="metodo">{{ pedido.metodo_pago || '—' }}</span>
                <span class="total">Total: Bs {{ fmt(pedido.total) }}</span>
              </div>

              <div v-if="pedido._confirmando" class="confirm-row">
                <span class="confirm-label">¿Confirmar anulación?</span>
                <div class="confirm-btns">
                  <button
                    class="btn-si"
                    :disabled="pedido._anulando"
                    @click="ejecutarAnulacion(pedido)"
                  >{{ pedido._anulando ? '...' : 'Sí, anular' }}</button>
                  <button class="btn-no" @click="pedido._confirmando = false">No</button>
                </div>
              </div>

              <button
                v-else-if="pedido.estado !== 'ANULADO'"
                class="btn-anular"
                @click="pedido._confirmando = true"
              >
                Anular pedido
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['close', 'anulado'])

const API = 'https://pollocopa.62344037.xyz/api/caja'

const pedidos  = ref([])
const cargando = ref(true)
const error    = ref(null)

async function cargarHistorial() {
  cargando.value = true
  error.value    = null
  try {
    const res  = await fetch(`${API}/historial`)
    if (!res.ok) throw new Error('Error al cargar historial')
    const data = await res.json()
    pedidos.value = data.map(p => ({ ...p, _confirmando: false, _anulando: false }))
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
}

async function ejecutarAnulacion(pedido) {
  pedido._anulando = true
  try {
    const res  = await fetch(`${API}/pedidos/${pedido.id_pedido}/anular`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'No se pudo anular el pedido'); return }
    pedido.estado       = 'ANULADO'
    pedido._confirmando = false
    emit('anulado')
  } catch {
    alert('Error de conexión al anular el pedido.')
  } finally {
    pedido._anulando = false
  }
}

onMounted(cargarHistorial)

function estadoClass(estado) {
  return {
    'EN PROCESO': 'badge-proceso',
    'LISTO':      'badge-listo',
    'ENTREGADO':  'badge-entregado',
    'ANULADO':    'badge-anulado',
  }[estado] ?? 'badge-proceso'
}

function etiquetaTipo(tipo) {
  return { COMBO: 'Combo', CON_PAPA: 'Con papa', SOLO: 'Solo' }[tipo] ?? tipo
}

function fmt(val) { return Number(val ?? 0).toFixed(2) }

function formatHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.historial-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

.historial-panel {
  width: 420px;
  max-width: 100vw;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px rgba(0,0,0,0.15);
  animation: slide-in 0.22s ease;
}

@keyframes slide-in {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}

.historial-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 2px solid #F2CB05;
  flex-shrink: 0;
}

.historial-titulo {
  font-size: 16px;
  font-weight: 800;
  color: #222;
  margin: 0;
}

.btn-cerrar {
  background: #f5f5f5;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 15px;
  color: #888;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.btn-cerrar:hover { background: #eee; color: #D90B31; }

.historial-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.estado-msg {
  text-align: center;
  color: #888;
  font-size: 13px;
  font-weight: 600;
  margin-top: 40px;
}
.error-msg { color: #D90B31; }

.pedidos-lista {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pedido-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
  transition: opacity 0.2s;
}
.pedido-card.anulado { opacity: 0.55; }

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.card-id-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-ticket {
  font-size: 13px;
  font-weight: 800;
  color: #222;
}

.card-hora {
  font-size: 11px;
  color: #888;
  font-weight: 600;
}

.estado-badge {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 3px 10px;
  border-radius: 12px;
}

.badge-proceso  { background: #fff3cd; color: #856404; }
.badge-listo    { background: #d4edda; color: #1a7a3e; }
.badge-entregado{ background: #cce5ff; color: #004085; }
.badge-anulado  { background: #f8d7da; color: #721c24; }

.card-items {
  padding: 8px 14px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.item-qty   { font-weight: 800; color: #555; min-width: 22px; }
.item-nombre{ flex: 1; font-weight: 600; color: #222; }
.item-tipo  { color: #999; font-size: 11px; }
.item-sub   { font-weight: 700; color: #444; white-space: nowrap; }

.card-footer {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footer-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metodo {
  font-size: 11px;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
}

.total {
  font-size: 14px;
  font-weight: 800;
  color: #222;
}

.btn-anular {
  align-self: flex-end;
  padding: 5px 14px;
  border: 1px solid #D90B31;
  border-radius: 5px;
  background: #fff;
  color: #D90B31;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.btn-anular:hover { background: #D90B31; color: #fff; }

.confirm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff8f8;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  padding: 8px 12px;
  gap: 10px;
}

.confirm-label {
  font-size: 12px;
  font-weight: 700;
  color: #721c24;
}

.confirm-btns {
  display: flex;
  gap: 6px;
}

.btn-si {
  padding: 4px 12px;
  background: #D90B31;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-si:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-si:not(:disabled):hover { background: #b80929; }

.btn-no {
  padding: 4px 10px;
  background: #fff;
  color: #555;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.btn-no:hover { background: #f5f5f5; }
</style>
