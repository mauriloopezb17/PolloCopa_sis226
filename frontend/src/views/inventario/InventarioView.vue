<template>
  <div class="inventario-wrapper">

    <!-- CAMBIO 3: sub-vistas -->
    <Historialingrediente
      v-if="vistaActual === 'historial'"
      @volver="vistaActual = 'inventario'"
      @ir-merma="vistaActual = 'merma'"
      @ir-valor="vistaActual = 'valor'"
    />
    <Registromerma
      v-else-if="vistaActual === 'merma'"
      @volver="vistaActual = 'inventario'"
      @ir-historial="vistaActual = 'historial'"
      @ir-valor="vistaActual = 'valor'"
    />
    <Valorinventario
      v-else-if="vistaActual === 'valor'"
      @volver="vistaActual = 'inventario'"
      @ir-historial="vistaActual = 'historial'"
      @ir-merma="vistaActual = 'merma'"
    />

    <template v-else>

    <div class="section-header">
      <div class="section-header-left">
        <h1 class="section-title">Inventario</h1>
        <span class="section-badge">{{ ingredientesFiltrados.length }} ingredientes</span>
      </div>
      <div class="section-header-right">
        <button class="btn-musica-inv" @click="toggleMusica" :title="musicaActiva ? 'Pausar música' : 'Reproducir música'">
          <span class="musica-icono">{{ musicaActiva ? '♪' : '♩' }}</span>
          <span class="musica-barra barra-1" :class="{ 'barra-activa': musicaActiva }"></span>
          <span class="musica-barra barra-2" :class="{ 'barra-activa': musicaActiva }"></span>
          <span class="musica-barra barra-3" :class="{ 'barra-activa': musicaActiva }"></span>
        </button>
        <button class="btn-historial" @click="irHistorial">
          Historial
        </button>
        <button class="btn-nuevo" @click="abrirModalNuevo">
          <span class="btn-nuevo-icon">＋</span>
          Nuevo Ingrediente
        </button>
      </div>
    </div>

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

    <div v-if="cargando" class="estado-carga">
      <div class="spinner"></div>
      <span>Cargando inventario...</span>
    </div>
    <div v-else-if="errorGlobal" class="estado-error">
      <span>⚠ {{ errorGlobal }}</span>
      <button class="filtro-btn" @click="cargarDatos">Reintentar</button>
    </div>

    <div v-else class="contenido-principal">

      <div class="card card-inventario">
        <div class="card-header">
          <h2 class="card-title">Inventario Actual</h2>
          <div class="card-title-line"></div>
        </div>

        <div class="ingrediente-list">
          <transition-group name="list" tag="div" class="list-group">
            <div v-for="item in ingredientesFiltrados" :key="item.id_insumo" class="ingrediente-row"
              :class="{
                'row-agotado': Number(item.stock_actual) <= 0,
                'row-bajo': Number(item.stock_actual) > 0 && Number(item.stock_actual) < Number(item.stock_minimo)
              }">
              <div class="ingrediente-info">
                <div class="ingrediente-top">
                  <span class="ingrediente-nombre">{{ item.nombre }}</span>
                  <span class="cat-tag">{{ getNombreCategoria(item.id_categoria_ingrediente) }}</span>
                  <span v-if="!item.activo" class="badge-inactivo">INACTIVO</span>
                </div>
                <div class="stock-info">
                  <span class="stock-item">
                    Stock Actual:
                    <strong :class="Number(item.stock_actual) <= 0 ? 'stock-cero' : 'stock-ok'">
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
                  <span v-if="Number(item.stock_actual) <= 0" class="badge-agotado">AGOTADO</span>
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

      <div v-if="ingredientesAlerta.length > 0" class="card card-alertas">
        <div class="card-header alertas-header">
          <div class="alertas-header-titulo">
            <h2 class="card-title alertas-title">⚠ Stock</h2>
            <span class="alerta-count-badge parpadeo-contador">{{ ingredientesAlerta.length }} alertas</span>
          </div>
          <div class="card-title-line alerta-line"></div>
        </div>

        <div class="alertas-list">
          <div
            v-for="item in ingredientesAlerta"
            :key="item.id_insumo"
            class="alerta-row"
            :class="Number(item.stock_actual) <= 0 ? 'alerta-agotado' : 'alerta-bajo'"
            @click="abrirModal(item)"
          >
            <div class="alerta-info">
              <span class="alerta-nombre">{{ item.nombre }}</span>
              <span class="alerta-detalle">
                {{ Number(item.stock_actual) <= 0 ? 'Sin stock' : `${item.stock_actual} / mín. ${item.stock_minimo} ${item.unidad_medida}` }}
              </span>
            </div>
            <span class="alerta-badge" :class="Number(item.stock_actual) <= 0 ? 'alerta-badge-agotado' : 'alerta-badge-bajo'">
              {{ Number(item.stock_actual) <= 0 ? 'AGOTADO' : 'BAJO' }}
            </span>
          </div>
        </div>
      </div>
    </div>

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
              <label class="modal-label">Costo Mínimo Estimado (Bs)</label>
              <div class="costo-total-display">{{ costoMinimoCalculado }}</div>
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

    <transition name="modal">
      <div v-if="modalVisible" class="modal-overlay" @click.self="cerrarModal">
        <div class="modal modal-stock">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Agregar Stock</h3>
              <p class="modal-sub">{{ itemSeleccionado?.nombre }}</p>
            </div>
            <button class="modal-close" @click="cerrarModal">✕</button>
          </div>

          <div class="modal-body">
            <div class="tipo-fijo">
              <span class="tipo-fijo-flecha">▲</span>
              <div class="tipo-fijo-texto">
                <span class="tipo-fijo-label">Tipo de movimiento</span>
                <span class="tipo-fijo-valor">COMPRA</span>
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
                <label class="modal-label">Observación</label>
                <input v-model="form.observacion" type="text" class="modal-input" placeholder="Opcional" />
              </div>
            </div>

            <div class="modal-divider">Datos del Proveedor</div>

            <div class="proveedor-tabs">
              <button
                class="prov-tab"
                :class="{ 'prov-tab-active': modoProveedor === 'existente' }"
                @click="modoProveedor = 'existente'"
                :disabled="proveedoresExistentes.length === 0"
              >
                <i class="fa-solid fa-address-book"></i>
                Proveedor existente
                <span v-if="proveedoresExistentes.length > 0" class="prov-count">{{ proveedoresExistentes.length }}</span>
              </button>
              <button
                class="prov-tab"
                :class="{ 'prov-tab-active': modoProveedor === 'nuevo' }"
                @click="modoProveedor = 'nuevo'"
              >
                <i class="fa-solid fa-plus"></i>
                Nuevo proveedor
              </button>
            </div>

            <div v-if="modoProveedor === 'existente'" class="prov-existente-list">
              <div v-if="proveedoresExistentes.length === 0" class="prov-vacio">
                No hay proveedores registrados aún.
              </div>
              <div
                v-for="prov in proveedoresExistentes"
                :key="prov.nombre"
                class="prov-card"
                :class="{ 'prov-card-active': proveedorSeleccionadoExistente?.nombre === prov.nombre }"
                @click="seleccionarProveedorExistente(prov)"
              >
                <div class="prov-card-top">
                  <span class="prov-card-nombre">{{ prov.nombre }}</span>
                  <span v-if="proveedorSeleccionadoExistente?.nombre === prov.nombre" class="prov-check">✓</span>
                </div>
                <div class="prov-card-info">
                  <span v-if="prov.contacto">{{ prov.contacto }}</span>
                  <span v-if="prov.telefono">· {{ prov.telefono }}</span>
                  <span v-if="prov.email">· {{ prov.email }}</span>
                </div>
                <div v-if="prov.direccion" class="prov-card-dir">{{ prov.direccion }}</div>
              </div>
            </div>

            <div v-if="modoProveedor === 'nuevo'">
              <div class="modal-field">
                <label class="modal-label">Nombre <span class="req">*</span></label>
                <input v-model="form.proveedor.nombre" type="text" class="modal-input" placeholder="Ej: Distribuidora Norte" />
              </div>
              <div class="modal-field" style="margin-top:12px">
                <label class="modal-label">Contacto</label>
                <input v-model="form.proveedor.contacto" type="text" class="modal-input" placeholder="Ej: Juan Pérez" />
              </div>
              <div class="modal-row" style="margin-top:12px">
                <div class="modal-field">
                  <label class="modal-label">Teléfono</label>
                  <input v-model="form.proveedor.telefono" type="text" class="modal-input" placeholder="Ej: 77712345" />
                </div>
                <div class="modal-field">
                  <label class="modal-label">Email</label>
                  <input v-model="form.proveedor.email" type="email" class="modal-input" placeholder="prov@mail.com" />
                </div>
              </div>
              <div class="modal-field" style="margin-top:12px">
                <label class="modal-label">Dirección</label>
                <input v-model="form.proveedor.direccion" type="text" class="modal-input" placeholder="Ej: Av. Montes 123, La Paz" />
              </div>
            </div>

            <transition name="fade">
              <div v-if="errorModal" class="msg-error">{{ errorModal }}</div>
            </transition>
          </div>

          <div class="modal-footer">
            <button class="btn-cancelar" @click="cerrarModal" :disabled="guardandoStock">Cancelar</button>
            <button class="btn-confirmar" :disabled="!formularioValido || guardandoStock" @click="confirmarStock">
              {{ guardandoStock ? 'Registrando...' : 'Registrar Compra' }}
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
                    <span class="historial-tipo">{{ h.tipo_nombre || 'COMPRA' }}</span>
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

    </template>
    <!-- fin v-else inventario principal -->

    <!-- 🎵 Audio -->
    <audio ref="audioPlayerInv" loop>
      <source src="/src/assets/musica/overcooked_caja.mp3" type="audio/mpeg" />
    </audio>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// CAMBIO 1: importar los 3 componentes y agregar vistaActual
