<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const API    = import.meta.env.VITE_API_URL
const router = useRouter()

const ingredientes   = ref([])
const proveedores    = ref([])
const compras        = ref([])
const resumen        = ref({})
const loadingCompras = ref(true)

const fIngrediente   = ref(null)
const fProveedor     = ref(null)
const fCantidad      = ref('')
const fCosto         = ref('')
const fLote          = ref('')
const fMotivo        = ref('Compra de lote')
const fObservacion   = ref('')
const guardando      = ref(false)
const exito          = ref(null)
const errorMsg       = ref(null)

const filtroIng      = ref('')
const filtroDesde    = ref('')
const filtroHasta    = ref('')

const ingredienteActual = computed(() =>
  ingredientes.value.find(i => i.id === fIngrediente.value) || null
)

const subtotalPreview = computed(() => {
  const c = Number(fCantidad.value), p = Number(fCosto.value)
  if (!c || !p || c <= 0 || p < 0) return null
  return (c * p).toFixed(2)
})

const costoAvgPreview = computed(() => {
  if (!ingredienteActual.value || !fCantidad.value || !fCosto.value) return null
  const sp = Number(ingredienteActual.value.stock_actual)
  const cp = Number(ingredienteActual.value.costo_unitario_avg)
  const c  = Number(fCantidad.value), cn = Number(fCosto.value)
  const sn = sp + c
  return sn > 0 ? ((sp * cp + c * cn) / sn).toFixed(2) : cn.toFixed(2)
})

const valorTotalInventario = computed(() =>
  ingredientes.value.reduce((a, i) => a + Number(i.valor_inventario || 0), 0)
)

const cargarIngredientes = async () => {
  const res = await fetch(`${API}/api/inventario/ingredientes`)
  ingredientes.value = await res.json()
  if (ingredientes.value.length > 0) fIngrediente.value = ingredientes.value[0].id
}

const cargarProveedores = async () => {
  const res = await fetch(`${API}/api/inventario/proveedores`)
  proveedores.value = await res.json()
}

const cargarResumen = async () => {
  const res = await fetch(`${API}/api/inventario/valor/resumen`)
  resumen.value = await res.json()
}

const cargarCompras = async () => {
  loadingCompras.value = true
  const params = new URLSearchParams()
  if (filtroIng.value)   params.append('id_insumo',  filtroIng.value)
  if (filtroDesde.value) params.append('fecha_desde', filtroDesde.value)
  if (filtroHasta.value) params.append('fecha_hasta', filtroHasta.value)
  const res = await fetch(`${API}/api/inventario/valor/compras?${params}`)
  compras.value        = await res.json()
  loadingCompras.value = false
}

const registrarCompra = async () => {
  exito.value = null; errorMsg.value = null
  if (!fIngrediente.value || !fCantidad.value || !fCosto.value) { errorMsg.value = 'Completa: ingrediente, cantidad y costo unitario.'; return }
  if (Number(fCantidad.value) <= 0) { errorMsg.value = 'La cantidad debe ser mayor a 0.'; return }
  if (Number(fCosto.value) < 0)     { errorMsg.value = 'El costo no puede ser negativo.'; return }
  guardando.value = true
  try {
    const res = await fetch(`${API}/api/inventario/valor/registrar-compra`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_insumo: fIngrediente.value, id_proveedor: fProveedor.value || null, cantidad: Number(fCantidad.value), costo_unitario: Number(fCosto.value), lote: fLote.value || null, motivo: fMotivo.value || 'Compra de lote', observacion: fObservacion.value || null })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al guardar')
    exito.value = { ingrediente: ingredienteActual.value.nombre, cantidad: fCantidad.value, unidad: ingredienteActual.value.unidad, costo: fCosto.value, subtotal: data.subtotal, costoAvg: data.costo_avg_nuevo, valorInv: data.valor_inv_nuevo }
    fCantidad.value = fCosto.value = fLote.value = fObservacion.value = ''
    fMotivo.value = 'Compra de lote'; fProveedor.value = null
    await Promise.all([cargarIngredientes(), cargarResumen(), cargarCompras()])
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    guardando.value = false
  }
}

let debounce = null
const onFiltro = () => { clearTimeout(debounce); debounce = setTimeout(cargarCompras, 300) }

onMounted(async () => {
  await Promise.all([cargarIngredientes(), cargarProveedores(), cargarResumen(), cargarCompras()])
})
</script>

