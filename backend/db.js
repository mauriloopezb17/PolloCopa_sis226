require('dotenv').config()      
const { Pool } = require('pg')  

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

pool.connect((err, client, release) => {
  if (err) {
    console.error(' No se pudo conectar a PostgreSQL:', err.message)
    return
  }
  release()
  console.log('Conectado a PostgreSQL →', process.env.DB_NAME)
})

module.exports = pool