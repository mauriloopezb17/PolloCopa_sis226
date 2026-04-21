const express = require('express')
const router  = express.Router()
const pool    = require('../db')

// ═══════════════════════════════════════════════════════════
// GET /api/cocina/pedidos
// ───────────────────────────────────────────────────────────
// Devuelve todos los pedidos en estado "EN PROCESO", ordenados
// del más antiguo al más nuevo para que el cocinero los
// prepare en el orden correcto.
//
// Tablas que usa:
//   pedido          → datos del pedido (ticket, hora, instrucciones)
//   estado_pedido   → para filtrar solo los EN PROCESO
//   detalle_pedido  → cada producto dentro del pedido
//   producto        → nombre e imagen del producto
// ═══════════════════════════════════════════════════════════
router.get('/pedidos', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.id_pedido,
        p.numero_ticket,
        p.hora_pedido,
        p.instrucciones,
        p.subtotal,
        dp.id_detalle,
        dp.tipo_precio,
        dp.cantidad,
        dp.subtotal        AS subtotal_detalle,
        pr.nombre          AS nombre_producto,
        pr.imagen_url,
        ep.nombre          AS estado
      FROM pedido p
        JOIN estado_pedido  ep  ON ep.id_estado   = p.id_estado
        JOIN detalle_pedido dp  ON dp.id_pedido   = p.id_pedido
        JOIN producto       pr  ON pr.id_producto = dp.id_producto
      WHERE ep.nombre = 'EN PROCESO'
      ORDER BY p.hora_pedido ASC
    `)

    res.json(rows)

  } catch (err) {
    console.error('[GET /api/cocina/pedidos]', err.message)
    res.status(500).json({ error: 'Error al obtener pedidos' })
  }
})


// ═══════════════════════════════════════════════════════════
// PATCH /api/cocina/pedidos/:id/completar
// ───────────────────────────────────────────────────────────
// El cocinero presiona "Completar orden".
// Este endpoint hace dos cosas dentro de una transacción:
//   1. Cambia el estado del pedido a "LISTO"
//   2. Registra el cambio en historial_estado_pedido
//
// Si cualquiera de las dos falla, ninguna se guarda
// (eso es lo que hace la transacción: todo o nada).
// ═══════════════════════════════════════════════════════════
router.patch('/pedidos/:id/completar', async (req, res) => {
  const id_pedido = parseInt(req.params.id)

  if (isNaN(id_pedido)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  const client = await pool.connect()  // tomamos una conexión del pool

  try {
    await client.query('BEGIN')  // inicio de transacción

    // 1. Buscar el id numérico del estado "LISTO"
    const { rows: estados } = await client.query(
      `SELECT id_estado FROM estado_pedido WHERE nombre = 'LISTO' LIMIT 1`
    )
    if (estados.length === 0) {
      await client.query('ROLLBACK')
      return res.status(500).json({ error: 'Estado LISTO no existe en la BD' })
    }
    const id_estado_listo = estados[0].id_estado

    // 2. Verificar que el pedido existe y está EN PROCESO (no se puede completar un pedido que no está en proceso)
    const { rows: pedidos } = await client.query(`
      SELECT p.id_pedido
      FROM   pedido p
        JOIN estado_pedido ep ON ep.id_estado = p.id_estado
      WHERE  p.id_pedido = $1
        AND  ep.nombre   = 'EN PROCESO'
    `, [id_pedido])

    if (pedidos.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Pedido no encontrado o ya fue completado' })
    }

    // 3. Actualizar el estado del pedido
    await client.query(
      `UPDATE pedido SET id_estado = $1 WHERE id_pedido = $2`,
      [id_estado_listo, id_pedido]
    )

    // 4. Insertar registro en el historial
    await client.query(
      `INSERT INTO historial_estado_pedido (id_pedido, id_estado, fecha)
       VALUES ($1, $2, NOW())`,
      [id_pedido, id_estado_listo]
    )

    await client.query('COMMIT')  // confirmar todo
    res.json({ ok: true, mensaje: 'Pedido completado', id_pedido })

  } catch (err) {
    await client.query('ROLLBACK')  // si algo falla, deshacer todo
    console.error('[PATCH /api/cocina/pedidos/:id/completar]', err.message)
    res.status(500).json({ error: 'Error al completar pedido' })
  } finally {
    client.release()  // devolver la conexión al pool
  }
})

module.exports = router