const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { initDb, saveMessage } = require('./db');
const roomsRouter = require('./routes/rooms');
const messagesRouter = require('./routes/messages');

// Inicializar base de datos SQLite
initDb();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

// Configuración de Multer para subida de archivos (límite 10MB)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Middlewares
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Servir archivos estáticos subidos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Endpoint de subida de archivos
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
  }

  res.json({
    fileUrl: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname,
    fileType: req.file.mimetype
  });
});

// Rutas REST
app.use('/api/rooms', roomsRouter);
app.use('/api/messages', messagesRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Configurar Socket.IO
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Almacén en memoria para trackear usuarios y su sala actual
// socket.id -> { username, currentRoom }
const activeSockets = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Cliente conectado: ${socket.id}`);

  // Unirse a una sala
  socket.on('join_room', ({ roomId, username }) => {
    if (!roomId || !username) return;

    const previousData = activeSockets.get(socket.id);
    if (previousData && previousData.currentRoom && previousData.currentRoom !== roomId) {
      socket.leave(previousData.currentRoom);
      socket.to(previousData.currentRoom).emit('user_left', {
        username: previousData.username,
        roomId: previousData.currentRoom,
        system: true
      });
    }

    socket.join(roomId);
    activeSockets.set(socket.id, { username, currentRoom: roomId });

    console.log(`[Socket.IO] ${username} se unió a la sala: ${roomId}`);

    // Notificar a los otros participantes de la sala
    socket.to(roomId).emit('user_joined', {
      username,
      roomId,
      system: true,
      message: `${username} se ha unido al chat`
    });
  });

  // Salir de una sala
  socket.on('leave_room', ({ roomId, username }) => {
    if (!roomId) return;
    socket.leave(roomId);
    activeSockets.delete(socket.id);

    socket.to(roomId).emit('user_left', {
      username,
      roomId,
      system: true,
      message: `${username} ha salido de la sala`
    });
  });

  // Enviar mensaje
  socket.on('send_message', ({ roomId, username, content, fileUrl, fileName, fileType }) => {
    const trimmedContent = content ? content.trim() : '';
    if (!roomId || !username || (!trimmedContent && !fileUrl)) return;

    try {
      // Persistir mensaje en SQLite
      const savedMsg = saveMessage({
        roomId,
        username: username.trim(),
        content: trimmedContent,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null
      });

      // Emitir el mensaje persistido a todos en la sala (incluyendo emisor)
      io.to(roomId).emit('receive_message', savedMsg);
    } catch (error) {
      console.error('[Socket.IO] Error al guardar mensaje:', error);
      socket.emit('message_error', { error: 'No se pudo enviar el mensaje' });
    }
  });

  // Indicador de "escribiendo..." (typing indicator)
  socket.on('typing_start', ({ roomId, username }) => {
    if (!roomId || !username) return;
    socket.to(roomId).emit('user_typing', {
      roomId,
      username,
      isTyping: true
    });
  });

  socket.on('typing_stop', ({ roomId, username }) => {
    if (!roomId || !username) return;
    socket.to(roomId).emit('user_typing', {
      roomId,
      username,
      isTyping: false
    });
  });

  // ===================== WebRTC Call Signaling =====================
  // Iniciar llamada en una sala
  socket.on('call_user', ({ userToCall, signalData, from, isVideo, roomId }) => {
    // Si viene dirigido a un socket específico
    if (userToCall) {
      io.to(userToCall).emit('incoming_call', {
        signal: signalData,
        from,
        fromSocketId: socket.id,
        isVideo,
        roomId
      });
    } else if (roomId) {
      // O emitir a la sala que alguien está llamando
      socket.to(roomId).emit('incoming_call', {
        signal: signalData,
        from,
        fromSocketId: socket.id,
        isVideo,
        roomId
      });
    }
  });

  // Responder a una llamada
  socket.on('answer_call', ({ toSocketId, signal }) => {
    io.to(toSocketId).emit('call_accepted', {
      signal,
      fromSocketId: socket.id
    });
  });

  // Finalizar llamada
  socket.on('end_call', ({ toSocketId, roomId }) => {
    if (toSocketId) {
      io.to(toSocketId).emit('call_ended');
    }
    if (roomId) {
      socket.to(roomId).emit('call_ended');
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    const userData = activeSockets.get(socket.id);
    if (userData && userData.currentRoom) {
      socket.to(userData.currentRoom).emit('user_left', {
        username: userData.username,
        roomId: userData.currentRoom,
        system: true,
        message: `${userData.username} se ha desconectado`
      });

      // Asegurar que si estaba escribiendo se limpie el estado
      socket.to(userData.currentRoom).emit('user_typing', {
        roomId: userData.currentRoom,
        username: userData.username,
        isTyping: false
      });
    }

    activeSockets.delete(socket.id);
    console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`[Servidor] Backend corriendo exitosamente en http://localhost:${PORT}`);
});
