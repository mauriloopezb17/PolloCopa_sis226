const express = require('express')
const router  = express.Router()
const pool    = require('../db')

// ═══════════════════════════════════════════════════════════
// GET /api/caja/categorias
// ───────────────────────────────────────────────────────────
// Devuelve todas las categorías de producto para los filtros
// de la interfaz del cajero.
// ═══════════════════════════════════════════════════════════
router.get('/categorias', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id_categoria_producto AS id, nombre
       FROM   categoria_producto
       ORDER  BY nombre`
    )
    res.json(rows)
  } catch (err) {
    console.error('[GET /api/caja/categorias]', err.message)
    res.status(500).json({ error: 'Error al obtener categorías' })
  }
})


// ═══════════════════════════════════════════════════════════
// GET /api/caja/productos
// ───────────────────────────────────────────────────────────
// Devuelve todos los productos disponibles con su categoría.
// El cajero ve esta lista para agregar ítems al pedido.
//
// Tablas que usa:
//   producto           → datos del producto
//   categoria_producto → nombre de la categoría
// ═══════════════════════════════════════════════════════════
router.get('/productos', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.id_producto,
        p.codigo,
        p.nombre,
        p.descripcion,
        p.id_categoria_producto,
        cp.nombre          AS categoria,
        p.precio_combo,
        p.precio_con_papa,
        p.precio_solo,
        p.disponible,
        p.imagen_url
      FROM producto p
        JOIN categoria_producto cp ON cp.id_categoria_producto = p.id_categoria_producto
      ORDER BY cp.nombre, p.nombre
    `)
    res.json(rows)
  } catch (err) {
    console.error('[GET /api/caja/productos]', err.message)
    res.status(500).json({ error: 'Error al obtener productos' })
  }
})


