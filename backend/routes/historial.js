// routes/historial.js
const express = require('express')
const router  = express.Router()
const db      = require('../db')

// ═══════════════════════════════════════════════════════
//  INGREDIENTES
// ═══════════════════════════════════════════════════════

// GET /api/historial/ingredientes
router.get('/ingredientes', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        i.id_insumo             AS id,
        i.nombre,
        i.unidad_medida         AS unidad,
        i.stock_actual,
        i.stock_minimo,
        i.costo_unitario_avg,
        i.valor_inventario,
        i.agotado,
        c.nombre                AS categoria
      FROM ingredientes i
      JOIN categoria_ingrediente c
        ON c.id_categoria_ingrediente = i.id_categoria_ingrediente
      WHERE i.activo = TRUE
      ORDER BY i.nombre ASC
    `)
    res.json(rows)
  } catch (err) {
    console.error('GET /historial/ingredientes:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/historial/tipos-movimiento
router.get('/tipos-movimiento', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id_tipo_movimiento AS id, nombre, afecta_stock
      FROM tipo_movimiento
      ORDER BY nombre ASC
    `)
    res.json(rows)
  } catch (err) {
    console.error('GET /historial/tipos-movimiento:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/historial/proveedores
router.get('/proveedores', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id_proveedor AS id, nombre
      FROM proveedor
      WHERE activo = TRUE
      ORDER BY nombre ASC
    `)
    res.json(rows)
  } catch (err) {
    console.error('GET /historial/proveedores:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
//  HISTORIAL DE MOVIMIENTOS
// ═══════════════════════════════════════════════════════

// GET /api/historial/movimientos/:idInsumo
router.get('/movimientos/:idInsumo', async (req, res) => {
  const { idInsumo } = req.params
  const { tipo, busqueda } = req.query

  const condiciones = ['m.id_insumo = $1']
  const valores     = [idInsumo]
  let   idx         = 2

  if (tipo === 'entrada') condiciones.push(`tm.afecta_stock = 1`)
  if (tipo === 'salida')  condiciones.push(`tm.afecta_stock = -1`)

  if (busqueda) {
    condiciones.push(`(m.observacion ILIKE $${idx} OR p.nombre ILIKE $${idx})`)
    valores.push(`%${busqueda}%`)
    idx++
  }

  const where = condiciones.join(' AND ')

  try {
    const { rows: movimientos } = await db.query(`
      SELECT
        m.id_movimiento                              AS id,
        TO_CHAR(m.fecha, 'YYYY-MM-DD')              AS fecha,
        TO_CHAR(m.fecha, 'HH24:MI')                 AS hora,
        tm.nombre                                    AS tipo_nombre,
        tm.afecta_stock,
        m.cantidad,
        i.unidad_medida                              AS unidad,
        m.observacion,
        m.lote,
        m.costo_unitario,
        p.nombre                                     AS proveedor,
        CASE WHEN tm.afecta_stock = 1 THEN 'entrada' ELSE 'salida' END AS tipo,
        CASE
          WHEN tm.afecta_stock = -1 AND m.cantidad >= i.stock_minimo THEN TRUE
          ELSE FALSE
        END AS es_alerta
      FROM movimiento_inventario m
      JOIN tipo_movimiento   tm ON tm.id_tipo_movimiento = m.id_tipo_movimiento
      JOIN ingredientes     i  ON i.id_insumo           = m.id_insumo
      LEFT JOIN proveedor     p  ON p.id_proveedor        = m.id_proveedor
      WHERE ${where}
      ORDER BY m.fecha DESC
    `, valores)

    const { rows: resumenRows } = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN tm.afecta_stock =  1 THEN m.cantidad END), 0) AS total_entradas,
        COALESCE(SUM(CASE WHEN tm.afecta_stock = -1 THEN m.cantidad END), 0) AS total_salidas,
        COUNT(CASE WHEN tm.afecta_stock = -1 AND m.cantidad >= i.stock_minimo THEN 1 END) AS total_alertas
      FROM movimiento_inventario m
      JOIN tipo_movimiento tm ON tm.id_tipo_movimiento = m.id_tipo_movimiento
      JOIN ingredientes   i  ON i.id_insumo           = m.id_insumo
      WHERE m.id_insumo = $1
    `, [idInsumo])

    const { rows: ing } = await db.query(`
      SELECT stock_actual, stock_minimo, unidad_medida AS unidad, agotado
      FROM ingredientes WHERE id_insumo = $1
    `, [idInsumo])

    res.json({
      resumen: { ...resumenRows[0], ...ing[0] },
      movimientos
    })
  } catch (err) {
    console.error('GET /historial/movimientos:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/historial/movimientos
router.post('/movimientos', async (req, res) => {
  const { id_insumo, id_tipo_movimiento, cantidad, observacion, lote, costo_unitario, id_proveedor } = req.body

  if (!id_insumo || !id_tipo_movimiento || !cantidad)
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  if (Number(cantidad) <= 0)
    return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' })

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const { rows: tipoRows } = await client.query(
      `SELECT afecta_stock FROM tipo_movimiento WHERE id_tipo_movimiento = $1`,
      [id_tipo_movimiento]
    )
    if (!tipoRows.length) throw new Error('Tipo no encontrado')
    const { afecta_stock } = tipoRows[0]

    const { rows: movRows } = await client.query(`
      INSERT INTO movimiento_inventario
        (id_insumo, id_tipo_movimiento, id_proveedor, cantidad, costo_unitario, lote, observacion)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `, [id_insumo, id_tipo_movimiento, id_proveedor || null, Number(cantidad),
        costo_unitario || null, lote || null, observacion || null])

    await client.query(`
      UPDATE ingredientes
      SET stock_actual = stock_actual + ($1 * $2),
          agotado      = (stock_actual + ($1 * $2) <= 0)
      WHERE id_insumo = $3
    `, [afecta_stock, Number(cantidad), id_insumo])

    await client.query('COMMIT')
    res.status(201).json(movRows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /historial/movimientos:', err.message)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// ═══════════════════════════════════════════════════════
//  MERMAS
// ═══════════════════════════════════════════════════════

// GET /api/historial/merma/historial
router.get('/merma/historial', async (req, res) => {
  const { id_insumo, causa } = req.query
  const condiciones = [
    `tm.afecta_stock = -1`,
    `m.observacion IN ('VENCIDO','DAÑADO','VENCIDO Y DAÑADO')`
  ]
  const valores = []
  let   idx     = 1

  if (id_insumo) { condiciones.push(`m.id_insumo = $${idx++}`); valores.push(id_insumo) }
  if (causa && ['VENCIDO','DAÑADO'].includes(causa)) { condiciones.push(`m.observacion = $${idx++}`); valores.push(causa) }

  try {
    const { rows } = await db.query(`
      SELECT
        m.id_movimiento                                                            AS id,
        TO_CHAR(m.fecha, 'YYYY-MM-DD')                                            AS fecha,
        TO_CHAR(m.fecha, 'HH24:MI')                                               AS hora,
        i.nombre                                                                   AS ingrediente,
        i.unidad_medida                                                            AS unidad,
        m.cantidad,
        m.observacion                                                              AS causa,
        m.lote,
        ROUND(m.cantidad * COALESCE(m.costo_unitario, i.costo_unitario_avg), 2)   AS perdida_estimada
      FROM movimiento_inventario m
      JOIN tipo_movimiento   tm ON tm.id_tipo_movimiento = m.id_tipo_movimiento
      JOIN ingredientes     i  ON i.id_insumo           = m.id_insumo
      WHERE ${condiciones.join(' AND ')}
      ORDER BY m.fecha DESC
    `, valores)
    res.json(rows)
  } catch (err) {
    console.error('GET /historial/merma/historial:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/historial/merma/resumen
router.get('/merma/resumen', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        i.id_insumo,
        i.nombre                                                                      AS ingrediente,
        i.unidad_medida                                                               AS unidad,
        COUNT(m.id_movimiento)                                                        AS total_registros,
        SUM(m.cantidad)                                                               AS total_cantidad,
        ROUND(SUM(m.cantidad * COALESCE(m.costo_unitario, i.costo_unitario_avg)), 2) AS perdida_total
      FROM movimiento_inventario m
      JOIN tipo_movimiento   tm ON tm.id_tipo_movimiento = m.id_tipo_movimiento
      JOIN ingredientes     i  ON i.id_insumo           = m.id_insumo
      WHERE tm.afecta_stock = -1
        AND m.observacion IN ('VENCIDO','DAÑADO','VENCIDO Y DAÑADO')
      GROUP BY i.id_insumo, i.nombre, i.unidad_medida
      ORDER BY perdida_total DESC
    `)
    res.json(rows)
  } catch (err) {
    console.error('GET /historial/merma/resumen:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/historial/merma/registrar
router.post('/merma/registrar', async (req, res) => {
  const { id_insumo, cantidad, causa, lote } = req.body

  if (!id_insumo || !cantidad || !causa)
    return res.status(400).json({ error: 'Faltan campos: id_insumo, cantidad, causa' })
  if (!['VENCIDO','DAÑADO','VENCIDO Y DAÑADO'].includes(causa))
    return res.status(400).json({ error: 'Causa inválida' })
  if (Number(cantidad) <= 0)
    return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' })

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const { rows: ingRows } = await client.query(
      `SELECT stock_actual, costo_unitario_avg FROM ingredientes WHERE id_insumo = $1`,
      [id_insumo]
    )
    if (!ingRows.length) throw new Error('Ingrediente no encontrado')
    if (Number(ingRows[0].stock_actual) < Number(cantidad))
      throw new Error(`Stock insuficiente. Stock actual: ${ingRows[0].stock_actual}`)

    const { rows: tipoRows } = await client.query(
      `SELECT id_tipo_movimiento FROM tipo_movimiento WHERE afecta_stock = -1 LIMIT 1`
    )
    if (!tipoRows.length) throw new Error('No hay tipo de movimiento de salida en la BD')

    const { rows: movRows } = await client.query(`
      INSERT INTO movimiento_inventario
        (id_insumo, id_tipo_movimiento, cantidad, observacion, lote, costo_unitario)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `, [id_insumo, tipoRows[0].id_tipo_movimiento, Number(cantidad),
        causa, lote || null, ingRows[0].costo_unitario_avg || null])

    await client.query(`
      UPDATE ingredientes
      SET stock_actual = stock_actual - $1,
          agotado      = (stock_actual - $1 <= 0)
      WHERE id_insumo = $2
    `, [Number(cantidad), id_insumo])

    await client.query('COMMIT')
    res.status(201).json({
      ok:               true,
      movimiento:       movRows[0],
      perdida_estimada: (Number(cantidad) * Number(ingRows[0].costo_unitario_avg || 0)).toFixed(2)
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /historial/merma/registrar:', err.message)
    res.status(400).json({ error: err.message })
  } finally {
    client.release()
  }
})

// ═══════════════════════════════════════════════════════
//  VALOR DE INVENTARIO
// ═══════════════════════════════════════════════════════

// GET /api/historial/valor/resumen
router.get('/valor/resumen', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        COUNT(*)                                                              AS total_ingredientes,
        COALESCE(SUM(valor_inventario), 0)                                   AS valor_total,
        COUNT(*) FILTER (WHERE agotado)                                      AS agotados,
        COUNT(*) FILTER (WHERE stock_actual <= stock_minimo AND NOT agotado) AS stock_bajo
      FROM ingredientes
      WHERE activo = TRUE
    `)
    res.json(rows[0])
  } catch (err) {
    console.error('GET /historial/valor/resumen:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/historial/valor/compras
router.get('/valor/compras', async (req, res) => {
  const { id_insumo, fecha_desde, fecha_hasta } = req.query
  const condiciones = [`tm.afecta_stock = 1`, `m.costo_unitario IS NOT NULL`]
  const valores     = []
  let   idx         = 1

  if (id_insumo)   { condiciones.push(`m.id_insumo = $${idx++}`);                        valores.push(id_insumo) }
  if (fecha_desde) { condiciones.push(`m.fecha >= $${idx++}`);                           valores.push(fecha_desde) }
  if (fecha_hasta) { condiciones.push(`m.fecha <= $${idx++}::date + interval '1 day'`); valores.push(fecha_hasta) }

  try {
    const { rows } = await db.query(`
      SELECT
        m.id_movimiento                          AS id,
        TO_CHAR(m.fecha, 'YYYY-MM-DD')          AS fecha,
        TO_CHAR(m.fecha, 'HH24:MI')             AS hora,
        i.nombre                                 AS ingrediente,
        i.unidad_medida                          AS unidad,
        m.cantidad,
        m.costo_unitario,
        ROUND(m.cantidad * m.costo_unitario, 2) AS subtotal,
        m.lote,
        p.nombre                                 AS proveedor
      FROM movimiento_inventario m
      JOIN tipo_movimiento   tm ON tm.id_tipo_movimiento = m.id_tipo_movimiento
      JOIN ingredientes     i  ON i.id_insumo           = m.id_insumo
      LEFT JOIN proveedor     p  ON p.id_proveedor        = m.id_proveedor
      WHERE ${condiciones.join(' AND ')}
      ORDER BY m.fecha DESC
    `, valores)
    res.json(rows)
  } catch (err) {
    console.error('GET /historial/valor/compras:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/historial/valor/registrar-compra
router.post('/valor/registrar-compra', async (req, res) => {
  const { id_insumo, id_proveedor, cantidad, costo_unitario, lote, observacion } = req.body

  if (!id_insumo || !cantidad || !costo_unitario)
    return res.status(400).json({ error: 'Faltan campos: id_insumo, cantidad, costo_unitario' })
  if (Number(cantidad) <= 0)
    return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' })
  if (Number(costo_unitario) < 0)
    return res.status(400).json({ error: 'El costo no puede ser negativo' })

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const { rows: tipoRows } = await client.query(
      `SELECT id_tipo_movimiento FROM tipo_movimiento WHERE afecta_stock = 1 LIMIT 1`
    )
    if (!tipoRows.length) throw new Error('No hay tipo de movimiento de entrada en la BD')

    const { rows: ingRows } = await client.query(
      `SELECT stock_actual, costo_unitario_avg, valor_inventario FROM ingredientes WHERE id_insumo = $1`,
      [id_insumo]
    )
    if (!ingRows.length) throw new Error('Ingrediente no encontrado')

    const stockPrev     = Number(ingRows[0].stock_actual)
    const costoPrev     = Number(ingRows[0].costo_unitario_avg)
    const cant          = Number(cantidad)
    const costoNuevo    = Number(costo_unitario)
    const subtotal      = cant * costoNuevo
    const stockNuevo    = stockPrev + cant
    const costoAvgNuevo = stockNuevo > 0
      ? ((stockPrev * costoPrev) + (cant * costoNuevo)) / stockNuevo
      : costoNuevo
    const valorNuevo    = Number(ingRows[0].valor_inventario) + subtotal

    const { rows: movRows } = await client.query(`
      INSERT INTO movimiento_inventario
        (id_insumo, id_tipo_movimiento, id_proveedor, cantidad, costo_unitario, lote, observacion)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `, [id_insumo, tipoRows[0].id_tipo_movimiento, id_proveedor || null,
        cant, costoNuevo, lote || null, observacion || null])

    await client.query(`
      UPDATE ingredientes
      SET stock_actual       = stock_actual + $1,
          costo_unitario_avg = $2,
          valor_inventario   = $3,
          agotado            = FALSE
      WHERE id_insumo = $4
    `, [cant, costoAvgNuevo.toFixed(2), valorNuevo.toFixed(2), id_insumo])

    await client.query('COMMIT')
    res.status(201).json({
      ok:              true,
      movimiento:      movRows[0],
      subtotal:        subtotal.toFixed(2),
      costo_avg_nuevo: costoAvgNuevo.toFixed(2),
      valor_inv_nuevo: valorNuevo.toFixed(2),
      stock_nuevo:     stockNuevo.toFixed(3),
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /historial/valor/registrar-compra:', err.message)
    res.status(400).json({ error: err.message })
  } finally {
    client.release()
  }
})

module.exports = router