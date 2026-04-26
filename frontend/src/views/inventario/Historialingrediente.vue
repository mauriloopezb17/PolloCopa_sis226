<script setup>
import { ref, onMounted, watch, computed } from 'vue'

const API  = 'https://pollocopa.62344037.xyz'
const emit = defineEmits(['volver', 'ir-merma', 'ir-valor'])

const ingredientes  = ref([])
const ingredienteId = ref(null)
const movimientos   = ref([])
const resumen       = ref({})
const loading       = ref(true)
const filtroTipo    = ref('')
const busqueda      = ref('')

const ingredienteActual = computed(() => ingredientes.value.find(i => i.id === ingredienteId.value) || null)
const stockBajo = computed(() =>
  resumen.value.stock_actual != null && resumen.value.stock_minimo != null &&
  Number(resumen.value.stock_actual) <= Number(resumen.value.stock_minimo)
)

const cargarIngredientes = async () => {
  const res = await fetch(`${API}/api/historial/ingredientes`)
  ingredientes.value = await res.json()
  if (ingredientes.value.length > 0) ingredienteId.value = ingredientes.value[0].id
}

const cargarDatos = async () => {
  if (!ingredienteId.value) return
  loading.value = true
  const params = new URLSearchParams()
  if (filtroTipo.value) params.append('tipo', filtroTipo.value)
  if (busqueda.value)   params.append('busqueda', busqueda.value)
  const url  = `${API}/api/historial/movimientos/${ingredienteId.value}${params.toString() ? '?' + params : ''}`
  const res  = await fetch(url)
  const data = await res.json()
  resumen.value     = data.resumen
  movimientos.value = data.movimientos
  loading.value     = false
}

const setFiltro = (v) => { filtroTipo.value = v; cargarDatos() }
let debounce = null
const onBuscar = () => { clearTimeout(debounce); debounce = setTimeout(cargarDatos, 350) }

watch(ingredienteId, cargarDatos)
onMounted(async () => { await cargarIngredientes() })
</script>

<template>
  <div class="h-wrapper">

    <div class="sub-header">
      <div class="sub-left">
        <button class="btn-volver" @click="emit('volver')">← Volver</button>
        <h2 class="sub-title">Historial de movimientos</h2>
      </div>
      <div class="sub-right">
        <div class="ing-selector">
          <label class="label-light">Ingrediente</label>
          <select class="select-pill" v-model="ingredienteId">
            <option v-for="i in ingredientes" :key="i.id" :value="i.id">{{ i.nombre }}</option>
          </select>
        </div>
        <button class="btn-nav" @click="emit('ir-merma')">Mermas</button>
        <button class="btn-nav" @click="emit('ir-valor')">Valor</button>
      </div>
    </div>

    <div class="cards">
      <div class="card card-green"><p class="card-label">Entradas totales</p><p class="card-value">{{ resumen.total_entradas ?? '—' }}</p><p class="card-unit">{{ resumen.unidad }}</p></div>
      <div class="card card-red"><p class="card-label">Salidas totales</p><p class="card-value">{{ resumen.total_salidas ?? '—' }}</p><p class="card-unit">{{ resumen.unidad }}</p></div>
      <div class="card card-yellow"><p class="card-label">Stock actual</p><p class="card-value">{{ resumen.stock_actual ?? '—' }}</p><p class="card-unit">{{ resumen.unidad }}</p></div>
      <div class="card" :class="ingredienteActual?.agotado ? 'card-alert' : stockBajo ? 'card-warn' : 'card-ok'">
        <p class="card-label">Estado</p>
        <p class="card-value card-estado">{{ ingredienteActual?.agotado ? 'Agotado' : stockBajo ? 'Stock bajo' : 'Normal' }}</p>
      </div>
    </div>

    <div v-if="Number(resumen.total_alertas) > 0" class="banner-alerta">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="banner-icon">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      {{ resumen.total_alertas }} salida(s) superan el stock minimo. Revisa las filas marcadas.
    </div>

    <section class="filtros-section">
      <h2 class="section-title">Historial</h2>
      <div class="filtros-row">
        <div class="tabs">
          <button class="tab" :class="{ 'tab-all':     filtroTipo === '' }"       @click="setFiltro('')">Todos</button>
          <button class="tab" :class="{ 'tab-entrada': filtroTipo === 'entrada' }" @click="setFiltro('entrada')">Entradas</button>
          <button class="tab" :class="{ 'tab-salida':  filtroTipo === 'salida'  }" @click="setFiltro('salida')">Salidas</button>
        </div>
        <input class="input input-buscar" v-model="busqueda" @input="onBuscar" placeholder="Buscar observacion o proveedor..." />
      </div>
    </section>

    <div v-if="loading" class="estado-carga">Cargando datos...</div>
    <div v-else class="table-wrap">
      <table v-if="movimientos.length > 0">
        <thead>
          <tr>
            <th>Fecha</th><th>Hora</th><th>Tipo</th><th>Cantidad</th>
            <th>Observacion</th><th>Lote</th><th>Proveedor</th><th>Costo unit.</th><th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in movimientos" :key="m.id" :class="{ 'row-alerta': m.es_alerta }">
            <td>{{ m.fecha }}</td>
            <td class="muted">{{ m.hora }}</td>
            <td><span :class="['badge', m.tipo === 'entrada' ? 'badge-entrada' : 'badge-salida']">{{ m.tipo === 'entrada' ? '+' : '−' }} {{ m.tipo_nombre }}</span></td>
            <td :class="m.tipo === 'entrada' ? 'qty-pos' : 'qty-neg'">{{ m.tipo === 'entrada' ? '+' : '−' }}{{ m.cantidad }} {{ m.unidad }}</td>
            <td>{{ m.observacion || '—' }}</td>
            <td class="muted">{{ m.lote || '—' }}</td>
            <td class="muted">{{ m.proveedor || '—' }}</td>
            <td class="muted">{{ m.costo_unitario != null ? m.costo_unitario : '—' }}</td>
            <td><span v-if="m.es_alerta" class="badge badge-alerta">Alerta</span><span v-else class="muted txt-sm">Normal</span></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="estado-vacio">Sin movimientos para mostrar.</div>
    </div>

  </div>
