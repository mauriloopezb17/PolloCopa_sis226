<template>
  <div class="caja-tab">

    <!-- ── Barra superior de estado de turno ── -->
    <div class="turno-bar" :class="turno ? 'bar-abierta' : 'bar-cerrada'">
      <div class="turno-info">
        <template v-if="turno">
          <span class="turno-badge abierto">Caja abierta</span>
          <span class="turno-desde">desde {{ formatHora(turno.apertura) }}</span>
          <span class="turno-monto">Apertura: Bs {{ fmt(turno.monto_apertura) }}</span>
        </template>
        <template v-else-if="!verificando">
          <span class="turno-badge cerrado">Caja cerrada</span>
          <span class="turno-desde">Abre el turno para comenzar a operar</span>
        </template>
      </div>
      <div class="turno-acciones">
        <button class="btn-musica-inv" @click="toggleMusica" :title="musicaActiva ? 'Pausar música' : 'Reproducir música'">
          <span class="musica-icono">{{ musicaActiva ? '♪' : '♩' }}</span>
          <span class="musica-barra barra-1" :class="{ 'barra-activa': musicaActiva }"></span>
          <span class="musica-barra barra-2" :class="{ 'barra-activa': musicaActiva }"></span>
          <span class="musica-barra barra-3" :class="{ 'barra-activa': musicaActiva }"></span>
        </button>
        <button
          class="btn-turno btn-historial"
          @click="mostrarAuthHistorial = true"
        >
          Historial
        </button>
        <button
          v-if="!turno && !verificando"
          class="btn-turno btn-abrir"
          @click="mostrarApertura = true"
        >
          Abrir caja
        </button>
        <button
          v-if="turno"
          class="btn-turno btn-cerrar"
          @click="mostrarCierre = true"
        >
          Cerrar caja
        </button>
      </div>
    </div>

    <!-- ── Contenido principal (catálogo + panel) ── -->
    <div class="caja-contenido" :class="{ bloqueado: !turno }">

      <!-- Overlay cuando caja cerrada -->
      <div v-if="!turno && !verificando" class="caja-overlay">
        <div class="overlay-mensaje">
          <div class="overlay-linea"></div>
          <p class="overlay-titulo">Caja cerrada</p>
          <p class="overlay-sub">Presiona <strong>Abrir caja</strong> para iniciar el turno.</p>
        </div>
      </div>

      <!-- Catálogo de productos -->
      <section class="catalogo-section">
        <div class="catalogo-header">
          <h2 class="catalogo-titulo">Productos disponibles</h2>
          <div class="catalogo-filtros">
            <button
              class="filtro-btn"
              :class="{ active: filtroCategoria === null }"
              @click="filtroCategoria = null"
            >
              Todos
            </button>
            <button
              v-for="cat in categorias"
              :key="cat.id"
              class="filtro-btn"
              :class="{ active: filtroCategoria === cat.id }"
              @click="filtroCategoria = cat.id"
            >
              {{ cat.nombre }}
            </button>
          </div>
        </div>

        <div v-if="error" class="catalogo-mensaje error-msg">
          <p>{{ error }}</p>
          <button class="filtro-btn" @click="cargarDatos">Reintentar</button>
        </div>
        <div v-else-if="cargando" class="catalogo-mensaje">
          <p>Cargando productos...</p>
        </div>
        <div v-else class="catalogo-lista">
          <div
            v-for="grupo in productosAgrupados"
            :key="grupo.id"
            class="categoria-grupo"
          >
            <div class="grupo-header">
              <span class="grupo-linea"></span>
              <h3 class="grupo-titulo">{{ grupo.nombre }}</h3>
            </div>
            
            <div class="catalogo-grid">
              <CajaProductoCard
                v-for="prod in grupo.productos"
                :key="prod.id_producto"
                :producto="prod"
                @añadir="añadirAlPedido"
              />
            </div>
          </div>

          <div v-if="productosAgrupados.length === 0" class="catalogo-mensaje">
            <p>No hay productos en esta categoría.</p>
          </div>
        </div>
      </section>

      <!-- Panel de pedido -->
      <CajaPedidoPanel
        ref="panelRef"
        :items="pedidoItems"
        :ticket="ticketActual"
        :metodos-pago="metodosPago"
        @incrementar="incrementar"
        @decrementar="decrementar"
        @eliminar="eliminar"
        @cancelar="cancelarPedido"
        @confirmar="confirmarPedido"
      />
    </div>

    <!-- Modal apertura -->
    <CajaAperturaModal
      :show="mostrarApertura"
      :monto-sugerido="montoAperturaSugerido"
      :hay-turno-anterior="hayTurnoAnterior"
      @abierto="onTurnoAbierto"
    />

    <!-- Modal cierre -->
    <CajaCierreModal
      :show="mostrarCierre"
      @close="mostrarCierre = false"
      @cerrado="onTurnoCerrado"
    />

    <!-- Auth modal historial -->
    <CajaHistorialAuthModal
      v-if="mostrarAuthHistorial"
      @autorizado="mostrarAuthHistorial = false; mostrarHistorial = true"
      @cancelar="mostrarAuthHistorial = false"
    />

    <!-- Panel historial -->
    <CajaHistorialPanel
      v-if="mostrarHistorial"
      @close="mostrarHistorial = false"
      @anulado="cargarDatos"
    />

    <!-- Modal recibo -->
    <CajaReceiptModal
      :show="!!ticketConfirmado"
      :ticket="ticketConfirmado"
      :items="reciboItems"
      :metodos-pago="metodosPago"
      :id-metodo-pago="reciboMetodoId"
      :nit="reciboNIT"
      :razon-social="reciboRazonSocial"
      @close="cerrarRecibo"
    />

   <audio ref="audioPlayerInv" loop>
      <source src="/src/assets/musica/overcooked_inventario.mp3" type="audio/mpeg" />
    </audio>

  </div>
