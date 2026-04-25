<template>
  <div class="menu-view">
    <!-- Contenido principal (catálogo) -->
    <section class="catalogo-section">
      <div class="catalogo-header">
        <h2 class="catalogo-titulo">Nuestro Menú</h2>
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
        <p>Cargando menú...</p>
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
          
          <div class="menu-grid">
            <MenuProductoCard
              v-for="prod in grupo.productos"
              :key="prod.id_producto"
              :producto="prod"
              :can-order="!!turno"
              @añadir="añadirAlPedido"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Panel de pedido (solo si hay turno) -->
    <div 
      v-if="turno" 
      class="pedido-container" 
      :class="{ 'mobile-open': showPanelMobile, 'has-items': pedidoItems.length > 0 }"
    >
      <!-- Botón flotante/Toggle para móvil -->
      <button 
        v-if="pedidoItems.length > 0" 
        class="mobile-toggle" 
        @click="showPanelMobile = !showPanelMobile"
      >
        <div class="toggle-content">
          <span class="toggle-badge">{{ totalItems }}</span>
          <span class="toggle-text">{{ showPanelMobile ? 'Cerrar pedido' : 'Ver mi pedido' }}</span>
          <span class="toggle-total">Bs {{ totalPedido.toFixed(2) }}</span>
        </div>
      </button>

      <CajaPedidoPanel
        ref="panelRef"
        :items="pedidoItems"
        :ticket="ticketActual"
        :metodos-pago="metodosPagoDigitales"
        :allow-discount="false"
        :exact-amount="true"
        :show-close="true"
        @incrementar="incrementar"
        @decrementar="decrementar"
        @eliminar="eliminar"
        @cancelar="cancelarPedido"
        @confirmar="confirmarPedido"
        @close="showPanelMobile = false"
      />
    </div>

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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import MenuProductoCard from './MenuProductoCard.vue'
import CajaPedidoPanel   from '../caja/CajaPedidoPanel.vue'
import CajaReceiptModal  from '../caja/CajaReceiptModal.vue'

const API = 'http://localhost:3000/api/caja'

// ── Turno (para habilitar pedido) ──────────────────────────
const turno       = ref(null)
const verificando = ref(true)

async function verificarTurno() {
  verificando.value = true
  try {
    const res = await fetch(`${API}/turno-actual`)
    const data = await res.json()
    turno.value = (res.ok && data.abierto) ? data : null
  } catch {
    turno.value = null
  } finally {
    verificando.value = false
  }
}

// ── Datos ──────────────────────────────────────────────────
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
    error.value = 'No se pudo cargar el menú.'
  } finally {
    cargando.value = false
  }
}

onMounted(async () => {
  await Promise.all([verificarTurno(), cargarDatos()])
})

// ── Filtrado y Agrupación ──────────────────────────────────
const filtroCategoria = ref(null)

const productosFiltrados = computed(() => {
  if (filtroCategoria.value === null) return productos.value
  return productos.value.filter(p => p.id_categoria_producto === filtroCategoria.value)
})

const productosAgrupados = computed(() => {
  const grupos = []
  const filtrados = productosFiltrados.value
  categorias.value.forEach(cat => {
    const prods = filtrados.filter(p => p.id_categoria_producto === cat.id)
    if (prods.length > 0) grupos.push({ id: cat.id, nombre: cat.nombre, productos: prods })
  })
  return grupos
})

const metodosPagoDigitales = computed(() => {
  return metodosPago.value.filter(m => m.nombre.toUpperCase() !== 'EFECTIVO')
})

// ── Mobile UI ──────────────────────────────────────────────
const showPanelMobile = ref(false)
const totalItems = computed(() => pedidoItems.value.reduce((s, i) => s + i.cantidad, 0))
const totalPedido = computed(() => pedidoItems.value.reduce((s, i) => s + i.subtotal, 0))

// ── Lógica de Pedido (Copia de CajaTab para compatibilidad) ──
const pedidoItems  = ref([])
const ticketActual = ref('---')
const enviando     = ref(false)

function añadirAlPedido(producto, tipoPrecio) {
  if (!turno.value) return
  const precioMap = { COMBO: producto.precio_combo, CON_PAPA: producto.precio_con_papa, SOLO: producto.precio_solo }
  const precioUnitario = Number(precioMap[tipoPrecio])
  const existente = pedidoItems.value.find(i => i.id_producto === producto.id_producto && i.tipo_precio === tipoPrecio)
  if (existente) {
    existente.cantidad++
    existente.subtotal = existente.cantidad * existente.precio_unitario
  } else {
    pedidoItems.value.push({
      id_producto: producto.id_producto,
      nombre: producto.nombre,
      tipo_precio: tipoPrecio,
      cantidad: 1,
      precio_unitario: precioUnitario,
      subtotal: precioUnitario,
    })
  }
}

