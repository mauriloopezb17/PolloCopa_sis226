<template>
  <div class="cocina-root">
  <div class="cocina-layout">
  <div class="cocina-pedidos-col">

    <div class="status-bar">
      <div class="status-left">
        <div class="stat-item">
          <span class="stat-num" :class="{ 'stat-num--alert': pedidosOrdenados.length > 0 }">
            {{ pedidosOrdenados.length }}
          </span>
          <span class="stat-lbl">en cola</span>
        </div>
        <div class="divider-v"></div>
        <div class="stat-item">
          <span class="stat-num stat-num--green">{{ pedidosListosHoy }}</span>
          <span class="stat-lbl">completados hoy</span>
        </div>
      </div>

      <div class="status-right">
        <div class="conexion-chip" :class="{ 'chip--vivo': sincronizando }">
          <span class="chip-dot"></span>
          <span>{{ sincronizando ? 'En vivo' : 'Sin conexión' }}</span>
        </div>
        <div class="reloj-chip">{{ horaActual }}</div>
      </div>
    </div>

    <transition name="banner-slide">
      <div v-if="mostrarAvisoRefresco" class="refresco-banner">
        <span class="refresco-icono">⚠️</span>
        <span class="refresco-txt">
          Cambiaste un ingrediente — recarga la página para evitar pedidos fantasma y asegurarte de que la base de datos esté sincronizada.
        </span>
        <button class="refresco-btn-ok" @click="recargarPagina">Recargar ahora</button>
        <button class="refresco-btn-cerrar" @click="mostrarAvisoRefresco = false" aria-label="Cerrar aviso">✕</button>
      </div>
    </transition>
    <section class="resumen-bar" v-if="resumenProductos.length > 0">
      <span class="resumen-titulo">Preparar ahora:</span>
      <ul class="resumen-lista">
        <li
          v-for="item in resumenProductos"
          :key="item.nombre"
          class="resumen-item"
        >
          <span class="resumen-count">{{ item.total }}</span>
          <span class="resumen-nombre">{{ item.nombre }}</span>
        </li>
      </ul>
    </section>

    <main class="pedidos-grid" v-if="pedidosExpandidos.length > 0">
      <article
        v-for="(pedido, index) in pedidosExpandidos"
        :key="pedido._uid"
        class="pedido-card"
        :class="estadoCard(pedido)"
      >
        <div class="pos-badge" :class="`pos-${posicion(index)}`">
          {{ posicion(index) === 'first' ? 'PRIMERO' : posicion(index) === 'last' ? 'ÚLTIMO' : '#' + (index + 1) }}
        </div>

        <div class="img-frame">
          <img
            v-if="pedido.imagen_url"
            :src="pedido.imagen_url"
            :alt="pedido.nombre_producto"
            class="combo-img"
            @error="onImgError($event)"
          />
          <div class="img-placeholder" v-else>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <rect width="44" height="44" rx="8" fill="#FFEBEE"/>
              <rect x="10" y="9" width="24" height="5" rx="2.5" fill="#E53935" opacity=".3"/>
              <ellipse cx="22" cy="26" rx="10" ry="7.5" fill="#E53935" opacity=".15"/>
              <rect x="7" y="34" width="30" height="3" rx="1.5" fill="#FFC107" opacity=".35"/>
            </svg>
            <span class="ph-txt">Sin imagen</span>
          </div>
          <span v-if="tiempoMs(pedido) >= ALERTA_MS" class="urgente-dot"></span>
        </div>

        <div class="pedido-body">
          <p class="pedido-ticket">Ticket #{{ pedido.numero_ticket }}</p>
          <p class="pedido-nombre">{{ pedido.nombre_producto }}</p>
          <p class="pedido-tipo">{{ pedido.tipo_precio_label }}</p>
          <p v-if="pedido.instrucciones" class="pedido-ins">
            {{ pedido.instrucciones }}
          </p>
        </div>

        <div class="tiempo-bloque">
          <div class="tiempo-nums">
            <span class="t-elapsed">{{ fmtMs(tiempoMs(pedido)) }}</span>
            <span class="t-total">/ {{ fmtMs(LIMITE_MS) }}</span>
          </div>
          <div class="barra-bg">
            <div
              class="barra-fill"
              :class="colorBarra(pedido)"
              :style="{ width: pct(pedido) + '%' }"
            ></div>
          </div>
        </div>

        <div class="pedido-precio">{{ pedido.subtotal }} Bs.</div>

        <button
          class="btn-completar"
          :disabled="completando === pedido.id_pedido"
          @click="completarPedido(pedido)"
        >
          {{ completando === pedido.id_pedido ? 'Completando…' : 'Completar orden' }}
        </button>

      </article>
    </main>

    <div v-else class="vacio">
      <p>Sin pedidos en cola</p>
    </div>

  </div><!-- /cocina-pedidos-col -->

  <aside class="ingredientes-panel">
    <div class="ing-header">
      <span class="ing-titulo">Ingredientes</span>
      <span
        class="ing-estado-chip"
        :class="ingredientesAgotados === 0 ? 'chip-ok' : 'chip-falta'"
      >
        {{ ingredientesAgotados === 0 ? 'Todo disponible' : `${ingredientesAgotados} falta${ingredientesAgotados > 1 ? 'n' : ''}` }}
      </span>
    </div>

    <div class="ing-lista">
      <div
        v-for="ing in ingredientes"
        :key="ing.id"
        class="ing-item"
        :class="{ 'ing-item--out': ing.out }"
      >
        <span class="ing-nombre">{{ ing.name }}</span>
        <button
          class="ing-btn"
          :class="ing.out ? 'ing-btn--restore' : 'ing-btn--disponible'"
          :disabled="togglingIngId === ing.id"
          @click="toggleIngrediente(ing.id)"
        >
          {{ ing.out ? 'Hay' : 'No hay' }}
        </button>
      </div>
      <div v-if="ingredientes.length === 0" class="ing-vacio">
        Cargando…
      </div>
    </div>

    <button class="ing-btn-refresh" @click="cargarIngredientes">
      Actualizar lista
    </button>
  </aside>

  </div><!-- /cocina-layout -->
  </div><!-- /cocina-root -->