</template>



<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import CajaProductoCard    from './CajaProductoCard.vue'
import CajaPedidoPanel     from './CajaPedidoPanel.vue'
import CajaReceiptModal    from './CajaReceiptModal.vue'
import CajaAperturaModal   from './CajaAperturaModal.vue'
import CajaCierreModal     from './CajaCierreModal.vue'
import CajaHistorialPanel     from './CajaHistorialPanel.vue'
import CajaHistorialAuthModal from './CajaHistorialAuthModal.vue'

const API = 'http://localhost:3000/api/caja'



const audioPlayerInv = ref(null)
const musicaActiva   = ref(false)

function toggleMusica() {
  const audio = audioPlayerInv.value
  if (!audio) return
  if (musicaActiva.value) {
    audio.pause()
    musicaActiva.value = false
  } else {
    audio.play().catch(() => console.warn('[Caja] No se pudo reproducir el audio.'))
    musicaActiva.value = true
  }
}

onUnmounted(() => {
  if (audioPlayerInv.value) audioPlayerInv.value.pause()
})

// ── Turno de caja ──────────────────────────────────────────
const turno                  = ref(null)   // null = cerrado
const verificando            = ref(true)
const montoAperturaSugerido  = ref(0)
const hayTurnoAnterior       = ref(false)

async function verificarTurno() {
  verificando.value = true
  try {
    const res  = await fetch(`${API}/turno-actual`)
    const data = await res.json()
    if (res.status === 404) {
      turno.value                 = null
      montoAperturaSugerido.value = data.monto_apertura_sugerido ?? 0
      hayTurnoAnterior.value      = (data.monto_apertura_sugerido ?? null) !== null
      return
    }
    turno.value = data.abierto ? data : null
  } catch {
    turno.value = null
  } finally {
    verificando.value = false
  }
}

const mostrarApertura  = ref(false)
const mostrarCierre    = ref(false)
const mostrarAuthHistorial = ref(false)
const mostrarHistorial = ref(false)

function onTurnoAbierto(nuevoTurno) {
  turno.value         = nuevoTurno
  mostrarApertura.value = false
}

function onTurnoCerrado(turnoFinalizado) {
  turno.value                 = null
  mostrarCierre.value         = false
  montoAperturaSugerido.value = Number(turnoFinalizado.monto_cierre ?? 0)
  hayTurnoAnterior.value      = true
  pedidoItems.value           = []
  panelRef.value?.reset()
}

// ── Datos del catálogo ─────────────────────────────────────
const panelRef    = ref(null)
const categorias  = ref([])
const productos   = ref([])
const metodosPago = ref([])
const cargando    = ref(true)
const error       = ref(null)

async function cargarDatos() {
  cargando.value = true
  error.value    = null
  try {
    const [resCat, resProd, resMet] = await Promise.all([
      fetch(`${API}/categorias`),
      fetch(`${API}/productos`),
      fetch(`${API}/metodos-pago`),
    ])
    if (!resCat.ok || !resProd.ok || !resMet.ok) throw new Error('Error al cargar datos')
    categorias.value  = await resCat.json()
    productos.value   = await resProd.json()
    metodosPago.value = await resMet.json()
  } catch (err) {
    console.error(err)
    error.value = 'No se pudieron cargar los productos. Verifica que el servidor esté activo.'
  } finally {
    cargando.value = false
  }
}

