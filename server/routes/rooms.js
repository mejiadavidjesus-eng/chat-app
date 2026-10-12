const express = require('express');
const router = express.Router();
const { getRooms, getRoomById } = require('../db');

// Obtener todas las salas
router.get('/', (req, res) => {
  try {
    const rooms = getRooms();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las salas', details: error.message });
  }
});

// Obtener detalles de una sala específica
router.get('/:id', (req, res) => {
  try {
    const room = getRoomById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Sala no encontrada' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la sala', details: error.message });
  }
});

module.exports = router;
