<template>
  <div class="inventario-wrapper">

    <div class="section-header">
      <div class="section-header-left">
        <h1 class="section-title">Inventario</h1>
        <span class="section-badge">{{ ingredientes.length }} ingredientes</span>
      </div>
      <div class="section-header-right">
        <span class="section-sub">Gestión de stock · Sucursal principal</span>
      </div>
    </div>

    <!-- LOADING -->
    <div v-if="cargando" class="estado-carga">
      <div class="spinner"></div>
      <span>Cargando inventario...</span>
    </div>

    <!-- ERROR -->
    <div v-else-if="errorGlobal" class="estado-error">
      <span>⚠ {{ errorGlobal }}</span>
      <button @click="cargarIngredientes">Reintentar</button>
    </div>

    <div v-else class="main-grid">

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Inventario Actual</h2>
          <div class="card-title-line"></div>
        </div>

        <div class="ingrediente-list">
          <transition-group name="list" tag="div" class="list-group">
            <div v-for="item in ingredientes" :key="item.id_insumo" class="ingrediente-row">
              <div class="ingrediente-info">
                <span class="ingrediente-nombre">{{ item.nombre }}</span>
                <span class="ingrediente-stock">
                  Stock:
                  <strong :class="item.stock_actual == 0 ? 'stock-cero' : 'stock-ok'">
                    {{ item.stock_actual }}
                  </strong>
                  {{ item.unidad_medida || 'unidades' }}
                </span>
              </div>
              <div class="ingrediente-acciones">
                <button
                  class="btn-info"
                  :class="{ 'btn-info-active': movimientosPorItem[item.id_insumo]?.length > 0 }"
                  @click="abrirInfo(item)"
                  title="Ver historial de proveedores"
                >
                  <i class="fa-solid fa-file-circle-exclamation"></i>
                </button>
                
                <button class="btn-agregar-stock" @click="abrirModal(item)">
                  Agregar Stock
                </button>
              </div>
            </div>
          </transition-group>

          <div v-if="ingredientes.length === 0" class="lista-vacia">
            <span class="vacia-icon">📦</span>
            <p>No hay ingredientes registrados.</p>
            <p class="vacia-sub">Agrega el primero desde el panel derecho.</p>
          </div>
        </div>
      </div>

      <div class="card card-right">
        <div class="card-header">
          <h2 class="card-title">Agregar Ingrediente</h2>
          <div class="card-title-line"></div>
        </div>

        <div class="form-group">
          <input
            v-model="nuevoNombre"
            type="text"
            class="input-nombre"
            placeholder="Ej: Pollo Fresco"
            @keyup.enter="agregarIngrediente"
            :disabled="guardandoIngrediente"
          />
          <button class="btn-agregar" :disabled="!nuevoNombre.trim() || guardandoIngrediente" @click="agregarIngrediente">
            {{ guardandoIngrediente ? '...' : 'Agregar' }}
          </button>
        </div>

        <transition name="fade">
          <div v-if="mensajeExito" class="mensaje-exito">Ingrediente agregado correctamente</div>
        </transition>
        <transition name="fade">
          <div v-if="mensajeError" class="mensaje-error">{{ mensajeErrorTexto }}</div>
        </transition>

        <div class="sugerencias">
          <p class="sugerencias-title">Ingredientes de ejemplo:</p>
          <ul>
            <li v-for="s in sugerencias" :key="s" class="sugerencia-item" @click="nuevoNombre = s">{{ s }}</li>
          </ul>
        </div>
      </div>
    </div>

    <transition name="modal">
      <div v-if="modalVisible" class="modal-overlay" @click.self="cerrarModal">
        <div class="modal">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Agregar Stock</h3>
              <p class="modal-sub">{{ itemSeleccionado?.nombre }}</p>
            </div>
            <button class="modal-close" @click="cerrarModal">✕</button>
          </div>

          <div class="modal-body">
            <div class="modal-section-label">Datos del ingreso</div>
            <div class="modal-field">
              <label class="modal-label">Cantidad a agregar</label>
              <input v-model.number="form.cantidad" type="number" min="1" class="modal-input" placeholder="Ej: 50" />
            </div>

            <div class="modal-divider">Datos del proveedor</div>

            <div class="modal-field">
              <label class="modal-label">Nombre</label>
              <input v-model="form.nombre" type="text" class="modal-input" placeholder="Ej: Distribuidora Norte" />
            </div>
            <div class="modal-field">
              <label class="modal-label">Contacto</label>
              <input v-model="form.contacto" type="text" class="modal-input" placeholder="Ej: Juan Pérez" />
            </div>
            <div class="modal-row">
              <div class="modal-field">
                <label class="modal-label">Teléfono</label>
                <input v-model="form.telefono" type="text" class="modal-input" placeholder="Ej: 77712345" />
              </div>
              <div class="modal-field">
                <label class="modal-label">Email</label>
                <input v-model="form.email" type="email" class="modal-input" placeholder="proveedor@mail.com" />
              </div>
            </div>
            <div class="modal-field">
              <label class="modal-label">Dirección</label>
              <input v-model="form.direccion" type="text" class="modal-input" placeholder="Ej: Av. Montes 123, La Paz" />
            </div>

            <transition name="fade">
              <div v-if="errorModal" class="mensaje-error" style="margin:0">{{ errorModal }}</div>
            </transition>
          </div>

          <div class="modal-footer">
            <button class="btn-cancelar" @click="cerrarModal" :disabled="guardandoStock">Cancelar</button>
            <button class="btn-confirmar" :disabled="!formularioValido || guardandoStock" @click="confirmarStock">
              {{ guardandoStock ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="modal">
      <div v-if="infoVisible" class="modal-overlay" @click.self="cerrarInfo">
        <div class="modal modal-info">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Historial de Proveedores</h3>
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
              <p>Sin registros de stock aún.</p>
            </div>

            <div v-else class="historial-list">
              <div v-for="(h, idx) in historialActual" :key="idx" class="historial-item">
                <div class="historial-top">
                  <span class="historial-cantidad">+{{ h.cantidad }} unidades</span>
                  <span class="historial-fecha">{{ formatFecha(h.fecha) }}</span>
                </div>
                <div class="historial-grid">
                  <div class="h-field"><span class="h-label">Proveedor</span><span class="h-value">{{ h.proveedor_nombre || '—' }}</span></div>
                  <div class="h-field"><span class="h-label">Contacto</span><span class="h-value">{{ h.contacto || '—' }}</span></div>
                  <div class="h-field"><span class="h-label">Teléfono</span><span class="h-value">{{ h.telefono || '—' }}</span></div>
                  <div class="h-field"><span class="h-label">Email</span><span class="h-value">{{ h.email || '—' }}</span></div>
                  <div class="h-field h-field-full"><span class="h-label">Dirección</span><span class="h-value">{{ h.direccion || '—' }}</span></div>
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

// Estado principal
const ingredientes        = ref([])
const cargando            = ref(true)
const errorGlobal         = ref('')
const movimientosPorItem  = ref({})

// Agregar ingrediente
const nuevoNombre          = ref('')
const mensajeExito         = ref(false)
const mensajeError         = ref(false)
const mensajeErrorTexto    = ref('')
const guardandoIngrediente = ref(false)
let   mensajeTimer         = null

const sugerencias = ['Pollo Fresco', 'Huevos', 'Pan Molido', 'Lechuga', 'Tomate', 'Papas']

// Modal stock
const modalVisible     = ref(false)
const itemSeleccionado = ref(null)
const guardandoStock   = ref(false)
const errorModal       = ref('')
const form = ref({
  cantidad: null, nombre: '', contacto: '', telefono: '', email: '', direccion: ''
})

const formularioValido = computed(() =>
  form.value.cantidad > 0 &&
  form.value.nombre.trim() &&
  form.value.contacto.trim() &&
  form.value.telefono.trim() &&
  form.value.email.trim() &&
  form.value.direccion.trim()
)

// Info / historial
const infoVisible       = ref(false)
const itemInfo          = ref(null)
const historialActual   = ref([])
const cargandoHistorial = ref(false)

// Carga inicial
onMounted(() => cargarIngredientes())

async function cargarIngredientes() {
  cargando.value = true
  errorGlobal.value = ''
  try {
    const res = await fetch(`${API}/ingredientes`)
    if (!res.ok) throw new Error()
    ingredientes.value = await res.json()
  } catch {
    errorGlobal.value = 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.'
  } finally {
    cargando.value = false
  }
}

// HU-01: Crear ingrediente
async function agregarIngrediente() {
  const nombre = nuevoNombre.value.trim()
  if (!nombre) return
  guardandoIngrediente.value = true
  try {
    const res = await fetch(`${API}/ingredientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre })
    })
    const data = await res.json()
    if (!res.ok) {
      mensajeErrorTexto.value = data.error || 'Error al guardar'
      mostrarMensaje('error')
      return
    }
    ingredientes.value.push(data)
    nuevoNombre.value = ''
    mostrarMensaje('exito')
  } catch {
    mensajeErrorTexto.value = 'No se pudo conectar con el servidor'
    mostrarMensaje('error')
  } finally {
    guardandoIngrediente.value = false
  }
}

// HU-02: Agregar stock
function abrirModal(item) {
  itemSeleccionado.value = item
  form.value = { cantidad: null, nombre: '', contacto: '', telefono: '', email: '', direccion: '' }
  errorModal.value = ''
  modalVisible.value = true
}

function cerrarModal() { modalVisible.value = false }

async function confirmarStock() {
  if (!formularioValido.value) return
  guardandoStock.value = true
  errorModal.value = ''
  try {
    const res = await fetch(`${API}/ingredientes/${itemSeleccionado.value.id_insumo}/movimientos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cantidad: form.value.cantidad,
        proveedor: {
          nombre:    form.value.nombre,
          contacto:  form.value.contacto,
          telefono:  form.value.telefono,
          email:     form.value.email,
          direccion: form.value.direccion,
        }
      })
    })
    const data = await res.json()
    if (!res.ok) {
      errorModal.value = data.error || 'Error al guardar'
      return
    }
    // Actualizar stock localmente
    const item = ingredientes.value.find(i => i.id_insumo === itemSeleccionado.value.id_insumo)
    if (item) item.stock_actual = Number(item.stock_actual) + Number(form.value.cantidad)
    // Marcar que tiene historial
    if (!movimientosPorItem.value[itemSeleccionado.value.id_insumo]) {
      movimientosPorItem.value[itemSeleccionado.value.id_insumo] = [true]
    }
    cerrarModal()
  } catch {
    errorModal.value = 'No se pudo conectar con el servidor'
  } finally {
    guardandoStock.value = false
  }
}

