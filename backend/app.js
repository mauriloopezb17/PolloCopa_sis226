const pool = require('./db')

pool.connect()
  .then(() => console.log('conectado a postgres'))
  .catch(err => console.error('error conexion postgres', err))
const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

const inventario = require('./routes/inventario.routes')
app.use('/api/inventario', inventario)

app.listen(3000, () => {
  console.log('backend corriendo en puerto 3000')
})