// ═══════════════════════════════════════════════════════════
// GET /api/caja/metodos-pago
// ───────────────────────────────────────────────────────────
// Devuelve todos los métodos de pago disponibles para que
// el cajero seleccione uno al procesar la venta.
// ═══════════════════════════════════════════════════════════
router.get('/metodos-pago', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id_metodo, nombre
       FROM   metodo_pago
       ORDER  BY id_metodo`
    )
    res.json(rows)
  } catch (err) {
    console.error('[GET /api/caja/metodos-pago]', err.message)
    res.status(500).json({ error: 'Error al obtener métodos de pago' })
  }
})


// ═══════════════════════════════════════════════════════════
// GET /api/caja/turno-actual
// ───────────────────────────────────────────────────────────
// Devuelve el turno ABIERTO con resumen de ventas por método
// de pago. 404 si no hay turno abierto.
// ═══════════════════════════════════════════════════════════
router.get('/turno-actual', async (req, res) => {
  try {
    const { rows: turnos } = await pool.query(
      `SELECT id_turno, apertura, monto_apertura
       FROM   turno_caja
       WHERE  estado = 'ABIERTO'
       ORDER  BY apertura DESC
       LIMIT  1`
    )
    if (turnos.length === 0) {
      // Incluir el monto_cierre del último turno cerrado para mostrarlo en la apertura
      const { rows: ultimo } = await pool.query(
        `SELECT COALESCE(total_calculado_en_caja, 0) AS monto_cierre
         FROM   turno_caja
         WHERE  estado = 'CERRADO'
         ORDER  BY cierre DESC
         LIMIT  1`
      )
      const monto_apertura_sugerido = ultimo.length > 0 ? Number(ultimo[0].monto_cierre) : 0
      return res.status(404).json({ abierto: false, monto_apertura_sugerido })
    }
    const turno = turnos[0]

    const { rows: ventas } = await pool.query(
      `SELECT mp.nombre                              AS metodo,
              COUNT(pa.id_pago)                      AS cantidad_pagos,
              SUM(pa.monto_pagado)                   AS total_pagado,
              SUM(pa.monto_cambio)                   AS total_cambio,
              SUM(pa.monto_pagado - pa.monto_cambio) AS total_neto
       FROM   pago pa
         JOIN metodo_pago mp ON mp.id_metodo = pa.id_metodo
       WHERE  pa.id_turno_caja = $1
       GROUP  BY mp.nombre
       ORDER  BY mp.nombre`,
      [turno.id_turno]
    )

    const total_neto_turno = ventas.reduce((s, v) => s + Number(v.total_neto), 0)
    const total_calculado  = Number(turno.monto_apertura) + total_neto_turno

    // Desglose teórico para el cierre
    const ventas_efectivo = ventas
      .filter(v => v.metodo.toUpperCase() === 'EFECTIVO')
      .reduce((s, v) => s + Number(v.total_neto), 0)
    
    const ventas_transferencia = ventas
      .filter(v => v.metodo.toUpperCase() !== 'EFECTIVO')
      .reduce((s, v) => s + Number(v.total_neto), 0)

    const total_efectivo_teorico      = Number(turno.monto_apertura) + ventas_efectivo
    const total_transferencia_teorico = ventas_transferencia

    res.json({
      abierto:          true,
      id_turno:         turno.id_turno,
      apertura:         turno.apertura,
      monto_apertura:   Number(turno.monto_apertura),
      ventas_por_metodo: ventas.map(v => ({
        metodo:          v.metodo,
        cantidad_pagos:  Number(v.cantidad_pagos),
        total_pagado:    Number(v.total_pagado),
        total_cambio:    Number(v.total_cambio),
        total_neto:      Number(v.total_neto),
      })),
      total_neto_turno,
      total_calculado,
      total_efectivo_teorico,
      total_transferencia_teorico,
    })
  } catch (err) {
    console.error('[GET /api/caja/turno-actual]', err.message)
    res.status(500).json({ error: 'Error al obtener el turno actual' })
  }
})


// ═══════════════════════════════════════════════════════════
// POST /api/caja/apertura
// ───────────────────────────────────────────────────────────
// Abre un nuevo turno de caja. El monto_apertura se toma
// automáticamente del monto_cierre del último turno cerrado;
// si no existe turno anterior se usa 0.
// ═══════════════════════════════════════════════════════════
router.post('/apertura', async (_req, res) => {
  try {
    // Verificar que no haya ya un turno abierto
    const { rows: abiertos } = await pool.query(
      `SELECT id_turno FROM turno_caja WHERE estado = 'ABIERTO' LIMIT 1`
    )
    if (abiertos.length > 0) {
      return res.status(409).json({ error: 'Ya existe un turno de caja abierto' })
    }

    // Tomar el monto_cierre del turno anterior como monto_apertura
    const { rows: ultimo } = await pool.query(
      `SELECT COALESCE(total_calculado_en_caja, 0) AS monto_cierre
       FROM   turno_caja
       WHERE  estado = 'CERRADO'
       ORDER  BY cierre DESC
       LIMIT  1`
    )
    const monto_apertura = ultimo.length > 0 ? Number(ultimo[0].monto_cierre) : 0

    const { rows } = await pool.query(
      `INSERT INTO turno_caja (monto_apertura, estado)
       VALUES ($1, 'ABIERTO')
       RETURNING id_turno, apertura, monto_apertura, estado`,
      [monto_apertura]
    )

    res.status(201).json({ ok: true, turno: rows[0] })
  } catch (err) {
    console.error('[POST /api/caja/apertura]', err.message)
    res.status(500).json({ error: 'Error al abrir el turno' })
  }
})


// ═══════════════════════════════════════════════════════════
// POST /api/caja/cierre
// ───────────────────────────────────────────────────────────
// Cierra el turno ABIERTO, registrando el conteo físico del
// cajero y el total calculado por el sistema.
// Body: { "monto_cierre": 850.00 }
// ═══════════════════════════════════════════════════════════
router.post('/cierre', async (req, res) => {
  console.log('[POST /api/caja/cierre] Request body:', req.body)
  const { monto_cierre_efectivo, monto_cierre_transaccion } = req.body

  if (monto_cierre_efectivo === undefined || isNaN(Number(monto_cierre_efectivo)) || Number(monto_cierre_efectivo) < 0) {
    return res.status(400).json({ error: 'monto_cierre_efectivo debe ser un número >= 0' })
  }
  if (monto_cierre_transaccion === undefined || isNaN(Number(monto_cierre_transaccion)) || Number(monto_cierre_transaccion) < 0) {
    return res.status(400).json({ error: 'monto_cierre_transaccion debe ser un número >= 0' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows: turnos } = await client.query(
      `SELECT id_turno, monto_apertura
       FROM   turno_caja
       WHERE  estado = 'ABIERTO'
       ORDER  BY apertura DESC
       LIMIT  1`
    )
    if (turnos.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'No hay un turno de caja abierto' })
    }
    const turno = turnos[0]

    // Calcular totales teóricos
    const { rows: ventas } = await client.query(
      `SELECT mp.nombre, COALESCE(SUM(monto_pagado - monto_cambio), 0) AS total_neto
       FROM   pago pa
         JOIN metodo_pago mp ON mp.id_metodo = pa.id_metodo
       WHERE  pa.id_turno_caja = $1
       GROUP  BY mp.nombre`,
      [turno.id_turno]
    )
    
    const total_neto_ventas = ventas.reduce((s, v) => s + Number(v.total_neto), 0)
    const total_calculado_teorico = Number(turno.monto_apertura) + total_neto_ventas

    const total_calculado_en_caja = Number(monto_cierre_efectivo) + Number(monto_cierre_transaccion)

    const { rows: updated } = await client.query(
      `UPDATE turno_caja
       SET    cierre                    = NOW(),
              monto_cierre_efectivo     = $1,
              monto_cierre_transaccion  = $2,
              total_calculado_teorico   = $3,
              total_calculado_en_caja   = $4,
              estado                    = 'CERRADO'
       WHERE  id_turno = $5
       RETURNING id_turno, apertura, cierre, monto_apertura, total_calculado_en_caja AS monto_cierre, total_calculado_teorico AS total_calculado`,
      [Number(monto_cierre_efectivo), Number(monto_cierre_transaccion), total_calculado_teorico, total_calculado_en_caja, turno.id_turno]
    )

    await client.query('COMMIT')
    res.json({ ok: true, turno: updated[0] })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[POST /api/caja/cierre] FULL ERROR:', err)
    res.status(500).json({ error: 'Error al cerrar el turno', details: err.message, stack: err.stack })
  } finally {
    client.release()
  }
})


// ═══════════════════════════════════════════════════════════
// POST /api/caja/pedidos
// ───────────────────────────────────────────────────────────
// Crea un nuevo pedido + su pago desde la caja, todo dentro
// de una misma transacción para que ambos aparezcan en la BD
// de forma atómica (todo o nada).
//
// Body esperado:
// {
//   "items": [
//     { "id_producto": 1, "tipo_precio": "COMBO", "cantidad": 2, "precio_unitario": 85.00 },
//     ...
//   ],
//   "pago": {
//     "id_metodo":    1,
//     "monto_pagado": 50.00
//   },
//   "instrucciones": "Sin picante" (opcional),
//   "NIT": 12345678              (opcional),
//   "razon_social": "Empresa X"  (opcional)
// }
//
// Lógica dentro de una transacción:
//   1. Generar un numero_ticket único
//   2. Buscar el id del estado "PENDIENTE" (estado inicial)
//   3. Calcular subtotal y total
//   4. Insertar en tabla pedido
//   5. Insertar cada ítem en detalle_pedido
//   6. Registrar en historial_estado_pedido
//   7. Buscar turno de caja abierto
//   8. Insertar el pago con el cambio calculado
// ═══════════════════════════════════════════════════════════
router.post('/pedidos', async (req, res) => {
  const { items, pago, instrucciones, NIT, razon_social, descuento_pct = 0, origen_web = false } = req.body
  
  // Validar descuento
  const d_pct = Number(descuento_pct)
  if (isNaN(d_pct) || d_pct < 0 || d_pct > 100) {
    return res.status(400).json({ error: 'El porcentaje de descuento debe estar entre 0 y 100' })
  }

  // Validar que hay al menos un ítem
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El pedido debe tener al menos un producto' })
  }

  // Validar cada ítem
  for (const item of items) {
    if (!item.id_producto || !item.tipo_precio || !item.cantidad || !item.precio_unitario) {
      return res.status(400).json({ error: 'Cada ítem debe tener id_producto, tipo_precio, cantidad y precio_unitario' })
    }
    if (!['COMBO', 'CON_PAPA', 'SOLO'].includes(item.tipo_precio)) {
      return res.status(400).json({ error: `tipo_precio inválido: ${item.tipo_precio}` })
    }
    if (item.cantidad < 1) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' })
    }
  }

  // Validar datos del pago
  if (!pago || !pago.id_metodo || !pago.monto_pagado) {
    return res.status(400).json({ error: 'Se requiere información de pago (id_metodo y monto_pagado)' })
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 1. Generar numero_ticket: T-YYYYMMDD-0001, etc. (único por día)
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const { rows: ticketRows } = await client.query(`
      SELECT COUNT(*) AS total
      FROM   pedido
      WHERE  numero_ticket LIKE $1
    `, [`T-${datePrefix}-%`])
    const ticketNum = String(Number(ticketRows[0].total) + 1).padStart(4, '0')
    const numero_ticket = `T-${datePrefix}-${ticketNum}`

    // 2. Buscar el estado inicial (EN PROCESO)
    const { rows: estados } = await client.query(
      `SELECT id_estado FROM estado_pedido WHERE nombre = 'EN PROCESO' LIMIT 1`
    )
    if (estados.length === 0) {
      await client.query('ROLLBACK')
      return res.status(500).json({ error: 'Estado EN PROCESO no existe en la BD' })
    }
    const id_estado = estados[0].id_estado

    // 3. Calcular subtotal y total
    const subtotal = items.reduce(
      (sum, item) => sum + item.cantidad * item.precio_unitario, 0
    )
    const descuento_monto = subtotal * (d_pct / 100)
    const total = subtotal - descuento_monto

    // 4. Validar que el monto pagado cubre el total
    if (pago.monto_pagado < total) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: `El monto pagado (${pago.monto_pagado}) es menor al total (${total})` })
    }

    const monto_cambio = pago.monto_pagado - total

    // 5. Insertar pedido
    const { rows: pedidoRows } = await client.query(`
      INSERT INTO pedido (id_estado, numero_ticket, origen_web, subtotal, descuento_pct, descuento_monto, total, instrucciones, nit, razon_social)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id_pedido, numero_ticket, hora_pedido
    `, [id_estado, numero_ticket, !!origen_web, subtotal, d_pct, descuento_monto, total, instrucciones || null, NIT || null, razon_social || null])

    const pedido = pedidoRows[0]

    // 6. Insertar cada detalle
    for (const item of items) {
      const itemSubtotal = item.cantidad * item.precio_unitario
      await client.query(`
        INSERT INTO detalle_pedido (id_pedido, id_producto, tipo_precio, cantidad, precio_unitario, subtotal)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [pedido.id_pedido, item.id_producto, item.tipo_precio, item.cantidad, item.precio_unitario, itemSubtotal])
    }

    // 7. Registrar en historial
    await client.query(`
      INSERT INTO historial_estado_pedido (id_pedido, id_estado, fecha)
      VALUES ($1, $2, NOW())
    `, [pedido.id_pedido, id_estado])

    // 8. Buscar turno de caja abierto
    const { rows: turnos } = await client.query(
      `SELECT id_turno FROM turno_caja WHERE estado = 'ABIERTO' ORDER BY apertura DESC LIMIT 1`
    )
    if (turnos.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'No hay un turno de caja abierto. Abrir turno antes de registrar pagos.' })
    }
    const id_turno = turnos[0].id_turno

    // 9. Insertar pago
    await client.query(`
      INSERT INTO pago (id_pedido, id_turno_caja, id_metodo, monto_pagado, monto_cambio)
      VALUES ($1, $2, $3, $4, $5)
    `, [pedido.id_pedido, id_turno, pago.id_metodo, pago.monto_pagado, monto_cambio])

    // 10. Descontar ingredientes del inventario según recetas
    await client.query(`
      UPDATE Ingredientes i
      SET stock_actual = GREATEST(0, i.stock_actual - d.total_deducir)
      FROM (
        SELECT r.id_ingrediente, SUM(r.cantidad * dp.cantidad) AS total_deducir
        FROM detalle_pedido dp
        JOIN receta r ON r.id_producto = dp.id_producto
        WHERE dp.id_pedido = $1
        GROUP BY r.id_ingrediente
      ) d
      WHERE i.id_insumo = d.id_ingrediente
    `, [pedido.id_pedido])

    // 11. Recalcular agotado y valor_inventario para los ingredientes afectados
    await client.query(`
      UPDATE Ingredientes
      SET agotado          = (stock_actual <= 0),
          valor_inventario = stock_actual * COALESCE(costo_unitario_avg, 0)
      WHERE id_insumo IN (
        SELECT DISTINCT r.id_ingrediente
        FROM detalle_pedido dp
        JOIN receta r ON r.id_producto = dp.id_producto
        WHERE dp.id_pedido = $1
      )
    `, [pedido.id_pedido])

    // 12. Marcar productos como no disponibles si un ingrediente se agotó
    await client.query(`
      UPDATE producto p
      SET disponible = false
      FROM receta r
      JOIN Ingredientes i ON i.id_insumo = r.id_ingrediente
      WHERE r.id_producto = p.id_producto
        AND i.agotado = true
        AND p.disponible = true
    `)

    await client.query('COMMIT')

    res.status(201).json({
      ok: true,
      mensaje: 'Pedido creado exitosamente',
      pedido: {
        id_pedido: pedido.id_pedido,
        numero_ticket: pedido.numero_ticket,
        hora_pedido: pedido.hora_pedido,
        subtotal,
        descuento_pct: d_pct,
        total,
        monto_pagado: pago.monto_pagado,
        monto_cambio: monto_cambio,
      },
    })

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[POST /api/caja/pedidos]', err.message)
    res.status(500).json({ error: 'Error al crear el pedido' })
  } finally {
    client.release()
  }
})