<template>
  <div class="app-wrapper">

    <header class="navbar">
      <div class="navbar-left">
        <div class="logo-block">
          <img src="../logo.png" alt="Pollos Copacabana" class="logo-img" />
          <div class="logo-text">
            <span class="logo-main">Pollos</span>
            <span class="logo-sub">Copacabana</span>
          </div>
        </div>
      </div>

      <nav class="navbar-center">
        <span class="nav-title">Inventario — Valor</span>
      </nav>

      <div class="navbar-right">
        <button class="btn-back" @click="router.push('/inventario')">Historial</button>
        <button class="nav-btn"  @click="router.push('/merma')">Mermas</button>
      </div>
    </header>

    <main class="content-area">

      <div class="cards">
        <div class="card card-yellow">
          <p class="card-label">Valor total en almacen</p>
          <p class="card-value">Bs. {{ Number(resumen.valor_total || 0).toFixed(2) }}</p>
          <p class="card-unit">inventario valorizado</p>
        </div>
        <div class="card card-green">
          <p class="card-label">Ingredientes activos</p>
          <p class="card-value">{{ resumen.total_ingredientes ?? '—' }}</p>
          <p class="card-unit">en almacen</p>
        </div>
        <div class="card card-warn">
          <p class="card-label">Con stock bajo</p>
          <p class="card-value">{{ resumen.stock_bajo ?? '—' }}</p>
          <p class="card-unit">ingredientes</p>
        </div>
        <div class="card card-red">
          <p class="card-label">Agotados</p>
          <p class="card-value">{{ resumen.agotados ?? '—' }}</p>
          <p class="card-unit">ingredientes</p>
        </div>
      </div>

      <section class="card-section">
        <h2 class="section-title">Registrar compra de lote</h2>
        <div v-if="exito" class="banner-exito"><strong>{{ exito.ingrediente }}</strong>: +{{ exito.cantidad }} {{ exito.unidad }} a Bs. {{ exito.costo }}/{{ exito.unidad }} — <strong>subtotal Bs. {{ exito.subtotal }}</strong>. Costo prom: <strong>Bs. {{ exito.costoAvg }}</strong> | Valor almacen: <strong>Bs. {{ exito.valorInv }}</strong></div>
        <div v-if="errorMsg" class="banner-error">{{ errorMsg }}</div>

        <div class="form-grid">
          <div class="field field-wide">
            <label class="field-label">Ingrediente *</label>
            <select class="input" v-model="fIngrediente">
              <option v-for="i in ingredientes" :key="i.id" :value="i.id">{{ i.nombre }} ({{ i.unidad }})</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label">Proveedor</label>
            <select class="input" v-model="fProveedor">
              <option :value="null">— ninguno —</option>
              <option v-for="p in proveedores" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label">Cantidad *</label>
            <input class="input" v-model="fCantidad" type="number" placeholder="0.000" min="0.001" step="0.001" />
          </div>
          <div class="field">
            <label class="field-label">Costo unitario (Bs.) *</label>
            <input class="input" v-model="fCosto" type="number" placeholder="0.00" min="0" step="0.01" />
          </div>
          <div class="field">
            <label class="field-label">Lote</label>
            <input class="input" v-model="fLote" placeholder="Ej: L-2025-04" />
          </div>
          <div class="field">
            <label class="field-label">Motivo</label>
            <input class="input" v-model="fMotivo" placeholder="Compra de lote" />
          </div>
          <div class="field field-wide">
            <label class="field-label">Observacion</label>
            <input class="input" v-model="fObservacion" placeholder="Notas adicionales..." />
          </div>
          <div class="field field-action">
            <button class="btn-primary" :disabled="guardando" @click="registrarCompra">
              {{ guardando ? 'Guardando...' : 'Registrar compra' }}
            </button>
          </div>
        </div>

        <div v-if="subtotalPreview && ingredienteActual" class="preview-box">
          <div class="preview-item">
            <span class="preview-label">Subtotal de esta compra</span>
            <span class="preview-valor highlight">Bs. {{ subtotalPreview }}</span>
          </div>
          <div class="preview-sep"></div>
          <div class="preview-item">
            <span class="preview-label">Costo prom. nuevo</span>
            <span class="preview-valor">Bs. {{ costoAvgPreview }} / {{ ingredienteActual.unidad }}</span>
          </div>
          <div class="preview-sep"></div>
          <div class="preview-item">
            <span class="preview-label">Nuevo stock</span>
            <span class="preview-valor">{{ (Number(ingredienteActual.stock_actual) + Number(fCantidad || 0)).toFixed(3) }} {{ ingredienteActual.unidad }}</span>
          </div>
          <div class="preview-sep"></div>
          <div class="preview-item">
            <span class="preview-label">Valor almacen tras compra</span>
            <span class="preview-valor highlight">Bs. {{ (Number(ingredienteActual.valor_inventario) + Number(subtotalPreview)).toFixed(2) }}</span>
          </div>
        </div>
      </section>

      <section class="card-section">
        <h2 class="section-title">Valor actual por ingrediente</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Ingrediente</th><th>Categoria</th><th>Stock actual</th><th>Costo prom. unit.</th><th>Valor en almacen</th><th>Estado</th></tr></thead>
            <tbody>
              <tr v-for="i in ingredientes" :key="i.id">
                <td><strong>{{ i.nombre }}</strong></td>
                <td class="muted">{{ i.categoria }}</td>
                <td>{{ i.stock_actual }} {{ i.unidad }}</td>
                <td class="muted">Bs. {{ Number(i.costo_unitario_avg).toFixed(2) }}</td>
                <td class="valor-cell">Bs. {{ Number(i.valor_inventario).toFixed(2) }}</td>
                <td>
                  <span v-if="i.agotado" class="badge badge-rojo">Agotado</span>
                  <span v-else-if="Number(i.stock_actual) <= Number(i.stock_minimo)" class="badge badge-warn">Stock bajo</span>
                  <span v-else class="badge badge-ok">Normal</span>
                </td>
              </tr>
              <tr class="fila-total">
                <td colspan="4"><strong>Total inventario</strong></td>
                <td class="valor-cell"><strong>Bs. {{ valorTotalInventario.toFixed(2) }}</strong></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="historial-section">
        <h2 class="section-title">Historial de compras</h2>
        <div class="filtros-row">
          <select class="input input-filtro" v-model="filtroIng" @change="onFiltro">
            <option value="">Todos los ingredientes</option>
            <option v-for="i in ingredientes" :key="i.id" :value="i.id">{{ i.nombre }}</option>
          </select>
          <div class="fecha-group">
            <input class="input" v-model="filtroDesde" type="date" @change="onFiltro" />
            <span class="fecha-sep">a</span>
            <input class="input" v-model="filtroHasta" type="date" @change="onFiltro" />
          </div>
        </div>
      </section>

      <div v-if="loadingCompras" class="estado-carga">Cargando compras...</div>
      <div v-else class="table-wrap">
        <table v-if="compras.length > 0">
          <thead><tr><th>Fecha</th><th>Hora</th><th>Ingrediente</th><th>Cantidad</th><th>Costo unit.</th><th>Subtotal</th><th>Lote</th><th>Proveedor</th></tr></thead>
          <tbody>
            <tr v-for="c in compras" :key="c.id">
              <td>{{ c.fecha }}</td>
              <td class="muted">{{ c.hora }}</td>
              <td><strong>{{ c.ingrediente }}</strong></td>
              <td class="qty-pos">+{{ c.cantidad }} {{ c.unidad }}</td>
              <td class="muted">Bs. {{ Number(c.costo_unitario).toFixed(2) }}</td>
              <td class="valor-cell">Bs. {{ Number(c.subtotal).toFixed(2) }}</td>
              <td class="muted">{{ c.lote || '—' }}</td>
              <td class="muted">{{ c.proveedor || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="estado-vacio">Sin compras registradas.</div>
      </div>

    </main>
  </div>
</template>

<style scoped>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.app-wrapper { min-height: 100vh; background: #fff; display: flex; flex-direction: column; font-family: 'Segoe UI', sans-serif; color: #1a1a1a; }

.navbar { background: #D90B31; height: 68px; display: flex; align-items: center; justify-content: space-between; padding: 0 28px; box-shadow: 0 4px 20px rgba(217,11,49,0.35); position: sticky; top: 0; z-index: 100; gap: 16px; }
.navbar-left { display: flex; align-items: center; }
.logo-block  { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.logo-img    { height: 56px; width: 56px; object-fit: cover; border-radius: 10px; }
.logo-text   { display: flex; flex-direction: column; line-height: 1.15; }
.logo-main   { font-size: 17px; font-weight: 800; color: #F2E205; letter-spacing: 0.5px; text-transform: uppercase; }
.logo-sub    { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.85); letter-spacing: 1.5px; text-transform: uppercase; }
.navbar-center { flex: 1; display: flex; justify-content: center; }
.nav-title { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.9); letter-spacing: 0.5px; text-transform: uppercase; }
.navbar-right { display: flex; align-items: center; gap: 10px; }

.btn-back,
.nav-btn { height: 34px; padding: 0 18px; background: rgba(0,0,0,0.2); border: 1.5px solid #F2E205; border-radius: 20px; color: #F2E205; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; letter-spacing: 0.5px; text-transform: uppercase; }
.btn-back:hover,
.nav-btn:hover { background: #F2E205; color: #D90B31; }

.content-area { flex: 1; background: #fdf6ec; padding: 1.75rem 2rem; max-width: 1100px; width: 100%; margin: 0 auto; }

.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 1.5rem; }
.card { border-radius: 14px; padding: 1.1rem; text-align: center; }
.card-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.65; margin-bottom: 6px; }
.card-value { font-size: 22px; font-weight: 800; line-height: 1.1; margin-bottom: 3px; }
.card-unit  { font-size: 11px; opacity: 0.6; }
.card-yellow { background: #fef9c3; color: #713f12; }
.card-green  { background: #dcfce7; color: #14532d; }
.card-warn   { background: #fef3c7; color: #78350f; }
.card-red    { background: #fee2e2; color: #7f1d1d; }

.banner-exito { background: #dcfce7; border: 1.5px solid #86efac; border-radius: 10px; padding: 11px 14px; margin-bottom: 14px; font-size: 13px; color: #14532d; line-height: 1.6; }
.banner-error { background: #fee2e2; border: 1.5px solid #fca5a5; border-radius: 10px; padding: 11px 14px; margin-bottom: 14px; font-size: 13px; color: #7f1d1d; }

.card-section { background: #fff; border: 1.5px solid #F2E205; border-radius: 16px; padding: 1.4rem; margin-bottom: 1.75rem; box-shadow: 0 2px 10px rgba(217,11,49,0.07); }
.section-title { font-size: 12px; font-weight: 700; color: #D90B31; text-transform: uppercase; letter-spacing: 0.6px; padding-bottom: 8px; border-bottom: 2px solid #F2E205; display: inline-block; margin-bottom: 14px; }

.form-grid { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
.field { display: flex; flex-direction: column; gap: 5px; min-width: 138px; }
.field-wide   { flex: 2; min-width: 220px; }
.field-action { justify-content: flex-end; }
.field-label  { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }

.input { height: 37px; padding: 0 11px; border: 1.5px solid #e5e7eb; border-radius: 9px; font-size: 13.5px; background: #fafafa; color: #1a1a1a; transition: border-color 0.15s; }
.input:focus { outline: none; border-color: #D90B31; background: #fff; }
.input-filtro { min-width: 200px; }

.btn-primary { height: 37px; padding: 0 22px; background: #D90B31; color: #F2E205; border: none; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: pointer; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 2px 8px rgba(217,11,49,0.3); transition: background 0.15s, transform 0.1s; white-space: nowrap; }
.btn-primary:hover:not(:disabled)  { background: #b91c1c; }
.btn-primary:active:not(:disabled) { transform: scale(0.97); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

.preview-box { display: flex; flex-wrap: wrap; align-items: center; margin-top: 16px; background: #fef9c3; border: 1.5px solid #F2E205; border-radius: 10px; overflow: hidden; }
.preview-item { display: flex; flex-direction: column; align-items: center; padding: 12px 20px; gap: 3px; flex: 1; min-width: 140px; }
.preview-sep  { width: 1px; background: #F2E205; align-self: stretch; }
.preview-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #92400e; opacity: 0.7; }
.preview-valor { font-size: 16px; font-weight: 700; color: #713f12; }
.preview-valor.highlight { color: #D90B31; font-size: 18px; }

.historial-section { margin-bottom: 1rem; }
.filtros-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.fecha-group { display: flex; align-items: center; gap: 6px; }
.fecha-sep { color: #9ca3af; font-size: 13px; font-weight: 600; }

.estado-carga { padding: 2rem; text-align: center; color: #9ca3af; font-size: 14px; }
.estado-vacio { padding: 2rem; text-align: center; color: #9ca3af; font-size: 14px; }
.table-wrap { background: #fff; border: 1px solid #f3f4f6; border-radius: 14px; overflow: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 1.75rem; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th { padding: 10px 13px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #F2E205; background: #D90B31; }
thead th:first-child { border-radius: 14px 0 0 0; }
thead th:last-child  { border-radius: 0 14px 0 0; }
tbody td { padding: 9px 13px; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
tbody tr:last-child td { border-bottom: none; }
tbody tr:hover td { background: #fff8e1; }
tbody tr.fila-total td { background: #fef9c3; border-top: 2px solid #F2E205; }

.badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.badge-ok   { background: #dcfce7; color: #14532d; }
.badge-warn { background: #fef3c7; color: #78350f; }
.badge-rojo { background: #fee2e2; color: #7f1d1d; }
.qty-pos    { color: #14532d; font-weight: 700; }
.valor-cell { color: #D90B31; font-weight: 700; }
.muted      { color: #9ca3af; }

@media (max-width: 768px) {
  .navbar { height: 60px; padding: 0 12px; }
  .logo-text { display: none; }
  .logo-img { height: 40px; width: 40px; }
}
</style>