const express = require('express')
const router  = express.Router()
const db      = require('../db')

// ─────────────────────────────────────────
// INGREDIENTES
// ─────────────────────────────────────────

router.get('/ingredientes', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM ingredientes
      ORDER BY id_insumo ASC
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('GET /ingredientes:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.post('/ingredientes', async (req, res) => {
  const { nombre, descripcion, unidad_medida, stock_minimo, id_categoria_ingrediente } = req.body
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' })

  try {
    const result = await db.query(`
      INSERT INTO ingredientes 
        (nombre, descripcion, unidad_medida, stock_actual, stock_minimo, agotado, activo, id_categoria_ingrediente)
      VALUES ($1, $2, $3, 0, $4, false, true, $5)
      RETURNING *
    `, [nombre, descripcion || null, unidad_medida || null, stock_minimo || 0, id_categoria_ingrediente || null])
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('POST /ingredientes:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// MOVIMIENTOS
// ─────────────────────────────────────────

router.get('/ingredientes/:id/movimientos', async (req, res) => {
  const { id } = req.params
  try {
    const result = await db.query(`
      SELECT 
        m.*,
        p.nombre    AS proveedor_nombre,
        p.contacto,
        p.telefono,
        p.email,
        p.direccion,
        tm.nombre   AS tipo_nombre
      FROM movimiento_inventario m
      LEFT JOIN proveedor        p  ON p.id_proveedor       = m.id_proveedor
      LEFT JOIN tipo_movimiento  tm ON tm.id_tipo_movimiento = m.id_tipo_movimi
      WHERE m.id_insumo = $1
      ORDER BY m.fecha DESC
    `, [id])
    res.json(result.rows)
  } catch (err) {
    console.error('GET /movimientos:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.post('/ingredientes/:id/movimientos', async (req, res) => {
  const { id } = req.params
  const { cantidad, costo_unitario, lote, observacion, proveedor } = req.body

  if (!cantidad || cantidad <= 0) return res.status(400).json({ error: 'Cantidad inválida' })
  if (!proveedor?.nombre)         return res.status(400).json({ error: 'El nombre del proveedor es requerido' })

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // 1. Buscar o crear proveedor
    let provResult = await client.query(
      `SELECT id_proveedor FROM proveedor WHERE LOWER(nombre) = LOWER($1) AND activo = true LIMIT 1`,
      [proveedor.nombre]
    )

    let id_proveedor
    if (provResult.rows.length > 0) {
      id_proveedor = provResult.rows[0].id_proveedor
    } else {
      const newProv = await client.query(`
        INSERT INTO proveedor (nombre, contacto, telefono, email, direccion, activo, created_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW())
        RETURNING id_proveedor
      `, [
        proveedor.nombre,
        proveedor.contacto  || null,
        proveedor.telefono  || null,
        proveedor.email     || null,
        proveedor.direccion || null,
      ])
      id_proveedor = newProv.rows[0].id_proveedor
    }

    // 2. Tipo movimiento COMPRA = id 1
    const id_tipo = 1

    // 3. Crear movimiento
    const movResult = await client.query(`
      INSERT INTO movimiento_inventario 
        (id_insumo, id_tipo_movimi, id_proveedor, cantidad, costo_unitario, lote, observacion, fecha)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `, [id, id_tipo, id_proveedor, cantidad, costo_unitario || null, lote || null, observacion || null])

    // 4. Actualizar stock
    await client.query(`
      UPDATE ingredientes
      SET 
        stock_actual = stock_actual + $1,
        agotado      = CASE WHEN (stock_actual + $1) <= 0 THEN true ELSE false END
      WHERE id_insumo = $2
    `, [cantidad, id])

    await client.query('COMMIT')
    res.status(201).json({ movimiento: movResult.rows[0], id_proveedor })

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /movimientos:', err.message)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// ─────────────────────────────────────────
// PROVEEDORES
// ─────────────────────────────────────────

router.get('/proveedores', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM proveedor WHERE activo = true ORDER BY nombre ASC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /proveedores:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router