<template>
  <div class="cocina-root">

    <!-- ══════════════════════════════════════
         BARRA DE ESTADO — discreta, bajo el navbar global
         Muestra: cola, completados, reloj, conexión
    ══════════════════════════════════════════ -->
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

    <!-- ══════════════════════════════════════
         GRID DE PEDIDOS
    ══════════════════════════════════════════ -->
    <main class="pedidos-grid" v-if="pedidosOrdenados.length > 0">
      <article
        v-for="(pedido, index) in pedidosOrdenados"
        :key="pedido.id_pedido"
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
          <p class="pedido-cantidad" v-if="pedido.cantidad > 1">x{{ pedido.cantidad }}</p>
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

  </div>
</template>

<script>
const LIMITE_MS  = 5 * 60 * 1000
const ALERTA_MS  = 4 * 60 * 1000
const POLLING_MS = 5 * 1000
const API_BASE   = 'http://localhost:3000/api/cocina'
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
      if (i === this.pedidosOrdenados.length - 1) return 'last'
      return 'mid'
    },
    onImgError(e) {
      e.target.style.display = 'none'
      e.target.nextElementSibling && (e.target.nextElementSibling.style.display = 'flex')
    },

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
  },

  mounted() {
    this.cargarPedidos()
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
  min-height: calc(100vh - 68px); /* descuenta el navbar global */
  box-sizing: border-box;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: var(--txt);
}

/* ── Barra de estado (reemplaza al header propio) ── */
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

.vacio { text-align: center; padding: 5rem 1rem; color: var(--txt2); font-size: .9rem; }
</style>