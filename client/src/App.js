import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import socket from './socket';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import Login from './components/Login';

const ROOMS = [
  { id: 'general', name: 'General', description: 'Canal principal para charlar de todo un poco' },
  { id: 'random', name: 'Random', description: 'Memes, historias random y diversión' },
  { id: 'tech', name: 'Tech', description: 'Programación, gadgets, IA y tecnología' },
];

export const getApiBaseUrl = () => {
  if (process.env.REACT_APP_SOCKET_URL) return process.env.REACT_APP_SOCKET_URL;
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://${window.location.hostname}:3001`;
    }
  }
  return 'https://chat-app-server-gvw2.onrender.com';
};

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roomMessages, setRoomMessages] = useState({
    general: [],
    random: [],
    tech: [],
  });
  const [typingUsers, setTypingUsers] = useState([]);

  // Aplicar tema en el body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  // Agregar mensaje al estado local por sala
  const appendMessage = useCallback((room, message) => {
    setRoomMessages((prev) => ({
      ...prev,
      [room]: [...(prev[room] || []), message],
    }));
  }, []);

  // Cargar historial de mensajes de la sala desde la API REST
  const fetchHistory = useCallback(async (roomId) => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/messages/${roomId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRoomMessages((prev) => ({
            ...prev,
            [roomId]: data.map((msg) => ({
              id: msg.id,
              user: msg.username,
              text: msg.content,
              timestamp: msg.createdAt || new Date().toISOString(),
              isSystem: false,
              fileUrl: msg.fileUrl || null,
              fileName: msg.fileName || null,
              fileType: msg.fileType || null,
            })),
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  }, []);

  // Manejo de conexión y eventos de socket
  useEffect(() => {
    if (!user) return;

    if (!socket.connected) {
      socket.connect();
    }

    // Unirse a la sala actual
    socket.emit('join_room', { roomId: currentRoom, username: user });

    // Cargar historial
    fetchHistory(currentRoom);

    // Mensaje recibido del servidor (el backend devuelve { id, roomId, username, content, createdAt })
    const handleMessage = (data) => {
      const targetRoom = data.roomId || currentRoom;
      appendMessage(targetRoom, {
        id: data.id || `${Date.now()}-${Math.random()}`,
        user: data.username || 'Anónimo',
        text: data.content || '',
        timestamp: data.createdAt || new Date().toISOString(),
        isSystem: false,
        fileUrl: data.fileUrl || null,
        fileName: data.fileName || null,
        fileType: data.fileType || null,
      });
    };

    // Indicador de escribiendo
    const handleTyping = (data) => {
      if (data.roomId && data.roomId !== currentRoom) return;
      const username = data.username;
      if (!username || username === user) return;

      if (data.isTyping) {
        setTypingUsers((prev) => (prev.includes(username) ? prev : [...prev, username]));
      } else {
        setTypingUsers((prev) => prev.filter((u) => u !== username));
      }
    };

    // Notificaciones de usuario conectado/desconectado
    const handleUserJoined = (data) => {
      const username = data.username;
      if (username && username !== user) {
        appendMessage(data.roomId || currentRoom, {
          id: `sys-${Date.now()}-${Math.random()}`,
          text: `${username} se unió a la sala`,
          isSystem: true,
          timestamp: new Date().toISOString(),
        });
      }
    };

    const handleUserLeft = (data) => {
      const username = data.username;
      if (username) {
        appendMessage(data.roomId || currentRoom, {
          id: `sys-${Date.now()}-${Math.random()}`,
          text: `${username} salió de la sala`,
          isSystem: true,
          timestamp: new Date().toISOString(),
        });
        // Also remove from typing
        setTypingUsers((prev) => prev.filter((u) => u !== username));
      }
    };

    socket.on('receive_message', handleMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);

    return () => {
      socket.off('receive_message', handleMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
    };
  }, [user, currentRoom, appendMessage, fetchHistory]);

  // Cambiar de canal
  const handleSelectRoom = (newRoomId) => {
    if (newRoomId === currentRoom) return;

    if (socket.connected && user) {
      socket.emit('leave_room', { roomId: currentRoom, username: user });
    }

    setCurrentRoom(newRoomId);
    setTypingUsers([]);
    setSidebarOpen(false);
  };

  // Enviar mensaje — NO agregar optimísticamente, esperar la respuesta del servidor
  const handleSendMessage = (text) => {
    if (!text.trim() || !user) return;

    if (socket.connected) {
      socket.emit('send_message', {
        roomId: currentRoom,
        username: user,
        content: text,
      });
    }
  };

  const handleSendFile = async (file) => {
    if (!file || !user) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const { fileUrl, fileName, fileType } = await res.json();
        if (socket.connected) {
          socket.emit('send_message', {
            roomId: currentRoom,
            username: user,
            content: `📎 ${fileName}`,
            fileUrl,
            fileName,
            fileType,
          });
        }
      }
    } catch (err) {
      console.error('Error uploading file:', err);
    }
  };

  // Manejar typing
  const handleTypingNotification = (isTyping) => {
    if (socket.connected && user) {
      if (isTyping) {
        socket.emit('typing_start', {
          roomId: currentRoom,
          username: user,
        });
      } else {
        socket.emit('typing_stop', {
          roomId: currentRoom,
          username: user,
        });
      }
    }
  };

  // Cerrar sesión
  const handleLogout = () => {
    if (socket.connected) {
      socket.emit('leave_room', { roomId: currentRoom, username: user });
      socket.disconnect();
    }
    setUser(null);
  };

  // Login handler
  const handleLogin = (nickname) => {
    setUser(nickname);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const activeRoomObj = ROOMS.find((r) => r.id === currentRoom) || ROOMS[0];
  const currentMessages = roomMessages[currentRoom] || [];

  return (
    <div className="app-container">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar
        rooms={ROOMS}
        currentRoom={currentRoom}
        onSelectRoom={handleSelectRoom}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        username={user}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <ChatArea
        roomName={activeRoomObj.name}
        roomDescription={activeRoomObj.description}
        messages={currentMessages}
        currentUser={user}
        typingUsers={typingUsers}
        onSendMessage={handleSendMessage}
        onSendFile={handleSendFile}
        onTyping={handleTypingNotification}
        darkMode={darkMode}
        onOpenSidebar={() => setSidebarOpen(true)}
      />
    </div>
  );
}

export default App;
