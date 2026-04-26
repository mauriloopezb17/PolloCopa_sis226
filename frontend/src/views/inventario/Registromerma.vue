<script setup>
import { ref, onMounted, computed } from 'vue'

const API = 'http://localhost:3000'
const emit = defineEmits(['volver', 'ir-historial', 'ir-valor'])

const ingredientes  = ref([])
const historial     = ref([])
const resumen       = ref([])
const loadingHist   = ref(true)
const fIngrediente  = ref(null)
const fCantidad     = ref('')
const fCausa        = ref('VENCIDO')
const fObservacion  = ref('')
const fLote         = ref('')
const guardando     = ref(false)
const exito         = ref(null)
const errorMsg      = ref(null)
const filtroCausa   = ref('')
const filtroIng     = ref('')

const ingredienteActual  = computed(() => ingredientes.value.find(i => i.id === fIngrediente.value) || null)
const stockInsuficiente  = computed(() => { if (!ingredienteActual.value || !fCantidad.value) return false; return Number(fCantidad.value) > Number(ingredienteActual.value.stock_actual) })
const totalPerdida       = computed(() => resumen.value.reduce((a, r) => a + Number(r.perdida_total || 0), 0))

const cargarIngredientes = async () => {
  const res = await fetch(`${API}/api/historial/ingredientes`)
  ingredientes.value = await res.json()
  if (ingredientes.value.length > 0) fIngrediente.value = ingredientes.value[0].id
}
const cargarHistorial = async () => {
  loadingHist.value = true
  const params = new URLSearchParams()
  if (filtroCausa.value) params.append('causa',     filtroCausa.value)
  if (filtroIng.value)   params.append('id_insumo', filtroIng.value)
  const res = await fetch(`${API}/api/historial/merma/historial?${params}`)
  historial.value   = await res.json()
  loadingHist.value = false
}
const cargarResumen = async () => {
  const res = await fetch(`${API}/api/historial/merma/resumen`)
  resumen.value = await res.json()
}
const registrarMerma = async () => {
  exito.value = null; errorMsg.value = null
  if (!fIngrediente.value || !fCantidad.value || !fCausa.value) { errorMsg.value = 'Completa: ingrediente, cantidad y causa.'; return }
  if (stockInsuficiente.value) { errorMsg.value = `Stock insuficiente. Disponible: ${ingredienteActual.value.stock_actual} ${ingredienteActual.value.unidad}`; return }
  guardando.value = true
  try {
    const res = await fetch(`${API}/api/historial/merma/registrar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_insumo: fIngrediente.value, cantidad: Number(fCantidad.value), causa: fCausa.value, observacion: fObservacion.value || null, lote: fLote.value || null })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al registrar')
    exito.value = { ingrediente: ingredienteActual.value.nombre, cantidad: fCantidad.value, unidad: ingredienteActual.value.unidad, perdida: data.perdida_estimada }
    fCantidad.value = fObservacion.value = fLote.value = ''
    await cargarIngredientes(); await Promise.all([cargarHistorial(), cargarResumen()])
  } catch (err) { errorMsg.value = err.message } finally { guardando.value = false }
}
const aplicarFiltros = () => cargarHistorial()

onMounted(async () => { await Promise.all([cargarIngredientes(), cargarHistorial(), cargarResumen()]) })
</script>

<template>
  <div class="m-wrapper">

    <div class="sub-header">
      <div class="sub-left">
        <button class="btn-volver" @click="emit('volver')">← Volver</button>
        <h2 class="sub-title">Registro de Mermas</h2>
      </div>
      <div class="sub-right">
        <button class="btn-nav" @click="emit('ir-historial')">Historial</button>
        <button class="btn-nav" @click="emit('ir-valor')">Valor</button>
      </div>
    </div>

    <div class="cards">
      <div class="card card-red"><p class="card-label">Ingredientes con merma</p><p class="card-value">{{ resumen.length }}</p><p class="card-unit">ingredientes</p></div>
      <div class="card card-yellow"><p class="card-label">Perdida economica total</p><p class="card-value">Bs. {{ totalPerdida.toFixed(2) }}</p><p class="card-unit">estimado</p></div>
      <div class="card card-warn"><p class="card-label">Total registros</p><p class="card-value">{{ historial.length }}</p><p class="card-unit">movimientos</p></div>
    </div>

    <section class="card-section">
      <h2 class="section-title">Registrar merma</h2>
      <div v-if="exito" class="banner-exito">Se descontaron <strong>{{ exito.cantidad }} {{ exito.unidad }}</strong> de <strong>{{ exito.ingrediente }}</strong>. Perdida estimada: <strong>Bs. {{ exito.perdida }}</strong></div>
      <div v-if="errorMsg" class="banner-error">{{ errorMsg }}</div>
      <div class="form-grid">
        <div class="field field-wide"><label class="field-label">Ingrediente *</label><select class="input" v-model="fIngrediente"><option v-for="i in ingredientes" :key="i.id" :value="i.id">{{ i.nombre }} — stock: {{ i.stock_actual }} {{ i.unidad }}</option></select></div>
        <div class="field">
          <label class="field-label">Causa *</label>
          <div class="causa-group">
            <button class="causa-btn" :class="{ 'causa-active': fCausa === 'VENCIDO' }"          @click="fCausa = 'VENCIDO'">Vencido</button>
            <button class="causa-btn" :class="{ 'causa-active': fCausa === 'DAÑADO' }"           @click="fCausa = 'DAÑADO'">Dañado</button>
            <button class="causa-btn" :class="{ 'causa-active': fCausa === 'VENCIDO Y DAÑADO' }" @click="fCausa = 'VENCIDO Y DAÑADO'">Ambos</button>
          </div>
        </div>
        <div class="field">
          <label class="field-label">Cantidad *</label>
          <input class="input" :class="{ 'input-error': stockInsuficiente }" v-model="fCantidad" type="number" placeholder="0.000" min="0.001" step="0.001" />
          <span v-if="stockInsuficiente" class="hint-error">Max: {{ ingredienteActual?.stock_actual }} {{ ingredienteActual?.unidad }}</span>
        </div>
        <div class="field"><label class="field-label">Lote</label><input class="input" v-model="fLote" placeholder="Ej: L-2025-04" /></div>
        <div class="field field-wide"><label class="field-label">Observacion</label><input class="input" v-model="fObservacion" placeholder="Ej: encontrado sin temperatura adecuada" /></div>
        <div class="field field-action">
          <button class="btn-primary" :disabled="guardando || stockInsuficiente" @click="registrarMerma">{{ guardando ? 'Guardando...' : 'Registrar merma' }}</button>
        </div>
      </div>
      <div v-if="ingredienteActual" class="stock-preview">
        <span class="stock-label">Stock de <strong>{{ ingredienteActual.nombre }}</strong>:</span>
        <span class="stock-barra-wrap"><span class="stock-barra" :style="{ width: Math.min(100, (ingredienteActual.stock_actual / (ingredienteActual.stock_actual + 1)) * 100) + '%', background: ingredienteActual.agotado ? '#D90B31' : Number(ingredienteActual.stock_actual) <= Number(ingredienteActual.stock_minimo) ? '#f59e0b' : '#16a34a' }"></span></span>
        <span class="stock-num">{{ ingredienteActual.stock_actual }} {{ ingredienteActual.unidad }}</span>
      </div>
    </section>

    <section class="card-section" v-if="resumen.length > 0">
      <h2 class="section-title">Resumen de perdidas por ingrediente</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ingrediente</th><th>Registros</th><th>Cantidad total</th><th>Perdida estimada</th></tr></thead>
          <tbody>
            <tr v-for="r in resumen" :key="r.id_insumo">
              <td><strong>{{ r.ingrediente }}</strong></td>
              <td class="muted">{{ r.total_registros }}</td>
              <td class="qty-neg">{{ r.total_cantidad }} {{ r.unidad }}</td>
              <td class="perdida">Bs. {{ Number(r.perdida_total).toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="filtros-section">
      <h2 class="section-title">Historial de mermas</h2>
      <div class="filtros-row">
        <div class="tabs">
          <button class="tab" :class="{ 'tab-all':     filtroCausa === '' }"          @click="filtroCausa = ''; aplicarFiltros()">Todas</button>
          <button class="tab" :class="{ 'tab-vencido': filtroCausa === 'VENCIDO' }"   @click="filtroCausa = 'VENCIDO'; aplicarFiltros()">Vencidos</button>
          <button class="tab" :class="{ 'tab-danado':  filtroCausa === 'DAÑADO' }"    @click="filtroCausa = 'DAÑADO'; aplicarFiltros()">Dañados</button>
        </div>
        <select class="input input-filtro" v-model="filtroIng" @change="aplicarFiltros">
          <option value="">Todos los ingredientes</option>
          <option v-for="i in ingredientes" :key="i.id" :value="i.id">{{ i.nombre }}</option>
        </select>
      </div>
    </section>

    <div v-if="loadingHist" class="estado-carga">Cargando historial...</div>
    <div v-else class="table-wrap">
      <table v-if="historial.length > 0">
        <thead><tr><th>Fecha</th><th>Hora</th><th>Ingrediente</th><th>Causa</th><th>Cantidad</th><th>Lote</th><th>Perdida est.</th><th>Observacion</th></tr></thead>
        <tbody>
          <tr v-for="m in historial" :key="m.id">
            <td>{{ m.fecha }}</td><td class="muted">{{ m.hora }}</td>
            <td><strong>{{ m.ingrediente }}</strong></td>
            <td><span :class="['badge', m.causa === 'VENCIDO' ? 'badge-vencido' : m.causa === 'DAÑADO' ? 'badge-danado' : 'badge-ambos']">{{ m.causa }}</span></td>
            <td class="qty-neg">−{{ m.cantidad }} {{ m.unidad }}</td>
            <td class="muted">{{ m.lote || '—' }}</td>
            <td class="perdida">Bs. {{ Number(m.perdida_estimada || 0).toFixed(2) }}</td>
            <td class="muted">{{ m.observacion || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="estado-vacio">Sin registros de merma.</div>
    </div>

  </div>
</template>

<style scoped>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.m-wrapper { padding: 24px 32px; background: #f9f9f9; min-height: 100%; font-family: 'Segoe UI', sans-serif; color: #1a1a1a; display: flex; flex-direction: column; gap: 0; }
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
.card-value { font-size: 26px; font-weight: 800; line-height: 1; margin-bottom: 3px; }
.card-unit  { font-size: 12px; opacity: 0.6; }
.card-red    { background: #fee2e2; color: #7f1d1d; }
.card-yellow { background: #fef9c3; color: #713f12; }
.card-warn   { background: #fef3c7; color: #78350f; }
.banner-exito { background: #dcfce7; border: 1.5px solid #86efac; border-radius: 10px; padding: 11px 14px; margin-bottom: 14px; font-size: 13px; color: #14532d; }
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
.input-error  { border-color: #fca5a5 !important; background: #fff5f5 !important; }
.hint-error   { font-size: 11px; color: #D90B31; }
.input-filtro { min-width: 200px; }
.causa-group { display: flex; border-radius: 9px; overflow: hidden; border: 1.5px solid #e5e7eb; }
.causa-btn { flex: 1; height: 37px; border: none; background: #f3f4f6; color: #6b7280; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; cursor: pointer; transition: all 0.14s; border-right: 1px solid #e5e7eb; }
.causa-btn:last-child { border-right: none; }
.causa-active { background: #D90B31 !important; color: #F2E205 !important; }
.btn-primary { height: 37px; padding: 0 22px; background: #D90B31; color: #F2E205; border: none; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: pointer; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 2px 8px rgba(217,11,49,0.3); transition: background 0.15s, transform 0.1s; white-space: nowrap; }
.btn-primary:hover:not(:disabled)  { background: #b91c1c; }
.btn-primary:active:not(:disabled) { transform: scale(0.97); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.stock-preview { display: flex; align-items: center; gap: 10px; margin-top: 16px; padding: 10px 14px; background: #f9f9f9; border-radius: 9px; flex-wrap: wrap; }
.stock-label { font-size: 13px; color: #6b7280; }
.stock-barra-wrap { flex: 1; min-width: 100px; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
.stock-barra { height: 100%; border-radius: 4px; transition: width 0.3s; }
.stock-num { font-size: 13px; font-weight: 700; color: #1a1a1a; white-space: nowrap; }
.filtros-section { margin-bottom: 1rem; }
.filtros-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.tabs { display: flex; gap: 5px; }
.tab { height: 33px; padding: 0 15px; border-radius: 20px; border: 1.5px solid #e5e7eb; background: #fff; color: #6b7280; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; cursor: pointer; transition: all 0.14s; }
.tab:hover    { border-color: #D90B31; color: #D90B31; }
.tab-all      { background: #D90B31 !important; color: #F2E205 !important; border-color: #D90B31 !important; }
.tab-vencido  { background: #fef3c7 !important; color: #78350f !important; border-color: #f59e0b !important; }
.tab-danado   { background: #fee2e2 !important; color: #7f1d1d !important; border-color: #fca5a5 !important; }
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
.badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.badge-vencido { background: #fef3c7; color: #78350f; }
.badge-danado  { background: #fee2e2; color: #7f1d1d; }
.badge-ambos   { background: #ede9fe; color: #4c1d95; }
.qty-neg { color: #7f1d1d; font-weight: 700; }
.perdida { color: #D90B31; font-weight: 600; }
.muted   { color: #9ca3af; }
</style>