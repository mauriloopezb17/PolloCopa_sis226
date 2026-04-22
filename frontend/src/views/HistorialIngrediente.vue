<script setup>
import { ref, onMounted, watch, computed } from 'vue'

const API = import.meta.env.VITE_API_URL

// ── Datos desde BD ──────────────────────────────────────────────────────────
const ingredientes     = ref([])
const tiposMovimiento  = ref([])
const proveedores      = ref([])

// ── Selección activa ─────────────────────────────────────────────────────────
const ingredienteId    = ref(null)

// ── Historial ────────────────────────────────────────────────────────────────
const movimientos      = ref([])
const resumen          = ref({})
const loading          = ref(true)

// ── Filtros ──────────────────────────────────────────────────────────────────
const filtroTipo       = ref('')       // 'entrada' | 'salida' | ''
const busqueda         = ref('')

// ── Formulario ───────────────────────────────────────────────────────────────
const fIdTipo          = ref(null)
const fCantidad        = ref('')
const fMotivo          = ref('')
const fObservacion     = ref('')
const fLote            = ref('')
const fCostoUnitario   = ref('')
const fIdProveedor     = ref(null)

// ── Computed: ingrediente seleccionado ────────────────────────────────────────
const ingredienteActual = computed(() =>
  ingredientes.value.find(i => i.id === ingredienteId.value) || null
)

// ── Carga inicial ─────────────────────────────────────────────────────────────
const cargarIngredientes = async () => {
  const res = await fetch(`${API}/inventario/ingredientes`)
  ingredientes.value = await res.json()
  if (ingredientes.value.length > 0) {
    ingredienteId.value = ingredientes.value[0].id
  }
}

const cargarTipos = async () => {
  const res = await fetch(`${API}/inventario/tipos-movimiento`)
  tiposMovimiento.value = await res.json()
  if (tiposMovimiento.value.length > 0) {
    fIdTipo.value = tiposMovimiento.value[0].id
  }
}

const cargarProveedores = async () => {
  const res = await fetch(`${API}/inventario/proveedores`)
  proveedores.value = await res.json()
}

// ── Historial ─────────────────────────────────────────────────────────────────
const cargarDatos = async () => {
  if (!ingredienteId.value) return
  loading.value = true
  const params = new URLSearchParams()
  if (filtroTipo.value) params.append('tipo', filtroTipo.value)
  if (busqueda.value)   params.append('busqueda', busqueda.value)
  let url = `${API}/inventario/movimientos/${ingredienteId.value}`
  if (params.toString()) url += `?${params.toString()}`
  const res  = await fetch(url)
  const data = await res.json()
  resumen.value    = data.resumen
  movimientos.value = data.movimientos
  loading.value    = false
}

