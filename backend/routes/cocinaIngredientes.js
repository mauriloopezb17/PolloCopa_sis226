const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        id_insumo AS id, 
        nombre AS name, 
        stock_actual, 
        agotado AS out 
      FROM Ingredientes
      ORDER BY id_insumo ASC`;
    const { rows } = await pool.query(query);
    console.log("Datos obtenidos de la BD:", rows);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener los ingredientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const checkQuery = 'SELECT agotado FROM Ingredientes WHERE id_insumo = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ingrediente no encontrado' });
    }
    
    const nuevoEstado = !checkResult.rows[0].agotado;

const updateQuery = `
  WITH upd_ingrediente AS (
    -- PASO 1: Marcamos el tomate (id=1) como agotado = true
    UPDATE Ingredientes 
    SET agotado = $1 
    WHERE id_insumo = $2 
    RETURNING id_insumo AS id, nombre AS name, stock_actual, agotado AS out
  ),
  upd_producto AS (
    -- PASO 2: Actualizamos los productos
    UPDATE producto 
    SET disponible = NOT $1  -- Como el tomate se agotó (true), el producto pasa a disponible = false
    WHERE id_producto IN (
        -- PASO 3: La magia ocurre aquí. 
        -- Buscamos en la tabla receta todos los IDs de productos que necesitan el ingrediente 1 (Tomate)
        SELECT id_producto 
        FROM receta 
        WHERE id_ingrediente = $2
    )
  )
  SELECT * FROM upd_ingrediente;
`;

const updateResult = await pool.query(updateQuery, [nuevoEstado, id]);
    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Error al actualizar el ingrediente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;