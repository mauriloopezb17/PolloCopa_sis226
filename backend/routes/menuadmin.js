const express = require('express')
const router  = express.Router()
const pool    = require('../db')

// ═══════════════════════════════════════════════════════════
// GET /api/menuAdmin/productos
// ───────────────────────────────────────────────────────────
// Devuelve todos los productos (activos e inactivos) con su
// categoría, para que el administrador pueda gestionar el menú.
// HU-24 / HU-25
// ═══════════════════════════════════════════════════════════
router.get('/productos', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.id_producto,
        p.codigo,
        p.nombre,
        p.descripcion,
        p.precio_combo,
        p.precio_con_papa,
        p.precio_solo,
        p.disponible,
        p.imagen_url,
        p.id_categoria_producto,
        cp.nombre AS categoria
      FROM producto p
        JOIN categoria_producto cp ON cp.id_categoria_producto = p.id_categoria_producto
      ORDER BY cp.nombre ASC, p.nombre ASC
    `)
    res.json(rows)
  } catch (err) {
    console.error('[GET /api/menuadmin/productos]', err.message)
    res.status(500).json({ error: 'Error al obtener productos' })
  }
})

// ═══════════════════════════════════════════════════════════
// GET /api/menuAdmin/categorias
// ───────────────────────────────────────────────────────────
// Lista de categorías de producto para el selector del form.
// ═══════════════════════════════════════════════════════════
router.get('/categorias', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id_categoria_producto, nombre FROM categoria_producto ORDER BY nombre ASC`
    )
    res.json(rows)
  } catch (err) {
    console.error('[GET /api/menuadmin/categorias]', err.message)
    res.status(500).json({ error: 'Error al obtener categorías' })
  }
})

