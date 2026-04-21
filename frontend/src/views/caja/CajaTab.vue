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

      <div class="catalogo-grid">
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
      :items="pedidoItems"
      :ticket="ticketActual"
      @incrementar="incrementar"
      @decrementar="decrementar"
      @eliminar="eliminar"
      @cancelar="cancelarPedido"
      @confirmar="confirmarPedido"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import CajaProductoCard from './CajaProductoCard.vue'
import CajaPedidoPanel from './CajaPedidoPanel.vue'

// ===== Datos de ejemplo (se reemplazarán con llamadas al backend) =====
const categorias = ref([
  { id: 1, nombre: 'Pollos' },
  { id: 2, nombre: 'Hamburguesas' },
  { id: 3, nombre: 'Bebidas' },
])

const productos = ref([
  {
    id_producto: 1,
    codigo: 'POLL-001',
    nombre: 'Pollo Entero',
    descripcion: 'Pollo entero crujiente dorado, con ensalada fresca.',
    id_categoria_producto: 1,
    categoria: 'Pollos',
    precio_combo: 85.00,
    precio_con_papa: 70.00,
    precio_solo: 55.00,
    disponible: true,
    imagen_url: null,
  },
  {
    id_producto: 2,
    codigo: 'POLL-002',
    nombre: 'Medio Pollo',
    descripcion: 'Medio pollo crujiente con ensalada y llajwa.',
    id_categoria_producto: 1,
    categoria: 'Pollos',
    precio_combo: 55.00,
    precio_con_papa: 45.00,
    precio_solo: 35.00,
    disponible: true,
    imagen_url: null,
  },
  {
    id_producto: 3,
    codigo: 'POLL-003',
    nombre: 'Cuarto de Pollo',
    descripcion: 'Cuarto de pollo con ensalada y pan.',
    id_categoria_producto: 1,
    categoria: 'Pollos',
    precio_combo: 35.00,
    precio_con_papa: 28.00,
    precio_solo: 22.00,
    disponible: true,
    imagen_url: null,
  },
  {
    id_producto: 4,
    codigo: 'POLL-004',
    nombre: 'Pollo Fiesta',
    descripcion: 'Pollo entero con papas jumbo, ensalada grande y gaseosa de 2L.',
    id_categoria_producto: 1,
    categoria: 'Pollos',
    precio_combo: 120.00,
    precio_con_papa: null,
    precio_solo: null,
    disponible: true,
    imagen_url: null,
  },
  {
    id_producto: 5,
    codigo: 'HAMB-001',
    nombre: 'Hamburguesa Clásica',
    descripcion: 'Carne a la parrilla con lechuga, tomate y mayonesa.',
    id_categoria_producto: 2,
    categoria: 'Hamburguesas',
    precio_combo: 35.00,
    precio_con_papa: 28.00,
    precio_solo: 20.00,
    disponible: true,
    imagen_url: null,
  },
  {
    id_producto: 6,
    codigo: 'HAMB-002',
    nombre: 'Hamburguesa Doble',
    descripcion: 'Doble carne con queso, lechuga, tomate y salsas.',
    id_categoria_producto: 2,
    categoria: 'Hamburguesas',
    precio_combo: 45.00,
    precio_con_papa: 38.00,
    precio_solo: 28.00,
    disponible: true,
    imagen_url: null,
  },
  {
    id_producto: 7,
    codigo: 'BEB-001',
    nombre: 'Gaseosa 500ml',
    descripcion: 'Coca-Cola, Fanta o Sprite.',
    id_categoria_producto: 3,
    categoria: 'Bebidas',
    precio_combo: null,
    precio_con_papa: null,
    precio_solo: 8.00,
    disponible: true,
    imagen_url: null,
  },
  {
    id_producto: 8,
    codigo: 'BEB-002',
    nombre: 'Jugo Natural 350ml',
    descripcion: 'Jugo de naranja, piña o mixto.',
    id_categoria_producto: 3,
    categoria: 'Bebidas',
    precio_combo: null,
    precio_con_papa: null,
    precio_solo: 12.00,
    disponible: true,
    imagen_url: null,
  },
])

// ===== Filtrado =====
const filtroCategoria = ref(null)

const productosFiltrados = computed(() => {
  if (filtroCategoria.value === null) return productos.value
  return productos.value.filter(p => p.id_categoria_producto === filtroCategoria.value)
})

// ===== Pedido =====
const pedidoItems = ref([])
const ticketCounter = ref(1)
const ticketActual = computed(() => {
  const num = String(ticketCounter.value).padStart(4, '0')
  return `T-${num}`
})

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

function confirmarPedido() {
  // Placeholder — se conectará al backend después
  alert(`Pedido ${ticketActual.value} confirmado con ${pedidoItems.value.length} item(s).`)
  pedidoItems.value = []
  ticketCounter.value++
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
  border-color: #F2CB05;
  color: #7a6200;
  background: rgba(242, 203, 5, 0.08);
}

.filtro-btn.active {
  background: #F2CB05;
  border-color: #F2CB05;
  color: #333;
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
</style>
