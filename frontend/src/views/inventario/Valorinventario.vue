<script setup>
import { ref, onMounted, computed } from 'vue'

const API = 'http://localhost:3000'
const emit = defineEmits(['volver', 'ir-historial', 'ir-merma'])

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

const ingredienteActual    = computed(() => ingredientes.value.find(i => i.id === fIngrediente.value) || null)
const subtotalPreview      = computed(() => { const c = Number(fCantidad.value), p = Number(fCosto.value); if (!c || !p || c <= 0 || p < 0) return null; return (c * p).toFixed(2) })
const costoAvgPreview      = computed(() => { if (!ingredienteActual.value || !fCantidad.value || !fCosto.value) return null; const sp = Number(ingredienteActual.value.stock_actual), cp = Number(ingredienteActual.value.costo_unitario_avg), c = Number(fCantidad.value), cn = Number(fCosto.value), sn = sp + c; return sn > 0 ? ((sp * cp + c * cn) / sn).toFixed(2) : cn.toFixed(2) })
const valorTotalInventario = computed(() => ingredientes.value.reduce((a, i) => a + Number(i.valor_inventario || 0), 0))

const cargarIngredientes = async () => {
  const res = await fetch(`${API}/api/historial/ingredientes`)
  ingredientes.value = await res.json()
  if (ingredientes.value.length > 0) fIngrediente.value = ingredientes.value[0].id
}
const cargarProveedores = async () => {
  const res = await fetch(`${API}/api/historial/proveedores`)
  proveedores.value = await res.json()
}
const cargarResumen = async () => {
  const res = await fetch(`${API}/api/historial/valor/resumen`)
  resumen.value = await res.json()
}
const cargarCompras = async () => {
  loadingCompras.value = true
  const params = new URLSearchParams()
  if (filtroIng.value)   params.append('id_insumo',  filtroIng.value)
  if (filtroDesde.value) params.append('fecha_desde', filtroDesde.value)
  if (filtroHasta.value) params.append('fecha_hasta', filtroHasta.value)
  const res = await fetch(`${API}/api/historial/valor/compras?${params}`)
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
    const res = await fetch(`${API}/api/historial/valor/registrar-compra`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_insumo: fIngrediente.value, id_proveedor: fProveedor.value || null, cantidad: Number(fCantidad.value), costo_unitario: Number(fCosto.value), lote: fLote.value || null, motivo: fMotivo.value || 'Compra de lote', observacion: fObservacion.value || null })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al guardar')
    exito.value = { ingrediente: ingredienteActual.value.nombre, cantidad: fCantidad.value, unidad: ingredienteActual.value.unidad, costo: fCosto.value, subtotal: data.subtotal, costoAvg: data.costo_avg_nuevo, valorInv: data.valor_inv_nuevo }
    fCantidad.value = fCosto.value = fLote.value = fObservacion.value = ''; fMotivo.value = 'Compra de lote'; fProveedor.value = null
    await Promise.all([cargarIngredientes(), cargarResumen(), cargarCompras()])
  } catch (err) { errorMsg.value = err.message } finally { guardando.value = false }
}
let debounce = null
const onFiltro = () => { clearTimeout(debounce); debounce = setTimeout(cargarCompras, 300) }

onMounted(async () => { await Promise.all([cargarIngredientes(), cargarProveedores(), cargarResumen(), cargarCompras()]) })
</script>

