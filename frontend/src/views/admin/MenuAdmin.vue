<template>
  <div class="madmin-root">

    <!-- ══════════════════════════════════════════════════════
         PANTALLA DE ACCESO — solicita contraseña de admin
         Se muestra cuando aún no se ha autenticado en esta vista.
    ══════════════════════════════════════════════════════════ -->
    <div v-if="!autenticado" class="gate-overlay">
      <div class="gate-card">
        <div class="gate-icon">Hola</div>
        <h2 class="gate-titulo">Acceso Administrativo</h2>
        <p class="gate-sub">Ingresa la contraseña para gestionar el menú</p>

        <form class="gate-form" @submit.prevent="verificarPassword">
          <div class="gate-field" :class="{ 'gate-field--error': errorAuth }">
            <input
              ref="inputPassword"
              v-model="password"
              :type="verPassword ? 'text' : 'password'"
              class="gate-input"
              placeholder="Contraseña"
              autocomplete="current-password"
              @input="errorAuth = false"
            />
            <button type="button" class="gate-eye" @click="verPassword = !verPassword">
              {{ verPassword ? '' : '' }}
            </button>
          </div>
          <p v-if="errorAuth" class="gate-error">Contraseña incorrecta</p>
          <button type="submit" class="gate-btn">Ingresar</button>
        </form>
      </div>
    </div>

    <template v-else>

      <!-- Barra de estado -->
      <div class="madmin-statusbar">
        <div class="msb-left">
          <span class="msb-title">Gestión de Menú</span>
          <span class="msb-chip msb-chip--total">{{ productos.length }} platos</span>
          <span class="msb-chip msb-chip--activos">{{ productosActivos }} activos</span>
          <span class="msb-chip msb-chip--inactivos" v-if="productosInactivos > 0">
            {{ productosInactivos }} inactivos
          </span>
        </div>
        <div class="msb-right">
          <button class="madmin-btn madmin-btn--nuevo" @click="abrirFormNuevo">
            + Nuevo plato
          </button>
          <button class="madmin-btn madmin-btn--nuevo-ing" @click="abrirModalNuevoIng">
            + Nuevo ingrediente
          </button>
          <button class="madmin-btn madmin-btn--salir" @click="salir">
            Salir
          </button>
        </div>
      </div>

      <!-- Banner de error de conexión -->
      <div v-if="errorCarga" class="madmin-error-banner">
        {{ errorCarga }}
        <button class="madmin-retry-btn" @click="cargarTodo">Reintentar</button>
      </div>

   

      <!-- Spinner de carga -->
      <div v-if="cargando" class="madmin-cargando">
        <span class="madmin-spinner"></span> Cargando datos
      </div>

      <!-- Filtro / búsqueda -->
      <div class="madmin-filtros" v-if="cargando">
        <input
          v-model="busqueda"
          class="madmin-search"
          placeholder="Buscar por nombre o código…"
        />
        <div class="filtro-tabs">
          <button
            v-for="f in filtros"
            :key="f.val"
            class="filtro-tab"
            :class="{ 'filtro-tab--active': filtroActivo === f.val }"
            @click="filtroActivo = f.val"
          >{{ f.label }}</button>
        </div>
      </div>

      <!-- Grid de productos -->
      <main class="madmin-grid" v-if="!cargando && productosFiltrados.length > 0">
        <article
          v-for="prod in productosFiltrados"
          :key="prod.id_producto"
          class="mprod-card"
          :class="{ 'mprod-card--inactivo': !prod.disponible }"
        >
          <!-- Badge disponibilidad -->
          <span class="mprod-badge" :class="prod.disponible ? 'badge--on' : 'badge--off'">
            {{ prod.disponible ? 'Activo' : 'Inactivo' }}
          </span>

          <!-- Imagen -->
          <div class="mprod-img-frame">
            <img
              v-if="prod.imagen_url"
              :src="prod.imagen_url"
              :alt="prod.nombre"
              class="mprod-img"
              @error="e => e.target.style.display = 'none'"
            />
            <div v-else class="mprod-img-ph">
              <span>NO foto</span>
            </div>
          </div>

          <!-- Info -->
          <div class="mprod-body">
            <p class="mprod-codigo">{{ prod.codigo }}</p>
            <p class="mprod-nombre">{{ prod.nombre }}</p>
            <p class="mprod-categoria">{{ prod.categoria }}</p>

            <div class="mprod-precios">
              <span v-if="prod.precio_combo"    class="precio-pill">Combo: {{ formatBs(prod.precio_combo) }}</span>
              <span v-if="prod.precio_con_papa" class="precio-pill">C/Papa: {{ formatBs(prod.precio_con_papa) }}</span>
              <span v-if="prod.precio_solo"     class="precio-pill">Solo: {{ formatBs(prod.precio_solo) }}</span>
            </div>
          </div>

          <!-- Acciones -->
          <div class="mprod-acciones">
            <button class="mprod-btn mprod-btn--edit" @click="abrirFormEditar(prod)">
              Editar
            </button>
            <button
              class="mprod-btn"
              :class="prod.disponible ? 'mprod-btn--desact' : 'mprod-btn--act'"
              :disabled="toggling === prod.id_producto"
              @click="toggleDisponible(prod)"
            >
              {{ toggling === prod.id_producto
                  ? '…'
                  : prod.disponible ? 'Desactivar' : 'Activar' }}
            </button>
            <button
              class="mprod-btn mprod-btn--eliminar"
              :disabled="eliminando === prod.id_producto"
              @click="eliminarProducto(prod)"
            >
              {{ eliminando === prod.id_producto ? '…' : 'Eliminar' }}
            </button>
          </div>
        </article>
      </main>

      <div v-else-if="!cargando && !errorCarga" class="madmin-vacio">
        <p v-if="busqueda || filtroActivo !== 'todos'">Sin resultados para "{{ busqueda }}"</p>
        <p v-else>No hay platos crea alguno para Pollitocopa</p>
      </div>

    </template>

    <!-- ══════════════════════════════════════════════════════
         MODAL — NUEVO INGREDIENTE
    ══════════════════════════════════════════════════════════ -->
    <transition name="modal-fade">
      <div v-if="modalIngAbierto" class="modal-backdrop" @mousedown.self="cerrarModalNuevoIng">
        <div class="modal-card modal-card--ing">

          <div class="modal-header">
            <h3 class="modal-titulo">Nuevo ingrediente</h3>
            <button class="modal-close" @click="cerrarModalNuevoIng">✕</button>
          </div>

          <div class="modal-body">

            <div class="mform-col">

              <label class="mform-label">Nombre *
                <input v-model="ingForm.nombre" class="mform-input" placeholder="Ej: Pollo Fresco" maxlength="150" />
              </label>

              <label class="mform-label">Unidad de medida *</label>
              <div class="ing-unidades">
                <button
                  v-for="u in ingUnidades" :key="u.valor"
                  class="ing-unidad-btn"
                  :class="{ 'ing-unidad-btn--active': ingForm.unidad_medida === u.valor }"
                  @click="ingForm.unidad_medida = u.valor"
                >{{ u.label }}</button>
              </div>

              <label class="mform-label">Categoría *</label>
              <div class="ing-unidades">
                <button
                  v-for="cat in categoriasIngrediente" :key="cat.id_categoria_ingrediente"
                  class="ing-unidad-btn"
                  :class="{ 'ing-unidad-btn--active': ingForm.id_categoria_ingrediente === cat.id_categoria_ingrediente }"
                  @click="ingForm.id_categoria_ingrediente = cat.id_categoria_ingrediente"
                >{{ cat.nombre }}</button>
              </div>

              <div class="mform-precios-row">
                <label class="mform-label mform-label--sm">Stock mínimo
                  <input v-model.number="ingForm.stock_minimo" type="number" min="0" step="0.001" class="mform-input" placeholder="0" />
                </label>
                <label class="mform-label mform-label--sm">Costo por unidad (Bs)
                  <input v-model.number="ingForm.costo_unitario" type="number" min="0" step="0.01" class="mform-input" placeholder="0.00" />
                </label>
              </div>

              <label class="mform-label">Descripción
                <textarea v-model="ingForm.descripcion" class="mform-input mform-textarea" rows="2" placeholder="Opcional…"></textarea>
              </label>

            </div>

          </div>

          <div class="modal-footer">
            <p v-if="errorIngForm" class="modal-error">{{ errorIngForm }}</p>
            <button class="madmin-btn madmin-btn--cancel" @click="cerrarModalNuevoIng">Cancelar</button>
            <button
              class="madmin-btn madmin-btn--guardar"
              :disabled="guardandoIng || !ingFormValido"
              @click="guardarNuevoIng"
            >
              {{ guardandoIng ? 'Guardando…' : 'Guardar ingrediente' }}
            </button>
          </div>

        </div>
      </div>
    </transition>

    <!-- ══════════════════════════════════════════════════════
         MODAL — CREAR / EDITAR PLATO (HU-24)
    ══════════════════════════════════════════════════════════ -->
    <transition name="modal-fade">
      <div v-if="modalAbierto" class="modal-backdrop" @mousedown.self="cerrarModal">
        <div class="modal-card">

          <div class="modal-header">
            <h3 class="modal-titulo">{{ editando ? 'Editar plato' : 'Nuevo plato' }}</h3>
            <button class="modal-close" @click="cerrarModal">✕</button>
          </div>

          <div class="modal-body">
            <div class="mform-cols">

              <!-- Columna izquierda: datos del producto -->
              <section class="mform-col">
                <h4 class="mform-section-title">Datos del producto</h4>

                <label class="mform-label">Código *
                  <input v-model="form.codigo" class="mform-input" placeholder="ej. COMBO-001" maxlength="20" />
                </label>
                <label class="mform-label">Nombre *
                  <input v-model="form.nombre" class="mform-input" placeholder="ej. Pollo Antojito" maxlength="150" />
                </label>
                <label class="mform-label">Categoría *
                  <select v-model="form.id_categoria_producto" class="mform-input mform-select">
                    <option value="" disabled>Selecciona una categoría</option>
                    <option
                      v-for="cat in categorias"
                      :key="cat.id_categoria_producto"
                      :value="cat.id_categoria_producto"
                    >{{ cat.nombre }}</option>
                  </select>
                </label>
                <label class="mform-label">Descripción
                  <textarea v-model="form.descripcion" class="mform-input mform-textarea" rows="2" placeholder="Descripción opcional…"></textarea>
                </label>
                <label class="mform-label">URL de imagen
                  <input v-model="form.imagen_url" class="mform-input" placeholder="https://…" />
                </label>
                <div class="mform-img-preview" v-if="form.imagen_url">
                  <img :src="form.imagen_url" alt="preview" @error="e => e.target.style.display='none'" />
                </div>

                <h4 class="mform-section-title mform-section-title--mt">Precios (Bs.)</h4>
                <div class="mform-precios-row">
                  <label class="mform-label mform-label--sm">Combo
                    <input v-model.number="form.precio_combo" type="number" min="0" step="0.01" class="mform-input" placeholder="0.00" />
                  </label>
                  <label class="mform-label mform-label--sm">Con papa
                    <input v-model.number="form.precio_con_papa" type="number" min="0" step="0.01" class="mform-input" placeholder="0.00" />
                  </label>
                  <label class="mform-label mform-label--sm">Solo
                    <input v-model.number="form.precio_solo" type="number" min="0" step="0.01" class="mform-input" placeholder="0.00" />
                  </label>
                </div>
              </section>

              <!-- Columna derecha: receta -->
              <section class="mform-col">
                <h4 class="mform-section-title">Receta (ingredientes)</h4>

                <!-- Buscador de ingredientes -->
                <input
                  v-model="busqIng"
                  class="mform-input mform-search-ing"
                  placeholder="Buscar ingrediente…"
                />

                <div class="ing-disponibles">
                  <div
                    v-for="ing in ingredientesFiltrados"
                    :key="ing.id_insumo"
                    class="ing-disponible-item"
                    :class="{ 'ing-ya-agregado': recetaMap[ing.id_insumo] }"
                    @click="agregarIngrediente(ing)"
                  >
                    <span class="ing-d-nombre">{{ ing.nombre }}</span>
                    <span class="ing-d-unidad">{{ ing.unidad_medida }}</span>
                    <span class="ing-d-add" v-if="!recetaMap[ing.id_insumo]">＋</span>
                    <span class="ing-d-check" v-else>✓</span>
                  </div>
                  <p v-if="ingredientesFiltrados.length === 0" class="ing-d-vacio">no hay nada</p>
                </div>

                <div class="receta-lista" v-if="form.receta.length > 0">
                  <h5 class="receta-lista-title">Ingredientes dde este plato</h5>
                  <div
                    v-for="(linea, idx) in form.receta"
                    :key="linea.id_ingrediente"
                    class="receta-linea"
                  >
                    <span class="receta-ing-nombre">{{ linea.nombre_ingrediente }}</span>
                    <div class="receta-cantidad-wrap">
                      <input
                        v-model.number="form.receta[idx].cantidad"
                        type="number"
                        min="0.001"
                        step="0.001"
                        class="receta-cantidad-input"
                      />
                      <span class="receta-unidad">{{ linea.unidad_medida }}</span>
                    </div>
                    <button class="receta-quitar" @click="quitarIngrediente(idx)">✕</button>
                  </div>
                </div>
                <p v-else class="receta-vacia">no hay ingredientes en la receta</p>
              </section>

            </div><!-- /mform-cols -->
          </div><!-- /modal-body -->

          <div class="modal-footer">
            <p v-if="errorForm" class="modal-error">{{ errorForm }}</p>
            <button class="madmin-btn madmin-btn--cancel" @click="cerrarModal">Cancelar</button>
            <button
              class="madmin-btn madmin-btn--guardar"
              :disabled="guardando"
              @click="guardarProducto"
            >
              {{ guardando ? 'Guardando' : (editando ? 'Guardar cambios' : 'Crear platito') }}
            </button>
          </div>

        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// ── Config ───────────────────────────────────────────────────