// Info historial
async function abrirInfo(item) {
  itemInfo.value      = item
  infoVisible.value   = true
  historialActual.value = []
  cargandoHistorial.value = true
  try {
    const res = await fetch(`${API}/ingredientes/${item.id_insumo}/movimientos`)
    if (!res.ok) throw new Error()
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
  const fecha = d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora  = d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return `${fecha} · ${hora}`
}

function mostrarMensaje(tipo) {
  clearTimeout(mensajeTimer)
  mensajeExito.value = false
  mensajeError.value = false
  if (tipo === 'exito') mensajeExito.value = true
  if (tipo === 'error') mensajeError.value = true
  mensajeTimer = setTimeout(() => {
    mensajeExito.value = false
    mensajeError.value = false
  }, 2500)
}
</script>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.inventario-wrapper {
  padding: 28px 32px;
  background: #F2F2F2;
  min-height: 100%;
  font-family: 'Segoe UI', 'Helvetica Neue', sans-serif;
}

/* HEADER */
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.section-header-left { display: flex; align-items: center; gap: 12px; }
.section-title { font-size: 26px; font-weight: 900; color: #1a1a1a; letter-spacing: -0.5px; }
.section-badge { background: #D90B31; color: #F2E205; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 3px 10px; }
.section-sub { font-size: 12px; color: #aaa; font-weight: 500; }

/* ESTADOS */
.estado-carga, .estado-error {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 60px 20px; color: #888; font-size: 14px; font-weight: 600;
}
.estado-error { color: #c0392b; flex-direction: column; }
.estado-error button { padding: 7px 18px; background: #D90B31; color: #fff; border: none; font-size: 13px; font-weight: 700; cursor: pointer; }
.spinner { width: 22px; height: 22px; border: 3px solid #e0e0e0; border-top-color: #D90B31; border-radius: 50%; animation: spin 0.7s linear infinite; }
.spinner-sm { width: 16px; height: 16px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* GRID */
.main-grid { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }

/* CARD */
.card { background: #fff; border: 1.5px solid #e8e8e8; box-shadow: 0 2px 16px rgba(0,0,0,0.06); }
.card-header { padding: 22px 24px 0; margin-bottom: 18px; }
.card-title { font-size: 20px; font-weight: 800; color: #1a1a1a; margin-bottom: 10px; }
.card-title-line { height: 3px; width: 48px; background: #D90B31; }

/* LISTA */
.ingrediente-list { padding: 0 16px 16px; }
.list-group { display: flex; flex-direction: column; gap: 10px; }

.ingrediente-row {
  display: flex; align-items: center; justify-content: space-between;
  background: #fafafa; border: 1.5px solid #ebebeb; padding: 14px 18px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.ingrediente-row:hover { border-color: #D90B31; box-shadow: 0 2px 10px rgba(217,11,49,0.08); }

.ingrediente-info { display: flex; flex-direction: column; gap: 3px; }
.ingrediente-nombre { font-size: 15px; font-weight: 700; color: #1a1a1a; }
.ingrediente-stock { font-size: 12px; color: #888; font-weight: 500; }
.stock-ok   { color: #D90B31; font-weight: 800; }
.stock-cero { color: #aaa;    font-weight: 800; }

.ingrediente-acciones { display: flex; align-items: center; gap: 8px; }

.btn-info {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 1.5px solid #ebebeb;
  background: #f5f5f5;
  color: #555;
  font-size: 14px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  padding: 0;
}
.btn-info:hover { border-color: #1a1a1a; color: #1a1a1a; background: #eeeeee; }
.btn-info-active { border-color: #D90B31; color: #D90B31; background: rgba(217,11,49,0.03); }
.btn-info-active:hover { border-color: #b50826; color: #b50826; }

.btn-agregar-stock {
  padding: 8px 18px; background: #1a1a1a; color: #F2E205;
  border: none; font-size: 12px; font-weight: 700;
  letter-spacing: 0.5px; text-transform: uppercase; cursor: pointer;
  transition: background 0.2s;
}
.btn-agregar-stock:hover { background: #D90B31; color: #fff; }

/* Lista vacía */
.lista-vacia { display: flex; flex-direction: column; align-items: center; padding: 40px 20px; text-align: center; gap: 8px; }
.vacia-icon { font-size: 40px; }
.lista-vacia p { font-size: 14px; font-weight: 600; color: #bbb; }
.vacia-sub { font-size: 12px !important; color: #d0d0d0 !important; }

/* CARD DERECHA */
.card-right { position: sticky; top: 20px; }
.form-group { display: flex; gap: 0; padding: 0 20px; margin-bottom: 14px; }

.input-nombre {
  flex: 1; padding: 10px 14px;
  border: 1.5px solid #e0e0e0; border-right: none;
  font-size: 14px; font-family: inherit; color: #1a1a1a;
  background: #fafafa; outline: none; transition: border-color 0.2s;
}
.input-nombre:focus { border-color: #D90B31; background: #fff; }
.input-nombre::placeholder { color: #c0c0c0; font-style: italic; }

.btn-agregar {
  padding: 10px 18px; background: #D90B31; color: #fff;
  border: none; font-size: 13px; font-weight: 800;
  cursor: pointer; letter-spacing: 0.3px; white-space: nowrap; transition: background 0.2s;
}
.btn-agregar:hover:not(:disabled) { background: #b50826; }
.btn-agregar:disabled { background: #e0a0a8; cursor: not-allowed; }

.mensaje-exito, .mensaje-error { margin: 0 20px 14px; padding: 9px 14px; font-size: 13px; font-weight: 700; }
.mensaje-exito { background: #edfaf1; color: #1a7a3c; border: 1px solid #b2e8c6; }
.mensaje-error { background: #fef0f0; color: #c0392b; border: 1px solid #f5c0c0; }

.sugerencias { margin: 0 20px 20px; background: #fffde6; border: 1.5px solid #F2E205; padding: 14px 16px; }
.sugerencias-title { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; }
.sugerencias ul { list-style: none; display: flex; flex-direction: column; gap: 6px; }
.sugerencia-item { font-size: 13px; color: #444; cursor: pointer; padding: 4px 8px; font-weight: 500; transition: background 0.15s, color 0.15s; }
.sugerencia-item::before { content: '· '; color: #D90B31; font-weight: 900; }
.sugerencia-item:hover { background: #F2E205; color: #1a1a1a; }

/* MODAL */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 999;
}
.modal {
  background: #fff; width: 100%; max-width: 480px;
  border-top: 4px solid #D90B31;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  max-height: 90vh; display: flex; flex-direction: column;
}
.modal-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 24px 16px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0;
}
.modal-title { font-size: 18px; font-weight: 900; color: #1a1a1a; letter-spacing: -0.3px; }
.modal-sub { font-size: 12px; color: #D90B31; font-weight: 700; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
.modal-close { background: none; border: none; font-size: 16px; color: #aaa; cursor: pointer; padding: 2px 6px; transition: color 0.2s; }
.modal-close:hover { color: #D90B31; }

.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
.modal-section-label { font-size: 10px; font-weight: 800; color: #D90B31; text-transform: uppercase; letter-spacing: 1.2px; }
.modal-divider { font-size: 10px; font-weight: 800; color: #888; text-transform: uppercase; letter-spacing: 1.2px; padding-top: 4px; border-top: 1px solid #f0f0f0; }
.modal-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.modal-field { display: flex; flex-direction: column; gap: 5px; }
.modal-label { font-size: 10px; font-weight: 800; color: #666; text-transform: uppercase; letter-spacing: 0.8px; }
.modal-input { padding: 9px 12px; border: 1.5px solid #e0e0e0; font-size: 13px; font-family: inherit; color: #1a1a1a; background: #fafafa; outline: none; transition: border-color 0.2s; }
.modal-input:focus { border-color: #D90B31; background: #fff; }
.modal-input::placeholder { color: #c0c0c0; font-style: italic; }

.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px 20px; border-top: 1px solid #f0f0f0; flex-shrink: 0; }
.btn-cancelar { padding: 9px 20px; background: #f0f0f0; color: #666; border: none; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
.btn-cancelar:hover:not(:disabled) { background: #e0e0e0; }
.btn-confirmar { padding: 9px 22px; background: #D90B31; color: #fff; border: none; font-size: 13px; font-weight: 800; cursor: pointer; letter-spacing: 0.3px; transition: background 0.2s; }
.btn-confirmar:hover:not(:disabled) { background: #b50826; }
.btn-confirmar:disabled, .btn-cancelar:disabled { opacity: 0.5; cursor: not-allowed; }

/* MODAL INFO */
.modal-info { max-width: 520px; }
.info-body { gap: 0; padding: 0; }
.info-vacia { padding: 40px 24px; text-align: center; color: #bbb; font-size: 14px; font-weight: 600; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.historial-list { display: flex; flex-direction: column; }
.historial-item { padding: 18px 24px; border-bottom: 1px solid #f0f0f0; }
.historial-item:last-child { border-bottom: none; }
.historial-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.historial-cantidad { font-size: 15px; font-weight: 900; color: #1a1a1a; background: #F2E205; padding: 2px 10px; }
.historial-fecha { font-size: 11px; color: #aaa; font-weight: 600; letter-spacing: 0.3px; }
.historial-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.h-field { display: flex; flex-direction: column; gap: 2px; }
.h-field-full { grid-column: 1 / -1; }
.h-label { font-size: 10px; font-weight: 800; color: #aaa; text-transform: uppercase; letter-spacing: 0.8px; }
.h-value { font-size: 13px; font-weight: 600; color: #1a1a1a; }

/* TRANSITIONS */
.list-enter-active { transition: all 0.28s ease; }
.list-enter-from   { opacity: 0; transform: translateY(-8px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
.modal-enter-active, .modal-leave-active { transition: opacity 0.22s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; }
</style>