<template>
  <div class="v-wrapper">

    <div class="sub-header">
      <div class="sub-left">
        <button class="btn-volver" @click="emit('volver')">← Volver</button>
        <h2 class="sub-title">Valor de Inventario</h2>
      </div>
      <div class="sub-right">
        <button class="btn-nav" @click="emit('ir-historial')">Historial</button>
        <button class="btn-nav" @click="emit('ir-merma')">Mermas</button>
      </div>
    </div>

    <div class="cards">
      <div class="card card-yellow"><p class="card-label">Valor total en almacen</p><p class="card-value">Bs. {{ Number(resumen.valor_total || 0).toFixed(2) }}</p><p class="card-unit">inventario valorizado</p></div>
      <div class="card card-green"><p class="card-label">Ingredientes activos</p><p class="card-value">{{ resumen.total_ingredientes ?? '—' }}</p><p class="card-unit">en almacen</p></div>
      <div class="card card-warn"><p class="card-label">Con stock bajo</p><p class="card-value">{{ resumen.stock_bajo ?? '—' }}</p><p class="card-unit">ingredientes</p></div>
      <div class="card card-red"><p class="card-label">Agotados</p><p class="card-value">{{ resumen.agotados ?? '—' }}</p><p class="card-unit">ingredientes</p></div>
    </div>

    <section class="card-section">
      <h2 class="section-title">Registrar compra de lote</h2>
      <div v-if="exito" class="banner-exito"><strong>{{ exito.ingrediente }}</strong>: +{{ exito.cantidad }} {{ exito.unidad }} a Bs. {{ exito.costo }}/{{ exito.unidad }} — <strong>subtotal Bs. {{ exito.subtotal }}</strong>. Costo prom: <strong>Bs. {{ exito.costoAvg }}</strong> | Valor almacen: <strong>Bs. {{ exito.valorInv }}</strong></div>
      <div v-if="errorMsg" class="banner-error">{{ errorMsg }}</div>
      <div class="form-grid">
        <div class="field field-wide"><label class="field-label">Ingrediente *</label><select class="input" v-model="fIngrediente"><option v-for="i in ingredientes" :key="i.id" :value="i.id">{{ i.nombre }} ({{ i.unidad }})</option></select></div>
        <div class="field"><label class="field-label">Proveedor</label><select class="input" v-model="fProveedor"><option :value="null">— ninguno —</option><option v-for="p in proveedores" :key="p.id" :value="p.id">{{ p.nombre }}</option></select></div>
        <div class="field"><label class="field-label">Cantidad *</label><input class="input" v-model="fCantidad" type="number" placeholder="0.000" min="0.001" step="0.001" /></div>
        <div class="field"><label class="field-label">Costo unitario (Bs.) *</label><input class="input" v-model="fCosto" type="number" placeholder="0.00" min="0" step="0.01" /></div>
        <div class="field"><label class="field-label">Lote</label><input class="input" v-model="fLote" placeholder="Ej: L-2025-04" /></div>
        <div class="field"><label class="field-label">Motivo</label><input class="input" v-model="fMotivo" placeholder="Compra de lote" /></div>
        <div class="field field-wide"><label class="field-label">Observacion</label><input class="input" v-model="fObservacion" placeholder="Notas adicionales..." /></div>
        <div class="field field-action"><button class="btn-primary" :disabled="guardando" @click="registrarCompra">{{ guardando ? 'Guardando...' : 'Registrar compra' }}</button></div>
      </div>
      <div v-if="subtotalPreview && ingredienteActual" class="preview-box">
        <div class="preview-item"><span class="preview-label">Subtotal</span><span class="preview-valor highlight">Bs. {{ subtotalPreview }}</span></div>
        <div class="preview-sep"></div>
        <div class="preview-item"><span class="preview-label">Costo prom. nuevo</span><span class="preview-valor">Bs. {{ costoAvgPreview }} / {{ ingredienteActual.unidad }}</span></div>
        <div class="preview-sep"></div>
        <div class="preview-item"><span class="preview-label">Nuevo stock</span><span class="preview-valor">{{ (Number(ingredienteActual.stock_actual) + Number(fCantidad || 0)).toFixed(3) }} {{ ingredienteActual.unidad }}</span></div>
        <div class="preview-sep"></div>
        <div class="preview-item"><span class="preview-label">Valor tras compra</span><span class="preview-valor highlight">Bs. {{ (Number(ingredienteActual.valor_inventario) + Number(subtotalPreview)).toFixed(2) }}</span></div>
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

    <section class="filtros-section">
      <h2 class="section-title">Historial de compras</h2>
      <div class="filtros-row">
        <select class="input input-filtro" v-model="filtroIng" @change="onFiltro"><option value="">Todos los ingredientes</option><option v-for="i in ingredientes" :key="i.id" :value="i.id">{{ i.nombre }}</option></select>
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
            <td>{{ c.fecha }}</td><td class="muted">{{ c.hora }}</td>
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

  </div>
</template>

<style scoped>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.v-wrapper { padding: 24px 32px; background: #f9f9f9; min-height: 100%; font-family: 'Segoe UI', sans-serif; color: #1a1a1a; display: flex; flex-direction: column; gap: 0; }
.sub-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid #e8e8e8; margin-bottom: 20px; }
.sub-left  { display: flex; align-items: center; gap: 12px; }
.sub-right { display: flex; align-items: center; gap: 8px; }
.sub-title { font-size: 22px; font-weight: 900; color: #1a1a1a; letter-spacing: -0.5px; }
.btn-volver { padding: 7px 16px; background: #f0f0f0; color: #1a1a1a; border: 1.5px solid #e0e0e0; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.btn-volver:hover { background: #1a1a1a; color: #F2E205; border-color: #1a1a1a; }
.btn-nav { padding: 7px 16px; background: #fff; color: #666; border: 1.5px solid #e0e0e0; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.4px; }
.btn-nav:hover { border-color: #D90B31; color: #D90B31; }
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
.card-section { background: #fff; border: 1.5px solid #F2E205; border-radius: 12px; padding: 1.2rem; margin-bottom: 1.5rem; box-shadow: 0 2px 10px rgba(217,11,49,0.07); }
.section-title { font-size: 11px; font-weight: 800; color: #D90B31; text-transform: uppercase; letter-spacing: 0.6px; padding-bottom: 8px; border-bottom: 2px solid #F2E205; display: inline-block; margin-bottom: 14px; }
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
.preview-item { display: flex; flex-direction: column; align-items: center; padding: 10px 16px; gap: 3px; flex: 1; min-width: 120px; }
.preview-sep  { width: 1px; background: #F2E205; align-self: stretch; }
.preview-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #92400e; opacity: 0.7; }
.preview-valor { font-size: 15px; font-weight: 700; color: #713f12; }
.preview-valor.highlight { color: #D90B31; font-size: 17px; }
.filtros-section { margin-bottom: 1rem; }
.filtros-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.fecha-group { display: flex; align-items: center; gap: 6px; }
.fecha-sep { color: #9ca3af; font-size: 13px; font-weight: 600; }
.estado-carga { padding: 2rem; text-align: center; color: #9ca3af; font-size: 14px; }
.estado-vacio { padding: 2rem; text-align: center; color: #9ca3af; font-size: 14px; }
.table-wrap { background: #fff; border: 1px solid #f3f4f6; border-radius: 12px; overflow: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 1.5rem; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th { padding: 10px 13px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #F2E205; background: #D90B31; }
thead th:first-child { border-radius: 12px 0 0 0; }
thead th:last-child  { border-radius: 0 12px 0 0; }
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
</style>