const API     = 'https://pollocopa.62344037.xyz/api/menuAdmin'
const API_INV = 'https://pollocopa.62344037.xyz/api/inventario'
const PASSWORD_ADMIN = 'admin'   // ← cambiar cuando haya auth real

// ── Auth ─────────────────────────────────────────────────────
const autenticado  = ref(false)
const password     = ref('')
const verPassword  = ref(false)
const errorAuth    = ref(false)
const inputPassword = ref(null)

function verificarPassword() {
  if (password.value === PASSWORD_ADMIN) {
    autenticado.value = true
    cargarTodo()
  } else {
    errorAuth.value = true
    password.value  = ''
  }
}

function salir() {
  autenticado.value = false
  password.value    = ''
}

// ── Datos ────────────────────────────────────────────────────
const productos    = ref([])
const categorias   = ref([])
const ingredientes         = ref([])
const categoriasIngrediente = ref([])   // para el modal nuevo ingrediente

const cargando    = ref(false)
const errorCarga  = ref('')

const busqueda    = ref('')
const filtroActivo = ref('todos')
const toggling    = ref(null)
const eliminando  = ref(null)

const filtros = [
  { val: 'todos',    label: 'Todos'    },
  { val: 'activos',  label: 'Activos'  },
  { val: 'inactivos', label: 'Inactivos' },
]

