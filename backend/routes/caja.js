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
  const { items, pago, instrucciones, NIT, razon_social } = req.body

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

    // 1. Generar numero_ticket: T-0001, T-0002, etc. (por día)
    const { rows: ticketRows } = await client.query(`
      SELECT COUNT(*) AS total
      FROM   pedido
      WHERE  hora_pedido::date = CURRENT_DATE
    `)
    const ticketNum = String(Number(ticketRows[0].total) + 1).padStart(4, '0')
    const numero_ticket = `T-${ticketNum}`

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
    const total = subtotal  // sin descuento por ahora

    // 4. Validar que el monto pagado cubre el total
    if (pago.monto_pagado < total) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: `El monto pagado (${pago.monto_pagado}) es menor al total (${total})` })
    }

    const monto_cambio = pago.monto_pagado - total

    // 5. Insertar pedido
    const { rows: pedidoRows } = await client.query(`
      INSERT INTO pedido (id_estado, numero_ticket, origen_web, subtotal, total, instrucciones, nit, razon_social)
      VALUES ($1, $2, false, $3, $4, $5, $6, $7)
      RETURNING id_pedido, numero_ticket, hora_pedido
    `, [id_estado, numero_ticket, subtotal, total, instrucciones || null, NIT || null, razon_social || null])

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

    await client.query('COMMIT')

    res.status(201).json({
      ok: true,
      mensaje: 'Pedido creado exitosamente',
      pedido: {
        id_pedido: pedido.id_pedido,
        numero_ticket: pedido.numero_ticket,
        hora_pedido: pedido.hora_pedido,
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
