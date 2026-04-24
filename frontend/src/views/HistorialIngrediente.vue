<script setup>
import { ref, onMounted, watch, computed } from 'vue'

const API = import.meta.env.VITE_API_URL

const ingredientes    = ref([])
const tiposMovimiento = ref([])
const proveedores     = ref([])

const ingredienteId   = ref(null)
const movimientos     = ref([])
const resumen         = ref({})
const loading         = ref(true)

const filtroTipo      = ref('')
const busqueda        = ref('')

const fIdTipo         = ref(null)
const fCantidad       = ref('')
const fMotivo         = ref('')
const fObservacion    = ref('')
const fLote           = ref('')
const fCostoUnitario  = ref('')
const fIdProveedor    = ref(null)

const ingredienteActual = computed(() =>
  ingredientes.value.find(i => i.id === ingredienteId.value) || null
)

const stockBajo = computed(() =>
  resumen.value.stock_actual != null &&
  resumen.value.stock_minimo != null &&
  Number(resumen.value.stock_actual) <= Number(resumen.value.stock_minimo)
)

const cargarIngredientes = async () => {
  const res = await fetch(`${API}/api/inventario/ingredientes`)
  ingredientes.value = await res.json()
  if (ingredientes.value.length > 0) ingredienteId.value = ingredientes.value[0].id
}

const cargarTipos = async () => {
  const res = await fetch(`${API}/api/inventario/tipos-movimiento`)
  tiposMovimiento.value = await res.json()
  if (tiposMovimiento.value.length > 0) fIdTipo.value = tiposMovimiento.value[0].id
}

const cargarProveedores = async () => {
  const res = await fetch(`${API}/api/inventario/proveedores`)
  proveedores.value = await res.json()
}

const cargarDatos = async () => {
  if (!ingredienteId.value) return
  loading.value = true
  const params = new URLSearchParams()
  if (filtroTipo.value) params.append('tipo', filtroTipo.value)
  if (busqueda.value)   params.append('busqueda', busqueda.value)
  const url = `${API}/api/inventario/movimientos/${ingredienteId.value}${params.toString() ? '?' + params : ''}`
  const res  = await fetch(url)
  const data = await res.json()
  resumen.value     = data.resumen
  movimientos.value = data.movimientos
  loading.value     = false
}