// ═══════════════════════════════════════════════════════════
// GET /api/caja/historial
// ───────────────────────────────────────────────────────────
// Devuelve los últimos 50 pedidos con sus ítems, estado y pago.
// ═══════════════════════════════════════════════════════════
router.get('/historial', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.id_pedido,
        p.numero_ticket,
        p.hora_pedido,
        p.subtotal,
        p.descuento_pct,
        p.descuento_monto,
        p.total,
        p.instrucciones,
        ep.nombre AS estado,
        mp.nombre AS metodo_pago,
        pa.monto_pagado,
        pa.monto_cambio,
        COALESCE(
          json_agg(
            json_build_object(
              'nombre',          prod.nombre,
              'cantidad',        dp.cantidad,
              'tipo_precio',     dp.tipo_precio,
              'precio_unitario', dp.precio_unitario,
              'subtotal',        dp.subtotal
            ) ORDER BY dp.id_detalle
          ) FILTER (WHERE dp.id_detalle IS NOT NULL),
          '[]'
        ) AS items
      FROM pedido p
      JOIN  estado_pedido ep ON ep.id_estado  = p.id_estado
      LEFT JOIN pago        pa ON pa.id_pedido  = p.id_pedido
      LEFT JOIN metodo_pago mp ON mp.id_metodo   = pa.id_metodo
      LEFT JOIN detalle_pedido dp   ON dp.id_pedido  = p.id_pedido
      LEFT JOIN producto       prod ON prod.id_producto = dp.id_producto
      GROUP BY p.id_pedido, ep.nombre, mp.nombre, pa.monto_pagado, pa.monto_cambio
      ORDER BY p.hora_pedido DESC
      LIMIT 50
    `)
    res.json(rows)
  } catch (err) {
    console.error('[GET /api/caja/historial]', err.message)
    res.status(500).json({ error: 'Error al obtener historial' })
  }
})


// ═══════════════════════════════════════════════════════════
// POST /api/caja/pedidos/:id/anular
// ───────────────────────────────────────────────────────────
// Cambia el estado del pedido a ANULADO y repone el stock
// de los ingredientes consumidos por sus recetas.
// ═══════════════════════════════════════════════════════════
router.post('/pedidos/:id/anular', async (req, res) => {
  const { id } = req.params
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Verificar que el pedido existe y no está ya anulado
    const { rows: pedidos } = await client.query(
      `SELECT p.id_pedido, ep.nombre AS estado
       FROM pedido p
       JOIN estado_pedido ep ON ep.id_estado = p.id_estado
       WHERE p.id_pedido = $1`,
      [id]
    )
    if (pedidos.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }
    if (pedidos[0].estado === 'ANULADO') {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'El pedido ya está anulado' })
    }

    // Obtener id del estado ANULADO
    const { rows: estados } = await client.query(
      `SELECT id_estado FROM estado_pedido WHERE nombre = 'ANULADO' LIMIT 1`
    )
    if (estados.length === 0) {
      await client.query('ROLLBACK')
      return res.status(500).json({ error: 'Estado ANULADO no existe en la BD' })
    }
    const id_estado_anulado = estados[0].id_estado

    // Actualizar estado del pedido
    await client.query(
      `UPDATE pedido SET id_estado = $1 WHERE id_pedido = $2`,
      [id_estado_anulado, id]
    )

    // Registrar cambio en historial
    await client.query(
      `INSERT INTO historial_estado_pedido (id_pedido, id_estado, fecha) VALUES ($1, $2, NOW())`,
      [id, id_estado_anulado]
    )

    // Reponer stock de los ingredientes según las recetas del pedido
    await client.query(`
      UPDATE Ingredientes i
      SET stock_actual = i.stock_actual + d.total_reponer
      FROM (
        SELECT r.id_ingrediente, SUM(r.cantidad * dp.cantidad) AS total_reponer
        FROM detalle_pedido dp
        JOIN receta r ON r.id_producto = dp.id_producto
        WHERE dp.id_pedido = $1
        GROUP BY r.id_ingrediente
      ) d
      WHERE i.id_insumo = d.id_ingrediente
    `, [id])

    // Recalcular agotado y valor_inventario
    await client.query(`
      UPDATE Ingredientes
      SET agotado          = (stock_actual <= 0),
          valor_inventario = stock_actual * COALESCE(costo_unitario_avg, 0)
      WHERE id_insumo IN (
        SELECT DISTINCT r.id_ingrediente
        FROM detalle_pedido dp
        JOIN receta r ON r.id_producto = dp.id_producto
        WHERE dp.id_pedido = $1
      )
    `, [id])

    // Re-habilitar productos cuyo ingredientes ya no están agotados
    await client.query(`
      UPDATE producto p
      SET disponible = true
      WHERE p.disponible = false
        AND NOT EXISTS (
          SELECT 1 FROM receta r
          JOIN Ingredientes i ON i.id_insumo = r.id_ingrediente
          WHERE r.id_producto = p.id_producto
            AND i.agotado = true
        )
    `)

    await client.query('COMMIT')
    res.json({ ok: true, mensaje: 'Pedido anulado y stock repuesto' })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[POST /api/caja/pedidos/:id/anular]', err.message)
    res.status(500).json({ error: 'Error al anular el pedido' })
  } finally {
    client.release()
  }
})


// ═══════════════════════════════════════════════════════════
// DELETE /api/caja/flush
// ───────────────────────────────────────────────────────────
// Limpia todas las tablas transaccionales de pedidos y pagos.
// SOLO PARA USO EN DESARROLLO/TESTING.
// Elimina: pago, historial_estado_pedido, detalle_pedido, pedido
// y reinicia los contadores de secuencia.
// ═══════════════════════════════════════════════════════════
router.delete('/flush', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM pago')
    await client.query('DELETE FROM historial_estado_pedido')
    await client.query('DELETE FROM detalle_pedido')
    await client.query('DELETE FROM pedido')
    // Reiniciar secuencias
    await client.query("ALTER SEQUENCE pago_id_pago_seq RESTART WITH 1")
    await client.query("ALTER SEQUENCE historial_estado_pedido_id_historial_seq RESTART WITH 1")
    await client.query("ALTER SEQUENCE detalle_pedido_id_detalle_seq RESTART WITH 1")
    await client.query("ALTER SEQUENCE pedido_id_pedido_seq RESTART WITH 1")
    await client.query('COMMIT')
    res.json({ ok: true, mensaje: 'Tablas de pedidos y pagos limpiadas correctamente' })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[DELETE /api/caja/flush]', err.message)
    res.status(500).json({ error: 'Error al limpiar tablas' })
  } finally {
    client.release()
  }
})

module.exports = router
