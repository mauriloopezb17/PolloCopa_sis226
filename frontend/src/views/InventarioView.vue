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

    <div class="main-grid">

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Inventario Actual</h2>
          <div class="card-title-line"></div>
        </div>

        <div class="ingrediente-list">
          <transition-group name="list" tag="div" class="list-group">
            <div v-for="item in ingredientes" :key="item.id" class="ingrediente-row">
              <div class="ingrediente-info">
                <span class="ingrediente-nombre">{{ item.nombre }}</span>
                <span class="ingrediente-stock">
                  Stock:
                  <strong :class="item.stock === 0 ? 'stock-cero' : 'stock-ok'">
                    {{ item.stock }}
                  </strong>
                  unidades
                </span>
              </div>
              <div class="ingrediente-acciones">
                <button
                  class="btn-info"
                  :class="{ 'btn-info-active': item.historial && item.historial.length > 0 }"
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
          />
          <button class="btn-agregar" :disabled="!nuevoNombre.trim()" @click="agregarIngrediente">
            Agregar
          </button>
        </div>

        <transition name="fade">
          <div v-if="mensajeExito" class="mensaje-exito">Ingrediente agregado correctamente</div>
        </transition>
        <transition name="fade">
          <div v-if="mensajeError" class="mensaje-error">Ya existe un ingrediente con ese nombre</div>
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
          </div>

          <div class="modal-footer">
            <button class="btn-cancelar" @click="cerrarModal">Cancelar</button>
            <button class="btn-confirmar" :disabled="!formularioValido" @click="confirmarStock">
              Guardar
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
            <div v-if="!itemInfo?.historial || itemInfo.historial.length === 0" class="info-vacia">
              <p>Sin registros de stock aún.</p>
            </div>

            <div v-else class="historial-list">
              <div v-for="(h, idx) in [...itemInfo.historial].reverse()" :key="idx" class="historial-item">
                <div class="historial-top">
                  <span class="historial-cantidad">+{{ h.cantidad }} unidades</span>
                  <span class="historial-fecha">{{ h.fecha }}</span>
                </div>
                <div class="historial-grid">
                  <div class="h-field"><span class="h-label">Proveedor</span><span class="h-value">{{ h.nombre }}</span></div>
                  <div class="h-field"><span class="h-label">Contacto</span><span class="h-value">{{ h.contacto }}</span></div>
                  <div class="h-field"><span class="h-label">Teléfono</span><span class="h-value">{{ h.telefono }}</span></div>
                  <div class="h-field"><span class="h-label">Email</span><span class="h-value">{{ h.email }}</span></div>
                  <div class="h-field h-field-full"><span class="h-label">Dirección</span><span class="h-value">{{ h.direccion }}</span></div>
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
import { ref, computed } from 'vue'

const nuevoNombre  = ref('')
const mensajeExito = ref(false)
const mensajeError = ref(false)
let   mensajeTimer = null

const sugerencias = ['Pollo Fresco', 'Huevos', 'Pan Molido', 'Lechuga', 'Tomate', 'Papas']

const ingredientes = ref([
  { id: 1, nombre: 'Pollo Fresco', stock: 25,  historial: [] },
  { id: 2, nombre: 'Huevos',       stock: 120, historial: [] },
  { id: 3, nombre: 'Pan Molido',   stock: 8,   historial: [] },
  { id: 4, nombre: 'Lechuga',      stock: 5,   historial: [] },
])

const modalVisible     = ref(false)
const itemSeleccionado = ref(null)
const form = ref({ cantidad: null, nombre: '', contacto: '', telefono: '', email: '', direccion: '' })

const formularioValido = computed(() =>
  form.value.cantidad > 0 &&
  form.value.nombre.trim() &&
  form.value.contacto.trim() &&
  form.value.telefono.trim() &&
  form.value.email.trim() &&
  form.value.direccion.trim()
)

const infoVisible = ref(false)
const itemInfo    = ref(null)

function agregarIngrediente() {
  const nombre = nuevoNombre.value.trim()
  if (!nombre) return
  const existe = ingredientes.value.some(i => i.nombre.toLowerCase() === nombre.toLowerCase())
  if (existe) { mostrarMensaje('error'); return }
  ingredientes.value.push({ id: Date.now(), nombre, stock: 0, historial: [] })
  nuevoNombre.value = ''
  mostrarMensaje('exito')
}