// ═══════════════════════════════════════════════════════════
// GET /api/menuAdmin/ingredientes
// ───────────────────────────────────────────────────────────
// Lista de ingredientes activos para armar la receta.
// HU-24
// ═══════════════════════════════════════════════════════════
router.get('/ingredientes', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        i.id_insumo,
        i.nombre,
        i.unidad_medida,
        i.stock_actual,
        ci.nombre AS categoria
      FROM Ingredientes i
        JOIN categoria_ingrediente ci ON ci.id_categoria_ingrediente = i.id_categoria_ingrediente
      WHERE i.activo = true
      ORDER BY ci.nombre ASC, i.nombre ASC
    `)
    res.json(rows)
  } catch (err) {
    console.error('[GET /api/menuadmin/ingredientes]', err.message)
    res.status(500).json({ error: 'Error al obtener ingredientes' })
  }
})

// ═══════════════════════════════════════════════════════════
// GET /api/menuAdmin/productos/:id/receta
// ───────────────────────────────────────────────────────────
// Devuelve la receta completa de un producto (para edición).
// ═══════════════════════════════════════════════════════════
router.get('/productos/:id/receta', async (req, res) => {
  const id_producto = parseInt(req.params.id)
  if (isNaN(id_producto)) return res.status(400).json({ error: 'ID inválido' })

  try {
    const { rows } = await pool.query(`
      SELECT
        r.id_receta,
        r.id_ingrediente,
        r.cantidad,
        i.nombre   AS nombre_ingrediente,
        i.unidad_medida
      FROM receta r
        JOIN Ingredientes i ON i.id_insumo = r.id_ingrediente
      WHERE r.id_producto = $1
      ORDER BY i.nombre ASC
    `, [id_producto])
    res.json(rows)
  } catch (err) {
    console.error('[GET /api/menuadmin/productos/:id/receta]', err.message)
    res.status(500).json({ error: 'Error al obtener receta' })
  }
})

// ═══════════════════════════════════════════════════════════
// POST /api/menuAdmin/productos
// ───────────────────────────────────────────────────────────
// Crea un nuevo plato con su receta en una sola transacción.
// Body: { codigo, nombre, descripcion, id_categoria_producto,
//         precio_combo, precio_con_papa, precio_solo,
//         imagen_url, receta: [{ id_ingrediente, cantidad }] }
// HU-24
// ═══════════════════════════════════════════════════════════
router.post('/productos', async (req, res) => {
  const {
    codigo, nombre, descripcion,
    id_categoria_producto,
    precio_combo, precio_con_papa, precio_solo,
    imagen_url,
    receta = [],
  } = req.body

  if (!codigo || !nombre || !id_categoria_producto) {
    return res.status(400).json({ error: 'codigo, nombre e id_categoria_producto son obligatorios' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1. Insertar producto
    const { rows: [prod] } = await client.query(`
      INSERT INTO producto
        (codigo, nombre, descripcion, id_categoria_producto,
         precio_combo, precio_con_papa, precio_solo, disponible, imagen_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8)
      RETURNING *
    `, [
      codigo, nombre, descripcion ?? null,
      id_categoria_producto,
      precio_combo   ?? null,
      precio_con_papa ?? null,
      precio_solo    ?? null,
      imagen_url     ?? null,
    ])

    // 2. Insertar líneas de receta
    for (const linea of receta) {
      if (!linea.id_ingrediente || !linea.cantidad || linea.cantidad <= 0) continue
      await client.query(`
        INSERT INTO receta (id_producto, id_ingrediente, cantidad)
        VALUES ($1, $2, $3)
        ON CONFLICT (id_producto, id_ingrediente) DO UPDATE SET cantidad = EXCLUDED.cantidad
      `, [prod.id_producto, linea.id_ingrediente, linea.cantidad])
    }

    await client.query('COMMIT')
    res.status(201).json({ ok: true, producto: prod })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[POST /api/menuadmin/productos]', err.message)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El código de producto ya existe' })
    }
    res.status(500).json({ error: 'Error al crear producto' })
  } finally {
    client.release()
  }
})

// ═══════════════════════════════════════════════════════════
// PUT /api/menuAdmin/productos/:id
// ───────────────────────────────────────────────────────────
// Edita un plato y reemplaza su receta completa.
// HU-24
// ═══════════════════════════════════════════════════════════
router.put('/productos/:id', async (req, res) => {
  const id_producto = parseInt(req.params.id)
  if (isNaN(id_producto)) return res.status(400).json({ error: 'ID inválido' })

  const {
    codigo, nombre, descripcion,
    id_categoria_producto,
    precio_combo, precio_con_papa, precio_solo,
    imagen_url,
    receta = [],
  } = req.body

  if (!codigo || !nombre || !id_categoria_producto) {
    return res.status(400).json({ error: 'codigo, nombre e id_categoria_producto son obligatorios' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1. Actualizar producto
    const { rows: [prod] } = await client.query(`
      UPDATE producto SET
        codigo               = $1,
        nombre               = $2,
        descripcion          = $3,
        id_categoria_producto = $4,
        precio_combo         = $5,
        precio_con_papa      = $6,
        precio_solo          = $7,
        imagen_url           = $8
      WHERE id_producto = $9
      RETURNING *
    `, [
      codigo, nombre, descripcion ?? null,
      id_categoria_producto,
      precio_combo    ?? null,
      precio_con_papa ?? null,
      precio_solo     ?? null,
      imagen_url      ?? null,
      id_producto,
    ])

    if (!prod) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Producto no encontrado' })
    }

    // 2. Reemplazar receta completa
    await client.query(`DELETE FROM receta WHERE id_producto = $1`, [id_producto])
    for (const linea of receta) {
      if (!linea.id_ingrediente || !linea.cantidad || linea.cantidad <= 0) continue
      await client.query(`
        INSERT INTO receta (id_producto, id_ingrediente, cantidad)
        VALUES ($1, $2, $3)
      `, [id_producto, linea.id_ingrediente, linea.cantidad])
    }

    await client.query('COMMIT')
    res.json({ ok: true, producto: prod })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[PUT /api/menuadmin/productos/:id]', err.message)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El código de producto ya existe' })
    }
    res.status(500).json({ error: 'Error al editar producto' })
  } finally {
    client.release()
  }
})

// ═══════════════════════════════════════════════════════════
// PATCH /api/menuAdmin/productos/:id/disponibilidad
// ───────────────────────────────────────────────────────────
// Activa o desactiva un producto del menú visible en Caja.
// Body: { disponible: true | false }
// HU-25
// ═══════════════════════════════════════════════════════════
router.patch('/productos/:id/disponibilidad', async (req, res) => {
  const id_producto = parseInt(req.params.id)
  if (isNaN(id_producto)) return res.status(400).json({ error: 'ID inválido' })

  const { disponible } = req.body
  if (typeof disponible !== 'boolean') {
    return res.status(400).json({ error: '"disponible" debe ser true o false' })
  }

  try {
    const { rows: [prod] } = await pool.query(`
      UPDATE producto
      SET disponible = $1
      WHERE id_producto = $2
      RETURNING id_producto, nombre, disponible
    `, [disponible, id_producto])

    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json({ ok: true, producto: prod })
  } catch (err) {
    console.error('[PATCH /api/menuadmin/productos/:id/disponibilidad]', err.message)
    res.status(500).json({ error: 'Error al actualizar disponibilidad' })
  }
})


// ═══════════════════════════════════════════════════════════
// DELETE /api/menuAdmin/productos/:id
// ───────────────────────────────────────────────────────────
// Elimina un plato y su receta completa (CASCADE en DB).
// Solo se permite si el producto no tiene pedidos asociados.
// HU-24
// ═══════════════════════════════════════════════════════════
router.delete('/productos/:id', async (req, res) => {
  const id_producto = parseInt(req.params.id)
  if (isNaN(id_producto)) return res.status(400).json({ error: 'ID inválido' })

  try {
    // Verificar que no existan pedidos con este producto
    const { rows: refs } = await pool.query(
      `SELECT 1 FROM detalle_pedido WHERE id_producto = $1 LIMIT 1`,
      [id_producto]
    )
    if (refs.length > 0) {
      return res.status(409).json({
        error: 'No se puede eliminar: el plato tiene pedidos registrados. Desactívalo en su lugar.'
      })
    }

    const { rows: [prod] } = await pool.query(
      `DELETE FROM producto WHERE id_producto = $1 RETURNING id_producto, nombre`,
      [id_producto]
    )
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' })

    res.json({ ok: true, eliminado: prod })
  } catch (err) {
    console.error('[DELETE /api/menuadmin/productos/:id]', err.message)
    res.status(500).json({ error: 'Error al eliminar producto' })
  }
})

module.exports = router