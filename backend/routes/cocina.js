// backend/routes/cocina.js
const express = require('express')
const router  = express.Router()
const pool    = require('../db')

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
        dp.completado,
        pr.nombre          AS nombre_producto,
        pr.imagen_url,
        pr.codigo,
        ep.nombre          AS estado
       
      FROM pedido p
        JOIN estado_pedido  ep  ON ep.id_estado   = p.id_estado
        JOIN detalle_pedido dp  ON dp.id_pedido   = p.id_pedido
        JOIN producto       pr  ON pr.id_producto = dp.id_producto
      WHERE ep.nombre = 'EN PROCESO'
        AND dp.completado = false
      ORDER BY p.hora_pedido ASC, dp.id_detalle ASC
    `)

    res.json(rows)

  } catch (err) {
    console.error('[GET /api/cocina/pedidos]', err.message)
    res.status(500).json({ error: 'Error al obtener pedidos' })
  }
})

router.patch('/detalles/:id_detalle/completar', async (req, res) => {
  const id_detalle = parseInt(req.params.id_detalle)

  if (isNaN(id_detalle)) {
    return res.status(400).json({ error: 'ID de detalle inválido' })
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { rows: detalles } = await client.query(
      `SELECT id_detalle, id_pedido FROM detalle_pedido
       WHERE id_detalle = $1 AND completado = false`,
      [id_detalle]
    )

    if (detalles.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Detalle no encontrado o ya completado' })
    }

    const id_pedido = detalles[0].id_pedido

    await client.query(
      `UPDATE detalle_pedido SET completado = true WHERE id_detalle = $1`,
      [id_detalle]
    )

    const { rows: pendientes } = await client.query(
      `SELECT COUNT(*) AS total
       FROM detalle_pedido
       WHERE id_pedido = $1 AND completado = false`,
      [id_pedido]
    )

    const quedanPendientes = parseInt(pendientes[0].total) > 0

    if (!quedanPendientes) {
      const { rows: estados } = await client.query(
        `SELECT id_estado FROM estado_pedido WHERE nombre = 'LISTO' LIMIT 1`
      )

      if (estados.length > 0) {
        const id_estado_listo = estados[0].id_estado

        await client.query(
          `UPDATE pedido SET id_estado = $1 WHERE id_pedido = $2`,
          [id_estado_listo, id_pedido]
        )

        await client.query(
          `INSERT INTO historial_estado_pedido (id_pedido, id_estado, fecha)
           VALUES ($1, $2, NOW())`,
          [id_pedido, id_estado_listo]
        )
      }
    }

    await client.query('COMMIT')

    res.json({
      ok: true,
      id_detalle,
      id_pedido,
      pedido_completado: !quedanPendientes,
      mensaje: quedanPendientes
        ? 'Ítem completado, pedido aún tiene ítems pendientes'
        : 'Ítem completado — pedido marcado como LISTO'
    })

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[PATCH /api/cocina/detalles/:id/completar]', err.message)
    res.status(500).json({ error: 'Error al completar ítem' })
  } finally {
    client.release()
  }
})

module.exports = router