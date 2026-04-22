require('dotenv').config()
const express = require('express')
const cors    = require('cors')

const app  = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json()) 
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, hora: new Date().toISOString() })
})

app.use('/api/cocina', require('./routes/cocina'))
app.use('/api/caja',   require('./routes/caja'))

const inventarioRoutes = require('./routes/inventario')
app.use('/api/inventario', inventarioRoutes)

app.listen(PORT, () => {
  console.log(`🚀  Servidor en http://localhost:${PORT}`)
})