</template>

<style scoped>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.h-wrapper { padding: 24px 32px; background: #f9f9f9; min-height: 100%; font-family: 'Segoe UI', sans-serif; color: #1a1a1a; display: flex; flex-direction: column; gap: 0; }
.sub-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid #e8e8e8; margin-bottom: 20px; }
.sub-left  { display: flex; align-items: center; gap: 12px; }
.sub-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sub-title { font-size: 22px; font-weight: 900; color: #1a1a1a; letter-spacing: -0.5px; }
.btn-volver { padding: 7px 16px; background: #f0f0f0; color: #1a1a1a; border: 1.5px solid #e0e0e0; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.btn-volver:hover { background: #1a1a1a; color: #F2E205; border-color: #1a1a1a; }
.btn-nav { padding: 7px 16px; background: #fff; color: #666; border: 1.5px solid #e0e0e0; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.4px; }
.btn-nav:hover { border-color: #D90B31; color: #D90B31; }
.ing-selector { display: flex; flex-direction: column; gap: 3px; }
.label-light  { font-size: 10px; font-weight: 600; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; }
.select-pill  { height: 34px; padding: 0 12px; border-radius: 6px; border: 1.5px solid #e0e0e0; background: #fff; color: #1a1a1a; font-size: 13px; font-weight: 600; cursor: pointer; min-width: 190px; }
.select-pill:focus { outline: none; border-color: #D90B31; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); gap: 12px; margin-bottom: 1.25rem; }
.card { border-radius: 14px; padding: 1.1rem; text-align: center; }
.card-label  { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.65; margin-bottom: 6px; }
.card-value  { font-size: 28px; font-weight: 800; line-height: 1; margin-bottom: 3px; }
.card-estado { font-size: 15px; }
.card-unit   { font-size: 12px; opacity: 0.6; }
.card-green  { background: #dcfce7; color: #14532d; }
.card-red    { background: #fee2e2; color: #7f1d1d; }
.card-yellow { background: #fef9c3; color: #713f12; }
.card-ok     { background: #e0f2fe; color: #0c4a6e; }
.card-warn   { background: #fef3c7; color: #78350f; }
.card-alert  { background: #7f1d1d; color: #fde68a; }
.banner-alerta { display: flex; align-items: center; gap: 10px; background: #fef3c7; border: 1.5px solid #f59e0b; border-radius: 10px; padding: 11px 16px; margin-bottom: 1.25rem; font-size: 13px; color: #78350f; }
.banner-icon { width: 17px; height: 17px; flex-shrink: 0; }
.filtros-section { margin-bottom: 1rem; }
.filtros-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.tabs { display: flex; gap: 5px; }
.tab { height: 33px; padding: 0 15px; border-radius: 20px; border: 1.5px solid #e5e7eb; background: #fff; color: #6b7280; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; cursor: pointer; transition: all 0.14s; }
.tab:hover     { border-color: #D90B31; color: #D90B31; }
.tab-all       { background: #D90B31 !important; color: #F2E205 !important; border-color: #D90B31 !important; }
.tab-entrada   { background: #dcfce7 !important; color: #14532d !important; border-color: #86efac !important; }
.tab-salida    { background: #fee2e2 !important; color: #7f1d1d !important; border-color: #fca5a5 !important; }
.input { height: 37px; padding: 0 11px; border: 1.5px solid #e5e7eb; border-radius: 9px; font-size: 13.5px; background: #fafafa; color: #1a1a1a; transition: border-color 0.15s; }
.input:focus { outline: none; border-color: #D90B31; background: #fff; }
.input-buscar { min-width: 260px; }
.section-title { font-size: 11px; font-weight: 800; color: #D90B31; text-transform: uppercase; letter-spacing: 0.6px; padding-bottom: 8px; border-bottom: 2px solid #F2E205; display: inline-block; margin-bottom: 14px; }
.estado-carga { padding: 2rem; text-align: center; color: #9ca3af; font-size: 14px; }
.estado-vacio { padding: 2rem; text-align: center; color: #9ca3af; font-size: 14px; }
.table-wrap { background: #fff; border: 1px solid #f3f4f6; border-radius: 12px; overflow: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 1.5rem; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th { padding: 10px 13px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #F2E205; background: #D90B31; }
thead th:first-child { border-radius: 12px 0 0 0; }
thead th:last-child  { border-radius: 0 12px 0 0; }
tbody td { padding: 9px 13px; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
tbody tr:last-child td { border-bottom: none; }
tbody tr:hover td      { background: #fff8e1; }
tbody tr.row-alerta td { background: #fff7ed; }
.badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.badge-entrada { background: #dcfce7; color: #14532d; }
.badge-salida  { background: #fee2e2; color: #7f1d1d; }
.badge-alerta  { background: #fef3c7; color: #78350f; }
.qty-pos { color: #14532d; font-weight: 700; }
.qty-neg { color: #7f1d1d; font-weight: 700; }
.muted   { color: #9ca3af; }
.txt-sm  { font-size: 12px; }
</style>