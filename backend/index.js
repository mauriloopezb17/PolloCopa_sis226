require('dotenv').config()
const express = require('express')
const cors    = require('cors')

const app  = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3001'],
}))
app.use(express.json()) 
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, hora: new Date().toISOString() })
})

app.use('/api/cocina', require('./routes/cocina'))

app.listen(PORT, () => {
  console.log(`🚀  Servidor en http://localhost:${PORT}`)
})