const express = require('express')
const cors = require('cors')
const pool = require('./db')

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/ingredients', async (req, res) => {
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
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener los ingredientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
})

app.patch('/api/ingredients/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const checkQuery = 'SELECT agotado FROM Ingredientes WHERE id_insumo = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ingrediente no encontrado' });
    }
    const nuevoEstado = !checkResult.rows[0].agotado;
    const updateQuery = `
      UPDATE Ingredientes
      SET agotado = $1
      WHERE id_insumo = $2
      RETURNING id_insumo AS id, nombre AS name, stock_actual, agotado AS out
    `;
    const updateResult = await pool.query(updateQuery, [nuevoEstado, id]);

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Error al actualizar el ingrediente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Kitchen API running on http://localhost:${PORT}`)
})