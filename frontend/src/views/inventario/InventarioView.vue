<template>
  <div class="inventario-wrapper">

    <!-- ── HEADER: Título + badge + botón nuevo ── -->
    <div class="section-header">
      <div class="section-header-left">
        <h1 class="section-title">Inventario</h1>
        <span class="section-badge">{{ ingredientesFiltrados.length }} ingredientes</span>
      </div>
      <button class="btn-nuevo" @click="abrirModalNuevo">
        <span class="btn-nuevo-icon">＋</span>
        Nuevo Ingrediente
      </button>
    </div>

    <!-- ── FILTROS CATEGORÍA (pills, debajo del título) ── -->
    <div class="cat-bar">
      <button
        class="filtro-btn"
        :class="{ active: categoriaActiva === null }"
        @click="categoriaActiva = null"
      >Todos</button>
      <button
        v-for="cat in categorias"
        :key="cat.id_categoria_ingrediente"
        class="filtro-btn"
        :class="{ active: categoriaActiva === cat.id_categoria_ingrediente }"
        @click="categoriaActiva = cat.id_categoria_ingrediente"
      >{{ cat.nombre }}</button>
    </div>

    <!-- ── LOADING / ERROR ── -->
    <div v-if="cargando" class="estado-carga">
      <div class="spinner"></div>
      <span>Cargando inventario...</span>
    </div>
    <div v-else-if="errorGlobal" class="estado-error">
      <span>⚠ {{ errorGlobal }}</span>
      <button class="filtro-btn" @click="cargarDatos">Reintentar</button>
    </div>

    <!-- ── LISTA ── -->
    <div v-else class="card">
      <div class="card-header">
        <h2 class="card-title">Inventario Actual</h2>
        <div class="card-title-line"></div>
      </div>

      <div class="ingrediente-list">
        <transition-group name="list" tag="div" class="list-group">
          <div v-for="item in ingredientesFiltrados" :key="item.id_insumo" class="ingrediente-row">

            <div class="ingrediente-info">
              <div class="ingrediente-top">
                <span class="ingrediente-nombre">{{ item.nombre }}</span>
                <span class="cat-tag">{{ getNombreCategoria(item.id_categoria_ingrediente) }}</span>
                <span v-if="!item.activo" class="badge-inactivo">INACTIVO</span>
              </div>

              <div class="stock-info">
                <span class="stock-item">
                  Stock Actual:
                  <strong :class="item.agotado ? 'stock-cero' : 'stock-ok'">
                    {{ item.stock_actual }} {{ item.unidad_medida }}
                  </strong>
                </span>
                <span class="stock-sep">·</span>
                <span
                  class="stock-item"
                  :class="{ 'stock-bajo-parpadeo': Number(item.stock_actual) < Number(item.stock_minimo) }"
                >
                  Stock Mínimo:
                  <strong>{{ item.stock_minimo }} {{ item.unidad_medida }}</strong>
                </span>
                <span class="stock-sep">·</span>
                <span v-if="item.agotado" class="badge-agotado">AGOTADO</span>
                <span v-else class="badge-disponible">Disponible</span>
              </div>
            </div>

            <div class="ingrediente-acciones">
              <button
                class="btn-info"
                :class="{ 'btn-info-active': movimientosPorItem[item.id_insumo]?.length > 0 }"
                @click="abrirInfo(item)"
                title="Ver historial de movimientos"
              >
                <i class="fa-solid fa-file-circle-exclamation"></i>
              </button>
              <button class="btn-agregar-stock" @click="abrirModal(item)">
                Agregar Stock
              </button>
            </div>
          </div>
        </transition-group>

        <div v-if="ingredientesFiltrados.length === 0" class="lista-vacia">
          <span class="vacia-icon">📦</span>
          <p>No hay ingredientes en esta categoría.</p>
        </div>
      </div>
    </div>

    <!-- ===== MODAL NUEVO INGREDIENTE ===== -->
    <transition name="modal">
      <div v-if="modalNuevoVisible" class="modal-overlay" @click.self="cerrarModalNuevo">
        <div class="modal modal-nuevo">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Nuevo Ingrediente</h3>
              <p class="modal-sub-gray">Completa los datos del ingrediente</p>
            </div>
            <button class="modal-close" @click="cerrarModalNuevo">✕</button>
          </div>

          <div class="modal-body">
            <div class="modal-field">
              <label class="modal-label">Nombre <span class="req">*</span></label>
              <input v-model="nuevoForm.nombre" type="text" class="modal-input" placeholder="Ej: Pollo Fresco" />
            </div>

            <div class="modal-field">
              <label class="modal-label">Unidad de Medida <span class="req">*</span></label>
              <div class="tab-group">
                <button
                  v-for="u in unidades" :key="u.valor"
                  class="tab-btn"
                  :class="{ 'tab-btn-active': nuevoForm.unidad_medida === u.valor }"
                  @click="nuevoForm.unidad_medida = u.valor"
                >{{ u.label }}</button>
              </div>
            </div>

            <div class="modal-field">
              <label class="modal-label">Categoría <span class="req">*</span></label>
              <div class="tab-group">
                <button
                  v-for="cat in categorias" :key="cat.id_categoria_ingrediente"
                  class="tab-btn"
                  :class="{ 'tab-btn-active': nuevoForm.id_categoria_ingrediente === cat.id_categoria_ingrediente }"
                  @click="nuevoForm.id_categoria_ingrediente = cat.id_categoria_ingrediente"
                >{{ cat.nombre }}</button>
              </div>
            </div>

            <div class="modal-row">
              <div class="modal-field">
                <label class="modal-label">Stock Mínimo</label>
                <input v-model.number="nuevoForm.stock_minimo" type="number" min="0" step="0.001" class="modal-input" placeholder="Ej: 10" />
              </div>
              <div class="modal-field">
                <label class="modal-label">Costo por Unidad (Bs)</label>
                <input v-model.number="nuevoForm.costo_unitario" type="number" min="0" step="0.01" class="modal-input" placeholder="Ej: 15.50" />
              </div>
            </div>

            <div class="modal-field">
              <label class="modal-label">Costo Total estimado (Bs)</label>
              <div class="costo-total-display">{{ costoTotalCalculado }}</div>
            </div>

            <div class="modal-field">
              <label class="modal-label">Descripción</label>
              <textarea v-model="nuevoForm.descripcion" class="modal-textarea" placeholder="Descripción del ingrediente..." rows="2"></textarea>
            </div>

            <transition name="fade">
              <div v-if="errorNuevo" class="msg-error">✕ {{ errorNuevo }}</div>
            </transition>
          </div>

          <div class="modal-footer">
            <button class="btn-cancelar" @click="cerrarModalNuevo">Cancelar</button>
            <button class="btn-confirmar" :disabled="!nuevoFormValido || guardandoNuevo" @click="guardarIngrediente">
              {{ guardandoNuevo ? 'Guardando...' : 'Guardar Ingrediente' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ===== MODAL REGISTRAR MOVIMIENTO ===== -->
    <transition name="modal">
      <div v-if="modalVisible" class="modal-overlay" @click.self="cerrarModal">
        <div class="modal modal-stock">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Registrar Movimiento</h3>
              <p class="modal-sub">{{ itemSeleccionado?.nombre }}</p>
            </div>
            <button class="modal-close" @click="cerrarModal">✕</button>
          </div>

          <div class="modal-body">
            <div class="modal-field">
              <label class="modal-label">Tipo de Movimiento <span class="req">*</span></label>
              <div class="tipo-grid">
                <button
                  v-for="tipo in tiposMovimiento" :key="tipo.id_tipo_movimiento"
                  class="tipo-btn"
                  :class="[
                    form.id_tipo_movimi === tipo.id_tipo_movimiento ? 'tipo-btn-active' : '',
                    tipo.afecta_stock > 0 ? 'tipo-entrada' : 'tipo-salida'
                  ]"
                  @click="form.id_tipo_movimi = tipo.id_tipo_movimiento"
                >
                  <span class="tipo-flecha">{{ tipo.afecta_stock > 0 ? '▲' : '▼' }}</span>
                  <span class="tipo-nombre">{{ tipo.nombre }}</span>
                </button>
              </div>
            </div>

            <div class="modal-row">
              <div class="modal-field">
                <label class="modal-label">Cantidad <span class="req">*</span></label>
                <div class="input-with-unit">
                  <input v-model.number="form.cantidad" type="number" min="0.001" step="0.001" class="modal-input" placeholder="Ej: 50" />
                  <span class="unit-badge">{{ itemSeleccionado?.unidad_medida || 'u' }}</span>
                </div>
              </div>
              <div class="modal-field">
                <label class="modal-label">Costo Unitario (Bs)</label>
                <input v-model.number="form.costo_unitario" type="number" min="0" step="0.01" class="modal-input" placeholder="Opcional" />
              </div>
            </div>

            <div class="modal-row">
              <div class="modal-field">
                <label class="modal-label">Lote</label>
                <input v-model="form.lote" type="text" class="modal-input" placeholder="Nro. de lote (opcional)" />
              </div>
              <div class="modal-field">
                <label class="modal-label">Motivo / Observación</label>
                <input v-model="form.observacion" type="text" class="modal-input" placeholder="Opcional" />
              </div>
            </div>

            <!-- Proveedor solo si es COMPRA -->
            <template v-if="tipoMovimientoActual?.afecta_stock > 0 && form.id_tipo_movimi === 1">
              <div class="modal-divider">Datos del Proveedor</div>
              <div class="modal-field">
                <label class="modal-label">Nombre <span class="req">*</span></label>
                <input v-model="form.proveedor.nombre" type="text" class="modal-input" placeholder="Ej: Distribuidora Norte" />
              </div>
              <div class="modal-field">
                <label class="modal-label">Contacto</label>
                <input v-model="form.proveedor.contacto" type="text" class="modal-input" placeholder="Ej: Juan Pérez" />
              </div>
              <div class="modal-row">
                <div class="modal-field">
                  <label class="modal-label">Teléfono</label>
                  <input v-model="form.proveedor.telefono" type="text" class="modal-input" placeholder="Ej: 77712345" />
                </div>
                <div class="modal-field">
                  <label class="modal-label">Email</label>
                  <input v-model="form.proveedor.email" type="email" class="modal-input" placeholder="prov@mail.com" />
                </div>
              </div>
              <div class="modal-field">
                <label class="modal-label">Dirección</label>
                <input v-model="form.proveedor.direccion" type="text" class="modal-input" placeholder="Ej: Av. Montes 123, La Paz" />
              </div>
            </template>

            <transition name="fade">
              <div v-if="errorModal" class="msg-error">{{ errorModal }}</div>
            </transition>
          </div>

          <div class="modal-footer">
            <button class="btn-cancelar" @click="cerrarModal" :disabled="guardandoStock">Cancelar</button>
            <button class="btn-confirmar" :disabled="!formularioValido || guardandoStock" @click="confirmarStock">
              {{ guardandoStock ? 'Registrando...' : 'Registrar Movimiento' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ===== MODAL HISTORIAL ===== -->
    <transition name="modal">
      <div v-if="infoVisible" class="modal-overlay" @click.self="cerrarInfo">
        <div class="modal modal-info">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Historial de Movimientos</h3>
              <p class="modal-sub">{{ itemInfo?.nombre }}</p>
            </div>
            <button class="modal-close" @click="cerrarInfo">✕</button>
          </div>

          <div class="modal-body info-body">
            <div v-if="cargandoHistorial" class="info-vacia">
              <div class="spinner spinner-sm"></div>
              <p>Cargando historial...</p>
            </div>
            <div v-else-if="!historialActual || historialActual.length === 0" class="info-vacia">
              <p>Sin movimientos registrados aún.</p>
            </div>
            <div v-else class="historial-list">
              <div v-for="(h, idx) in historialActual" :key="idx" class="historial-item">
                <div class="historial-top">
                  <div class="historial-top-left">
                    <span class="historial-cantidad" :class="Number(h.afecta_stock) > 0 ? 'mov-entrada' : 'mov-salida'">
                      {{ Number(h.afecta_stock) > 0 ? '+' : '-' }}{{ h.cantidad }} {{ itemInfo?.unidad_medida }}
                    </span>
                    <span class="historial-tipo">{{ h.tipo_nombre || 'MOVIMIENTO' }}</span>
                  </div>
                  <span class="historial-fecha">{{ formatFecha(h.fecha) }}</span>
                </div>
                <div class="historial-grid">
                  <div v-if="h.proveedor_nombre" class="h-field"><span class="h-label">Proveedor</span><span class="h-value">{{ h.proveedor_nombre }}</span></div>
                  <div v-if="h.contacto"         class="h-field"><span class="h-label">Contacto</span><span class="h-value">{{ h.contacto }}</span></div>
                  <div v-if="h.telefono"         class="h-field"><span class="h-label">Teléfono</span><span class="h-value">{{ h.telefono }}</span></div>
                  <div v-if="h.email"            class="h-field"><span class="h-label">Email</span><span class="h-value">{{ h.email }}</span></div>
                  <div v-if="h.direccion"        class="h-field h-field-full"><span class="h-label">Dirección</span><span class="h-value">{{ h.direccion }}</span></div>
                  <div v-if="h.lote"             class="h-field"><span class="h-label">Lote</span><span class="h-value">{{ h.lote }}</span></div>
                  <div v-if="h.costo_unitario"   class="h-field"><span class="h-label">Costo unit.</span><span class="h-value">Bs {{ h.costo_unitario }}</span></div>
                  <div v-if="h.observacion"      class="h-field h-field-full"><span class="h-label">Observación</span><span class="h-value">{{ h.observacion }}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const API = 'http://localhost:3000/api/inventario'

// ─── DATOS DE BD ──────────────────────────────────────
const categorias      = ref([])
const ingredientes    = ref([])
const tiposMovimiento = ref([])
const cargando        = ref(true)
const errorGlobal     = ref('')

onMounted(() => cargarDatos())

async function cargarDatos() {
  cargando.value    = true
  errorGlobal.value = ''
  try {
    const [resCat, resIng, resTipos] = await Promise.all([
      fetch(`${API}/categorias`),
      fetch(`${API}/ingredientes`),
      fetch(`${API}/tipos-movimiento`),
    ])
    if (!resCat.ok || !resIng.ok || !resTipos.ok) throw new Error()
    categorias.value      = await resCat.json()
    ingredientes.value    = await resIng.json()
    tiposMovimiento.value = await resTipos.json()
  } catch {
    errorGlobal.value = 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.'
  } finally {
    cargando.value = false
  }
}

// ─── FILTROS ──────────────────────────────────────────
const categoriaActiva = ref(null)

const ingredientesFiltrados = computed(() => {
  if (categoriaActiva.value === null) return ingredientes.value
  return ingredientes.value.filter(i => i.id_categoria_ingrediente === categoriaActiva.value)
})

function getNombreCategoria(id) {
  return categorias.value.find(c => c.id_categoria_ingrediente === id)?.nombre || '—'
}

// ─── UNIDADES ─────────────────────────────────────────
const unidades = [
  { valor: 'kg',  label: 'kg'  },
  { valor: 'g',   label: 'g'   },
  { valor: 'l',   label: 'l'   },
  { valor: 'ml',  label: 'ml'  },
  { valor: 'u',   label: 'u'   },
  { valor: 'lb',  label: 'lb'  },
  { valor: 'doc', label: 'doc' },
]

// ─── MODAL NUEVO INGREDIENTE ──────────────────────────
const modalNuevoVisible = ref(false)
const guardandoNuevo    = ref(false)
const errorNuevo        = ref('')
const nuevoForm = ref({
  nombre: '', unidad_medida: '', id_categoria_ingrediente: null,
  stock_minimo: null, costo_unitario: null, descripcion: ''
})

const costoTotalCalculado = computed(() => {
  const c = nuevoForm.value.costo_unitario
  const s = nuevoForm.value.stock_minimo
  if (!c || !s) return 'Bs 0.00'
  return `Bs ${(c * s).toFixed(2)}`
})

const nuevoFormValido = computed(() =>
  nuevoForm.value.nombre.trim() &&
  nuevoForm.value.unidad_medida &&
  nuevoForm.value.id_categoria_ingrediente
)

function abrirModalNuevo() {
  nuevoForm.value = { nombre: '', unidad_medida: '', id_categoria_ingrediente: null, stock_minimo: null, costo_unitario: null, descripcion: '' }
  errorNuevo.value = ''
  modalNuevoVisible.value = true
}
function cerrarModalNuevo() { modalNuevoVisible.value = false }

async function guardarIngrediente() {
  if (!nuevoFormValido.value) return
  guardandoNuevo.value = true
  errorNuevo.value     = ''
  try {
    const res = await fetch(`${API}/ingredientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre:                   nuevoForm.value.nombre.trim(),
        unidad_medida:            nuevoForm.value.unidad_medida,
        stock_minimo:             nuevoForm.value.stock_minimo             || 0,
        costo_unitario_avg:       nuevoForm.value.costo_unitario           || 0,
        descripcion:              nuevoForm.value.descripcion              || null,
        id_categoria_ingrediente: nuevoForm.value.id_categoria_ingrediente,
        activo: true,
      })
    })
    const data = await res.json()
    if (!res.ok) { errorNuevo.value = data.error || 'Error al guardar'; return }
    ingredientes.value.push(data)
    cerrarModalNuevo()
  } catch {
    errorNuevo.value = 'No se pudo conectar con el servidor'
  } finally {
    guardandoNuevo.value = false
  }
}

// ─── MODAL MOVIMIENTO ─────────────────────────────────
const modalVisible     = ref(false)
const itemSeleccionado = ref(null)
const guardandoStock   = ref(false)
const errorModal       = ref('')
const movimientosPorItem = ref({})

const form = ref({
  id_tipo_movimi: null,
  cantidad: null, costo_unitario: null, lote: '', observacion: '',
  proveedor: { nombre: '', contacto: '', telefono: '', email: '', direccion: '' }
})

const tipoMovimientoActual = computed(() =>
  tiposMovimiento.value.find(t => t.id_tipo_movimiento === form.value.id_tipo_movimi)
)

const formularioValido = computed(() => {
  if (!form.value.cantidad || form.value.cantidad <= 0) return false
  if (!form.value.id_tipo_movimi) return false
  if (form.value.id_tipo_movimi === 1 && !form.value.proveedor.nombre.trim()) return false
  return true
})

function abrirModal(item) {
  itemSeleccionado.value = item
  form.value = {
    id_tipo_movimi: tiposMovimiento.value[0]?.id_tipo_movimiento || null,
    cantidad: null, costo_unitario: null, lote: '', observacion: '',
    proveedor: { nombre: '', contacto: '', telefono: '', email: '', direccion: '' }
  }
  errorModal.value   = ''
  modalVisible.value = true
}
function cerrarModal() { modalVisible.value = false }

async function confirmarStock() {
  if (!formularioValido.value) return
  guardandoStock.value = true
  errorModal.value     = ''
  try {
    const res = await fetch(`${API}/ingredientes/${itemSeleccionado.value.id_insumo}/movimientos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_tipo_movimi: form.value.id_tipo_movimi,
        cantidad:       form.value.cantidad,
        costo_unitario: form.value.costo_unitario || null,
        lote:           form.value.lote           || null,
        observacion:    form.value.observacion     || null,
        proveedor:      form.value.id_tipo_movimi === 1 ? form.value.proveedor : null,
      })
    })
    const data = await res.json()
    if (!res.ok) { errorModal.value = data.error || 'Error al registrar'; return }

    // Actualizar stock local
    const tipo = tipoMovimientoActual.value
    const item = ingredientes.value.find(i => i.id_insumo === itemSeleccionado.value.id_insumo)
    if (item && tipo) {
      item.stock_actual = Math.max(0, Number(item.stock_actual) + (Number(tipo.afecta_stock) * Number(form.value.cantidad)))
      item.agotado = item.stock_actual <= 0
    }
    if (!movimientosPorItem.value[itemSeleccionado.value.id_insumo])
      movimientosPorItem.value[itemSeleccionado.value.id_insumo] = [true]

    cerrarModal()
  } catch {
    errorModal.value = 'No se pudo conectar con el servidor'
  } finally {
    guardandoStock.value = false
  }
}