const productosActivos   = computed(() => productos.value.filter(p => p.disponible).length)
const productosInactivos = computed(() => productos.value.filter(p => !p.disponible).length)

const productosFiltrados = computed(() => {
  let lista = productos.value
  if (filtroActivo.value === 'activos')   lista = lista.filter(p => p.disponible)
  if (filtroActivo.value === 'inactivos') lista = lista.filter(p => !p.disponible)
  if (busqueda.value.trim()) {
    const q = busqueda.value.trim().toLowerCase()
    lista = lista.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.codigo.toLowerCase().includes(q)
    )
  }
  return lista
})

// ── Modal / form ─────────────────────────────────────────────
const modalAbierto = ref(false)
const editando     = ref(false)
const guardando    = ref(false)
const errorForm    = ref('')
const busqIng      = ref('')

const formVacio = () => ({
  id_producto: null,
  codigo: '',
  nombre: '',
  descripcion: '',
  id_categoria_producto: '',
  precio_combo: null,
  precio_con_papa: null,
  precio_solo: null,
  imagen_url: '',
  receta: [],   // [{ id_ingrediente, nombre_ingrediente, unidad_medida, cantidad }]
})

const form = ref(formVacio())

// Map rápido para saber si un ingrediente ya está en la receta
const recetaMap = computed(() => {
  const m = {}
  for (const l of form.value.receta) m[l.id_ingrediente] = true
  return m
})

