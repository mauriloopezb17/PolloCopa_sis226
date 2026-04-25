<template>
  <Teleport to="body">
    <div class="overlay" @click.self="$emit('cancelar')">
      <div class="modal">

        <div class="modal-body">
          <label for="clave-historial">Contraseña</label>
          <input
            id="clave-historial"
            ref="inputRef"
            v-model="clave"
            type="text"
            @keydown.enter="verificar"
            @input="errorMsg = null"
          />
          <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        </div>

        <div class="modal-footer">
          <button class="btn-cancelar" @click="$emit('cancelar')">Cancelar</button>
          <button class="btn-confirmar" :disabled="!clave" @click="verificar">Confirmar</button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['autorizado', 'cancelar'])

const CLAVE_CORRECTA = 'redes'

const clave    = ref('')
const errorMsg = ref(null)
const inputRef = ref(null)

onMounted(() => inputRef.value?.focus())

function verificar() {
  if (!clave.value) return
  if (clave.value === CLAVE_CORRECTA) {
    clave.value = ''
    emit('autorizado')
  } else {
    errorMsg.value = 'Contraseña incorrecta.'
    clave.value = ''
    inputRef.value?.focus()
  }
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
  width: 320px;
  max-width: 95vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.modal-body {
  padding: 24px 24px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #999;
}

input {
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

input:focus {
  border-color: #D90B31;
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
  padding: 12px 24px 20px;
  display: flex;
  gap: 8px;
}

.btn-cancelar {
  flex: 1;
  padding: 10px 0;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  color: #666;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-cancelar:hover { background: #f5f5f5; }

.btn-confirmar {
  flex: 2;
  padding: 10px 0;
  background: #D90B31;
  border: none;
  border-radius: 6px;
  color: #F2CB05;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-confirmar:hover:not(:disabled) { background: #b80929; }
.btn-confirmar:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