const registrarMovimiento = async () => {
  if (!fCantidad.value || !fMotivo.value || !fIdTipo.value) {
    alert('Completa: tipo, cantidad y motivo')
    return
  }
  const res = await fetch(`${API}/api/inventario/movimientos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_insumo:          ingredienteId.value,
      id_tipo_movimiento: fIdTipo.value,
      cantidad:           Number(fCantidad.value),
      motivo:             fMotivo.value,
      observacion:        fObservacion.value   || null,
      lote:               fLote.value          || null,
      costo_unitario:     fCostoUnitario.value ? Number(fCostoUnitario.value) : null,
      id_proveedor:       fIdProveedor.value   || null,
    })
  })
  if (!res.ok) {
    const err = await res.json()
    alert(err.error || 'Error al guardar')
    return
  }
  fCantidad.value = fMotivo.value = fObservacion.value = fLote.value = fCostoUnitario.value = ''
  fIdProveedor.value = null
  await cargarIngredientes()
  cargarDatos()
}

const setFiltro = (v) => { filtroTipo.value = v; cargarDatos() }

let debounce = null
const onBuscar = () => { clearTimeout(debounce); debounce = setTimeout(cargarDatos, 350) }

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
        <div class="ing-selector">
          <label class="label-light">Ingrediente</label>
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
        <div class="card" :class="ingredienteActual?.agotado ? 'card-alert' : stockBajo ? 'card-warn' : 'card-ok'">
          <p class="card-label">Estado</p>
          <p class="card-value">{{ ingredienteActual?.agotado ? '🚫' : stockBajo ? '⚠️' : '✓' }}</p>
          <p class="card-unit">{{ ingredienteActual?.agotado ? 'Agotado' : stockBajo ? 'Stock bajo' : 'Normal' }}</p>
        </div>
      </div>

      <!-- BANNER ALERTA -->
      <div v-if="Number(resumen.total_alertas) > 0" class="banner-alerta">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="banner-icon">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        {{ resumen.total_alertas }} salida(s) superan el stock mínimo. Revisa las filas marcadas.
      </div>

      <!-- FORMULARIO -->
      <section class="card-section">
        <h2 class="section-title">Registrar movimiento</h2>
        <div class="form-grid">

          <div class="field">
            <label class="field-label">Tipo *</label>
            <select class="input" v-model="fIdTipo">
              <option v-for="t in tiposMovimiento" :key="t.id" :value="t.id">
                {{ t.nombre }}
              </option>
            </select>
          </div>

          <div class="field">
            <label class="field-label">Cantidad *</label>
            <input class="input" v-model="fCantidad" type="number" placeholder="0.000" min="0.001" step="0.001" />
          </div>

          <div class="field field-wide">
            <label class="field-label">Motivo *</label>
            <input class="input" v-model="fMotivo" placeholder="Ej: Compra semanal" />
          </div>

          <div class="field">
            <label class="field-label">Proveedor</label>
            <select class="input" v-model="fIdProveedor">
              <option :value="null">— ninguno —</option>
              <option v-for="p in proveedores" :key="p.id" :value="p.id">{{ p.nombre }}</option>
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

          <div class="field field-action">
            <button class="btn-guardar" @click="registrarMovimiento">Guardar</button>
          </div>

        </div>
      </section>

      <!-- HISTORIAL -->
      <section class="historial-section">
        <h2 class="section-title">Historial</h2>
        <div class="filtros-row">
          <div class="tabs">
            <button class="tab" :class="{ 'tab-all': filtroTipo === '' }"          @click="setFiltro('')">Todos</button>
            <button class="tab" :class="{ 'tab-entrada': filtroTipo === 'entrada' }" @click="setFiltro('entrada')">Entradas</button>
            <button class="tab" :class="{ 'tab-salida':  filtroTipo === 'salida'  }" @click="setFiltro('salida')">Salidas</button>
          </div>
          <input class="input input-buscar" v-model="busqueda" @input="onBuscar" placeholder="Buscar motivo, observación o proveedor..." />
        </div>
      </section>

      <div v-if="loading" class="estado-carga">Cargando datos...</div>

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
            <tr v-for="m in movimientos" :key="m.id" :class="{ 'row-alerta': m.es_alerta }">
              <td>{{ m.fecha }}</td>
              <td class="muted">{{ m.hora }}</td>
              <td>
                <span :class="['badge', m.tipo === 'entrada' ? 'badge-entrada' : 'badge-salida']">
                  {{ m.tipo === 'entrada' ? '+' : '−' }} {{ m.tipo_nombre }}
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
                <span v-if="m.es_alerta" class="badge badge-alerta">⚠ alerta</span>
                <span v-else class="muted txt-sm">normal</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="estado-vacio">Sin movimientos para mostrar.</div>
      </div>

    </main>
  </div>
</template>

<style scoped>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.page { min-height: 100vh; background: #fdf6ec; font-family: 'Segoe UI', sans-serif; color: #1a1a1a; }

/* ── HEADER ── */
.header {
  background: #b91c1c;
  padding: 1.1rem 2rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  position: sticky;
  top: 0;
  z-index: 10;
}
.header-inner {
  max-width: 1100px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;
}
.logo-wrap { display: flex; align-items: center; gap: 12px; }
.logo-icon  { font-size: 36px; }
.header-title { font-size: 20px; font-weight: 700; color: #fde68a; letter-spacing: -0.3px; }
.header-sub   { font-size: 12px; color: #fca5a5; margin-top: 2px; }

.ing-selector { display: flex; flex-direction: column; gap: 4px; }
.label-light  { font-size: 11px; font-weight: 600; color: #fca5a5; text-transform: uppercase; letter-spacing: 0.5px; }
.select-pill {
  height: 36px; padding: 0 16px; border-radius: 20px;
  border: 1.5px solid #fde68a; background: #7f1d1d; color: #fde68a;
  font-size: 14px; font-weight: 600; cursor: pointer; min-width: 210px;
}
.select-pill:focus { outline: none; box-shadow: 0 0 0 2px #fde68a; }

/* ── MAIN ── */
.main { max-width: 1100px; margin: 0 auto; padding: 1.75rem 2rem; }

/* ── CARDS ── */
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); gap: 12px; margin-bottom: 1.25rem; }
.card { border-radius: 14px; padding: 1.1rem; text-align: center; }
.card-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.65; margin-bottom: 6px; }
.card-value { font-size: 28px; font-weight: 800; line-height: 1; margin-bottom: 3px; }
.card-unit  { font-size: 12px; opacity: 0.6; }
.card-green  { background: #dcfce7; color: #14532d; }
.card-red    { background: #fee2e2; color: #7f1d1d; }
.card-yellow { background: #fef9c3; color: #713f12; }
.card-ok     { background: #e0f2fe; color: #0c4a6e; }
.card-warn   { background: #fef3c7; color: #78350f; }
.card-alert  { background: #7f1d1d; color: #fde68a; }

/* ── BANNER ── */
.banner-alerta {
  display: flex; align-items: center; gap: 10px;
  background: #fef3c7; border: 1.5px solid #f59e0b; border-radius: 10px;
  padding: 11px 16px; margin-bottom: 1.25rem; font-size: 13px; color: #78350f;
}
.banner-icon { width: 17px; height: 17px; flex-shrink: 0; }

/* ── CARD SECTION ── */
.card-section {
  background: #fff; border: 1.5px solid #fde68a; border-radius: 16px;
  padding: 1.4rem; margin-bottom: 1.75rem;
  box-shadow: 0 2px 10px rgba(185,28,28,0.07);
}
.section-title {
  font-size: 12px; font-weight: 700; color: #b91c1c;
  text-transform: uppercase; letter-spacing: 0.6px;
  padding-bottom: 8px; border-bottom: 2px solid #fde68a;
  display: inline-block; margin-bottom: 14px;
}

/* ── FORM ── */
.form-grid { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
.field { display: flex; flex-direction: column; gap: 5px; min-width: 138px; }
.field-wide   { flex: 2; min-width: 200px; }
.field-action { justify-content: flex-end; }
.field-label  { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }

.input {
  height: 37px; padding: 0 11px;
  border: 1.5px solid #e5e7eb; border-radius: 9px;
  font-size: 13.5px; background: #fafafa; color: #1a1a1a;
  transition: border-color 0.15s;
}
.input:focus { outline: none; border-color: #b91c1c; background: #fff; }
.input-buscar { min-width: 260px; }

.btn-guardar {
  height: 37px; padding: 0 26px;
  background: #b91c1c; color: #fde68a;
  border: none; border-radius: 9px;
  font-size: 13.5px; font-weight: 700; cursor: pointer;
  box-shadow: 0 2px 8px rgba(185,28,28,0.22);
  transition: background 0.15s, transform 0.1s;
}
.btn-guardar:hover  { background: #991b1b; }
.btn-guardar:active { transform: scale(0.97); }

/* ── HISTORIAL / FILTROS ── */
.historial-section { margin-bottom: 1rem; }
.filtros-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }

.tabs { display: flex; gap: 5px; }
.tab {
  height: 33px; padding: 0 15px; border-radius: 20px;
  border: 1.5px solid #e5e7eb; background: #fff; color: #6b7280;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.14s;
}
.tab:hover     { border-color: #b91c1c; color: #b91c1c; }
.tab-all       { background: #b91c1c !important; color: #fde68a !important; border-color: #b91c1c !important; }
.tab-entrada   { background: #dcfce7 !important; color: #14532d !important; border-color: #86efac !important; }
.tab-salida    { background: #fee2e2 !important; color: #7f1d1d !important; border-color: #fca5a5 !important; }

/* ── TABLA ── */
.estado-carga { padding: 2rem; text-align: center; color: #9ca3af; font-size: 14px; }
.estado-vacio { padding: 2rem; text-align: center; color: #9ca3af; font-size: 14px; }

.table-wrap { background: #fff; border: 1px solid #f3f4f6; border-radius: 14px; overflow: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
table { width: 100%; border-collapse: collapse; font-size: 13px; }

thead th {
  padding: 10px 13px; text-align: left;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
  color: #fde68a; background: #b91c1c;
}
thead th:first-child { border-radius: 14px 0 0 0; }
thead th:last-child  { border-radius: 0 14px 0 0; }

tbody td { padding: 9px 13px; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
tbody tr:last-child td { border-bottom: none; }
tbody tr:hover td      { background: #fef9c3; }
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