</template>

<script>
const LIMITE_MS  = 10 * 60 * 1000   // límite: 10 minutos
const ALERTA_MS  =  8 * 60 * 1000   // alerta al 80% (8 min)
const CRITICO_MS = 10 * 60 * 1000   
const POLLING_MS = 5 * 1000
const API_BASE   = 'http://localhost:3000/api/cocina'
const API_ING    = 'http://localhost:3000/api/ingredients'
const MODO_MOCK  = false

const TIPO_LABELS = {
  COMBO:    'Combo completo',
  CON_PAPA: 'Con papas',
  SOLO:     'Solo',
}

export default {
  name: 'CocinaPedidos',

  data() {
    return {
      pedidos: [],
      pedidosListosHoy: 0,
      ahora: Date.now(),
      sincronizando: false,
      completando: null,
      _tick: null,
      _poll: null,
      LIMITE_MS,
      ALERTA_MS,
      // ── Ingredientes ──
      ingredientes: [],
      togglingIngId: null,
      // ── Aviso de refresco ──
      mostrarAvisoRefresco: false,
    }
  },

  computed: {
    pedidosOrdenados() {
      return [...this.pedidos]
        .filter(p => p.estado === 'EN PROCESO')
        .sort((a, b) => new Date(a.hora_pedido) - new Date(b.hora_pedido))
        .map(p => ({
          ...p,
          tipo_precio_label: TIPO_LABELS[p.tipo_precio] || p.tipo_precio,
        }))
    },
    horaActual() {
      return new Date(this.ahora).toLocaleTimeString('es-BO', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    },
    // HU-23: totales acumulados por nombre de producto
    resumenProductos() {
      const mapa = {}
      for (const p of this.pedidosOrdenados) {
        const key = p.nombre_producto
        if (!mapa[key]) mapa[key] = 0
        mapa[key] += (p.cantidad || 1)
      }
      return Object.entries(mapa)
        .map(([nombre, total]) => ({ nombre, total }))
        .sort((a, b) => b.total - a.total)
    },
    pedidosExpandidos() {
      const resultado = []
      for (const pedido of this.pedidosOrdenados) {
        const cant = pedido.cantidad > 1 ? pedido.cantidad : 1
        for (let i = 0; i < cant; i++) {
          resultado.push({
            ...pedido,
            _uid: `${pedido.id_pedido}-${i}`,
            cantidad: 1,
          })
        }
      }
      return resultado
    },
    ingredientesAgotados() {
      return this.ingredientes.filter(i => i.out).length
    },
  },

  methods: {
    tiempoMs(p) {
      return Math.max(0, this.ahora - new Date(p.hora_pedido).getTime())
    },
    pct(p) {
      return Math.min((this.tiempoMs(p) / LIMITE_MS) * 100, 100).toFixed(1)
    },
    fmtMs(ms) {
      const t = Math.max(0, Math.floor(ms / 1000))
      return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0')
    },
    estadoCard(p) {
      const ms = this.tiempoMs(p)
      if (ms >= CRITICO_MS) return 'card-critico parpadeando-suave'  
      const v = parseFloat(this.pct(p))
      if (v >= 100) return 'card-urgente parpadeando'
      if (v >= 80)  return 'card-warn'
      return 'card-ok'
    },
    colorBarra(p) {
      const v = parseFloat(this.pct(p))
      if (v >= 100) return 'fill-red'
      if (v >= 80)  return 'fill-yellow'
      return 'fill-green'
    },
    posicion(i) {
      if (i === 0) return 'first'
      if (i === this.pedidosExpandidos.length - 1) return 'last'
      return 'mid'
    },
    onImgError(e) {
      e.target.style.display = 'none'
      e.target.nextElementSibling && (e.target.nextElementSibling.style.display = 'flex')
    },

    /* ── Modal receta ── */
    verReceta(item) {
      this.recetaActual = item
      this.recetaVisible = true
    },
    cerrarReceta() {
      this.recetaVisible = false
      this.recetaActual  = {}
    },
    
    rutaReceta(item) {
      const CLOUD_NAME = 'dg6scbzzi'  
      const BASE = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/`

      if (item.codigo) {
        return `${BASE}${item.codigo.toLowerCase()}.png`
      }

      const nombre = (item.nombre_producto || 'sin-receta')
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_-]/g, '')

      return `${BASE}${nombre}.png`
    },
    onRecetaImgError(e) {
      e.target.style.display = 'none'
      const ph = e.target.nextElementSibling
      if (ph) ph.style.display = 'flex'
    },

    /* ── Pedidos ── */
    async cargarPedidos() {
      if (MODO_MOCK) { this._cargarMock(); this.sincronizando = true; return }
      try {
        const res = await fetch(`${API_BASE}/pedidos`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        this.pedidos = await res.json()
        this.sincronizando = true
      } catch (err) {
        console.error('[Cocina] Error al cargar:', err)
        this.sincronizando = false
      }
    },

    async completarPedido(pedido) {
      this.completando = pedido.id_pedido
      if (MODO_MOCK) {
        await new Promise(r => setTimeout(r, 600))
        const p = this.pedidos.find(x => x.id_pedido === pedido.id_pedido)
        if (p) { p.estado = 'LISTO'; this.pedidosListosHoy++ }
        this.completando = null
        return
      }
      try {
        const res = await fetch(`${API_BASE}/pedidos/${pedido.id_pedido}/completar`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        await this.cargarPedidos()
        this.pedidosListosHoy++
      } catch (err) {
        console.error('[Cocina] Error al completar:', err)
        alert('No se pudo completar el pedido. Intenta de nuevo.')
      } finally {
        this.completando = null
      }
    },

    _cargarMock() {
      if (this.pedidos.length > 0) return
      const b = Date.now()
      this.pedidos = [
        { id_pedido:1, numero_ticket:'T-0001', hora_pedido:new Date(b-270000).toISOString(), instrucciones:'', subtotal:30.00, nombre_producto:'POLLO ANTOJITO', tipo_precio:'COMBO',    cantidad:1, imagen_url:'', estado:'EN PROCESO' },
        { id_pedido:2, numero_ticket:'T-0002', hora_pedido:new Date(b-180000).toISOString(), instrucciones:'Sin ají', subtotal:25.00, nombre_producto:'POLLO ANTOJITO', tipo_precio:'CON_PAPA', cantidad:2, imagen_url:'', estado:'EN PROCESO' },
        { id_pedido:3, numero_ticket:'T-0003', hora_pedido:new Date(b-60000).toISOString(),  instrucciones:'', subtotal:18.00, nombre_producto:'PECHUGA DORADA',  tipo_precio:'SOLO',     cantidad:1, imagen_url:'', estado:'EN PROCESO' },
      ]
    },

    // ── Ingredientes (cocinaIngredientes.js) ──
    async cargarIngredientes() {
      try {
        const res = await fetch(API_ING)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        this.ingredientes = await res.json()
      } catch (err) {
        console.error('[Cocina] Error al cargar ingredientes:', err)
      }
    },

    async toggleIngrediente(id) {
      this.togglingIngId = id
      try {
        const res = await fetch(`${API_ING}/${id}/toggle`, { method: 'PATCH' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        // Recarga completa para garantizar que la lista refleje el estado real del servidor
        await this.cargarIngredientes()
        // Avisar al usuario que recargue para evitar pedidos fantasma
        this.mostrarAvisoRefresco = true
      } catch (err) {
        console.error('[Cocina] Error al actualizar ingrediente:', err)
      } finally {
        this.togglingIngId = null
      }
    },

    recargarPagina() {
      window.location.reload()
    },
  },

  mounted() {
    this.cargarPedidos()
    this.cargarIngredientes()
    this._poll = setInterval(() => this.cargarPedidos(), POLLING_MS)
    this._tick = setInterval(() => { this.ahora = Date.now() }, 1000)
  },

  beforeUnmount() {
    clearInterval(this._poll)
    clearInterval(this._tick)
  },
}
</script>

<style scoped>
.cocina-root {
  --rojo:     #E53935;
  --rojo-s:   #FFEBEE;
  --rojo-dk:  #C62828;
  --amarillo: #FFC107;
  --verde:    #43A047;
  --bg:       #F5F5F5;
  --border:   #E0E0E0;
  --txt:      #1A1A1A;
  --txt2:     #757575;

  background: var(--bg);
  min-height: calc(100vh - 68px); 
  box-sizing: border-box;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: var(--txt);
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid var(--border);
  padding: 0 1.5rem;
  height: 44px;
}

.status-left  { display: flex; align-items: center; gap: .85rem; }
.stat-item    { display: flex; align-items: baseline; gap: 5px; }
.stat-num     { font-size: .95rem; font-weight: 700; color: var(--txt); }
.stat-num--alert { color: var(--rojo); }
.stat-num--green { color: var(--verde); }
.stat-lbl     { font-size: .68rem; color: var(--txt2); }
.divider-v    { width: 1px; height: 18px; background: var(--border); }

.status-right { display: flex; align-items: center; gap: .75rem; }

.conexion-chip {
  display: flex; align-items: center; gap: 5px;
  font-size: .68rem; font-weight: 600;
  color: var(--txt2);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px 10px;
}
.chip-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--border);
  flex-shrink: 0;
}
.chip--vivo              { color: var(--verde); border-color: #C8E6C9; background: #F1F8E9; }
.chip--vivo .chip-dot    { background: var(--verde); }

.reloj-chip {
  font-size: .78rem; font-weight: 700;
  color: var(--txt);
  font-variant-numeric: tabular-nums;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px 12px;
}

/* ── Grid ── */
.pedidos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(205px, 1fr));
  gap: 1rem;
  padding: 1.25rem;
}

/* ── Tarjeta ── */
.pedido-card {
  background: #fff;
  border-radius: 14px;
  border: 1.5px solid var(--border);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: .55rem;
  position: relative;
  transition: border-color .25s;
}
.card-ok      { border-color: var(--border); }
.card-warn    { border-color: var(--amarillo); }
.card-urgente { border-color: var(--rojo); }
@keyframes parpadear { 0%,100%{opacity:1} 50%{opacity:.5} }
.parpadeando  { animation: parpadear 1s ease-in-out infinite; }

.pos-badge {
  position: absolute;
  top: -11px; left: 50%; transform: translateX(-50%);
  font-size: .58rem; font-weight: 700; letter-spacing: .7px;
  border-radius: 999px; padding: 2px 10px; white-space: nowrap;
}
.pos-first { background: var(--rojo);   color: #fff; }
.pos-mid   { background: var(--border); color: var(--txt2); }
.pos-last  { background: var(--txt);    color: #fff; }

.img-frame {
  border-radius: 10px; overflow: hidden;
  background: var(--bg); height: 130px;
  display: flex; align-items: center; justify-content: center;
  position: relative; border: 1px solid var(--border);
}
.combo-img { width: 100%; height: 100%; object-fit: cover; }
.img-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  flex-direction: column; gap: 4px;
}
.ph-txt      { font-size: .6rem; color: var(--txt2); }
.urgente-dot { position: absolute; top: 8px; right: 8px; width: 10px; height: 10px; border-radius: 50%; background: var(--rojo); }

.pedido-body     { text-align: center; }
.pedido-ticket   { margin: 0; font-size: .6rem; color: var(--txt2); }
.pedido-nombre   { margin: 2px 0 1px; font-size: .88rem; font-weight: 700; color: var(--txt); }
.pedido-tipo     { margin: 0; font-size: .72rem; color: var(--txt2); }
.pedido-cantidad { margin: 2px 0 0; font-size: .78rem; font-weight: 700; color: var(--rojo); }
.pedido-ins {
  margin: 4px 0 0; font-size: .7rem; font-weight: 700;
  color: var(--rojo); background: var(--rojo-s);
  border-radius: 6px; padding: 3px 8px;
}

.tiempo-bloque { margin-top: auto; }
.tiempo-nums   { display: flex; justify-content: space-between; font-size: .63rem; margin-bottom: 3px; font-variant-numeric: tabular-nums; }
.t-elapsed     { font-weight: 700; color: var(--txt); }
.t-total       { color: var(--txt2); }
.barra-bg      { background: var(--border); border-radius: 999px; height: 6px; overflow: hidden; }
.barra-fill    { height: 100%; border-radius: 999px; transition: width .9s linear; }
.fill-green    { background: var(--verde); }
.fill-yellow   { background: var(--amarillo); }
.fill-red      { background: var(--rojo); }

.pedido-precio {
  text-align: center; font-size: .95rem; font-weight: 700; color: var(--rojo);
  border-top: 1px solid var(--border); padding-top: .45rem;
}

.btn-completar {
  width: 100%;
  background: var(--rojo);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: .5rem;
  font-size: .78rem;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: .2px;
  transition: background .15s, transform .1s, opacity .2s;
}
.btn-completar:hover:not(:disabled)  { background: var(--rojo-dk); }
.btn-completar:active:not(:disabled) { transform: scale(.97); }
.btn-completar:disabled              { opacity: .6; cursor: not-allowed; }

/* ── HU-21: parpadeo rojo suave tras 10 minutos ── */
@keyframes parpadear-suave {
  0%,100% { background-color: #f1a4a4; border-color: #EF9A9A; }
  50%     { background-color: #FFEBEE; border-color: var(--rojo); }
}
.card-critico       { border-color: #f1a4a4; }
.parpadeando-suave  { animation: parpadear-suave 1.6s ease-in-out infinite; }

/* ── HU-23: barra de resumen de productos ── */
.resumen-bar {
  background: #fff;
  border-bottom: 1px solid var(--border);
  padding: .6rem 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: .85rem;
}
.resumen-titulo {
  font-size: .7rem;
  font-weight: 700;
  color: var(--txt2);
  letter-spacing: .4px;
  text-transform: uppercase;
  white-space: nowrap;
  padding-top: 2px;
}
.resumen-lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: .3rem;
}
.resumen-item {
  display: flex;
  align-items: center;
  gap: .5rem;
}
.resumen-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--rojo);
  color: #fff;
  font-size: .72rem;
  font-weight: 700;
  padding: 0 5px;
}
.resumen-nombre {
  font-size: .78rem;
  font-weight: 600;
  color: var(--txt);
}

.cocina-layout {
  display: flex;
  align-items: flex-start;
  min-height: calc(100vh - 68px - 44px);
}
.cocina-pedidos-col {
  flex: 1 1 0;
  min-width: 0;
  overflow-y: auto;
}

/* ── Panel ingredientes ── */
.ingredientes-panel {
  flex: 0 0 220px;
  width: 220px;
  background: #fff;
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-self: stretch;
}

.ing-header {
  background: var(--rojo);
  padding: .55rem .75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
  flex-shrink: 0;
}
.ing-titulo {
  color: #fff;
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: .5px;
  text-transform: uppercase;
}
.ing-estado-chip {
  font-size: .62rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1.5px solid rgba(255,255,255,.6);
  white-space: nowrap;
}
.chip-ok    { color: #fff; }
.chip-falta { color: #FFCA07; border-color: #FFCA07; }

.ing-lista {
  flex: 1 1 0;
  overflow-y: auto;
  max-height: calc(100vh - 68px - 44px - 42px - 48px); /* viewport - navbar - statusbar - ing-header - refresh-btn */
  padding: .5rem .6rem;
  display: flex;
  flex-direction: column;
  gap: .4rem;
}

.ing-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #FFCA07;
  border: 1.5px solid #D90404;
  border-radius: 8px;
  padding: 6px 8px;
  transition: opacity .2s;
}
.ing-item--out {
  opacity: .72;
  background: #ecc434;
}

.ing-nombre {
  font-size: .72rem;
  font-weight: 700;
  color: #1A1A1A;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: .4rem;
}

.ing-btn {
  font-size: .65rem;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 6px;
  border: 2px solid;
  cursor: pointer;
  transition: background .15s, transform .1s;
  white-space: nowrap;
  flex-shrink: 0;
}
.ing-btn:disabled { opacity: .5; cursor: not-allowed; }
.ing-btn--disponible {
  background: #EB1A20;
  color: #fff;
  border-color: #8a0825;
}
.ing-btn--disponible:hover:not(:disabled) { background: #a00025; transform: scale(.97); }
.ing-btn--restore {
  background: #2d5a1a;
  color: #a8f07a;
  border-color: #8a0825;
}
.ing-btn--restore:hover:not(:disabled) { background: #1a3a0a; transform: scale(.97); }

.ing-btn-refresh {
  flex-shrink: 0;
  margin: .5rem .6rem .6rem;
  background: var(--rojo);
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: .42rem;
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .3px;
  text-transform: uppercase;
  cursor: pointer;
  transition: background .15s, transform .1s;
}
.ing-btn-refresh:hover { background: var(--rojo-dk); transform: scale(.98); }

.ing-vacio {
  font-size: .72rem;
  color: var(--txt2);
  text-align: center;
  padding: 1.5rem 0;
}

/* ── Aviso de refresco de pestaña ── */
.refresco-banner {
  display: flex;
  align-items: center;
  gap: .65rem;
  background: #FFF8E1;
  border-bottom: 2px solid #FFC107;
  padding: .55rem 1.25rem;
  flex-wrap: wrap;
}
.refresco-icono {
  font-size: 1rem;
  flex-shrink: 0;
}
.refresco-txt {
  flex: 1 1 0;
  font-size: .72rem;
  font-weight: 600;
  color: #5D4037;
  min-width: 160px;
}
.refresco-btn-ok {
  background: #E53935;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: .3rem .85rem;
  font-size: .7rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background .15s, transform .1s;
  flex-shrink: 0;
}
.refresco-btn-ok:hover { background: #C62828; transform: scale(.97); }
.refresco-btn-cerrar {
  background: transparent;
  border: none;
  color: #9E9E9E;
  font-size: .85rem;
  cursor: pointer;
  padding: 2px 4px;
  line-height: 1;
  flex-shrink: 0;
  transition: color .15s;
}
.refresco-btn-cerrar:hover { color: #333; }

/* transición slide-down */
.banner-slide-enter-active,
.banner-slide-leave-active { transition: max-height .3s ease, opacity .3s ease; overflow: hidden; }
.banner-slide-enter-from,
.banner-slide-leave-to     { max-height: 0; opacity: 0; }
.banner-slide-enter-to,
.banner-slide-leave-from   { max-height: 80px; opacity: 1; }

.vacio { text-align: center; padding: 5rem 1rem; color: var(--txt2); font-size: .9rem; }
</style>