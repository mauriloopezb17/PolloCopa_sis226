// routes/inventario.js
const express = require('express')
const router  = express.Router()
const pool    = require('../db') // tu instancia de pg Pool

// ─── GET /api/inventario/ingredientes ────────────────────────────────────────
// Lista de ingredientes activos con su categoría
router.get('/ingredientes', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        i.id_insumo       AS id,
        i.nombre,
        i.unidad_medida   AS unidad,
        i.stock_actual,
        i.stock_minimo,
        i.agotado,
        c.nombre          AS categoria
      FROM Ingredientes i
      JOIN categoria_ingrediente c ON c.id_categoria_ingrediente = i.id_categoria_ingrediente
      WHERE i.activo = TRUE
      ORDER BY i.nombre ASC
    `)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener ingredientes' })
  }
})

// ─── GET /api/inventario/tipos-movimiento ────────────────────────────────────
// Lista de tipos de movimiento (para poblar el select del formulario)
router.get('/tipos-movimiento', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id_tipo_movimiento AS id, nombre, afecta_stock
      FROM tipo_movimiento
      ORDER BY nombre ASC
    `)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener tipos de movimiento' })
  }
})

// ─── GET /api/inventario/proveedores ─────────────────────────────────────────
// Lista de proveedores activos (para el select opcional del formulario)
router.get('/proveedores', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id_proveedor AS id, nombre
      FROM proveedor
      WHERE activo = TRUE
      ORDER BY nombre ASC
    `)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener proveedores' })
  }
})

// ─── GET /api/inventario/movimientos/:idInsumo ───────────────────────────────
// Historial + resumen de un ingrediente
// Query params opcionales: tipo ('entrada'|'salida'), busqueda (texto)
router.get('/movimientos/:idInsumo', async (req, res) => {
  const { idInsumo } = req.params
  const { tipo, busqueda } = req.query

  const condiciones = ['m.id_insumo = $1']
  const valores     = [idInsumo]
  let   idx         = 2

  // tipo = 'entrada' → afecta_stock = 1 / tipo = 'salida' → afecta_stock = -1
  if (tipo === 'entrada') {
    condiciones.push(`tm.afecta_stock = 1`)
  } else if (tipo === 'salida') {
    condiciones.push(`tm.afecta_stock = -1`)
  }

  if (busqueda) {
    condiciones.push(`(m.motivo ILIKE $${idx} OR m.observacion ILIKE $${idx} OR p.nombre ILIKE $${idx})`)
    valores.push(`%${busqueda}%`)
    idx++
  }

  const where = condiciones.join(' AND ')

  try {
    // Movimientos filtrados
    const { rows: movimientos } = await pool.query(`
      SELECT
        m.id_movimiento                             AS id,
        TO_CHAR(m.fecha, 'YYYY-MM-DD')             AS fecha,
        TO_CHAR(m.fecha, 'HH24:MI')                AS hora,
        tm.nombre                                   AS tipo_nombre,
        tm.afecta_stock,
        m.cantidad,
        i.unidad_medida                             AS unidad,
        m.motivo,
        m.observacion,
        m.lote,
        m.costo_unitario,
        p.nombre                                    AS proveedor,
        CASE
          WHEN tm.afecta_stock = 1 THEN 'entrada'
          ELSE 'salida'
        END                                         AS tipo,
        CASE
          WHEN tm.afecta_stock = -1
           AND m.cantidad >= i.stock_minimo         THEN TRUE
          ELSE FALSE
        END                                         AS es_alerta
      FROM movimiento_inventario m
      JOIN tipo_movimiento   tm ON tm.id_tipo_movimiento = m.id_tipo_movimiento
      JOIN Ingredientes       i  ON i.id_insumo           = m.id_insumo
      LEFT JOIN proveedor     p  ON p.id_proveedor        = m.id_proveedor
      WHERE ${where}
      ORDER BY m.fecha DESC
    `, valores)

    // Resumen general del ingrediente (sin filtros)
    const { rows: resumen } = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN tm.afecta_stock =  1 THEN m.cantidad END), 0) AS total_entradas,
        COALESCE(SUM(CASE WHEN tm.afecta_stock = -1 THEN m.cantidad END), 0) AS total_salidas,
        COUNT(CASE WHEN tm.afecta_stock = -1
                    AND m.cantidad >= i.stock_minimo THEN 1 END)             AS total_alertas
      FROM movimiento_inventario m
      JOIN tipo_movimiento tm ON tm.id_tipo_movimiento = m.id_tipo_movimiento
      JOIN Ingredientes     i  ON i.id_insumo           = m.id_insumo
      WHERE m.id_insumo = $1
    `, [idInsumo])

    // Datos actuales del ingrediente
    const { rows: ing } = await pool.query(`
      SELECT stock_actual, stock_minimo, unidad_medida AS unidad
      FROM Ingredientes
      WHERE id_insumo = $1
    `, [idInsumo])

    res.json({
      resumen: {
        ...resumen[0],
        stock_actual: ing[0]?.stock_actual ?? 0,
        stock_minimo: ing[0]?.stock_minimo ?? 0,
        unidad:       ing[0]?.unidad       ?? '',
      },
      movimientos
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener movimientos' })
  }
})

