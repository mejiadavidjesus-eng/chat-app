const express = require('express');
const router = express.Router();
const { getMessagesByRoom, saveMessage } = require('../db');

// Obtener historial de mensajes de una sala
router.get('/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 100;
    const messages = getMessagesByRoom(roomId, limit);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mensajes', details: error.message });
  }
});

// Endpoint opcional para enviar mensaje vía REST
router.post('/', (req, res) => {
  try {
    const { roomId, username, content, fileUrl, fileName, fileType } = req.body;
    if (!roomId || !username || (!content && !fileUrl)) {
      return res.status(400).json({ error: 'roomId, username y content o fileUrl son obligatorios' });
    }

    const newMessage = saveMessage({ roomId, username, content, fileUrl, fileName, fileType });
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar el mensaje', details: error.message });
  }
});

module.exports = router;