const ingredientesFiltrados = computed(() => {
  const q = busqIng.value.trim().toLowerCase()
  if (!q) return ingredientes.value
  return ingredientes.value.filter(i => i.nombre.toLowerCase().includes(q))
})

function agregarIngrediente(ing) {
  if (recetaMap.value[ing.id_insumo]) return
  form.value.receta.push({
    id_ingrediente:   ing.id_insumo,
    nombre_ingrediente: ing.nombre,
    unidad_medida:    ing.unidad_medida,
    cantidad:         1,
  })
}

function quitarIngrediente(idx) {
  form.value.receta.splice(idx, 1)
}

function abrirFormNuevo() {
  form.value    = formVacio()
  editando.value = false
  errorForm.value = ''
  busqIng.value  = ''
  modalAbierto.value = true
}

async function abrirFormEditar(prod) {
  form.value = {
    id_producto:          prod.id_producto,
    codigo:               prod.codigo,
    nombre:               prod.nombre,
    descripcion:          prod.descripcion ?? '',
    id_categoria_producto: prod.id_categoria_producto ?? '',
    precio_combo:         prod.precio_combo,
    precio_con_papa:      prod.precio_con_papa,
    precio_solo:          prod.precio_solo,
    imagen_url:           prod.imagen_url ?? '',
    receta:               [],
  }
  editando.value   = true
  errorForm.value  = ''
  busqIng.value    = ''
  modalAbierto.value = true

  // Cargar receta existente
  try {
    const res = await fetch(`${API}/productos/${prod.id_producto}/receta`)
    if (res.ok) {
      const lineas = await res.json()
      form.value.receta = lineas.map(l => ({
        id_ingrediente:     l.id_ingrediente,
        nombre_ingrediente: l.nombre_ingrediente,
        unidad_medida:      l.unidad_medida,
        cantidad:           parseFloat(l.cantidad),
      }))
    }
  } catch (err) {
    console.error('Error cargando receta:', err)
  }
}

function cerrarModal() {
  modalAbierto.value = false
}

async function guardarProducto() {
  errorForm.value = ''

  if (!form.value.codigo.trim())  { errorForm.value = 'El codigo es obligatorio'; return }
  if (!form.value.nombre.trim())  { errorForm.value = 'El nombre es obligatorio'; return }
  if (!form.value.id_categoria_producto) { errorForm.value = 'Selecciona una categoría'; return }

  guardando.value = true
  try {
    const body = {
      codigo:               form.value.codigo.trim(),
      nombre:               form.value.nombre.trim(),
      descripcion:          form.value.descripcion || null,
      id_categoria_producto: form.value.id_categoria_producto,
      precio_combo:         form.value.precio_combo  || null,
      precio_con_papa:      form.value.precio_con_papa || null,
      precio_solo:          form.value.precio_solo   || null,
      imagen_url:           form.value.imagen_url    || null,
      receta:               form.value.receta.map(l => ({
        id_ingrediente: l.id_ingrediente,
        cantidad:       l.cantidad,
      })),
    }

    const url    = editando.value ? `${API}/productos/${form.value.id_producto}` : `${API}/productos`
    const method = editando.value ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { errorForm.value = data.error || 'Error al guardar'; return }

    await cargarProductos()
    cerrarModal()
  } catch (err) {
    console.error(err)
    errorForm.value = 'Error de conexión'
  } finally {
    guardando.value = false
  }
}

// ── HU-25: toggle disponibilidad ─────────────────────────────
async function toggleDisponible(prod) {
  toggling.value = prod.id_producto
  try {
    const res = await fetch(`${API}/productos/${prod.id_producto}/disponibilidad`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disponible: !prod.disponible }),
    })
    if (!res.ok) throw new Error()
    // Mutar localmente para respuesta inmediata
    const idx = productos.value.findIndex(p => p.id_producto === prod.id_producto)
    if (idx !== -1) productos.value[idx] = { ...productos.value[idx], disponible: !prod.disponible }
  } catch {
    alert('No se pudo actualizar la disponibilidad. Intenta de nuevo.')
  } finally {
    toggling.value = null
  }
}

// ── Helpers de fetch por endpoint ────────────────────────────
// Devuelve { ok, data } o { ok: false, msg }
async function fetchEndpoint(path) {
  const url = `${API}/${path}`
  try {
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      return { ok: true, data }
    }
    let msg = `HTTP ${res.status}`
    try { const b = await res.json(); msg += ': ' + (b.error || JSON.stringify(b)) } catch {}
    return { ok: false, msg }
  } catch (err) {
    return { ok: false, msg: `Sin respuesta — ¿está corriendo el backend? (${url})` }
  }
}

