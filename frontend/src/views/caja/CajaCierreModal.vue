<template>
  <Teleport to="body">
    <div v-if="show" class="overlay" @click.self="!cerrando && $emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h2>Cierre de Caja</h2>
          <button class="btn-close" :disabled="cerrando" @click="$emit('close')">✕</button>
        </div>

        <div v-if="cargando" class="estado-msg">Cargando resumen del turno...</div>
        <div v-else-if="errorMsg && !resumen" class="estado-msg error">{{ errorMsg }}</div>

        <template v-else-if="resumen">
          <div class="modal-body">
            <!-- Info del turno -->
            <div class="info-turno">
              <div class="info-row">
                <span class="label">Apertura</span>
                <span class="value">{{ formatFecha(resumen.apertura) }}</span>
              </div>
              <div class="info-row">
                <span class="label">Monto apertura</span>
                <span class="value">Bs {{ fmt(resumen.monto_apertura) }}</span>
              </div>
            </div>

            <!-- Desglose por método de pago -->
            <div class="seccion">
              <h3 class="seccion-titulo">Ventas del turno</h3>
              <div v-if="resumen.ventas_por_metodo.length === 0" class="sin-ventas">
                Sin ventas registradas en este turno.
              </div>
              <table v-else class="tabla-ventas">
                <thead>
                  <tr>
                    <th>Método</th>
                    <th class="num">Pagos</th>
                    <th class="num">Cobrado</th>
                    <th class="num">Cambio</th>
                    <th class="num">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="v in resumen.ventas_por_metodo" :key="v.metodo">
                    <td>{{ v.metodo }}</td>
                    <td class="num">{{ v.cantidad_pagos }}</td>
                    <td class="num">Bs {{ fmt(v.total_pagado) }}</td>
                    <td class="num">Bs {{ fmt(v.total_cambio) }}</td>
                    <td class="num bold">Bs {{ fmt(v.total_neto) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="4" class="total-label">Total neto vendido</td>
                    <td class="num bold accent">Bs {{ fmt(resumen.total_neto_turno) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Totales sistema -->
            <div class="resumen-sistema">
              <div class="resumen-row">
                <span>Apertura</span>
                <span>Bs {{ fmt(resumen.monto_apertura) }}</span>
              </div>
              <div class="resumen-row">
                <span>+ Ventas netas</span>
                <span>Bs {{ fmt(resumen.total_neto_turno) }}</span>
              </div>
              <div class="resumen-row total-sistema">
                <span>Total sistema</span>
                <span>Bs {{ fmt(resumen.total_calculado) }}</span>
              </div>
            </div>

            <!-- Monto físico -->
            <div class="seccion-montos">
              <!-- EFECTIVO -->
              <div class="seccion single-col">
                <div class="label-with-theoretical">
                  <label class="campo-label">Efectivo físico en caja</label>
                  <span class="theoretical-hint">Sistema: Bs {{ fmt(resumen.total_efectivo_teorico) }}</span>
                </div>
                <div class="input-wrap">
                  <span class="prefix">Bs</span>
                  <input
                    v-model.number="montoEfectivo"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    class="input-monto"
                    :disabled="cerrando"
                  />
                </div>
                <div
                  v-if="montoEfectivo !== null && montoEfectivo !== ''"
                  class="diferencia"
                  :class="{ negativa: diffEfectivo < 0, cero: diffEfectivo === 0 }"
                >
                  Dif. Efectivo: Bs {{ fmt(Math.abs(diffEfectivo)) }}
                  <span v-if="diffEfectivo > 0">&nbsp;(sobrante)</span>
                  <span v-else-if="diffEfectivo < 0">&nbsp;(faltante)</span>
                </div>
              </div>
            </div>

            <!-- Total General y Diferencia Total -->
            <div class="total-cierre-resumen">
              <div class="resumen-row">
                <span>Total contado en caja</span>
                <span class="bold">Bs {{ fmt(montoTotalReportado) }}</span>
              </div>
              <div
                v-if="montoTotalReportado > 0"
                class="diferencia total-diff"
                :class="{ negativa: diferenciaTotal < 0, cero: diferenciaTotal === 0 }"
              >
                Diferencia Total: Bs {{ fmt(Math.abs(diferenciaTotal)) }}
                <span v-if="diferenciaTotal > 0">&nbsp;(sobrante)</span>
                <span v-else-if="diferenciaTotal < 0">&nbsp;(faltante)</span>
                <span v-else>&nbsp;(cuadrado)</span>
              </div>
            </div>

            <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
          </div>

          <div class="modal-footer">
            <button class="btn-cancelar" :disabled="cerrando" @click="$emit('close')">
              Cancelar
            </button>
            <button
              class="btn-cerrar"
              :disabled="!puedeConfirmar || cerrando"
              @click="confirmarCierre"
            >
              {{ cerrando ? 'Cerrando...' : 'Confirmar cierre' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
})

const emit = defineEmits(['close', 'cerrado'])

const API = 'http://localhost:3000/api/caja'

const cargando           = ref(false)
const cerrando           = ref(false)
const errorMsg           = ref(null)
const resumen            = ref(null)
const montoEfectivo      = ref(null)

watch(() => props.show, async (visible) => {
  if (!visible) return
  montoEfectivo.value      = null
  errorMsg.value           = null
  resumen.value            = null
  await cargarResumen()
})

async function cargarResumen() {
  cargando.value = true
  try {
    const res  = await fetch(`${API}/turno-actual`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al cargar el turno')
    resumen.value = data
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    cargando.value = false
  }
}

const montoTotalReportado = computed(() => {
  const efec = Number(montoEfectivo.value || 0)
  const digital = Number(resumen.value?.total_transferencia_teorico || 0)
  return efec + digital
})

const diffEfectivo = computed(() => {
  if (!resumen.value || montoEfectivo.value === null || montoEfectivo.value === '') return 0
  return Number(montoEfectivo.value) - resumen.value.total_efectivo_teorico
})

const diferenciaTotal = computed(() => {
  if (!resumen.value) return 0
  // La diferencia solo viene del efectivo, ya que digital se asume correcto
  return diffEfectivo.value
})

const puedeConfirmar = computed(() =>
  resumen.value !== null &&
  montoEfectivo.value !== null && montoEfectivo.value !== ''
)

async function confirmarCierre() {
  if (!puedeConfirmar.value || cerrando.value) return
  cerrando.value = true
  errorMsg.value = null
  try {
    const res  = await fetch(`${API}/cierre`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ 
        monto_cierre_efectivo:    Number(montoEfectivo.value),
        monto_cierre_transaccion: Number(resumen.value.total_transferencia_teorico)
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'No se pudo cerrar el turno')
    emit('cerrado', data.turno)
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    cerrando.value = false
  }
}

function fmt(val) {
  return Number(val ?? 0).toFixed(2)
}

function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 10px;
  width: 560px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 2px solid #F2CB05;
  flex-shrink: 0;
}

.modal-header h2 {
  font-size: 17px;
  font-weight: 800;
  color: #222;
}

.btn-close {
  background: none;
  border: none;
  font-size: 16px;
  color: #aaa;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
.btn-close:hover:not(:disabled) { color: #D90B31; }
.btn-close:disabled { opacity: 0.4; cursor: not-allowed; }

.estado-msg {
  padding: 48px 22px;
  text-align: center;
  font-size: 14px;
  color: #888;
  font-weight: 600;
}
.estado-msg.error { color: #D90B31; }

.modal-body {
  overflow-y: auto;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Turno info */
.info-turno {
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.info-row { display: flex; justify-content: space-between; font-size: 13px; }
.info-row .label { color: #888; font-weight: 600; }
.info-row .value { color: #222; font-weight: 700; }

/* Secciones */
.seccion { display: flex; flex-direction: column; gap: 8px; }
.seccion-titulo {
  font-size: 12px;
  font-weight: 800;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.sin-ventas { font-size: 13px; color: #bbb; font-style: italic; }

/* Tabla */
.tabla-ventas {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.tabla-ventas th {
  text-align: left;
  color: #aaa;
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 4px 8px 8px;
  border-bottom: 2px solid #f0f0f0;
}
.tabla-ventas td {
  padding: 7px 8px;
  border-bottom: 1px solid #f5f5f5;
  color: #333;
}
.tabla-ventas tfoot td {
  padding-top: 8px;
  border-top: 2px solid #eee;
  border-bottom: none;
}
.tabla-ventas .num { text-align: right; }
.tabla-ventas .bold { font-weight: 800; }
.tabla-ventas .total-label { color: #555; font-weight: 700; }
.tabla-ventas .accent { color: #D90B31; }

/* Resumen sistema */
.resumen-sistema {
  background: #fffbea;
  border: 1px solid #F2CB05;
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.resumen-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #777;
}
.total-sistema {
  font-size: 15px;
  font-weight: 800;
  color: #222;
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px solid #F2CB05;
}

/* Input monto cierre */
.campo-label { font-size: 13px; font-weight: 700; color: #444; }
.input-wrap {
  display: flex;
  align-items: center;
  border: 1.5px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.15s;
}
.input-wrap:focus-within { border-color: #D90B31; }
.prefix {
  padding: 0 12px;
  background: #f5f5f5;
  font-size: 13px;
  font-weight: 700;
  color: #888;
  border-right: 1px solid #ddd;
  height: 40px;
  display: flex;
  align-items: center;
}
.input-monto {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  font-weight: 700;
  padding: 0 12px;
  height: 40px;
  color: #222;
}

.seccion-montos {
  display: block;
}
.single-col { width: 100%; }

.label-with-theoretical {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 4px;
}

.theoretical-hint {
  font-size: 11px;
  color: #999;
  font-weight: 600;
}

.total-cierre-resumen {
  margin-top: 8px;
  padding: 12px 16px;
  background: #f8f8f8;
  border-radius: 8px;
  border: 1px dashed #ddd;
}

.total-diff {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid #eee;
  text-align: right;
}

.diferencia {
  font-size: 12px;
  font-weight: 700;
  color: #2a9d5c;
  margin-top: 4px;
}
.diferencia.negativa { color: #D90B31; }
.diferencia.cero { color: #2a9d5c; }

.error-msg {
  font-size: 13px;
  color: #D90B31;
  font-weight: 600;
  background: rgba(217, 11, 49, 0.07);
  border-radius: 6px;
  padding: 8px 12px;
}

/* Footer */
.modal-footer {
  display: flex;
  gap: 10px;
  padding: 16px 22px;
  border-top: 1px solid #eee;
  flex-shrink: 0;
}
.btn-cancelar,
.btn-cerrar {
  flex: 1;
  padding: 10px 0;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  transition: background 0.15s, opacity 0.15s;
}
.btn-cancelar {
  background: #fff;
  border: 1px solid #ddd;
  color: #666;
}
.btn-cancelar:hover:not(:disabled) { background: #f5f5f5; }
.btn-cerrar {
  background: #D90B31;
  border: 1px solid #D90B31;
  color: #F2CB05;
}
.btn-cerrar:hover:not(:disabled) { background: #b80929; }
.btn-cerrar:disabled,
.btn-cancelar:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