import Historialingrediente from './Historialingrediente.vue'
import Registromerma        from './Registromerma.vue'
import Valorinventario      from './Valorinventario.vue'

const vistaActual = ref('inventario')

// ── 🎵 Música ──────────────────────────────────────────────
const audioPlayerInv = ref(null)
const musicaActiva   = ref(false)

function toggleMusica() {
  const audio = audioPlayerInv.value
  if (!audio) return
  if (musicaActiva.value) {
    audio.pause()
    musicaActiva.value = false
  } else {
    audio.play().catch(() => console.warn('[Inventario] No se pudo reproducir el audio.'))
    musicaActiva.value = true
  }
}

onUnmounted(() => {
  if (audioPlayerInv.value) audioPlayerInv.value.pause()
})

const API = 'https://pollocopa.62344037.xyz/api/inventario'

// ─── DATOS ───────────────────────────────────────────
const categorias      = ref([])
const ingredientes    = ref([])
const tiposMovimiento = ref([])
const cargando        = ref(true)
const errorGlobal     = ref('')

// ID fijo para COMPRA 
const ID_TIPO_COMPRA = 1

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

// ─── FILTROS ─────────────────────────────────────────
const categoriaActiva = ref(null)

const ingredientesFiltrados = computed(() => {
  if (categoriaActiva.value === null) return ingredientes.value
  return ingredientes.value.filter(i => i.id_categoria_ingrediente === categoriaActiva.value)
})

