<template>
  <div class="caja-tab">
    <!-- Catálogo de productos -->
    <section class="catalogo-section">
      <div class="catalogo-header">
        <h2 class="catalogo-titulo">Productos disponibles</h2>

        <!-- Filtros -->
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

      <!-- Mensaje de error -->
      <div v-if="error" class="catalogo-mensaje error-msg">
        <p>{{ error }}</p>
        <button class="filtro-btn" @click="cargarDatos">Reintentar</button>
      </div>

      <!-- Cargando -->
      <div v-else-if="cargando" class="catalogo-mensaje">
        <p>Cargando productos...</p>
      </div>

      <!-- Grid de productos -->
      <div v-else class="catalogo-grid">
        <CajaProductoCard
          v-for="prod in productosFiltrados"
          :key="prod.id_producto"
          :producto="prod"
          @añadir="añadirAlPedido"
        />
      </div>
    </section>

    <!-- Panel de pedido a la derecha -->
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

    <!-- Modal del Recibo -->
    <CajaReceiptModal 
      :show="!!ticketConfirmado"
      :ticket="ticketConfirmado"
      :items="reciboItems"
      :metodos-pago="metodosPago"
      :id-metodo-pago="reciboMetodoId"
      @close="cerrarRecibo"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import CajaProductoCard from './CajaProductoCard.vue'
import CajaPedidoPanel from './CajaPedidoPanel.vue'
import CajaReceiptModal from './CajaReceiptModal.vue'

const API = 'http://localhost:3000/api/caja'

// ===== Referencia al panel para llamar métodos expuestos =====
const panelRef = ref(null)

// ===== Datos cargados desde el backend =====
const categorias  = ref([])
const productos   = ref([])
const metodosPago = ref([])
const cargando    = ref(true)
const error       = ref(null)

async function cargarDatos() {
  cargando.value = true
  error.value = null
  try {
    const [resCat, resProd, resMet] = await Promise.all([
      fetch(`${API}/categorias`),
      fetch(`${API}/productos`),
      fetch(`${API}/metodos-pago`),
    ])
    if (!resCat.ok || !resProd.ok || !resMet.ok) throw new Error('Error al cargar datos del servidor')
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

onMounted(cargarDatos)

// ===== Filtrado =====
const filtroCategoria = ref(null)

const productosFiltrados = computed(() => {
  if (filtroCategoria.value === null) return productos.value
  return productos.value.filter(p => p.id_categoria_producto === filtroCategoria.value)
})

// ===== Pedido =====
const pedidoItems = ref([])
const ticketActual = ref('---')
const enviando = ref(false)

// ===== Estado del Recibo Modal =====
const ticketConfirmado = ref(null)
const reciboItems = ref([])
const reciboMetodoId = ref(null)

function añadirAlPedido(producto, tipoPrecio) {
  // Determinar precio según tipo
  const precioMap = {
    COMBO: producto.precio_combo,
    CON_PAPA: producto.precio_con_papa,
    SOLO: producto.precio_solo,
  }
  const precioUnitario = Number(precioMap[tipoPrecio])

  // Buscar si ya existe un item idéntico (mismo producto + mismo tipo)
  const existente = pedidoItems.value.find(
    i => i.id_producto === producto.id_producto && i.tipo_precio === tipoPrecio
  )

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

function eliminar(idx) {
  pedidoItems.value.splice(idx, 1)
}

function cancelarPedido() {
  pedidoItems.value = []
}

async function confirmarPedido(datosPago) {
  if (enviando.value) return
  enviando.value = true

  try {
    const body = {
      items: pedidoItems.value.map(i => ({
        id_producto:    i.id_producto,
        tipo_precio:    i.tipo_precio,
        cantidad:       i.cantidad,
        precio_unitario: i.precio_unitario,
      })),
      pago: {
        id_metodo:    datosPago.id_metodo,
        monto_pagado: datosPago.monto_pagado,
      },
    }

    const res = await fetch(`${API}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(`Error: ${data.error || 'No se pudo crear el pedido'}`)
      return
    }

    // Preparar info para el recibo
    reciboItems.value = [...pedidoItems.value]
    reciboMetodoId.value = datosPago.id_metodo
    ticketConfirmado.value = data.pedido

    // Limpiar pedido actual
    pedidoItems.value = []
    ticketActual.value = '---'
    panelRef.value?.resetPago()

  } catch (err) {
    console.error(err)
    alert('Error de conexión al crear el pedido.')
  } finally {
    enviando.value = false
  }
}

function cerrarRecibo() {
  ticketConfirmado.value = null
  reciboItems.value = []
  reciboMetodoId.value = null
}

// ===== Flush para testing (ejecutar desde la consola del navegador) =====
if (typeof window !== 'undefined') {
  window.flushPedidos = async function () {
    try {
      const res = await fetch(`${API}/flush`, { method: 'DELETE' })
      const data = await res.json()
      console.log('%c✔ ' + data.mensaje, 'color: green; font-weight: bold')
      return data
    } catch (err) {
      console.error('Error al limpiar:', err)
    }
  }
  console.log(
    '%c[CAJA DEV] Para limpiar pedidos y pagos de la BD, ejecuta: flushPedidos()',
    'color: #F2CB05; font-weight: bold; background: #222; padding: 4px 8px; border-radius: 4px'
  )
}
</script>

<style scoped>
.caja-tab {
  display: flex;
  height: calc(100vh - 68px);
  background: #f9f9f9;
}

/* --- Catálogo --- */
.catalogo-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.catalogo-header {
  padding: 20px 24px 12px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

.catalogo-titulo {
  font-size: 18px;
  font-weight: 800;
  color: #222;
  margin-bottom: 12px;
}

/* Filtros */
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

/* Grid de productos */
.catalogo-grid {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 12px;
  align-content: start;
}

/* Mensajes de carga / error */
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

.error-msg {
  color: #D90B31;
}
</style>