function abrirModal(item) {
  itemSeleccionado.value = item
  form.value = { cantidad: null, nombre: '', contacto: '', telefono: '', email: '', direccion: '' }
  modalVisible.value = true
}

function cerrarModal() { modalVisible.value = false }

function confirmarStock() {
  if (!formularioValido.value) return
  const ahora = new Date()
  const fecha = ahora.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora  = ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  itemSeleccionado.value.stock += form.value.cantidad
  itemSeleccionado.value.historial.push({
    cantidad:  form.value.cantidad,
    nombre:    form.value.nombre.trim(),
    contacto:  form.value.contacto.trim(),
    telefono:  form.value.telefono.trim(),
    email:     form.value.email.trim(),
    direccion: form.value.direccion.trim(),
    fecha:     `${fecha} · ${hora}`,
  })
  cerrarModal()
}

function abrirInfo(item) {
  itemInfo.value    = item
  infoVisible.value = true
}

function cerrarInfo() { infoVisible.value = false }

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

/* BOTÓN INFO AJUSTADO (CIRCULAR Y OSCURO) */
.btn-info {
  width: 32px; height: 32px; /* Tamaño del botón */
  border-radius: 50%; /* Redondo */
  border: 1.5px solid #ebebeb;
  background: #f5f5f5; /* Fondo gris suave por defecto */
  color: #555; /* Icono gris oscuro (carbón) */
  font-size: 14px; /* Icono más pequeño */
  cursor: pointer;
  display: flex; 
  align-items: center; 
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  padding: 0;
}
.btn-info:hover { 
  border-color: #1a1a1a; 
  color: #1a1a1a; /* Negro al pasar el mouse */
  background: #eeeeee; 
}
.btn-info-active { 
  border-color: #D90B31; 
  color: #D90B31; /* Rojo cuando hay historial */
  background: rgba(217,11,49,0.03); 
}
.btn-info-active:hover { 
  border-color: #b50826; 
  color: #b50826; 
}

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
  background: #fff;
  width: 100%; max-width: 480px;
  border-top: 4px solid #D90B31;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  max-height: 90vh;
  display: flex; flex-direction: column;
}

.modal-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.modal-title { font-size: 18px; font-weight: 900; color: #1a1a1a; letter-spacing: -0.3px; }
.modal-sub { font-size: 12px; color: #D90B31; font-weight: 700; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
.modal-close { background: none; border: none; font-size: 16px; color: #aaa; cursor: pointer; padding: 2px 6px; transition: color 0.2s; }
.modal-close:hover { color: #D90B31; }

.modal-body {
  padding: 20px 24px;
  display: flex; flex-direction: column; gap: 14px;
  overflow-y: auto;
}

.modal-section-label { font-size: 10px; font-weight: 800; color: #D90B31; text-transform: uppercase; letter-spacing: 1.2px; }
.modal-divider { font-size: 10px; font-weight: 800; color: #888; text-transform: uppercase; letter-spacing: 1.2px; padding-top: 4px; border-top: 1px solid #f0f0f0; }
.modal-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.modal-field { display: flex; flex-direction: column; gap: 5px; }
.modal-label { font-size: 10px; font-weight: 800; color: #666; text-transform: uppercase; letter-spacing: 0.8px; }
.modal-input { padding: 9px 12px; border: 1.5px solid #e0e0e0; font-size: 13px; font-family: inherit; color: #1a1a1a; background: #fafafa; outline: none; transition: border-color 0.2s; }
.modal-input:focus { border-color: #D90B31; background: #fff; }

.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px 20px; border-top: 1px solid #f0f0f0; flex-shrink: 0; }
.btn-cancelar { padding: 9px 20px; background: #f0f0f0; color: #666; border: none; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
.btn-confirmar { padding: 9px 22px; background: #D90B31; color: #fff; border: none; font-size: 13px; font-weight: 800; cursor: pointer; letter-spacing: 0.3px; transition: background 0.2s; }

/* MODAL INFO */
.modal-info { max-width: 520px; }
.info-body { gap: 0; padding: 0; }
.info-vacia { padding: 40px 24px; text-align: center; color: #bbb; font-size: 14px; font-weight: 600; }
.historial-list { display: flex; flex-direction: column; }
.historial-item { padding: 18px 24px; border-bottom: 1px solid #f0f0f0; }
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