// ─── POST /api/inventario/movimientos ────────────────────────────────────────
// Registra un nuevo movimiento y actualiza stock en Ingredientes
router.post('/movimientos', async (req, res) => {
  const {
    id_insumo,
    id_tipo_movimiento,
    cantidad,
    motivo,
    observacion,
    lote,
    costo_unitario,
    id_proveedor
  } = req.body

  if (!id_insumo || !id_tipo_movimiento || !cantidad || !motivo) {
    return res.status(400).json({ error: 'Faltan campos requeridos: id_insumo, id_tipo_movimiento, cantidad, motivo' })
  }
  if (Number(cantidad) <= 0) {
    return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Obtener afecta_stock del tipo seleccionado
    const { rows: tipoRows } = await client.query(
      `SELECT afecta_stock FROM tipo_movimiento WHERE id_tipo_movimiento = $1`,
      [id_tipo_movimiento]
    )
    if (tipoRows.length === 0) throw new Error('Tipo de movimiento no encontrado')
    const { afecta_stock } = tipoRows[0]

    // Insertar movimiento
    const { rows: movRows } = await client.query(`
      INSERT INTO movimiento_inventario
        (id_insumo, id_tipo_movimiento, id_proveedor, cantidad, costo_unitario, lote, motivo, observacion)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      id_insumo,
      id_tipo_movimiento,
      id_proveedor || null,
      Number(cantidad),
      costo_unitario || null,
      lote || null,
      motivo,
      observacion || null
    ])

    // Actualizar stock_actual en Ingredientes
    await client.query(`
      UPDATE Ingredientes
      SET stock_actual = stock_actual + ($1 * $2),
          agotado      = (stock_actual + ($1 * $2) <= 0)
      WHERE id_insumo = $3
    `, [afecta_stock, Number(cantidad), id_insumo])

    await client.query('COMMIT')
    res.status(201).json(movRows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: err.message || 'Error al registrar movimiento' })
  } finally {
    client.release()
  }
})

module.exports = router// routes/inventario.js
const express = require('express')
const router  = express.Router()
const pool    = require('../db') // tu instancia de pg Pool

// ─── GET /api/inventario/ingredientes ────────────────────────────────────────
// Lista de ingredientes activos con su categoría
router.get('/ingredientes', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        i.id_insumo       AS id,
        i.nombre,
        i.unidad_medida   AS unidad,
        i.stock_actual,
        i.stock_minimo,
        i.agotado,
        c.nombre          AS categoria
      FROM Ingredientes i
      JOIN categoria_ingrediente c ON c.id_categoria_ingrediente = i.id_categoria_ingrediente
      WHERE i.activo = TRUE
      ORDER BY i.nombre ASC
    `)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener ingredientes' })
  }
})

// ─── GET /api/inventario/tipos-movimiento ────────────────────────────────────
// Lista de tipos de movimiento (para poblar el select del formulario)
router.get('/tipos-movimiento', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id_tipo_movimiento AS id, nombre, afecta_stock
      FROM tipo_movimiento
      ORDER BY nombre ASC
    `)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener tipos de movimiento' })
  }
})

// ─── GET /api/inventario/proveedores ─────────────────────────────────────────
// Lista de proveedores activos (para el select opcional del formulario)
router.get('/proveedores', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id_proveedor AS id, nombre
      FROM proveedor
      WHERE activo = TRUE
      ORDER BY nombre ASC
    `)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener proveedores' })
  }
})