// ─── HISTORIAL ────────────────────────────────────────
const infoVisible       = ref(false)
const itemInfo          = ref(null)
const historialActual   = ref([])
const cargandoHistorial = ref(false)

async function abrirInfo(item) {
  itemInfo.value          = item
  infoVisible.value       = true
  historialActual.value   = []
  cargandoHistorial.value = true
  try {
    const res  = await fetch(`${API}/ingredientes/${item.id_insumo}/movimientos`)
    const data = await res.json()
    historialActual.value = data
    movimientosPorItem.value[item.id_insumo] = data
  } catch {
    historialActual.value = []
  } finally {
    cargandoHistorial.value = false
  }
}
function cerrarInfo() { infoVisible.value = false }

function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  const d = new Date(fechaStr)
  return `${d.toLocaleDateString('es-BO', { day:'2-digit', month:'2-digit', year:'numeric' })} · ${d.toLocaleTimeString('es-BO', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}`
}
</script>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.inventario-wrapper {
  padding: 24px 32px;
  background: #f9f9f9;
  min-height: 100%;
  font-family: 'Segoe UI', 'Helvetica Neue', sans-serif;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── HEADER ────────────────────────────── */
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px; gap: 12px;
}
.section-header-left { display: flex; align-items: center; gap: 12px; }
.section-title { font-size: 26px; font-weight: 900; color: #1a1a1a; letter-spacing: -0.5px; }
.section-badge {
  background: #D90B31; color: #F2E205;
  font-size: 11px; font-weight: 800; letter-spacing: 1px;
  text-transform: uppercase; padding: 3px 10px;
  border-radius: 20px;
}

.btn-nuevo {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 20px;
  background: #D90B31; color: #fff;
  border: none; font-size: 13px; font-weight: 800;
  letter-spacing: 0.4px; cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap; border-radius: 6px;
}
.btn-nuevo:hover { background: #b50826; }
.btn-nuevo-icon { font-size: 16px; font-weight: 900; }

/* ── FILTROS PILL ──────────────────────── */
.cat-bar {
  display: flex; gap: 6px; flex-wrap: wrap;
  padding: 14px 0 16px;
  border-bottom: 1px solid #e8e8e8;
  margin-bottom: 16px;
}

.filtro-btn {
  padding: 6px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  background: #fff;
  font-size: 12px; font-weight: 700; color: #666;
  cursor: pointer; transition: all 0.15s ease;
  text-transform: uppercase; letter-spacing: 0.3px;
}
.filtro-btn:hover { border-color: #D90B31; color: #D90B31; background: rgba(217,11,49,0.05); }
.filtro-btn.active { background: #D90B31; border-color: #D90B31; color: #F2CB05; }

/* ── ESTADOS ───────────────────────────── */
.estado-carga, .estado-error {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 60px 20px; color: #888; font-size: 14px; font-weight: 600;
}
.estado-error { color: #c0392b; flex-direction: column; }
.spinner      { width: 22px; height: 22px; border: 3px solid #e0e0e0; border-top-color: #D90B31; border-radius: 50%; animation: spin 0.7s linear infinite; }
.spinner-sm   { width: 16px; height: 16px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── CARD ──────────────────────────────── */
.card { background: #fff; border: 1.5px solid #e8e8e8; box-shadow: 0 2px 16px rgba(0,0,0,0.06); border-radius: 6px; }
.card-header { padding: 20px 24px 0; margin-bottom: 16px; }
.card-title { font-size: 18px; font-weight: 800; color: #1a1a1a; margin-bottom: 10px; }
.card-title-line { height: 3px; width: 48px; background: #D90B31; border-radius: 2px; }

/* ── LISTA ─────────────────────────────── */
.ingrediente-list { padding: 0 16px 16px; }
.list-group { display: flex; flex-direction: column; gap: 8px; }

.ingrediente-row {
  display: flex; align-items: center; justify-content: space-between;
  background: #fafafa;
  border: 1.5px solid #ebebeb;
  border-radius: 6px;
  padding: 14px 18px;
  transition: border-color 0.2s, box-shadow 0.2s; gap: 12px;
}
.ingrediente-row:hover { border-color: #D90B31; box-shadow: 0 2px 10px rgba(217,11,49,0.08); }

.ingrediente-info { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
.ingrediente-top  { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ingrediente-nombre { font-size: 15px; font-weight: 700; color: #1a1a1a; }

.cat-tag {
  font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;
  background: #f0f0f0; color: #888; padding: 2px 8px; border-radius: 4px;
}
.badge-inactivo {
  font-size: 10px; font-weight: 900; background: #888; color: #fff;
  padding: 2px 8px; letter-spacing: 1px; text-transform: uppercase; border-radius: 4px;
}

.stock-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.stock-item { font-size: 12px; color: #888; font-weight: 500; }
.stock-sep  { color: #ddd; font-size: 12px; }
.stock-ok   { color: #D90B31; font-weight: 800; }
.stock-cero { color: #aaa;    font-weight: 800; }

.stock-bajo-parpadeo { animation: parpadeo 1.2s ease-in-out infinite; color: #D90404; font-weight: 700; }
@keyframes parpadeo { 0%,100% { opacity:1; } 50% { opacity:0.2; } }

.badge-agotado    { font-size: 10px; font-weight: 900; letter-spacing: 1px; background: #D90404; color: #fff; padding: 2px 8px; text-transform: uppercase; border-radius: 4px; }
.badge-disponible { font-size: 10px; font-weight: 800; letter-spacing: 0.8px; background: #edfaf1; color: #1a7a3c; padding: 2px 8px; border: 1px solid #b2e8c6; text-transform: uppercase; border-radius: 4px; }

.ingrediente-acciones { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.btn-info {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1.5px solid #ebebeb; background: #f5f5f5; color: #555;
  font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; flex-shrink: 0; padding: 0;
}
.btn-info:hover { border-color: #1a1a1a; color: #1a1a1a; background: #eeeeee; }
.btn-info-active { border-color: #D90B31; color: #D90B31; background: rgba(217,11,49,0.03); }

.btn-agregar-stock {
  padding: 8px 16px; background: #1a1a1a; color: #F2E205;
  border: 1.5px solid #1a1a1a;
  border-radius: 6px;
  font-size: 12px; font-weight: 700;
  letter-spacing: 0.5px; text-transform: uppercase; cursor: pointer;
  transition: background 0.2s; white-space: nowrap;
}
.btn-agregar-stock:hover { background: #D90B31; border-color: #D90B31; color: #fff; }

.lista-vacia { display: flex; flex-direction: column; align-items: center; padding: 40px 20px; text-align: center; gap: 8px; }
.vacia-icon { font-size: 40px; }
.lista-vacia p { font-size: 14px; font-weight: 600; color: #bbb; }

/* ── MODAL BASE ────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center; z-index: 999;
}
.modal {
  background: #fff; width: 100%; max-width: 480px;
  border-top: 4px solid #D90B31;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  max-height: 90vh; display: flex; flex-direction: column;
}
.modal-nuevo { max-width: 520px; }
.modal-stock { max-width: 520px; }
.modal-info  { max-width: 540px; }

.modal-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 24px 16px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0;
}
.modal-title    { font-size: 18px; font-weight: 900; color: #1a1a1a; }
.modal-sub      { font-size: 12px; color: #D90B31; font-weight: 700; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
.modal-sub-gray { font-size: 12px; color: #aaa; font-weight: 500; margin-top: 3px; }
.modal-close    { background: none; border: none; font-size: 16px; color: #aaa; cursor: pointer; padding: 2px 6px; transition: color 0.2s; }
.modal-close:hover { color: #D90B31; }

.modal-body    { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
.modal-divider { font-size: 10px; font-weight: 800; color: #888; text-transform: uppercase; letter-spacing: 1.2px; padding-top: 4px; border-top: 1px solid #f0f0f0; }
.modal-row     { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.modal-field   { display: flex; flex-direction: column; gap: 6px; }
.modal-label   { font-size: 10px; font-weight: 800; color: #666; text-transform: uppercase; letter-spacing: 0.8px; }
.req { color: #D90B31; }

.modal-input {
  padding: 9px 12px; border: 1.5px solid #e0e0e0; border-radius: 4px;
  font-size: 13px; font-family: inherit; color: #1a1a1a;
  background: #fafafa; outline: none; transition: border-color 0.2s; width: 100%;
}
.modal-input:focus { border-color: #D90B31; background: #fff; }
.modal-input::placeholder { color: #c0c0c0; font-style: italic; }

.modal-textarea {
  padding: 9px 12px; border: 1.5px solid #e0e0e0; border-radius: 4px;
  font-size: 13px; font-family: inherit; color: #1a1a1a;
  background: #fafafa; outline: none; resize: vertical; min-height: 64px;
  transition: border-color 0.2s;
}
.modal-textarea:focus { border-color: #D90B31; background: #fff; }
.modal-textarea::placeholder { color: #c0c0c0; font-style: italic; }

.costo-total-display {
  padding: 9px 12px; border: 1.5px solid #F2E205; border-radius: 4px;
  background: #fffde6; font-size: 15px; font-weight: 800; color: #1a1a1a;
}

/* Tabs */
.tab-group { display: flex; flex-wrap: wrap; gap: 6px; }
.tab-btn {
  padding: 6px 13px; border: 1.5px solid #e0e0e0; border-radius: 20px;
  background: #fff; color: #666;
  font-size: 11px; font-weight: 700; cursor: pointer;
  transition: all 0.15s; text-transform: uppercase; letter-spacing: 0.5px;
}
.tab-btn:hover { border-color: #D90B31; color: #D90B31; }
.tab-btn-active { background: #D90B31; color: #F2CB05; border-color: #D90B31; }

/* Tipo movimiento */
.tipo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.tipo-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 8px; border: 1.5px solid #e0e0e0; border-radius: 6px;
  background: #fafafa; cursor: pointer; transition: all 0.15s;
}
.tipo-btn:hover { border-color: #1a1a1a; }
.tipo-flecha { font-size: 14px; font-weight: 900; }
.tipo-nombre { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; color: #555; }
.tipo-entrada .tipo-flecha { color: #1a7a3c; }
.tipo-salida  .tipo-flecha { color: #c0392b; }
.tipo-btn-active.tipo-entrada { background: #1a1a1a; border-color: #1a1a1a; }
.tipo-btn-active.tipo-entrada .tipo-flecha,
.tipo-btn-active.tipo-entrada .tipo-nombre { color: #F2E205; }
.tipo-btn-active.tipo-salida  { background: #D90B31; border-color: #D90B31; }
.tipo-btn-active.tipo-salida  .tipo-flecha,
.tipo-btn-active.tipo-salida  .tipo-nombre { color: #fff; }

/* Input con unidad */
.input-with-unit { display: flex; align-items: stretch; }
.input-with-unit .modal-input { border-right: none; border-radius: 4px 0 0 4px; flex: 1; }
.unit-badge {
  padding: 0 10px; background: #1a1a1a; color: #F2E205;
  font-size: 12px; font-weight: 800; display: flex; align-items: center;
  border: 1.5px solid #1a1a1a; border-radius: 0 4px 4px 0; white-space: nowrap;
}

.modal-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 24px 20px; border-top: 1px solid #f0f0f0; flex-shrink: 0;
}
.btn-cancelar  { padding: 9px 20px; background: #f0f0f0; color: #666; border: 1.5px solid #e0e0e0; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
.btn-cancelar:hover:not(:disabled)  { background: #e0e0e0; }
.btn-confirmar { padding: 9px 22px; background: #D90B31; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 800; cursor: pointer; letter-spacing: 0.3px; transition: background 0.2s; }
.btn-confirmar:hover:not(:disabled) { background: #b50826; }
.btn-confirmar:disabled, .btn-cancelar:disabled { opacity: 0.5; cursor: not-allowed; }

.msg-error { padding: 9px 14px; font-size: 13px; font-weight: 700; background: #fef0f0; color: #c0392b; border: 1px solid #f5c0c0; border-radius: 4px; }

/* Historial */
.info-body { gap: 0; padding: 0; }
.info-vacia { padding: 40px 24px; text-align: center; color: #bbb; font-size: 14px; font-weight: 600; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.historial-list { display: flex; flex-direction: column; }
.historial-item { padding: 16px 24px; border-bottom: 1px solid #f0f0f0; }
.historial-item:last-child { border-bottom: none; }
.historial-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.historial-top-left { display: flex; align-items: center; gap: 8px; }
.historial-cantidad { font-size: 14px; font-weight: 900; color: #fff; padding: 2px 10px; border-radius: 4px; }
.mov-entrada { background: #1a7a3c; }
.mov-salida  { background: #D90404; }
.historial-tipo { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #888; background: #f0f0f0; padding: 2px 8px; border-radius: 4px; }
.historial-fecha { font-size: 11px; color: #aaa; font-weight: 600; }
.historial-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.h-field { display: flex; flex-direction: column; gap: 2px; }
.h-field-full { grid-column: 1 / -1; }
.h-label { font-size: 10px; font-weight: 800; color: #aaa; text-transform: uppercase; letter-spacing: 0.8px; }
.h-value { font-size: 13px; font-weight: 600; color: #1a1a1a; }

/* Transitions */
.list-enter-active { transition: all 0.28s ease; }
.list-enter-from   { opacity: 0; transform: translateY(-8px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
.modal-enter-active, .modal-leave-active { transition: opacity 0.22s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; }
</style>