// ── Registrar movimiento ──────────────────────────────────────────────────────
const registrarMovimiento = async () => {
  if (!fCantidad.value || !fMotivo.value || !fIdTipo.value) {
    alert('Completa los campos: tipo, cantidad y motivo')
    return
  }
  await fetch(`${API}/inventario/movimientos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_insumo:          ingredienteId.value,
      id_tipo_movimiento: fIdTipo.value,
      cantidad:           Number(fCantidad.value),
      motivo:             fMotivo.value,
      observacion:        fObservacion.value || null,
      lote:               fLote.value        || null,
      costo_unitario:     fCostoUnitario.value ? Number(fCostoUnitario.value) : null,
      id_proveedor:       fIdProveedor.value  || null,
    })
  })
  // Limpiar form
  fCantidad.value      = ''
  fMotivo.value        = ''
  fObservacion.value   = ''
  fLote.value          = ''
  fCostoUnitario.value = ''
  fIdProveedor.value   = null
  // Refrescar
  await cargarIngredientes()
  cargarDatos()
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const setFiltro = (valor) => {
  filtroTipo.value = valor
  cargarDatos()
}

let debounce = null
const onBuscar = () => {
  clearTimeout(debounce)
  debounce = setTimeout(cargarDatos, 350)
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
watch(ingredienteId, cargarDatos)

onMounted(async () => {
  await Promise.all([cargarIngredientes(), cargarTipos(), cargarProveedores()])
})
</script>

<template>
  <div class="page">

    <!-- HEADER -->
    <header class="header">
      <div class="header-inner">
        <div class="logo-wrap">
          <span class="logo-icon">🍗</span>
          <div>
            <h1 class="header-title">Inventario Pollos Copacabana</h1>
            <p class="header-sub">Control de ingresos y salidas de ingredientes</p>
          </div>
        </div>
        <div class="selector-wrap">
          <label class="field-label-light">Ingrediente</label>
          <select class="select-pill" v-model="ingredienteId">
            <option v-for="i in ingredientes" :key="i.id" :value="i.id">
              {{ i.nombre }}
            </option>
          </select>
        </div>
      </div>
    </header>

    <main class="main">

      <!-- CARDS -->
      <div class="cards">
        <div class="card card-green">
          <p class="card-label">Entradas totales</p>
          <p class="card-value">{{ resumen.total_entradas ?? '—' }}</p>
          <p class="card-unit">{{ resumen.unidad }}</p>
        </div>
        <div class="card card-red">
          <p class="card-label">Salidas totales</p>
          <p class="card-value">{{ resumen.total_salidas ?? '—' }}</p>
          <p class="card-unit">{{ resumen.unidad }}</p>
        </div>
        <div class="card card-yellow">
          <p class="card-label">Stock actual</p>
          <p class="card-value">{{ resumen.stock_actual ?? '—' }}</p>
          <p class="card-unit">{{ resumen.unidad }}</p>
        </div>
        <div class="card" :class="ingredienteActual?.agotado || resumen.stock_actual <= resumen.stock_minimo ? 'card-alert' : 'card-ok'">
          <p class="card-label">Estado</p>
          <p class="card-value">{{ ingredienteActual?.agotado || resumen.stock_actual <= resumen.stock_minimo ? '⚠️' : '✓' }}</p>
          <p class="card-unit">{{ ingredienteActual?.agotado ? 'Agotado' : resumen.stock_actual <= resumen.stock_minimo ? 'Stock bajo' : 'Normal' }}</p>
        </div>
      </div>

      <!-- ALERTA STOCK BAJO -->
      <div v-if="resumen.total_alertas > 0" class="alerta-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;flex-shrink:0">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>{{ resumen.total_alertas }} salida(s) superan el stock mínimo del ingrediente. Revisa las filas marcadas.</span>
      </div>

      <!-- FORM -->
      <section class="form-section">
        <h2 class="section-title">Registrar movimiento</h2>
        <div class="form-grid">

          <div class="field">
            <label class="field-label">Tipo de movimiento *</label>
            <select class="input" v-model="fIdTipo">
              <option v-for="t in tiposMovimiento" :key="t.id" :value="t.id">
                {{ t.nombre }}
              </option>
            </select>
          </div>

          <div class="field">
            <label class="field-label">Cantidad *</label>
            <input class="input" v-model="fCantidad" type="number" placeholder="0" min="0.001" step="0.001" />
          </div>

          <div class="field field-wide">
            <label class="field-label">Motivo *</label>
            <input class="input" v-model="fMotivo" placeholder="Ej: Compra semanal proveedor" />
          </div>

          <div class="field">
            <label class="field-label">Proveedor</label>
            <select class="input" v-model="fIdProveedor">
              <option :value="null">— ninguno —</option>
              <option v-for="p in proveedores" :key="p.id" :value="p.id">
                {{ p.nombre }}
              </option>
            </select>
          </div>

          <div class="field">
            <label class="field-label">Costo unitario</label>
            <input class="input" v-model="fCostoUnitario" type="number" placeholder="0.00" min="0" step="0.01" />
          </div>

          <div class="field">
            <label class="field-label">Lote</label>
            <input class="input" v-model="fLote" placeholder="Ej: L-2025-04" />
          </div>

          <div class="field field-wide">
            <label class="field-label">Observación</label>
            <input class="input" v-model="fObservacion" placeholder="Notas adicionales..." />
          </div>

          <div class="field field-btn">
            <button class="btn-guardar" @click="registrarMovimiento">Guardar</button>
          </div>

        </div>
      </section>

      <!-- FILTROS -->
      <section class="filtros-section">
        <h2 class="section-title">Historial</h2>
        <div class="filtros-row">
          <div class="filter-tabs">
            <button class="filter-tab" :class="{ 'tab-active': filtroTipo === '' }"        @click="setFiltro('')">Todos</button>
            <button class="filter-tab" :class="{ 'tab-active-entrada': filtroTipo === 'entrada' }" @click="setFiltro('entrada')">Entradas</button>
            <button class="filter-tab" :class="{ 'tab-active-salida':  filtroTipo === 'salida'  }" @click="setFiltro('salida')">Salidas</button>
          </div>
          <input class="input input-search" v-model="busqueda" @input="onBuscar" placeholder="Buscar motivo, observación o proveedor..." />
        </div>
      </section>

      <!-- TABLA -->
      <div v-if="loading" class="loading">Cargando datos...</div>

      <div v-else class="table-wrap">
        <table v-if="movimientos.length > 0">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Motivo</th>
              <th>Lote</th>
              <th>Proveedor</th>
              <th>Costo unit.</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in movimientos" :key="m.id" :class="m.es_alerta ? 'row-alerta' : ''">
              <td>{{ m.fecha }}</td>
              <td class="muted">{{ m.hora }}</td>
              <td>
                <span :class="['badge', m.tipo === 'entrada' ? 'badge-entrada' : 'badge-salida']">
                  {{ m.tipo === 'entrada' ? '+ ' : '− ' }}{{ m.tipo_nombre }}
                </span>
              </td>
              <td :class="m.tipo === 'entrada' ? 'qty-pos' : 'qty-neg'">
                {{ m.tipo === 'entrada' ? '+' : '−' }}{{ m.cantidad }} {{ m.unidad }}
              </td>
              <td>{{ m.motivo }}</td>
              <td class="muted">{{ m.lote || '—' }}</td>
              <td class="muted">{{ m.proveedor || '—' }}</td>
              <td class="muted">{{ m.costo_unitario != null ? m.costo_unitario : '—' }}</td>
              <td>
                <span v-if="m.es_alerta" class="badge badge-alerta">alerta</span>
                <span v-else class="muted estado-normal">normal</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty">Sin movimientos para mostrar.</div>
      </div>

    </main>
  </div>
</template>

<style scoped>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.page { min-height: 100vh; background: #fdf6ec; font-family: 'Segoe UI', sans-serif; color: #1a1a1a; }

/* HEADER */
.header { background: #b91c1c; padding: 1.25rem 2rem; box-shadow: 0 2px 10px rgba(0,0,0,0.18); }
.header-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
.logo-wrap { display: flex; align-items: center; gap: 14px; }
.logo-icon  { font-size: 38px; }
.header-title { font-size: 22px; font-weight: 700; color: #fde68a; letter-spacing: -0.3px; }
.header-sub   { font-size: 13px; color: #fca5a5; margin-top: 2px; }
.selector-wrap { display: flex; flex-direction: column; gap: 5px; }
.field-label-light { font-size: 11px; font-weight: 600; color: #fca5a5; text-transform: uppercase; letter-spacing: 0.5px; }
.select-pill { height: 38px; padding: 0 16px; border-radius: 20px; border: 1.5px solid #fde68a; background: #7f1d1d; color: #fde68a; font-size: 14px; font-weight: 600; cursor: pointer; min-width: 220px; }
.select-pill:focus { outline: none; box-shadow: 0 0 0 2px #fde68a; }

/* MAIN */
.main { max-width: 1100px; margin: 0 auto; padding: 2rem; }

/* CARDS */
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 1.5rem; }
.card { border-radius: 16px; padding: 1.2rem; text-align: center; }
.card-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.65; margin-bottom: 8px; }
.card-value { font-size: 30px; font-weight: 800; line-height: 1; margin-bottom: 4px; }
.card-unit  { font-size: 13px; opacity: 0.6; }
.card-green  { background: #dcfce7; color: #14532d; }
.card-red    { background: #fee2e2; color: #7f1d1d; }
.card-yellow { background: #fef9c3; color: #713f12; }
.card-ok     { background: #e0f2fe; color: #0c4a6e; }
.card-alert  { background: #7f1d1d; color: #fde68a; }

/* ALERTA */
.alerta-box { display: flex; align-items: center; gap: 10px; background: #fef3c7; border: 1.5px solid #f59e0b; border-radius: 10px; padding: 12px 16px; margin-bottom: 1.5rem; font-size: 13px; color: #78350f; }

/* SECTION TITLE */
.section-title { font-size: 13px; font-weight: 700; color: #b91c1c; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid #fde68a; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px; }

/* FORM */
.form-section { background: #fff; border: 1.5px solid #fde68a; border-radius: 18px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 2px 12px rgba(185,28,28,0.07); }
.form-grid { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; }
.field { display: flex; flex-direction: column; gap: 6px; min-width: 140px; }
.field-wide { flex: 2; min-width: 200px; }
.field-btn  { justify-content: flex-end; }
.field-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }

.input { height: 38px; padding: 0 12px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 14px; background: #fafafa; color: #1a1a1a; transition: border-color 0.15s; }
.input:focus { outline: none; border-color: #b91c1c; background: #fff; }
.input-search { min-width: 260px; }

.btn-guardar { height: 38px; padding: 0 28px; background: #b91c1c; color: #fde68a; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; letter-spacing: 0.3px; transition: background 0.15s, transform 0.1s; box-shadow: 0 2px 8px rgba(185,28,28,0.25); }
.btn-guardar:hover  { background: #991b1b; }
.btn-guardar:active { transform: scale(0.97); }

/* FILTROS */
.filtros-section { margin-bottom: 1rem; }
.filtros-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.filter-tabs { display: flex; gap: 6px; }
.filter-tab { height: 34px; padding: 0 16px; border-radius: 20px; border: 1.5px solid #e5e7eb; background: #fff; color: #6b7280; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.filter-tab:hover        { border-color: #b91c1c; color: #b91c1c; }
.tab-active              { background: #b91c1c !important; color: #fde68a !important; border-color: #b91c1c !important; }
.tab-active-entrada      { background: #dcfce7 !important; color: #14532d !important; border-color: #86efac !important; }
.tab-active-salida       { background: #fee2e2 !important; color: #7f1d1d !important; border-color: #fca5a5 !important; }

/* TABLA */
.loading { padding: 2rem; text-align: center; color: #9ca3af; font-size: 14px; }
.empty   { padding: 2rem; text-align: center; color: #9ca3af; font-size: 14px; }

.table-wrap { background: #fff; border: 1px solid #f3f4f6; border-radius: 16px; overflow: auto; box-shadow: 0 2px 12px rgba(0,0,0,0.05); }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th { padding: 11px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #fde68a; background: #b91c1c; }
thead th:first-child { border-radius: 16px 0 0 0; }
thead th:last-child  { border-radius: 0 16px 0 0; }
tbody td { padding: 10px 14px; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
tbody tr:last-child td { border-bottom: none; }
tbody tr:hover td      { background: #fef9c3; }
tbody tr.row-alerta td { background: #fff7ed; }

.badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.badge-entrada { background: #dcfce7; color: #14532d; }
.badge-salida  { background: #fee2e2; color: #7f1d1d; }
.badge-alerta  { background: #fef3c7; color: #78350f; }

.qty-pos { color: #14532d; font-weight: 700; }
.qty-neg { color: #7f1d1d; font-weight: 700; }
.muted   { color: #9ca3af; }
.estado-normal { font-size: 12px; }
</style>