// ─── GET /api/inventario/movimientos/:idInsumo ───────────────────────────────
// Historial + resumen de un ingrediente
// Query params opcionales: tipo ('entrada'|'salida'), busqueda (texto)
router.get('/movimientos/:idInsumo', async (req, res) => {
  const { idInsumo } = req.params
  const { tipo, busqueda } = req.query

  const condiciones = ['m.id_insumo = $1']
  const valores     = [idInsumo]
  let   idx         = 2

  // tipo = 'entrada' → afecta_stock = 1 / tipo = 'salida' → afecta_stock = -1
  if (tipo === 'entrada') {
    condiciones.push(`tm.afecta_stock = 1`)
  } else if (tipo === 'salida') {
    condiciones.push(`tm.afecta_stock = -1`)
  }

  if (busqueda) {
    condiciones.push(`(m.motivo ILIKE $${idx} OR m.observacion ILIKE $${idx} OR p.nombre ILIKE $${idx})`)
    valores.push(`%${busqueda}%`)
    idx++
  }

  const where = condiciones.join(' AND ')

  try {
    // Movimientos filtrados
    const { rows: movimientos } = await pool.query(`
      SELECT
        m.id_movimiento                             AS id,
        TO_CHAR(m.fecha, 'YYYY-MM-DD')             AS fecha,
        TO_CHAR(m.fecha, 'HH24:MI')                AS hora,
        tm.nombre                                   AS tipo_nombre,
        tm.afecta_stock,
        m.cantidad,
        i.unidad_medida                             AS unidad,
        m.motivo,
        m.observacion,
        m.lote,
        m.costo_unitario,
        p.nombre                                    AS proveedor,
        CASE
          WHEN tm.afecta_stock = 1 THEN 'entrada'
          ELSE 'salida'
        END                                         AS tipo,
        CASE
          WHEN tm.afecta_stock = -1
           AND m.cantidad >= i.stock_minimo         THEN TRUE
          ELSE FALSE
        END                                         AS es_alerta
      FROM movimiento_inventario m
      JOIN tipo_movimiento   tm ON tm.id_tipo_movimiento = m.id_tipo_movimiento
      JOIN Ingredientes       i  ON i.id_insumo           = m.id_insumo
      LEFT JOIN proveedor     p  ON p.id_proveedor        = m.id_proveedor
      WHERE ${where}
      ORDER BY m.fecha DESC
    `, valores)

    // Resumen general del ingrediente (sin filtros)
    const { rows: resumen } = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN tm.afecta_stock =  1 THEN m.cantidad END), 0) AS total_entradas,
        COALESCE(SUM(CASE WHEN tm.afecta_stock = -1 THEN m.cantidad END), 0) AS total_salidas,
        COUNT(CASE WHEN tm.afecta_stock = -1
                    AND m.cantidad >= i.stock_minimo THEN 1 END)             AS total_alertas
      FROM movimiento_inventario m
      JOIN tipo_movimiento tm ON tm.id_tipo_movimiento = m.id_tipo_movimiento
      JOIN Ingredientes     i  ON i.id_insumo           = m.id_insumo
      WHERE m.id_insumo = $1
    `, [idInsumo])

    // Datos actuales del ingrediente
    const { rows: ing } = await pool.query(`
      SELECT stock_actual, stock_minimo, unidad_medida AS unidad
      FROM Ingredientes
      WHERE id_insumo = $1
    `, [idInsumo])

    res.json({
      resumen: {
        ...resumen[0],
        stock_actual: ing[0]?.stock_actual ?? 0,
        stock_minimo: ing[0]?.stock_minimo ?? 0,
        unidad:       ing[0]?.unidad       ?? '',
      },
      movimientos
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener movimientos' })
  }
})

// ─── POST /api/inventario/movimientos ────────────────────────────────────────
// Registra un nuevo movimiento y actualiza stock en Ingredientes
router.post('/movimientos', async (req, res) => {
  const {
    id_insumo,
    id_tipo_movimiento,
    cantidad,
    motivo,
    observacion,
    lote,
    costo_unitario,
    id_proveedor
  } = req.body

  if (!id_insumo || !id_tipo_movimiento || !cantidad || !motivo) {
    return res.status(400).json({ error: 'Faltan campos requeridos: id_insumo, id_tipo_movimiento, cantidad, motivo' })
  }
  if (Number(cantidad) <= 0) {
    return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Obtener afecta_stock del tipo seleccionado
    const { rows: tipoRows } = await client.query(
      `SELECT afecta_stock FROM tipo_movimiento WHERE id_tipo_movimiento = $1`,
      [id_tipo_movimiento]
    )
    if (tipoRows.length === 0) throw new Error('Tipo de movimiento no encontrado')
    const { afecta_stock } = tipoRows[0]

    // Insertar movimiento
    const { rows: movRows } = await client.query(`
      INSERT INTO movimiento_inventario
        (id_insumo, id_tipo_movimiento, id_proveedor, cantidad, costo_unitario, lote, motivo, observacion)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      id_insumo,
      id_tipo_movimiento,
      id_proveedor || null,
      Number(cantidad),
      costo_unitario || null,
      lote || null,
      motivo,
      observacion || null
    ])

    // Actualizar stock_actual en Ingredientes
    await client.query(`
      UPDATE Ingredientes
      SET stock_actual = stock_actual + ($1 * $2),
          agotado      = (stock_actual + ($1 * $2) <= 0)
      WHERE id_insumo = $3
    `, [afecta_stock, Number(cantidad), id_insumo])

    await client.query('COMMIT')
    res.status(201).json(movRows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: err.message || 'Error al registrar movimiento' })
  } finally {
    client.release()
  }
})

module.exports = router