// Ingredientes con alerta (agotados o stock bajo el mínimo)
const ingredientesAlerta = computed(() =>
  ingredientes.value.filter(i =>
    Number(i.stock_actual) <= 0 || Number(i.stock_actual) < Number(i.stock_minimo)
  )
)

function getNombreCategoria(id) {
  return categorias.value.find(c => c.id_categoria_ingrediente === id)?.nombre || '—'
}

// ─── UNIDADES ────────────────────────────────────────
const unidades = [
  { valor: 'kg',  label: 'kg'  }, { valor: 'g',   label: 'g'   },
  { valor: 'l',   label: 'l'   }, { valor: 'ml',  label: 'ml'  },
  { valor: 'u',   label: 'u'   }, { valor: 'lb',  label: 'lb'  },
  { valor: 'doc', label: 'doc' },
]

// CAMBIO 2: reemplazar irHistorial
function irHistorial() {
  vistaActual.value = 'historial'
}

// ─── MODAL NUEVO INGREDIENTE ─────────────────────────
const modalNuevoVisible = ref(false)
const guardandoNuevo    = ref(false)
const errorNuevo        = ref('')
const nuevoForm = ref({ nombre: '', unidad_medida: '', id_categoria_ingrediente: null, stock_minimo: null, costo_unitario: null, descripcion: '' })

