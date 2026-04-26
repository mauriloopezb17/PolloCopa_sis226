<template>
  <div class="cocina-root">
  <div class="cocina-layout">
  <div class="cocina-pedidos-col">

    <!-- ── Barra de estado ── -->
    <div class="status-bar">
      <div class="status-left">
        <div class="stat-item">
          <span class="stat-num" :class="{ 'stat-num--alert': pedidosExpandidos.length > 0 }">
            {{ pedidosExpandidos.length }}
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
        <!-- 🎵 Botón música mejorado -->
        <button class="btn-musica" :class="{ 'btn-musica--activa': musicaActiva }" @click="toggleMusica" :title="musicaActiva ? 'Pausar música' : 'Reproducir música'">
          <span class="musica-icono">{{ musicaActiva ? '♪' : '♩' }}</span>
          <span class="musica-barra barra-1" :class="{ 'barra-activa': musicaActiva }"></span>
          <span class="musica-barra barra-2" :class="{ 'barra-activa': musicaActiva }"></span>
          <span class="musica-barra barra-3" :class="{ 'barra-activa': musicaActiva }"></span>
          <span class="musica-lbl">{{ musicaActiva ? 'ON :)' : 'OFF :(' }}</span>
        </button>

        <div class="conexion-chip" :class="{ 'chip--vivo': sincronizando }">
          <span class="chip-dot"></span>
          <span>{{ sincronizando ? 'En vivo' : 'Sin conexión' }}</span>
        </div>
        <div class="reloj-chip">{{ horaActual }}</div>
      </div>
    </div>

    <!-- ── HU-23: resumen ── -->
    <section class="resumen-bar" v-if="resumenProductos.length > 0">
      <span class="resumen-titulo">Preparar ahora:</span>
      <ul class="resumen-lista">
        <li v-for="item in resumenProductos" :key="item.nombre" class="resumen-item">
          <span class="resumen-count">{{ item.total }}</span>
          <span class="resumen-nombre">{{ item.nombre }}</span>
        </li>
      </ul>
    </section>

    <!-- ══════════════════════════════════════
         PEDIDOS AGRUPADOS POR TICKET
         Cada bloque = un pedido completo del cajero.
         Dentro del bloque = una tarjeta por producto.
    ══════════════════════════════════════════ -->
    <main class="pedidos-area" v-if="pedidosAgrupados.length > 0">
      <div
        v-for="grupo in pedidosAgrupados"
        :key="grupo.id_pedido"
        class="grupo-pedido"
      >
        <!-- Cabecera del grupo -->
        <div class="grupo-header">
          <div class="grupo-header-left">
            <span class="grupo-ticket">{{ grupo.numero_ticket }}</span>
            <span class="grupo-count">
              {{ grupo.items.length }} {{ grupo.items.length === 1 ? 'producto' : 'productos' }}
            </span>
          </div>
          <div class="grupo-header-right">
            <span class="grupo-tiempo" :class="tiempoMsGrupo(grupo) >= ALERTA_MS ? 'tiempo-alerta' : 'tiempo-ok'">
              {{ fmtMs(tiempoMsGrupo(grupo)) }}
            </span>
            <span v-if="grupo.instrucciones" class="grupo-ins">{{ grupo.instrucciones }}</span>
          </div>
        </div>

        <!-- Tarjetas de productos dentro del grupo -->
        <div class="grupo-cards">
          <article
            v-for="pedido in grupo.items"
            :key="pedido._uid"
            class="pedido-card"
            :class="estadoCard(pedido)"
          >
            <div class="img-frame">
              <img
                v-if="pedido.imagen_url"
                :src="pedido.imagen_url"
                :alt="pedido.nombre_producto"
                class="combo-img"
                @error="onImgError($event)"
              />
              <div class="img-placeholder" v-else>
                <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
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
              <p v-if="pedido.instrucciones" class="pedido-ins">{{ pedido.instrucciones }}</p>
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

            <div class="pedido-precio">{{ Number(pedido.subtotal_detalle).toFixed(2) }} Bs.</div>

            <div class="card-acciones">
              <button class="btn-receta" @click="verReceta(pedido)">Ver receta</button>
              <button
                class="btn-completar"
                :disabled="completando === pedido.id_detalle"
                @click="completarDetalle(pedido)"
              >
                {{ completando === pedido.id_detalle ? 'Completando…' : 'Completar orden' }}
              </button>
            </div>
          </article>
        </div>

      </div>
    </main>

    <div v-else class="vacio">
      <p>Sin pedidos en cola</p>
    </div>

  </div><!-- /cocina-pedidos-col -->

  <!-- ── Panel ingredientes (sin cambios) ── -->
  <aside class="ingredientes-panel">
    <div class="ing-header">
      <span class="ing-titulo">Ingredientes</span>
      <span class="ing-estado-chip" :class="ingredientesAgotados === 0 ? 'chip-ok' : 'chip-falta'">
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
      <div v-if="ingredientes.length === 0" class="ing-vacio">Cargando…</div>
    </div>
    <button class="ing-btn-refresh" @click="cargarIngredientes">Actualizar lista</button>
  </aside>

  <!-- ── Modal ver receta ── -->
  <transition name="modal-fade">
    <div v-if="recetaVisible" class="modal-overlay" @click.self="cerrarReceta">
      <div class="modal-receta" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div class="modal-titulo-wrap">
            <span class="modal-label">Receta</span>
            <span class="modal-nombre">{{ recetaActual.nombre_producto }}</span>
          </div>
          <button class="modal-cerrar" @click="cerrarReceta" aria-label="Cerrar">✕</button>
        </div>
        <div class="modal-img-wrap">
          <img
            :src="rutaReceta(recetaActual)"
            :alt="`Receta de ${recetaActual.nombre_producto}`"
            class="modal-img"
            @error="onRecetaImgError($event)"
          />
        </div>
      </div>
    </div>
  </transition>

  </div><!-- /cocina-layout -->

  <!--
    Elemento de audio — pon tu archivo en:
    /frontend/src/assets/musica/overcooked.mp3
  -->
  <audio ref="audioPlayer" loop>
    <source src="/src/assets/musica/overcooked.mp3" type="audio/mpeg" />
  </audio>

  </div><!-- /cocina-root -->