// ── Diagnóstico por endpoint ──────────────────────────────────
// null = sin intentar | 'ok' | { ok: false, msg }
const diagnostico = ref({ productos: null, categorias: null, ingredientes: null })

// ── HU-24: eliminar producto ─────────────────────────────────
async function eliminarProducto(prod) {
  if (!confirm(`¿Eliminar "${prod.nombre}"?\nEsta acción no se puede deshacer.`)) return

  eliminando.value = prod.id_producto
  try {
    const res = await fetch(`${API}/productos/${prod.id_producto}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error || 'No se pudo eliminar el producto.')
      return
    }
    // Quitar de la lista local inmediatamente
    productos.value = productos.value.filter(p => p.id_producto !== prod.id_producto)
  } catch {
    alert('Error de conexión al eliminar.')
  } finally {
    eliminando.value = null
  }
}

// ── Carga de datos ────────────────────────────────────────────
async function cargarProductos() {
  const r = await fetchEndpoint('productos')
  if (r.ok) {
    productos.value = r.data
    diagnostico.value.productos = 'ok'
  } else {
    diagnostico.value.productos = r
    console.error('[cargarProductos]', r.msg)
  }
}

async function cargarTodo() {
  cargando.value    = true
  errorCarga.value  = ''
  diagnostico.value = { productos: null, categorias: null, ingredientes: null }

  // Fetch independiente: fallo en uno NO bloquea los demás
  const [rProd, rCat, rIng] = await Promise.all([
    fetchEndpoint('productos'),
    fetchEndpoint('categorias'),
    fetchEndpoint('ingredientes'),
  ])

  if (rProd.ok) { productos.value    = rProd.data; diagnostico.value.productos    = 'ok' }
  else          { diagnostico.value.productos    = rProd; console.error('[productos]',    rProd.msg) }

  if (rCat.ok)  { categorias.value   = rCat.data;  diagnostico.value.categorias   = 'ok' }
  else          { diagnostico.value.categorias   = rCat;  console.error('[categorias]',   rCat.msg)  }

  if (rIng.ok)  { ingredientes.value = rIng.data;  diagnostico.value.ingredientes = 'ok' }
  else          { diagnostico.value.ingredientes = rIng;  console.error('[ingredientes]', rIng.msg)  }

  // Cargar categorías de ingrediente para el modal "Nuevo ingrediente"
  try {
    const rCatIng = await fetch(`${API_INV}/categorias`)
    if (rCatIng.ok) categoriasIngrediente.value = await rCatIng.json()
  } catch {}

  if ([rProd, rCat, rIng].some(r => !r.ok)) {
    errorCarga.value = 'Uno o más endpoints fallaron — revisa el diagnóstico abajo.'
  }

  cargando.value = false
}

// ── Modal Nuevo Ingrediente ──────────────────────────────────
const API_BASE = API   // expuesto al template para el panel de diagnóstico

const ingUnidades = [
  { valor: 'kg',  label: 'kg'  }, { valor: 'g',   label: 'g'   },
  { valor: 'l',   label: 'l'   }, { valor: 'ml',  label: 'ml'  },
  { valor: 'u',   label: 'u'   }, { valor: 'lb',  label: 'lb'  },
  { valor: 'doc', label: 'doc' },
]

const modalIngAbierto = ref(false)
const guardandoIng    = ref(false)
const errorIngForm    = ref('')
const ingFormVacio = () => ({
  nombre: '', unidad_medida: '', id_categoria_ingrediente: null,
  stock_minimo: null, costo_unitario: null, descripcion: '',
})
const ingForm = ref(ingFormVacio())

const ingFormValido = computed(() =>
  ingForm.value.nombre.trim() &&
  ingForm.value.unidad_medida &&
  ingForm.value.id_categoria_ingrediente
)

function abrirModalNuevoIng() {
  ingForm.value    = ingFormVacio()
  errorIngForm.value = ''
  modalIngAbierto.value = true
}
function cerrarModalNuevoIng() { modalIngAbierto.value = false }

async function guardarNuevoIng() {
  if (!ingFormValido.value) return
  guardandoIng.value   = true
  errorIngForm.value   = ''
  try {
    const res = await fetch(`${API_INV}/ingredientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre:                   ingForm.value.nombre.trim(),
        unidad_medida:            ingForm.value.unidad_medida,
        stock_minimo:             ingForm.value.stock_minimo   || 0,
        costo_unitario_avg:       ingForm.value.costo_unitario || 0,
        descripcion:              ingForm.value.descripcion    || null,
        id_categoria_ingrediente: ingForm.value.id_categoria_ingrediente,
        activo: true,
      }),
    })
    const data = await res.json()
    if (!res.ok) { errorIngForm.value = data.error || 'Error al guardar'; return }
    // Refrescar lista de ingredientes para que aparezca en el picker de recetas
    const rIng = await fetchEndpoint('ingredientes')
    if (rIng.ok) ingredientes.value = rIng.data
    cerrarModalNuevoIng()
  } catch {
    errorIngForm.value = 'Error de conexión'
  } finally {
    guardandoIng.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────
function formatBs(n) {
  return Number(n).toFixed(2) + ' Bs.'
}

onMounted(() => {
  // Foco en el input de contraseña al montar
})
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════
   VARIABLES — heredadas del sistema de color del proyecto
══════════════════════════════════════════════════════════ */
.madmin-root {
  --rojo:     #D90B31;
  --rojo-dk:  #A5001F;
  --amarillo: #F2CB05;
  --bg:       #F5F5F5;
  --border:   #E0E0E0;
  --txt:      #1A1A1A;
  --txt2:     #757575;
  --blanco:   #ffffff;
  --verde:    #2e7d32;
  --verde-bg: #e8f5e9;

  background: var(--bg);
  min-height: calc(100vh - 68px);
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: var(--txt);
  position: relative;
}

/* ══ ERROR BANNER & SPINNER ══════════════════════════════ */
.madmin-error-banner {
  display: flex; align-items: center; gap: .75rem;
  background: #FFEBEE; border: 1px solid #FFCDD2;
  color: var(--rojo); font-size: .8rem; font-weight: 600;
  border-radius: 8px; margin: .75rem 1rem;
  padding: .65rem 1rem;
}
.madmin-retry-btn {
  margin-left: auto;
  background: var(--rojo); color: #fff;
  border: none; border-radius: 6px;
  padding: .3rem .8rem; font-size: .75rem; font-weight: 700;
  cursor: pointer;
}
.madmin-retry-btn:hover { background: var(--rojo-dk); }

/* ══ DIAGNÓSTICO ════════════════════════════════════════ */
.madmin-diag {
  background: #1a1a2e; color: #e0e0e0;
  font-family: monospace; font-size: .72rem;
  margin: 0 1rem .75rem;
  border-radius: 8px; padding: .75rem 1rem;
}
.diag-titulo {
  font-weight: 700; color: #F2CB05; margin-bottom: .5rem;
}
.diag-titulo code { color: #aad8ff; }
.diag-row {
  display: flex; align-items: center; gap: .6rem;
  padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,.07);
}
.diag-row:last-child { border-bottom: none; }
.diag-endpoint { color: #aad8ff; min-width: 100px; }
.diag-chip {
  border-radius: 4px; padding: 1px 7px;
  font-size: .68rem; font-weight: 700;
}
.diag-chip--pending { background: #444; color: #aaa; }
.diag-chip--ok      { background: #1b4332; color: #52c41a; }
.diag-chip--err     { background: #4a0010; color: #ff6b81; max-width: 500px; word-break: break-word; }

.madmin-cargando {
  display: flex; align-items: center; justify-content: center; gap: .65rem;
  padding: 3rem 1rem; color: var(--txt2); font-size: .85rem;
}
.madmin-spinner {
  display: inline-block;
  width: 20px; height: 20px;
  border: 3px solid var(--border);
  border-top-color: var(--rojo);
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ══ GATE ═══════════════════════════════════════════════════ */
.gate-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.gate-card {
  background: var(--blanco);
  border-radius: 16px;
  padding: 2.5rem 2rem;
  width: 340px;
  box-shadow: 0 20px 60px rgba(0,0,0,.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .75rem;
}
.gate-icon  { font-size: 2.5rem; }
.gate-titulo { font-size: 1.1rem; font-weight: 800; color: var(--txt); text-align: center; }
.gate-sub    { font-size: .78rem; color: var(--txt2); text-align: center; }

.gate-form { width: 100%; display: flex; flex-direction: column; gap: .6rem; margin-top: .5rem; }

.gate-field {
  display: flex;
  align-items: center;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color .2s;
}
.gate-field:focus-within { border-color: var(--rojo); }
.gate-field--error       { border-color: var(--rojo); animation: shake .3s; }

@keyframes shake {
  0%,100% { transform: translateX(0); }
  25%     { transform: translateX(-6px); }
  75%     { transform: translateX(6px); }
}

.gate-input {
  flex: 1;
  border: none;
  outline: none;
  padding: .6rem .85rem;
  font-size: .88rem;
  background: transparent;
  color: var(--txt);
}
.gate-eye {
  background: none;
  border: none;
  padding: 0 .65rem;
  cursor: pointer;
  font-size: .9rem;
}
.gate-error {
  font-size: .72rem;
  color: var(--rojo);
  margin: 0;
}
.gate-btn {
  background: var(--rojo);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: .6rem;
  font-size: .88rem;
  font-weight: 700;
  cursor: pointer;
  transition: background .15s, transform .1s;
}
.gate-btn:hover  { background: var(--rojo-dk); }
.gate-btn:active { transform: scale(.97); }

/* ══ STATUS BAR ══════════════════════════════════════════════ */
.madmin-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--blanco);
  border-bottom: 1px solid var(--border);
  padding: 0 1.5rem;
  height: 48px;
  flex-shrink: 0;
}
.msb-left  { display: flex; align-items: center; gap: .6rem; }
.msb-right { display: flex; align-items: center; gap: .5rem; }
.msb-title {
  font-size: .8rem;
  font-weight: 700;
  letter-spacing: .5px;
  text-transform: uppercase;
  color: var(--txt2);
}
.msb-chip {
  font-size: .68rem; font-weight: 700;
  padding: 2px 10px; border-radius: 999px;
}
.msb-chip--total    { background: var(--border);    color: var(--txt2); }
.msb-chip--activos  { background: var(--verde-bg);  color: var(--verde); }
.msb-chip--inactivos { background: #FFEBEE;         color: var(--rojo); }

/* ══ FILTROS ════════════════════════════════════════════════ */
.madmin-filtros {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: .65rem 1.5rem;
  background: var(--blanco);
  border-bottom: 1px solid var(--border);
}
.madmin-search {
  flex: 1;
  max-width: 320px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: .4rem .75rem;
  font-size: .82rem;
  outline: none;
  transition: border-color .2s;
}
.madmin-search:focus { border-color: var(--rojo); }

.filtro-tabs { display: flex; gap: .35rem; }
.filtro-tab {
  font-size: .72rem; font-weight: 700;
  padding: 4px 14px; border-radius: 999px;
  border: 1.5px solid var(--border);
  background: transparent; color: var(--txt2);
  cursor: pointer; transition: all .15s;
}
.filtro-tab--active {
  background: var(--rojo); color: #fff; border-color: var(--rojo);
}

/* ══ BOTONES GLOBALES ════════════════════════════════════════ */
.madmin-btn {
  font-size: .72rem; font-weight: 700;
  padding: 5px 14px; border-radius: 7px;
  border: none; cursor: pointer;
  transition: background .15s, transform .1s;
  white-space: nowrap;
}
.madmin-btn--nuevo  { background: var(--rojo); color: #fff; }
.madmin-btn--nuevo:hover  { background: var(--rojo-dk); }
.madmin-btn--salir  { background: var(--border); color: var(--txt2); }
.madmin-btn--salir:hover  { background: #cfcfcf; }
.madmin-btn--guardar { background: var(--rojo); color: #fff; }
.madmin-btn--guardar:hover:not(:disabled) { background: var(--rojo-dk); }
.madmin-btn--guardar:disabled { opacity: .55; cursor: not-allowed; }
.madmin-btn--cancel { background: var(--border); color: var(--txt2); }
.madmin-btn--cancel:hover { background: #cfcfcf; }
.madmin-btn:active:not(:disabled) { transform: scale(.97); }

/* ══ GRID PRODUCTOS ═════════════════════════════════════════ */
.madmin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  padding: 1.25rem 1.5rem;
}
.madmin-vacio {
  text-align: center; padding: 4rem; color: var(--txt2); font-size: .9rem;
}

/* ══ CARD PRODUCTO ══════════════════════════════════════════ */
.mprod-card {
  background: var(--blanco);
  border-radius: 14px;
  border: 1.5px solid var(--border);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: .55rem;
  position: relative;
  transition: border-color .2s, opacity .2s;
}
.mprod-card--inactivo {
  opacity: .65;
  border-color: #FFCDD2;
}
.mprod-badge {
  position: absolute;
  top: -10px; right: 12px;
  font-size: .58rem; font-weight: 700;
  padding: 2px 10px; border-radius: 999px;
  white-space: nowrap;
}
.badge--on  { background: var(--verde);   color: #fff; }
.badge--off { background: var(--rojo);    color: #fff; }

.mprod-img-frame {
  border-radius: 10px; overflow: hidden;
  background: var(--bg); height: 120px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--border);
}
.mprod-img { width: 100%; height: 100%; object-fit: cover; }
.mprod-img-ph { font-size: 2.5rem; }

.mprod-body { display: flex; flex-direction: column; gap: 2px; }
.mprod-codigo    { font-size: .6rem; color: var(--txt2); margin: 0; }
.mprod-nombre    { font-size: .9rem; font-weight: 700; color: var(--txt); margin: 0; }
.mprod-categoria { font-size: .7rem; color: var(--txt2); margin: 0; }

.mprod-precios {
  display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;
}
.precio-pill {
  font-size: .6rem; font-weight: 700;
  background: #FFF9C4; color: #5a4b00;
  border: 1px solid #F2CB05;
  border-radius: 999px; padding: 1px 8px;
}

.mprod-acciones {
  display: flex; flex-direction: column; gap: .4rem; margin-top: auto;
}
.mprod-btn {
  width: 100%; font-size: .72rem; font-weight: 700;
  padding: .4rem; border-radius: 7px;
  border: none; cursor: pointer;
  transition: background .15s, transform .1s;
}
.mprod-btn:disabled { opacity: .5; cursor: not-allowed; }
.mprod-btn:active:not(:disabled) { transform: scale(.97); }
.mprod-btn--edit   { background: var(--amarillo); color: #1A1A1A; }
.mprod-btn--edit:hover  { background: #d4a900; }
.mprod-btn--desact { background: #FFEBEE; color: var(--rojo); border: 1px solid #FFCDD2; }
.mprod-btn--desact:hover:not(:disabled) { background: #FFCDD2; }
.mprod-btn--act    { background: var(--verde-bg); color: var(--verde); border: 1px solid #C8E6C9; }
.mprod-btn--act:hover:not(:disabled)    { background: #C8E6C9; }
.mprod-btn--eliminar { background: #fff; color: var(--rojo); border: 1.5px solid #FFCDD2; }
.mprod-btn--eliminar:hover:not(:disabled) { background: #FFEBEE; }

/* ══ MODAL ══════════════════════════════════════════════════ */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity .2s; }
.modal-fade-enter-from,  .modal-fade-leave-to      { opacity: 0; }

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 1rem;
}
.modal-card {
  background: var(--blanco);
  border-radius: 16px;
  width: 100%;
  max-width: 860px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 80px rgba(0,0,0,.3);
  overflow: hidden;
}
.modal-header {
  background: var(--rojo);
  padding: .85rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.modal-titulo { color: #fff; font-size: .95rem; font-weight: 800; margin: 0; }
.modal-close {
  background: none; border: none; color: rgba(255,255,255,.8);
  font-size: 1rem; cursor: pointer; line-height: 1;
  transition: color .15s;
}
.modal-close:hover { color: #fff; }

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
}
.modal-footer {
  padding: .85rem 1.25rem;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: .5rem;
  flex-shrink: 0;
}
.modal-error {
  flex: 1; font-size: .75rem; color: var(--rojo); margin: 0;
}

/* ══ FORM COLUMNAS ══════════════════════════════════════════ */
.mform-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}
@media (max-width: 640px) {
  .mform-cols { grid-template-columns: 1fr; }
}
.mform-col { display: flex; flex-direction: column; gap: .65rem; }

.mform-section-title {
  font-size: .7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .5px;
  color: var(--rojo); margin: 0;
  padding-bottom: .35rem;
  border-bottom: 1.5px solid var(--border);
}
.mform-section-title--mt { margin-top: .5rem; }

.mform-label {
  display: flex; flex-direction: column; gap: 4px;
  font-size: .72rem; font-weight: 700; color: var(--txt2);
}
.mform-label--sm { flex: 1; }

.mform-input {
  border: 1.5px solid var(--border);
  border-radius: 7px;
  padding: .4rem .65rem;
  font-size: .82rem;
  outline: none;
  transition: border-color .2s;
  background: var(--blanco);
  color: var(--txt);
  width: 100%;
  box-sizing: border-box;
}
.mform-input:focus { border-color: var(--rojo); }
.mform-select  { cursor: pointer; }
.mform-textarea { resize: vertical; min-height: 52px; }

.mform-precios-row {
  display: flex; gap: .5rem;
}
.mform-img-preview {
  border-radius: 8px; overflow: hidden;
  height: 80px; border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  background: var(--bg);
}
.mform-img-preview img { height: 100%; object-fit: cover; }

/* ══ INGREDIENTES DISPONIBLES ════════════════════════════ */
.mform-search-ing { margin-bottom: .25rem; }

.ing-disponibles {
  border: 1.5px solid var(--border);
  border-radius: 8px;
  max-height: 160px;
  overflow-y: auto;
}
.ing-disponible-item {
  display: flex; align-items: center; gap: .5rem;
  padding: 5px 10px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background .12s;
  font-size: .75rem;
}
.ing-disponible-item:last-child { border-bottom: none; }
.ing-disponible-item:hover { background: #FFF9C4; }
.ing-ya-agregado { background: var(--verde-bg); }
.ing-ya-agregado:hover { background: #C8E6C9; }

.ing-d-nombre { flex: 1; font-weight: 600; color: var(--txt); }
.ing-d-unidad { font-size: .67rem; color: var(--txt2); }
.ing-d-add    { color: var(--rojo); font-weight: 700; font-size: .9rem; margin-left: auto; }
.ing-d-check  { color: var(--verde); font-weight: 700; margin-left: auto; }
.ing-d-vacio  { padding: .75rem; text-align: center; color: var(--txt2); font-size: .75rem; margin: 0; }

/* ══ RECETA AÑADIDA ════════════════════════════════════════ */
.receta-lista {
  display: flex; flex-direction: column; gap: .35rem;
  margin-top: .5rem;
}
.receta-lista-title {
  font-size: .68rem; font-weight: 700; color: var(--txt2);
  text-transform: uppercase; letter-spacing: .4px;
  margin: 0 0 .25rem;
}
.receta-linea {
  display: flex; align-items: center; gap: .45rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 4px 8px;
}
.receta-ing-nombre {
  flex: 1; font-size: .75rem; font-weight: 600; color: var(--txt);
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.receta-cantidad-wrap {
  display: flex; align-items: center; gap: 3px;
}
.receta-cantidad-input {
  width: 68px;
  border: 1.5px solid var(--border);
  border-radius: 6px;
  padding: 2px 5px;
  font-size: .75rem;
  text-align: right;
  outline: none;
}
.receta-cantidad-input:focus { border-color: var(--rojo); }
.receta-unidad { font-size: .67rem; color: var(--txt2); white-space: nowrap; }
.receta-quitar {
  background: none; border: none;
  color: var(--rojo); cursor: pointer; font-size: .8rem;
  padding: 0 2px; line-height: 1;
  transition: transform .1s;
}
.receta-quitar:hover { transform: scale(1.2); }

.receta-vacia {
  font-size: .73rem; color: var(--txt2);
  text-align: center; padding: .75rem 0; margin: 0;
  border: 1.5px dashed var(--border); border-radius: 8px;
}

/* ══ NUEVO INGREDIENTE BUTTON ══════════════════════════ */
.madmin-btn--nuevo-ing {
  background: #fff;
  color: var(--rojo);
  border: 1.5px solid var(--rojo);
}
.madmin-btn--nuevo-ing:hover { background: #FFEBEE; }

/* ══ MODAL INGREDIENTE ══════════════════════════════════ */
.modal-card--ing { max-width: 480px; }

.ing-unidades {
  display: flex; flex-wrap: wrap; gap: .4rem;
  margin-top: 2px;
}
.ing-unidad-btn {
  padding: .3rem .8rem;
  border: 1.5px solid var(--border);
  border-radius: 20px;
  background: #fff; color: var(--txt2);
  font-size: .72rem; font-weight: 700;
  cursor: pointer; transition: all .15s;
  text-transform: uppercase; letter-spacing: .3px;
}
.ing-unidad-btn:hover { border-color: var(--rojo); color: var(--rojo); }
.ing-unidad-btn--active {
  background: var(--rojo); border-color: var(--rojo);
  color: #fff;
}
</style>