// ── Polling liviano del catálogo ──────────────────────────
// Consulta un fingerprint (total/disponibles) cada 8 s.
// Solo llama a cargarDatos() si el valor cambió en la DB.
let _pollTimer     = null
let _lastFingerprint = null

async function _pollFingerprint() {
  try {
    const res = await fetch(`${API}/productos/fingerprint`)
    if (!res.ok) return
    const { total, disponibles } = await res.json()
    const fp = `${total}:${disponibles}`
    if (_lastFingerprint !== null && fp !== _lastFingerprint) {
      await cargarDatos()
    }
    _lastFingerprint = fp
  } catch {
    // red caída — no hacer nada, el próximo tick reintenta
  }
}

onMounted(async () => {
  await Promise.all([verificarTurno(), cargarDatos()])
  // Tomar el fingerprint inicial después de la primera carga
  try {
    const res = await fetch(`${API}/productos/fingerprint`)
    if (res.ok) {
      const { total, disponibles } = await res.json()
      _lastFingerprint = `${total}:${disponibles}`
    }
  } catch {}
  _pollTimer = setInterval(_pollFingerprint, 8000)
})

onUnmounted(() => {
  clearInterval(_pollTimer)
})

// ── Filtrado ───────────────────────────────────────────────
const filtroCategoria = ref(null)

const productosFiltrados = computed(() => {
  if (filtroCategoria.value === null) return productos.value
  return productos.value.filter(p => p.id_categoria_producto === filtroCategoria.value)
})

const productosAgrupados = computed(() => {
  const grupos = []
  const filtrados = productosFiltrados.value

  // Usamos el orden de la lista de categorías
  categorias.value.forEach(cat => {
    const productosDeCat = filtrados.filter(p => p.id_categoria_producto === cat.id)
    if (productosDeCat.length > 0) {
      grupos.push({
        id: cat.id,
        nombre: cat.nombre,
        productos: productosDeCat
      })
    }
  })

  // Por si hay productos sin categoría asignada en la BD
  const sinCat = filtrados.filter(p => !categorias.value.find(c => c.id === p.id_categoria_producto))
  if (sinCat.length > 0) {
    grupos.push({
      id: 'misc',
      nombre: 'Otros',
      productos: sinCat
    })
  }

  return grupos
})

// ── Pedido ─────────────────────────────────────────────────
const pedidoItems  = ref([])
const ticketActual = ref('---')
const enviando     = ref(false)

function añadirAlPedido(producto, tipoPrecio) {
  const precioMap = {
    COMBO:    producto.precio_combo,
    CON_PAPA: producto.precio_con_papa,
    SOLO:     producto.precio_solo,
  }
  const precioUnitario = Number(precioMap[tipoPrecio])
  const existente = pedidoItems.value.find(
    i => i.id_producto === producto.id_producto && i.tipo_precio === tipoPrecio
  )
  if (existente) {
    existente.cantidad++
    existente.subtotal = existente.cantidad * existente.precio_unitario
  } else {
    pedidoItems.value.push({
      id_producto:    producto.id_producto,
      nombre:         producto.nombre,
      tipo_precio:    tipoPrecio,
      cantidad:       1,
      precio_unitario: precioUnitario,
      subtotal:       precioUnitario,
    })
  }
}

function incrementar(idx) {
  const item = pedidoItems.value[idx]
  item.cantidad++
  item.subtotal = item.cantidad * item.precio_unitario
}

function decrementar(idx) {
  const item = pedidoItems.value[idx]
  if (item.cantidad > 1) {
    item.cantidad--
    item.subtotal = item.cantidad * item.precio_unitario
  } else {
    pedidoItems.value.splice(idx, 1)
  }
}

function eliminar(idx) { pedidoItems.value.splice(idx, 1) }
function cancelarPedido() { pedidoItems.value = [] }

// ── Recibo ─────────────────────────────────────────────────
const ticketConfirmado = ref(null)
const reciboItems      = ref([])
const reciboMetodoId   = ref(null)
const reciboNIT        = ref(null)
const reciboRazonSocial = ref(null)

