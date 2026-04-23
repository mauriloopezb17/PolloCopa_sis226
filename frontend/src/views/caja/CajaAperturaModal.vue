<template>
  <Teleport to="body">
    <div v-if="show" class="overlay">
      <div class="modal">
        <div class="modal-header">
          <h2>Abrir Caja</h2>
        </div>

        <div class="modal-body">
          <p class="descripcion">
            El monto de apertura se toma del cierre del turno anterior registrado en el sistema.
          </p>

          <div class="monto-display">
            <span class="monto-label">Monto de apertura</span>
            <span class="monto-valor">Bs {{ fmt(montoSugerido) }}</span>
            <span class="monto-origen">{{ origenTexto }}</span>
          </div>

          <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        </div>

        <div class="modal-footer">
          <button
            class="btn-confirmar"
            :disabled="abriendo"
            @click="confirmar"
          >
            {{ abriendo ? 'Abriendo...' : 'Confirmar apertura' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  show:           { type: Boolean, required: true },
  montoSugerido:  { type: Number,  default: 0 },
  hayTurnoAnterior: { type: Boolean, default: false },
})

const emit = defineEmits(['abierto'])

const API = 'http://localhost:3000/api/caja'

const abriendo = ref(false)
const errorMsg = ref(null)

const origenTexto = computed(() =>
  props.hayTurnoAnterior
    ? 'Tomado del cierre del turno anterior'
    : 'Primer turno — sin registros previos'
)

async function confirmar() {
  if (abriendo.value) return
  abriendo.value = true
  errorMsg.value = null
  try {
    const res  = await fetch(`${API}/apertura`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'No se pudo abrir la caja')
    emit('abierto', data.turno)
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    abriendo.value = false
  }
}

function fmt(val) {
  return Number(val ?? 0).toFixed(2)
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 10px;
  width: 380px;
  max-width: 95vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.modal-header {
  padding: 20px 24px 0;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 800;
  color: #222;
}

.modal-body {
  padding: 16px 24px 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.descripcion {
  font-size: 13px;
  color: #777;
  line-height: 1.5;
  margin: 0;
}

.monto-display {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.monto-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #999;
}

.monto-valor {
  font-size: 26px;
  font-weight: 800;
  color: #222;
  line-height: 1.2;
}

.monto-origen {
  font-size: 12px;
  color: #aaa;
  font-weight: 500;
}

.error-msg {
  font-size: 13px;
  color: #D90B31;
  font-weight: 600;
  background: rgba(217, 11, 49, 0.07);
  border-radius: 6px;
  padding: 8px 12px;
  margin: 0;
}

.modal-footer {
  padding: 16px 24px;
}

.btn-confirmar {
  width: 100%;
  padding: 12px 0;
  background: #D90B31;
  border: none;
  border-radius: 6px;
  color: #F2CB05;
  font-size: 14px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-confirmar:hover:not(:disabled) {
  background: #b80929;
}

.btn-confirmar:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