function incrementar(idx) {
  pedidoItems.value[idx].cantidad++
  pedidoItems.value[idx].subtotal = pedidoItems.value[idx].cantidad * pedidoItems.value[idx].precio_unitario
}
function decrementar(idx) {
  if (pedidoItems.value[idx].cantidad > 1) {
    pedidoItems.value[idx].cantidad--
    pedidoItems.value[idx].subtotal = pedidoItems.value[idx].cantidad * pedidoItems.value[idx].precio_unitario
  }
}
function eliminar(idx) { pedidoItems.value.splice(idx, 1) }
function cancelarPedido() { pedidoItems.value = [] }

// ── Confirmar / Recibo ─────────────────────────────────────
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
        id_producto: i.id_producto,
        tipo_precio: i.tipo_precio,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
      })),
      pago: { id_metodo: datosPago.id_metodo, monto_pagado: datosPago.monto_pagado },
      NIT: datosPago.NIT || null,
      razon_social: datosPago.razon_social || null,
      descuento_pct: datosPago.descuento_pct || 0,
      instrucciones: datosPago.instrucciones || null,
      origen_web: true
    }
    const res = await fetch(`${API}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { alert(`Error: ${data.error}`); return }

    reciboItems.value       = [...pedidoItems.value]
    reciboMetodoId.value    = datosPago.id_metodo
    reciboNIT.value         = datosPago.NIT
    reciboRazonSocial.value = datosPago.razon_social
    ticketConfirmado.value  = data.pedido
    pedidoItems.value       = []
    panelRef.value?.reset()
  } catch (err) {
    alert('Error al procesar el pedido.')
  } finally {
    enviando.value = false
  }
}

function cerrarRecibo() {
  ticketConfirmado.value = null
}
</script>

<style scoped>
.menu-view {
  display: flex;
  height: calc(100vh - 68px);
  background: #fdfdfd;
}

.catalogo-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.catalogo-header {
  padding: 24px 32px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.catalogo-titulo {
  font-size: 28px;
  font-weight: 800;
  color: #D90B31;
  margin-bottom: 16px;
  letter-spacing: -0.5px;
}

.catalogo-filtros {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.filtro-btn {
  padding: 10px 20px;
  border-radius: 25px;
  border: 1.5px solid #eee;
  background: #fff;
  font-size: 14px;
  font-weight: 700;
  color: #666;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.filtro-btn:hover {
  border-color: #F2CB05;
  color: #D90B31;
}

.filtro-btn.active {
  background: #D90B31;
  border-color: #D90B31;
  color: #F2CB05;
}

.catalogo-lista {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px 60px;
}

.categoria-grupo {
  margin-bottom: 40px;
}

.grupo-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.grupo-linea {
  width: 6px;
  height: 24px;
  background: #F2CB05;
  border-radius: 3px;
}

.grupo-titulo {
  font-size: 20px;
  font-weight: 800;
  color: #222;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
}

.pedido-container {
  display: contents; /* Por defecto en desktop se comporta igual */
}

.mobile-toggle {
  display: none;
}

/* Responsiveness */
@media (max-width: 1024px) {
  .menu-view {
    flex-direction: column;
  }

  .catalogo-header {
    padding: 16px 20px;
  }

  .catalogo-titulo {
    font-size: 22px;
    margin-bottom: 12px;
  }

  .catalogo-lista {
    padding: 16px 20px 100px;
  }

  .menu-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  /* Panel de pedido como Bottom Sheet en móvil */
  .pedido-container {
    display: block;
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    z-index: 1000;
    pointer-events: none;
  }

  .pedido-container.mobile-open {
    height: 100vh;
    background: rgba(0,0,0,0.5);
    pointer-events: auto;
  }

  .pedido-container :deep(.pedido-panel) {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    max-width: none;
    height: 80vh;
    border-radius: 20px 20px 0 0;
    border-left: none;
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: auto;
  }

  .pedido-container.mobile-open :deep(.pedido-panel) {
    transform: translateY(0);
    padding-bottom: 90px; /* Evita que el botón flotante tape las acciones del panel */
  }

  .mobile-toggle {
    display: block;
    pointer-events: auto;
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    background: #D90B31;
    color: #F2CB05;
    border: none;
    border-radius: 14px;
    padding: 16px 20px;
    font-weight: 800;
    box-shadow: 0 8px 24px rgba(217, 11, 49, 0.4);
    z-index: 1001;
    transition: transform 0.2s;
  }

  .mobile-toggle:active {
    transform: scale(0.96);
  }

  .toggle-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .toggle-badge {
    background: #F2CB05;
    color: #D90B31;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }

  .toggle-text {
    flex: 1;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .toggle-total {
    font-size: 16px;
  }
}

.catalogo-mensaje {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #999;
}

.error-msg { color: #D90B31; }

/* Transitions */
.slide-right-enter-active, .slide-right-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-right-enter-from, .slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
