import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import socket from './socket';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import Login from './components/Login';
import VideoModal from './components/VideoModal';

// Fallback configuration for STUN servers
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

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

  // ================= WebRTC Call State =================
  const [callState, setCallState] = useState(null); // null | 'calling' | 'incoming' | 'connected'
  const [callerName, setCallerName] = useState('');
  const [callerSocketId, setCallerSocketId] = useState('');
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [incomingSignal, setIncomingSignal] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

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

  // ================= Limpieza de llamadas =================
  const cleanupCall = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState(null);
    setCallerName('');
    setCallerSocketId('');
    setIncomingSignal(null);
    setIsMuted(false);
    setIsVideoOff(false);
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

    // Mensaje recibido del servidor
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
        setTypingUsers((prev) => prev.filter((u) => u !== username));
      }
    };

    // WebRTC Signaling listeners
    const handleIncomingCall = ({ signal, from, fromSocketId, isVideo }) => {
      setCallerName(from);
      setCallerSocketId(fromSocketId);
      setIsVideoCall(isVideo);
      setIncomingSignal(signal);
      setCallState('incoming');
    };

    const handleCallAccepted = async ({ signal }) => {
      if (pcRef.current && signal) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
          setCallState('connected');
        } catch (err) {
          console.error('Error setting remote description:', err);
        }
      }
    };

    const handleCallEnded = () => {
      cleanupCall();
    };

    socket.on('receive_message', handleMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('call_ended', handleCallEnded);

    return () => {
      socket.off('receive_message', handleMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('call_ended', handleCallEnded);
    };
  }, [user, currentRoom, appendMessage, fetchHistory, cleanupCall]);

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

  // Enviar mensaje
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

  // ===================== WebRTC Call Actions =====================
  const handleStartCall = async (video) => {
    try {
      setIsVideoCall(video);
      setCallState('calling');
      setCallerName(`#${currentRoom}`);

      const stream = await navigator.mediaDevices.getUserMedia({
        video,
        audio: true,
      });

      setLocalStream(stream);
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          setCallState('connected');
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate === null && pc.localDescription) {
          // Finished gathering ICE candidates
          socket.emit('call_user', {
            roomId: currentRoom,
            signalData: pc.localDescription,
            from: user,
            isVideo: video,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
    } catch (err) {
      console.error('Error starting call:', err);
      alert('No se pudo acceder al micrófono o cámara. Verifica los permisos de tu navegador.');
      cleanupCall();
    }
  };

  const handleAcceptCall = async () => {
    try {
      setCallState('connected');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCall,
        audio: true,
      });

      setLocalStream(stream);
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate === null && pc.localDescription) {
          socket.emit('answer_call', {
            toSocketId: callerSocketId,
            signal: pc.localDescription,
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(incomingSignal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
    } catch (err) {
      console.error('Error accepting call:', err);
      cleanupCall();
    }
  };

  const handleEndCall = () => {
    if (socket.connected) {
      socket.emit('end_call', {
        toSocketId: callerSocketId,
        roomId: currentRoom,
      });
    }
    cleanupCall();
  };

  const handleToggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Cerrar sesión
  const handleLogout = () => {
    if (socket.connected) {
      socket.emit('leave_room', { roomId: currentRoom, username: user });
      socket.disconnect();
    }
    cleanupCall();
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
        onStartCall={handleStartCall}
      />

      {/* Modal / Panel de Llamada y Videollamada */}
      <VideoModal
        callState={callState}
        localStream={localStream}
        remoteStream={remoteStream}
        callerName={callerName}
        isVideo={isVideoCall}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onAcceptCall={handleAcceptCall}
        onEndCall={handleEndCall}
      />
    </div>
  );
}

export default App;