const costoMinimoCalculado = computed(() => {
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
        stock_minimo:             nuevoForm.value.stock_minimo    || 0,
        costo_unitario_avg:       nuevoForm.value.costo_unitario  || 0,
        descripcion:              nuevoForm.value.descripcion     || null,
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

// ─── PROVEEDORES EXISTENTES (desde movimientos) ──────
const proveedoresExistentes          = ref([])
const modoProveedor                  = ref('nuevo')
const proveedorSeleccionadoExistente = ref(null)

async function cargarProveedoresExistentes() {
  const provMap = new Map()
  await Promise.all(
    ingredientes.value.map(async (ing) => {
      try {
        const res  = await fetch(`${API}/ingredientes/${ing.id_insumo}/movimientos`)
        const data = await res.json()
        if (Array.isArray(data)) {
          data.forEach(m => {
            if (m.proveedor_nombre && !provMap.has(m.proveedor_nombre)) {
              provMap.set(m.proveedor_nombre, {
                nombre:   m.proveedor_nombre,
                contacto: m.contacto   || '',
                telefono: m.telefono   || '',
                email:    m.email      || '',
                direccion: m.direccion || '',
              })
            }
          })
        }
      } catch {}
    })
  )
  proveedoresExistentes.value = Array.from(provMap.values())
}

function seleccionarProveedorExistente(prov) {
  proveedorSeleccionadoExistente.value = prov
  form.value.proveedor = { ...prov }
}

// ─── MODAL AGREGAR STOCK ─────────────────────────────
const modalVisible       = ref(false)
const itemSeleccionado   = ref(null)
const guardandoStock     = ref(false)
const errorModal         = ref('')
const movimientosPorItem = ref({})

const form = ref({
  cantidad: null, costo_unitario: null, lote: '', observacion: '',
  proveedor: { nombre: '', contacto: '', telefono: '', email: '', direccion: '' }
})

const formularioValido = computed(() => {
  if (!form.value.cantidad || form.value.cantidad <= 0) return false
  if (modoProveedor.value === 'existente' && !proveedorSeleccionadoExistente.value) return false
  if (modoProveedor.value === 'nuevo' && !form.value.proveedor.nombre.trim()) return false
  return true
})

async function abrirModal(item) {
  itemSeleccionado.value = item
  form.value = {
    cantidad: null, costo_unitario: null, lote: '', observacion: '',
    proveedor: { nombre: '', contacto: '', telefono: '', email: '', direccion: '' }
  }
  proveedorSeleccionadoExistente.value = null
  errorModal.value   = ''

  await cargarProveedoresExistentes()
  modoProveedor.value = proveedoresExistentes.value.length > 0 ? 'existente' : 'nuevo'

  modalVisible.value = true
}
function cerrarModal() { modalVisible.value = false }

async function confirmarStock() {
  if (!formularioValido.value) return
  guardandoStock.value = true
  errorModal.value     = ''

  const proveedorData = modoProveedor.value === 'existente'
    ? form.value.proveedor
    : form.value.proveedor

  try {
    const res = await fetch(`${API}/ingredientes/${itemSeleccionado.value.id_insumo}/movimientos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_tipo_movimi: ID_TIPO_COMPRA,
        cantidad:       form.value.cantidad,
        costo_unitario: form.value.costo_unitario || null,
        lote:           form.value.lote           || null,
        observacion:    form.value.observacion    || null,
        proveedor:      proveedorData,
      })
    })
    const data = await res.json()
    if (!res.ok) { errorModal.value = data.error || 'Error al registrar'; return }

    const item = ingredientes.value.find(i => i.id_insumo === itemSeleccionado.value.id_insumo)
    if (item) {
      item.stock_actual = Number(item.stock_actual) + Number(form.value.cantidad)
      item.agotado = Number(item.stock_actual) <= 0
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

// ─── HISTORIAL DE UN INGREDIENTE ─────────────────────
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

// ─── HELPERS ─────────────────────────────────────────
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
  display: flex; flex-direction: column; gap: 0;
}

/* ── HEADER ─────────────────────────────── */
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px; gap: 12px;
}
.section-header-left  { display: flex; align-items: center; gap: 12px; }
.section-header-right { display: flex; align-items: center; gap: 10px; }

.section-title { font-size: 26px; font-weight: 900; color: #1a1a1a; letter-spacing: -0.5px; }
.section-badge {
  background: #D90B31; color: #F2E205;
  font-size: 11px; font-weight: 800; letter-spacing: 1px;
  text-transform: uppercase; padding: 3px 10px; border-radius: 20px;
}

.btn-historial {
  padding: 9px 18px;
  background: #fff; color: #1a1a1a;
  border: 1.5px solid #e0e0e0; border-radius: 6px;
  font-size: 13px; font-weight: 700; cursor: pointer;
  transition: all 0.2s; white-space: nowrap;
}
.btn-historial:hover { border-color: #1a1a1a; background: #f5f5f5; }

.btn-nuevo {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 20px;
  background: #D90B31; color: #fff;
  border: none; border-radius: 6px;
  font-size: 13px; font-weight: 800;
  letter-spacing: 0.4px; cursor: pointer;
  transition: background 0.2s; white-space: nowrap;
}
.btn-nuevo:hover { background: #b50826; }
.btn-nuevo-icon { font-size: 16px; font-weight: 900; }

/* ── BOTÓN MÚSICA ───────────────────────── */
.btn-musica-inv {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  background: #fff;
  border: 1.5px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  height: 36px;
}
.btn-musica-inv:hover {
  border-color: #D90B31;
  background: rgba(217, 11, 49, 0.04);
}

.musica-icono {
  font-size: 14px;
  color: #888;
  transition: color 0.2s;
  line-height: 1;
}
.btn-musica-inv:hover .musica-icono { color: #D90B31; }

/* Barras animadas tipo ecualizador */
.musica-barra {
  display: inline-block;
  width: 3px;
  border-radius: 2px;
  background: #ccc;
  transition: background 0.2s;
  animation: none;
}
.btn-musica-inv:hover .musica-barra { background: #D90B31; }

.barra-1 { height: 8px; }
.barra-2 { height: 12px; }
.barra-3 { height: 6px; }

/* Cuando la música está activa: barras animadas + colores vivos */
.barra-activa {
  background: #D90B31 !important;
}
.barra-1.barra-activa { animation: eq1 0.7s ease-in-out infinite alternate; }
.barra-2.barra-activa { animation: eq2 0.5s ease-in-out infinite alternate; }
.barra-3.barra-activa { animation: eq3 0.9s ease-in-out infinite alternate; }

@keyframes eq1 { from { height: 4px; } to { height: 14px; } }
@keyframes eq2 { from { height: 8px; } to { height: 4px;  } }
@keyframes eq3 { from { height: 6px; } to { height: 12px; } }

/* ── FILTROS PILL ──────────────────────── */
.cat-bar {
  display: flex; gap: 6px; flex-wrap: wrap;
  padding: 14px 0 16px;
  border-bottom: 1px solid #e8e8e8;
  margin-bottom: 16px;
}
.filtro-btn {
  padding: 6px 16px; border: 1px solid #e0e0e0; border-radius: 20px;
  background: #fff; font-size: 12px; font-weight: 700; color: #666;
  cursor: pointer; transition: all 0.15s;
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

/* ── CONTENIDO PRINCIPAL (columnas) ─────── */
.contenido-principal {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: start;
}

/* ── CARD ───────────────────────────────── */
.card { background: #fff; border: 1.5px solid #e8e8e8; box-shadow: 0 2px 16px rgba(0,0,0,0.06); border-radius: 6px; }
.card-inventario { min-width: 0; }
.card-header { padding: 20px 24px 0; margin-bottom: 16px; }
.card-title { font-size: 18px; font-weight: 800; color: #1a1a1a; margin-bottom: 10px; }
.card-title-line { height: 3px; width: 48px; background: #D90B31; border-radius: 2px; }

/* ── ALERTAS ────────────────────────────── */
.card-alertas {
  width: 260px;
  border: 2px solid #D90404;
  animation: borde-parpadeo 1.4s ease-in-out infinite;
}
@keyframes borde-parpadeo {
  0%, 100% { border-color: #D90404; box-shadow: 0 0 0 0 rgba(217,4,4,0); }
  50%       { border-color: #ff6b6b; box-shadow: 0 0 8px 2px rgba(217,4,4,0.25); }
}

.alertas-header { padding: 16px 20px 0; margin-bottom: 12px; }
.alertas-header-titulo { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.alertas-title  { font-size: 15px; color: #D90404; margin-bottom: 0; }
.alerta-count-badge {
  background: #D90404; color: #fff;
  font-size: 11px; font-weight: 800; letter-spacing: 1px;
  padding: 3px 10px; border-radius: 20px;
}
.parpadeo-contador { animation: parpadeo 1.2s ease-in-out infinite; }
@keyframes parpadeo { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.alerta-line    { background: #D90404; }
.alertas-list { padding: 0 12px 12px; display: flex; flex-direction: column; gap: 8px; }
.alerta-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-radius: 6px; cursor: pointer;
  transition: opacity 0.2s; gap: 8px;
}
.alerta-row:hover { opacity: 0.85; }
.alerta-agotado { background: rgba(217,4,4,0.08); border: 1.5px solid rgba(217,4,4,0.3); }
.alerta-bajo    { background: rgba(242,203,5,0.15); border: 1.5px solid rgba(242,203,5,0.5); }
.alerta-info   { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.alerta-nombre { font-size: 13px; font-weight: 700; color: #1a1a1a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.alerta-detalle{ font-size: 11px; color: #888; font-weight: 500; }
.alerta-badge { font-size: 9px; font-weight: 900; padding: 2px 7px; border-radius: 4px; letter-spacing: 0.8px; white-space: nowrap; }
.alerta-badge-agotado { background: #D90404; color: #fff; }
.alerta-badge-bajo    { background: #F2CB05; color: #1a1a1a; }

/* ── LISTA ──────────────────────────────── */
.ingrediente-list { padding: 0 16px 16px; }
.list-group { display: flex; flex-direction: column; gap: 8px; }
.ingrediente-row {
  display: flex; align-items: center; justify-content: space-between;
  background: #fafafa; border: 1.5px solid #ebebeb; border-radius: 6px;
  padding: 14px 18px; transition: border-color 0.2s, box-shadow 0.2s; gap: 12px;
}
.ingrediente-row:hover { border-color: #D90B31; box-shadow: 0 2px 10px rgba(217,11,49,0.08); }
.row-agotado { border-color: #f5b0b0 !important; background: #fff8f8; }
.row-bajo    { border-color: #f5dfa0 !important; background: #fffbf0; }
.ingrediente-info  { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
.ingrediente-top   { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ingrediente-nombre{ font-size: 15px; font-weight: 700; color: #1a1a1a; }
.cat-tag       { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; background: #f0f0f0; color: #888; padding: 2px 8px; border-radius: 4px; }
.badge-inactivo{ font-size: 10px; font-weight: 900; background: #888; color: #fff; padding: 2px 8px; letter-spacing: 1px; text-transform: uppercase; border-radius: 4px; }
.stock-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.stock-item { font-size: 12px; color: #888; font-weight: 500; }
.stock-sep  { color: #ddd; font-size: 12px; }
.stock-ok   { color: #D90B31; font-weight: 800; }
.stock-cero { color: #aaa;    font-weight: 800; }
.stock-bajo-parpadeo { animation: parpadeoStock 1.2s ease-in-out infinite; color: #D90404; font-weight: 700; }
@keyframes parpadeoStock { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
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
.btn-info:hover      { border-color: #1a1a1a; color: #1a1a1a; background: #eeeeee; }
.btn-info-active     { border-color: #D90B31; color: #D90B31; background: rgba(217,11,49,0.03); }
.btn-agregar-stock {
  padding: 8px 16px; background: #1a1a1a; color: #F2E205;
  border: 1.5px solid #1a1a1a; border-radius: 6px;
  font-size: 12px; font-weight: 700;
  letter-spacing: 0.5px; text-transform: uppercase; cursor: pointer;
  transition: background 0.2s; white-space: nowrap;
}
.btn-agregar-stock:hover { background: #D90B31; border-color: #D90B31; color: #fff; }
.lista-vacia { display: flex; flex-direction: column; align-items: center; padding: 40px 20px; text-align: center; gap: 8px; }
.vacia-icon { font-size: 40px; }
.lista-vacia p { font-size: 14px; font-weight: 600; color: #bbb; }

/* ── MODAL BASE ──────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center; z-index: 999;
}
.modal {
  background: #fff; width: 100%; max-width: 480px;
  border-top: 4px solid #D90B31; border-radius: 0 0 6px 6px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  max-height: 90vh; display: flex; flex-direction: column;
}
.modal-nuevo           { max-width: 520px; }
.modal-stock           { max-width: 540px; }
.modal-info            { max-width: 540px; }
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
.modal-input:focus     { border-color: #D90B31; background: #fff; }
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
.tipo-fijo {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px;
  background: #f0fff4; border: 1.5px solid #b2e8c6; border-radius: 6px;
}
.tipo-fijo-flecha { font-size: 18px; color: #1a7a3c; font-weight: 900; }
.tipo-fijo-texto  { display: flex; flex-direction: column; gap: 1px; }
.tipo-fijo-label  { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.8px; }
.tipo-fijo-valor  { font-size: 14px; font-weight: 900; color: #1a7a3c; letter-spacing: 0.5px; }
.proveedor-tabs { display: flex; gap: 8px; margin-top: -4px; }
.prov-tab {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 16px;
  border: 1.5px solid #e0e0e0; border-radius: 6px;
  background: #fafafa; color: #666;
  font-size: 12px; font-weight: 700; cursor: pointer;
  transition: all 0.15s; flex: 1; justify-content: center;
  text-transform: uppercase; letter-spacing: 0.4px;
}
.prov-tab:hover:not(:disabled) { border-color: #1a1a1a; color: #1a1a1a; }
.prov-tab-active { background: #1a1a1a; border-color: #1a1a1a; color: #F2E205; }
.prov-tab:disabled { opacity: 0.35; cursor: not-allowed; }
.prov-count { background: #D90B31; color: #fff; font-size: 10px; font-weight: 900; padding: 1px 6px; border-radius: 20px; }
.prov-existente-list { display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; padding-right: 2px; }
.prov-vacio { font-size: 13px; color: #bbb; font-weight: 600; padding: 12px 0; text-align: center; }
.prov-card { padding: 10px 14px; border: 1.5px solid #e0e0e0; border-radius: 6px; background: #fafafa; cursor: pointer; transition: all 0.15s; }
.prov-card:hover { border-color: #1a1a1a; background: #f5f5f5; }
.prov-card-active { border-color: #D90B31 !important; background: rgba(217,11,49,0.04) !important; }
.prov-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.prov-card-nombre { font-size: 13px; font-weight: 800; color: #1a1a1a; }
.prov-check { font-size: 13px; color: #D90B31; font-weight: 900; }
.prov-card-info { font-size: 11px; color: #888; font-weight: 500; }
.prov-card-dir  { font-size: 11px; color: #aaa; margin-top: 2px; }
.tab-group { display: flex; flex-wrap: wrap; gap: 6px; }
.tab-btn {
  padding: 6px 13px; border: 1.5px solid #e0e0e0; border-radius: 20px;
  background: #fff; color: #666;
  font-size: 11px; font-weight: 700; cursor: pointer;
  transition: all 0.15s; text-transform: uppercase; letter-spacing: 0.5px;
}
.tab-btn:hover   { border-color: #D90B31; color: #D90B31; }
.tab-btn-active  { background: #D90B31; color: #F2CB05; border-color: #D90B31; }
.input-with-unit { display: flex; align-items: stretch; }
.input-with-unit .modal-input { border-right: none; border-radius: 4px 0 0 4px; flex: 1; }
.unit-badge { padding: 0 10px; background: #1a1a1a; color: #F2E205; font-size: 12px; font-weight: 800; display: flex; align-items: center; border: 1.5px solid #1a1a1a; border-radius: 0 4px 4px 0; white-space: nowrap; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px 20px; border-top: 1px solid #f0f0f0; flex-shrink: 0; }
.btn-cancelar  { padding: 9px 20px; background: #f0f0f0; color: #666; border: 1.5px solid #e0e0e0; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
.btn-cancelar:hover:not(:disabled)  { background: #e0e0e0; }
.btn-confirmar { padding: 9px 22px; background: #D90B31; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 800; cursor: pointer; letter-spacing: 0.3px; transition: background 0.2s; }
.btn-confirmar:hover:not(:disabled) { background: #b50826; }
.btn-confirmar:disabled, .btn-cancelar:disabled { opacity: 0.5; cursor: not-allowed; }
.msg-error { padding: 9px 14px; font-size: 13px; font-weight: 700; background: #fef0f0; color: #c0392b; border: 1px solid #f5c0c0; border-radius: 4px; }

/* ── HISTORIAL ───────────────────────────── */
.info-body { gap: 0; padding: 0; }
.info-vacia { padding: 40px 24px; text-align: center; color: #bbb; font-size: 14px; font-weight: 600; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.historial-list { display: flex; flex-direction: column; }
.historial-item { padding: 16px 24px; border-bottom: 1px solid #f0f0f0; }
.historial-item:last-child { border-bottom: none; }
.historial-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.historial-top-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.historial-cantidad  { font-size: 14px; font-weight: 900; color: #fff; padding: 2px 10px; border-radius: 4px; }
.mov-entrada { background: #1a7a3c; }
.mov-salida  { background: #D90404; }
.historial-tipo { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #888; background: #f0f0f0; padding: 2px 8px; border-radius: 4px; }
.historial-fecha { font-size: 11px; color: #aaa; font-weight: 600; }
.historial-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.h-field { display: flex; flex-direction: column; gap: 2px; }
.h-field-full { grid-column: 1 / -1; }
.h-label { font-size: 10px; font-weight: 800; color: #aaa; text-transform: uppercase; letter-spacing: 0.8px; }
.h-value { font-size: 13px; font-weight: 600; color: #1a1a1a; }

/* ── TRANSITIONS ─────────────────────────── */
.list-enter-active { transition: all 0.28s ease; }
.list-enter-from   { opacity: 0; transform: translateY(-8px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
.modal-enter-active, .modal-leave-active { transition: opacity 0.22s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; }
</style>