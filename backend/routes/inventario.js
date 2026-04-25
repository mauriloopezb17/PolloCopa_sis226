const express = require('express')
const router  = express.Router()
const db      = require('../db')

// ─────────────────────────────────────────
// CATEGORÍAS DE INGREDIENTE
// ─────────────────────────────────────────

router.get('/categorias', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id_categoria_ingrediente, nombre
       FROM categoria_ingrediente
       ORDER BY nombre ASC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /categorias:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// TIPOS DE MOVIMIENTO
// ─────────────────────────────────────────

router.get('/tipos-movimiento', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id_tipo_movimiento, nombre, afecta_stock
       FROM tipo_movimiento
       ORDER BY id_tipo_movimiento ASC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /tipos-movimiento:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// INGREDIENTES
// ─────────────────────────────────────────

router.get('/ingredientes', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         id_insumo,
         nombre,
         descripcion,
         unidad_medida,
         stock_actual,
         stock_minimo,
         costo_unitario_avg,
         valor_inventario,
         agotado,
         activo,
         id_categoria_ingrediente
       FROM ingredientes
       WHERE activo = true
       ORDER BY nombre ASC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /ingredientes:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.post('/ingredientes', async (req, res) => {
  const {
    nombre,
    descripcion,
    unidad_medida,
    stock_minimo,
    costo_unitario_avg,
    id_categoria_ingrediente,
  } = req.body

  if (!nombre)        return res.status(400).json({ error: 'El nombre es requerido' })
  if (!unidad_medida) return res.status(400).json({ error: 'La unidad de medida es requerida' })

  try {
    const result = await db.query(
      `INSERT INTO ingredientes
         (nombre, descripcion, unidad_medida, stock_actual, stock_minimo,
          costo_unitario_avg, valor_inventario, agotado, activo, id_categoria_ingrediente)
       VALUES ($1, $2, $3, 0, $4, $5, 0, true, true, $6)
       RETURNING *`,
      [
        nombre,
        descripcion              || null,
        unidad_medida,
        stock_minimo             || 0,
        costo_unitario_avg       || 0,
        id_categoria_ingrediente || null,
      ]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('POST /ingredientes:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// MOVIMIENTOS DE INVENTARIO
// ─────────────────────────────────────────

// GET historial de movimientos de un ingrediente
router.get('/ingredientes/:id/movimientos', async (req, res) => {
  const { id } = req.params
  try {
    const result = await db.query(
      `SELECT
         m.id_movimiento,
         m.cantidad,
         m.costo_unitario,
         m.lote,
         m.motivo,
         m.observacion,
         m.fecha,
         tm.nombre      AS tipo_nombre,
         tm.afecta_stock,
         p.nombre       AS proveedor_nombre,
         p.contacto,
         p.telefono,
         p.email,
         p.direccion
       FROM movimiento_inventario m
       LEFT JOIN tipo_movimiento  tm ON tm.id_tipo_movimiento = m.id_tipo_movimiento
       LEFT JOIN proveedor        p  ON p.id_proveedor        = m.id_proveedor
       WHERE m.id_insumo = $1
       ORDER BY m.fecha DESC`,
      [id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /movimientos:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST registrar movimiento (agregar stock, consumo, ajuste, merma)
router.post('/ingredientes/:id/movimientos', async (req, res) => {
  const { id } = req.params
  const {
    id_tipo_movimi,
    cantidad,
    costo_unitario,
    lote,
    observacion,
    proveedor,          // { nombre, contacto, telefono, email, direccion }
  } = req.body

  if (!cantidad || cantidad <= 0)
    return res.status(400).json({ error: 'Cantidad inválida' })
  if (!id_tipo_movimi)
    return res.status(400).json({ error: 'El tipo de movimiento es requerido' })

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // 1. Verificar tipo de movimiento y su efecto en stock
    const tipoRes = await client.query(
      `SELECT id_tipo_movimiento, afecta_stock FROM tipo_movimiento WHERE id_tipo_movimiento = $1`,
      [id_tipo_movimi]
    )
    if (tipoRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Tipo de movimiento no válido' })
    }
    const afecta_stock = Number(tipoRes.rows[0].afecta_stock)

    // 2. Buscar o crear proveedor (solo si tipo es COMPRA = id 1 y viene proveedor)
    let id_proveedor = null
    if (id_tipo_movimi === 1 && proveedor?.nombre?.trim()) {
      const provRes = await client.query(
        `SELECT id_proveedor FROM proveedor
         WHERE LOWER(nombre) = LOWER($1) AND activo = true LIMIT 1`,
        [proveedor.nombre.trim()]
      )
      if (provRes.rows.length > 0) {
        id_proveedor = provRes.rows[0].id_proveedor
      } else {
        const newProv = await client.query(
          `INSERT INTO proveedor (nombre, contacto, telefono, email, direccion, activo, created_at)
           VALUES ($1, $2, $3, $4, $5, true, NOW())
           RETURNING id_proveedor`,
          [
            proveedor.nombre.trim(),
            proveedor.contacto  || null,
            proveedor.telefono  || null,
            proveedor.email     || null,
            proveedor.direccion || null,
          ]
        )
        id_proveedor = newProv.rows[0].id_proveedor
      }
    }

    // 3. Obtener stock actual del ingrediente
    const ingRes = await client.query(
      `SELECT stock_actual, stock_minimo FROM ingredientes WHERE id_insumo = $1`,
      [id]
    )
    if (ingRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Ingrediente no encontrado' })
    }
    const stockActual = Number(ingRes.rows[0].stock_actual)
    const stockMinimo = Number(ingRes.rows[0].stock_minimo)
    const nuevoStock  = Math.max(0, stockActual + (afecta_stock * Number(cantidad)))

    // 4. Crear movimiento
    const movRes = await client.query(
      `INSERT INTO movimiento_inventario
         (id_insumo, id_tipo_movimiento, id_proveedor, cantidad, costo_unitario, lote, observacion, fecha)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        id,
        id_tipo_movimi,
        id_proveedor,
        cantidad,
        costo_unitario || null,
        lote           || null,
        observacion    || null,
      ]
    )

    // 5. Actualizar stock_actual, valor_inventario y agotado
    await client.query(
      `UPDATE ingredientes
       SET stock_actual      = $1,
           agotado           = $2,
           valor_inventario  = $1 * COALESCE(costo_unitario_avg, 0)
       WHERE id_insumo = $3`,
      [nuevoStock, nuevoStock <= 0, id]
    )

    await client.query('COMMIT')
    res.status(201).json({
      movimiento:   movRes.rows[0],
      stock_actual: nuevoStock,
      agotado:      nuevoStock <= 0,
      id_proveedor,
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /movimientos:', err.message)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// ─────────────────────────────────────────
// PROVEEDORES (lectura)
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