async function confirmarPedido(datosPago) {
  if (enviando.value) return
  enviando.value = true
  try {
    const body = {
      items: pedidoItems.value.map(i => ({
        id_producto:     i.id_producto,
        tipo_precio:     i.tipo_precio,
        cantidad:        i.cantidad,
        precio_unitario: i.precio_unitario,
      })),
      pago: {
        id_metodo:    datosPago.id_metodo,
        monto_pagado: datosPago.monto_pagado,
      },
      NIT:          datosPago.NIT          || null,
      razon_social: datosPago.razon_social || null,
      descuento_pct: datosPago.descuento_pct || 0,
      instrucciones: datosPago.instrucciones || null,
    }
    const res  = await fetch(`${API}/pedidos`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { alert(`Error: ${data.error || 'No se pudo crear el pedido'}`); return }

    reciboItems.value       = [...pedidoItems.value]
    reciboMetodoId.value    = datosPago.id_metodo
    reciboNIT.value         = datosPago.NIT          || null
    reciboRazonSocial.value = datosPago.razon_social || null
    ticketConfirmado.value  = data.pedido
    pedidoItems.value      = []
    ticketActual.value     = '---'
    panelRef.value?.reset()
  } catch (err) {
    console.error(err)
    alert('Error de conexión al crear el pedido.')
  } finally {
    enviando.value = false
  }
}

function cerrarRecibo() {
  ticketConfirmado.value  = null
  reciboItems.value       = []
  reciboMetodoId.value    = null
  reciboNIT.value         = null
  reciboRazonSocial.value = null
}

// ── Helpers ────────────────────────────────────────────────
function fmt(val) { return Number(val ?? 0).toFixed(2) }

function formatHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
}

// ── Dev helper ─────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.flushPedidos = async () => {
    try {
      const res  = await fetch(`${API}/flush`, { method: 'DELETE' })
      const data = await res.json()
      console.log('%c✔ ' + data.mensaje, 'color: green; font-weight: bold')
    } catch (e) { console.error(e) }
  }
}
</script>

<style scoped>
/* ── Layout raíz ── */
.caja-tab {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 68px);
  background: #f9f9f9;
}

/* ── Barra de turno ── */
.turno-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  border-bottom: 2px solid transparent;
  flex-shrink: 0;
  gap: 12px;
}

.bar-abierta {
  background: #fff;
  border-color: #F2CB05;
}

.bar-cerrada {
  background: #fff4f4;
  border-color: #D90B31;
}

.turno-info {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.turno-badge {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 3px 10px;
  border-radius: 12px;
}

.turno-badge.abierto {
  background: #d4edda;
  color: #1a7a3e;
}

.turno-badge.cerrado {
  background: rgba(217, 11, 49, 0.1);
  color: #D90B31;
}

.turno-desde,
.turno-monto {
  font-size: 13px;
  color: #666;
  font-weight: 600;
}

.turno-acciones {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}


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

.btn-turno {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  cursor: pointer;
  border: none;
  transition: background 0.15s;
}

.btn-historial {
  background: #fff;
  color: #555;
  border: 1px solid #ddd;
}
.btn-historial:hover { background: #f5f5f5; color: #222; }

.btn-abrir {
  background: #D90B31;
  color: #F2CB05;
}
.btn-abrir:hover { background: #b80929; }

.btn-cerrar {
  background: #555;
  color: #fff;
}
.btn-cerrar:hover { background: #333; }

/* ── Contenido principal ── */
.caja-contenido {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.caja-contenido.bloqueado {
  pointer-events: none;
}

/* ── Overlay de caja cerrada ── */
.caja-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
}

.overlay-mensaje {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.overlay-linea {
  width: 40px;
  height: 3px;
  background: #D90B31;
  border-radius: 2px;
  margin-bottom: 4px;
}

.overlay-titulo {
  font-size: 15px;
  font-weight: 800;
  color: #444;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.overlay-sub {
  font-size: 13px;
  font-weight: 500;
  color: #888;
  margin: 0;
}

/* ── Catálogo ── */
.catalogo-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.catalogo-header {
  padding: 16px 24px 12px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

.catalogo-titulo {
  font-size: 18px;
  font-weight: 800;
  color: #222;
  margin-bottom: 10px;
}

.catalogo-filtros {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filtro-btn {
  padding: 6px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  color: #666;
  cursor: pointer;
  transition: all 0.15s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.filtro-btn:hover {
  border-color: #D90B31;
  color: #D90B31;
  background: rgba(217, 11, 49, 0.05);
}

.filtro-btn.active {
  background: #D90B31;
  border-color: #D90B31;
  color: #F2CB05;
}

.catalogo-lista {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0 40px;
  background: #f9f9f9;
}

.categoria-grupo {
  margin-bottom: 24px;
}

.grupo-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px 8px;
}

.grupo-linea {
  width: 4px;
  height: 18px;
  background: #F2CB05;
  border-radius: 2px;
}

.grupo-titulo {
  font-size: 14px;
  font-weight: 800;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 0;
}

.catalogo-grid {
  padding: 8px 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 12px;
  align-content: start;
}

.catalogo-mensaje {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #888;
  font-size: 14px;
  font-weight: 600;
}

.error-msg { color: #D90B31; }
</style>