</template>

<script>
const LIMITE_MS  = 10 * 60 * 1000
const ALERTA_MS  =  8 * 60 * 1000
const CRITICO_MS = 10 * 60 * 1000
const POLLING_MS = 5 * 1000
const API_BASE   = 'https://pollocopa.62344037.xyz/api/cocina'
const API_ING    = 'https://pollocopa.62344037.xyz/api/ingredients'
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
      recetaVisible: false,
      recetaActual: {},
      ingredientes: [],
      togglingIngId: null,
      mostrarAvisoRefresco: false,
      _ingFingerprint: null,   // último fingerprint conocido de ingredientes
      _ingPoll: null,          // timer del polling de ingredientes
      // Música
      musicaActiva: false,
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

    // Expande por cantidad (lógica original de tu amigo, sin cambios)
    pedidosExpandidos() {
      const resultado = []
      for (const pedido of this.pedidosOrdenados) {
        const cant = pedido.cantidad > 1 ? pedido.cantidad : 1
        for (let i = 0; i < cant; i++) {
          resultado.push({
            ...pedido,
            _uid: `${pedido.id_detalle}-${i}`,
            cantidad: 1,
          })
        }
      }
      return resultado
    },

    /*
      Agrupa pedidosExpandidos por id_pedido.
      Mantiene el orden: el grupo más antiguo va primero.
      Cada grupo: { id_pedido, numero_ticket, hora_pedido, instrucciones, items[] }
    */
    pedidosAgrupados() {
      const mapa = new Map()
      for (const item of this.pedidosExpandidos) {
        if (!mapa.has(item.id_pedido)) {
          mapa.set(item.id_pedido, {
            id_pedido:     item.id_pedido,
            numero_ticket: item.numero_ticket,
            hora_pedido:   item.hora_pedido,
            instrucciones: item.instrucciones,
            items: [],
          })
        }
        mapa.get(item.id_pedido).items.push(item)
      }
      return [...mapa.values()]
    },

    horaActual() {
      return new Date(this.ahora).toLocaleTimeString('es-BO', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    },

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

    ingredientesAgotados() {
      return this.ingredientes.filter(i => i.out).length
    },
  },

  methods: {
    /* ── Tiempo ── */
    tiempoMs(p) {
      return Math.max(0, this.ahora - new Date(p.hora_pedido).getTime())
    },
    tiempoMsGrupo(grupo) {
      return this.tiempoMs(grupo.items[0])
    },
    pct(p) {
      return Math.min((this.tiempoMs(p) / LIMITE_MS) * 100, 100).toFixed(1)
    },
    fmtMs(ms) {
      const t = Math.max(0, Math.floor(ms / 1000))
      return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0')
    },

    /* ── Estilos ── */
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
    onImgError(e) {
      e.target.style.display = 'none'
      e.target.nextElementSibling && (e.target.nextElementSibling.style.display = 'flex')
    },

    /* ── Música ── */
    toggleMusica() {
      const audio = this.$refs.audioPlayer
      if (!audio) return
      if (this.musicaActiva) {
        audio.pause()
        this.musicaActiva = false
      } else {
        audio.play().catch(() => {
          console.warn('[Cocina] No se pudo reproducir el audio.')
        })
        this.musicaActiva = true
      }
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
      if (item.codigo) return `${BASE}${item.codigo.toLowerCase()}.png`
      const nombre = (item.nombre_producto || 'sin-receta')
        .toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '')
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

    async completarDetalle(item) {
      this.completando = item.id_detalle
      try {
        const res = await fetch(`${API_BASE}/detalles/${item.id_detalle}/completar`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        this.pedidosListosHoy++
        await this.cargarPedidos()
      } catch (err) {
        console.error('[Cocina] Error al completar ítem:', err)
        alert('No se pudo completar el ítem. Intenta de nuevo.')
      } finally {
        this.completando = null
      }
    },

    /* ── Ingredientes ── */
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
        await this.cargarIngredientes()
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

    /* ── Polling fingerprint de ingredientes ── */
    async _pollIngFingerprint() {
      try {
        const res = await fetch(`${API_ING}/fingerprint`)
        if (!res.ok) return
        const { total, agotados } = await res.json()
        const fp = `${total}:${agotados}`
        if (this._ingFingerprint !== null && fp !== this._ingFingerprint) {
          await this.cargarIngredientes()
        }
        this._ingFingerprint = fp
      } catch {
        // red caída — el próximo tick reintenta
      }
    },

    _cargarMock() {
      if (this.pedidos.length > 0) return
      const b = Date.now()
      this.pedidos = [
        { id_pedido:1, id_detalle:1, numero_ticket:'T-0001', hora_pedido:new Date(b-270000).toISOString(), instrucciones:'Sin cebolla', subtotal:'50.50', subtotal_detalle:'30.00', nombre_producto:'Combo Antojito', tipo_precio:'COMBO',    cantidad:1, imagen_url:'', estado:'EN PROCESO' },
        { id_pedido:1, id_detalle:2, numero_ticket:'T-0001', hora_pedido:new Date(b-270000).toISOString(), instrucciones:'Sin cebolla', subtotal:'50.50', subtotal_detalle:'10.50', nombre_producto:'Arroz Mediano',  tipo_precio:'SOLO',     cantidad:1, imagen_url:'', estado:'EN PROCESO' },
        { id_pedido:2, id_detalle:3, numero_ticket:'T-0002', hora_pedido:new Date(b-60000).toISOString(),  instrucciones:'',            subtotal:'18.00', subtotal_detalle:'18.00', nombre_producto:'Combo Fiesta',   tipo_precio:'COMBO',    cantidad:1, imagen_url:'', estado:'EN PROCESO' },
      ]
    },
  },

  mounted() {
    this.cargarPedidos()
    this.cargarIngredientes().then(() => {
      // Tomar fingerprint inicial después de la primera carga
      fetch(`${API_ING}/fingerprint`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) this._ingFingerprint = `${d.total}:${d.agotados}` })
        .catch(() => {})
    })
    this._poll    = setInterval(() => this.cargarPedidos(), POLLING_MS)
    this._ingPoll = setInterval(() => this._pollIngFingerprint(), 8000)
    this._tick    = setInterval(() => { this.ahora = Date.now() }, 1000)
  },

  beforeUnmount() {
    clearInterval(this._poll)
    clearInterval(this._ingPoll)
    clearInterval(this._tick)
    if (this.$refs.audioPlayer) this.$refs.audioPlayer.pause()
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

/* ── Status bar ── */
.status-bar {
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; border-bottom: 1px solid var(--border);
  padding: 0 1.5rem; height: 44px;
}
.status-left  { display: flex; align-items: center; gap: .85rem; }
.stat-item    { display: flex; align-items: baseline; gap: 5px; }
.stat-num     { font-size: .95rem; font-weight: 700; color: var(--txt); }
.stat-num--alert { color: var(--rojo); }
.stat-num--green { color: var(--verde); }
.stat-lbl     { font-size: .68rem; color: var(--txt2); }
.divider-v    { width: 1px; height: 18px; background: var(--border); }
.status-right { display: flex; align-items: center; gap: .65rem; }

/* ── Botón música mejorado ── */
.btn-musica {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 11px 4px 9px;
  cursor: pointer;
  font-size: .68rem;
  font-weight: 700;
  color: var(--txt2);
  transition: all .2s;
  height: 28px;
}
.btn-musica:hover {
  border-color: var(--rojo);
  color: var(--rojo);
  background: var(--rojo-s);
}
.btn-musica--activa {
  border-color: var(--rojo);
  background: var(--rojo-s);
  color: var(--rojo);
}

/* Nota musical */
.musica-icono {
  font-size: .85rem;
  line-height: 1;
  transition: color .2s;
}

/* Barras tipo ecualizador */
.musica-barra {
  display: inline-block;
  width: 2.5px;
  border-radius: 2px;
  background: var(--border);
  transition: background .2s;
  flex-shrink: 0;
}
.btn-musica:hover .musica-barra,
.btn-musica--activa .musica-barra {
  background: var(--rojo);
}

.barra-1 { height: 6px; }
.barra-2 { height: 10px; }
.barra-3 { height: 5px; }

.barra-activa { background: var(--rojo) !important; }
.barra-1.barra-activa { animation: eq1 0.7s ease-in-out infinite alternate; }
.barra-2.barra-activa { animation: eq2 0.5s ease-in-out infinite alternate; }
.barra-3.barra-activa { animation: eq3 0.9s ease-in-out infinite alternate; }

@keyframes eq1 { from { height: 3px; } to { height: 11px; } }
@keyframes eq2 { from { height: 7px; } to { height: 3px;  } }
@keyframes eq3 { from { height: 4px; } to { height: 10px; } }

.musica-lbl {
  letter-spacing: .2px;
  margin-left: 2px;
}

.conexion-chip {
  display: flex; align-items: center; gap: 5px;
  font-size: .68rem; font-weight: 600; color: var(--txt2);
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 999px; padding: 3px 10px;
}
.chip-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border); flex-shrink: 0; }
.chip--vivo           { color: var(--verde); border-color: #C8E6C9; background: #F1F8E9; }
.chip--vivo .chip-dot { background: var(--verde); }
.reloj-chip {
  font-size: .78rem; font-weight: 700; color: var(--txt);
  font-variant-numeric: tabular-nums;
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 999px; padding: 3px 12px;
}

/* ── Aviso refresco ── */
.refresco-banner {
  display: flex; align-items: center; gap: .65rem;
  background: #FFF8E1; border-bottom: 2px solid #FFC107;
  padding: .55rem 1.25rem; flex-wrap: wrap;
}
.refresco-icono { font-size: 1rem; flex-shrink: 0; }
.refresco-txt   { flex: 1 1 0; font-size: .72rem; font-weight: 600; color: #5D4037; min-width: 160px; }
.refresco-btn-ok {
  background: var(--rojo); color: #fff; border: none; border-radius: 6px;
  padding: .3rem .85rem; font-size: .7rem; font-weight: 700; cursor: pointer;
  white-space: nowrap; flex-shrink: 0;
}
.refresco-btn-ok:hover { background: var(--rojo-dk); }
.refresco-btn-cerrar {
  background: transparent; border: none; color: #9E9E9E;
  font-size: .85rem; cursor: pointer; padding: 2px 4px; flex-shrink: 0;
}
.refresco-btn-cerrar:hover { color: #333; }
.banner-slide-enter-active, .banner-slide-leave-active { transition: max-height .3s ease, opacity .3s ease; overflow: hidden; }
.banner-slide-enter-from, .banner-slide-leave-to { max-height: 0; opacity: 0; }
.banner-slide-enter-to, .banner-slide-leave-from { max-height: 80px; opacity: 1; }

/* ── HU-23: resumen ── */
.resumen-bar { background: #fff; border-bottom: 1px solid var(--border); padding: .6rem 1.5rem; display: flex; align-items: flex-start; gap: .85rem; }
.resumen-titulo { font-size: .7rem; font-weight: 700; color: var(--txt2); letter-spacing: .4px; text-transform: uppercase; white-space: nowrap; padding-top: 2px; }
.resumen-lista  { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; gap: .4rem .75rem; }
.resumen-item   { display: flex; align-items: center; gap: .5rem; }
.resumen-count  { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 24px; border-radius: 6px; background: var(--rojo); color: #fff; font-size: .72rem; font-weight: 700; padding: 0 5px; }
.resumen-nombre { font-size: .78rem; font-weight: 600; color: var(--txt); }

/* ── Layout ── */
.cocina-layout { display: flex; align-items: stretch; min-height: calc(100vh - 68px - 44px); }
.cocina-pedidos-col { flex: 1 1 0; min-width: 0; overflow-y: auto; }

/* ── Área de grupos ── */
.pedidos-area {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.25rem;
}

/* ── Grupo de pedido ── */
.grupo-pedido {
  background: #fff;
  border-radius: 14px;
  border: 1.5px solid var(--border);
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}

.grupo-header {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--rojo); padding: .5rem 1rem;
}
.grupo-header-left  { display: flex; align-items: center; gap: .6rem; }
.grupo-ticket       { font-size: .82rem; font-weight: 800; color: #fff; letter-spacing: .4px; }
.grupo-count        { font-size: .65rem; color: rgba(255,255,255,.8); background: rgba(0,0,0,.18); border-radius: 999px; padding: 1px 8px; }
.grupo-header-right { display: flex; align-items: center; gap: .6rem; }
.grupo-tiempo       { font-size: .75rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.tiempo-ok          { color: rgba(255,255,255,.85); }
.tiempo-alerta      { color: #FFCA07; }
.grupo-ins          { font-size: .68rem; font-weight: 700; color: #FFCA07; background: rgba(0,0,0,.2); border-radius: 999px; padding: 2px 8px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Cards dentro del grupo ── */
.grupo-cards {
  display: flex;
  flex-wrap: wrap;
  gap: .85rem;
  padding: 1rem;
}

.pedido-card {
  background: var(--bg);
  border-radius: 12px;
  border: 1.5px solid var(--border);
  padding: .85rem;
  display: flex;
  flex-direction: column;
  gap: .5rem;
  position: relative;
  width: 190px;
  flex-shrink: 0;
  transition: border-color .25s;
}
.card-ok      { border-color: var(--border); }
.card-warn    { border-color: var(--amarillo); }
.card-urgente { border-color: var(--rojo); }
@keyframes parpadear { 0%,100%{opacity:1} 50%{opacity:.5} }
.parpadeando  { animation: parpadear 1s ease-in-out infinite; }
@keyframes parpadear-suave {
  0%,100% { background-color: #f1a4a4; border-color: #EF9A9A; }
  50%     { background-color: #FFEBEE; border-color: var(--rojo); }
}
.card-critico      { border-color: #f1a4a4; }
.parpadeando-suave { animation: parpadear-suave 1.6s ease-in-out infinite; }

.img-frame {
  border-radius: 9px; overflow: hidden; background: #fff; height: 110px;
  display: flex; align-items: center; justify-content: center;
  position: relative; border: 1px solid var(--border);
}
.combo-img { width: 100%; height: 100%; object-fit: cover; }
.img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 4px; }
.ph-txt      { font-size: .58rem; color: var(--txt2); }
.urgente-dot { position: absolute; top: 7px; right: 7px; width: 9px; height: 9px; border-radius: 50%; background: var(--rojo); }

.pedido-body     { text-align: center; }
.pedido-ticket   { margin: 0; font-size: .58rem; color: var(--txt2); }
.pedido-nombre   { margin: 2px 0 1px; font-size: .82rem; font-weight: 700; color: var(--txt); }
.pedido-tipo     { margin: 0; font-size: .68rem; color: var(--txt2); }
.pedido-ins      { margin: 3px 0 0; font-size: .66rem; font-weight: 700; color: var(--rojo); background: var(--rojo-s); border-radius: 5px; padding: 2px 7px; }

.tiempo-bloque { margin-top: auto; }
.tiempo-nums   { display: flex; justify-content: space-between; font-size: .6rem; margin-bottom: 3px; font-variant-numeric: tabular-nums; }
.t-elapsed     { font-weight: 700; color: var(--txt); }
.t-total       { color: var(--txt2); }
.barra-bg      { background: var(--border); border-radius: 999px; height: 5px; overflow: hidden; }
.barra-fill    { height: 100%; border-radius: 999px; transition: width .9s linear; }
.fill-green    { background: var(--verde); }
.fill-yellow   { background: var(--amarillo); }
.fill-red      { background: var(--rojo); }

.pedido-precio { text-align: center; font-size: .88rem; font-weight: 700; color: var(--rojo); border-top: 1px solid var(--border); padding-top: .4rem; }

.card-acciones { display: flex; gap: .35rem; }
.btn-receta {
  flex: 1; background: #fff; color: var(--rojo);
  border: 1.5px solid var(--rojo); border-radius: 7px;
  padding: .4rem .2rem; font-size: .67rem; font-weight: 700;
  cursor: pointer; white-space: nowrap; transition: background .15s;
}
.btn-receta:hover { background: var(--rojo-s); }
.btn-completar {
  flex: 1; background: var(--rojo); color: #fff;
  border: none; border-radius: 7px;
  padding: .4rem .2rem; font-size: .67rem; font-weight: 700;
  cursor: pointer; white-space: nowrap;
  transition: background .15s, transform .1s, opacity .2s;
}
.btn-completar:hover:not(:disabled)  { background: var(--rojo-dk); }
.btn-completar:active:not(:disabled) { transform: scale(.97); }
.btn-completar:disabled              { opacity: .6; cursor: not-allowed; }

/* ── Panel ingredientes ── */
.ingredientes-panel { flex: 0 0 220px; width: 220px; background: #fff; border-left: 1px solid var(--border); display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; max-height: 100vh; overflow: hidden; }
.ing-header { background: var(--rojo); padding: .55rem .75rem; display: flex; align-items: center; justify-content: space-between; gap: .5rem; flex-shrink: 0; }
.ing-titulo { color: #fff; font-size: .75rem; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; }
.ing-estado-chip { font-size: .62rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; border: 1.5px solid rgba(255,255,255,.6); white-space: nowrap; }
.chip-ok    { color: #fff; }
.chip-falta { color: #FFCA07; border-color: #FFCA07; }
.ing-lista { flex: 1 1 0; overflow-y: auto; padding: .5rem .6rem; display: flex; flex-direction: column; gap: .4rem; }
.ing-item { display: flex; align-items: center; justify-content: space-between; background: #FFCA07; border: 1.5px solid #D90404; border-radius: 8px; padding: 6px 8px; transition: opacity .2s; }
.ing-item--out { opacity: .72; background: #ecc434; }
.ing-nombre { font-size: .72rem; font-weight: 700; color: #1A1A1A; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: .4rem; }
.ing-btn { font-size: .65rem; font-weight: 700; padding: 4px 9px; border-radius: 6px; border: 2px solid; cursor: pointer; transition: background .15s, transform .1s; white-space: nowrap; flex-shrink: 0; }
.ing-btn:disabled { opacity: .5; cursor: not-allowed; }
.ing-btn--disponible { background: #EB1A20; color: #fff; border-color: #8a0825; }
.ing-btn--disponible:hover:not(:disabled) { background: #a00025; transform: scale(.97); }
.ing-btn--restore { background: #2d5a1a; color: #a8f07a; border-color: #8a0825; }
.ing-btn--restore:hover:not(:disabled) { background: #1a3a0a; transform: scale(.97); }
.ing-btn-refresh { flex-shrink: 0; margin: .5rem .6rem .6rem; background: var(--rojo); color: #fff; border: none; border-radius: 7px; padding: .42rem; font-size: .68rem; font-weight: 700; letter-spacing: .3px; text-transform: uppercase; cursor: pointer; transition: background .15s, transform .1s; }
.ing-btn-refresh:hover { background: var(--rojo-dk); transform: scale(.98); }
.ing-vacio { font-size: .72rem; color: var(--txt2); text-align: center; padding: 1.5rem 0; }

/* ── Modal receta ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.65); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.modal-receta { background: #fff; border-radius: 16px; width: 100%; max-width: 1150px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.3); }
.modal-header { display: flex; align-items: center; justify-content: space-between; background: var(--rojo); padding: .75rem 1rem; flex-shrink: 0; }
.modal-titulo-wrap { display: flex; flex-direction: column; }
.modal-label  { font-size: .62rem; font-weight: 700; color: rgba(255,255,255,.75); text-transform: uppercase; letter-spacing: .8px; }
.modal-nombre { font-size: 1rem; font-weight: 700; color: #fff; }
.modal-cerrar { background: rgba(255,255,255,.2); border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; font-size: .9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s; }
.modal-cerrar:hover { background: rgba(255,255,255,.35); }
.modal-img-wrap { flex: 1; overflow-y: auto; display: flex; align-items: center; justify-content: center; padding: 1.25rem; background: var(--bg); }
.modal-img { width: 100%; height: auto; object-fit: contain; border-radius: 10px; }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity .2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

.vacio { text-align: center; padding: 5rem 1rem; color: var(--txt2); font-size: .9rem; }
</style>