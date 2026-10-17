import React, { useState, useEffect, useRef } from 'react';
import Message from './Message';
import EmojiPicker from './EmojiPicker';

const ChatArea = ({
  roomName,
  roomDescription,
  messages,
  currentUser,
  typingUsers,
  onSendMessage,
  onSendFile,
  onTyping,
  darkMode,
  onOpenSidebar,
  onStartCall
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom whenever messages or typing change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);

    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    onSendMessage(trimmed);
    setInputText('');
    setShowEmojiPicker(false);

    if (onTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping(false);
    }

    // Regresar el foco al input
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onSendFile) {
      onSendFile(file);
    }
    e.target.value = '';
  };

  // Filter out current user from typing notification
  const otherTypingUsers = (typingUsers || []).filter(
    (u) => u && u.toLowerCase() !== (currentUser || '').toLowerCase()
  );

  return (
    <main className="chat-area" aria-label={`Área de mensajes del canal ${roomName}`}>
      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-title">
          {onOpenSidebar && (
            <button
              type="button"
              className="menu-toggle-btn"
              onClick={onOpenSidebar}
              title="Abrir menú de canales"
              aria-label="Abrir menú lateral de canales"
            >
              ☰
            </button>
          )}
          <span className="channel-hash" aria-hidden="true">#</span>
          <h2>{roomName}</h2>
        </div>
        <div className="chat-header-actions">
          {onStartCall && (
            <>
              <button
                type="button"
                className="header-call-btn"
                onClick={() => onStartCall(false)}
                title="Iniciar llamada de voz"
                aria-label="Iniciar llamada de voz"
              >
                📞
              </button>
              <button
                type="button"
                className="header-call-btn"
                onClick={() => onStartCall(true)}
                title="Iniciar videollamada"
                aria-label="Iniciar videollamada con cámara"
              >
                📹
              </button>
            </>
          )}
          {roomDescription && (
            <p className="chat-header-desc">{roomDescription}</p>
          )}
        </div>
      </header>

      {/* Messages View */}
      <div className="messages-container" role="log" aria-live="polite" aria-label="Historial de mensajes">
        {messages.length === 0 ? (
          <div className="empty-messages">
            <div className="empty-icon" aria-hidden="true">💬</div>
            <h3>¡Bienvenido a #{roomName}!</h3>
            <p>Este es el inicio de la sala. ¡Envía el primer mensaje!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <Message
              key={msg.id || index}
              message={msg}
              isOwn={msg.user?.toLowerCase() === currentUser?.toLowerCase()}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      <div className="typing-indicator-wrapper" aria-live="polite">
        {otherTypingUsers.length > 0 && (
          <div className="typing-indicator">
            <span className="typing-dots" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span className="typing-text">
              {otherTypingUsers.length === 1
                ? `${otherTypingUsers[0]} está escribiendo...`
                : `${otherTypingUsers.join(', ')} están escribiendo...`}
            </span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="chat-input-wrapper">
        {showEmojiPicker && (
          <EmojiPicker
            darkMode={darkMode}
            onSelectEmoji={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}

        <form onSubmit={handleSend} className="chat-form" aria-label="Formulario para enviar mensaje">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
            aria-hidden="true"
          />

          <button
            type="button"
            className="emoji-toggle-btn attach-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Adjuntar archivo o imagen"
            aria-label="Adjuntar archivo o imagen"
          >
            📎
          </button>

          <button
            type="button"
            className="emoji-toggle-btn"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            title="Seleccionar emoji"
            aria-label="Abrir selector de emojis"
            aria-expanded={showEmojiPicker}
          >
            😊
          </button>

          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder={`Enviar mensaje a #${roomName}...`}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            aria-label={`Mensaje para #${roomName}`}
            autoComplete="off"
          />

          <button
            type="submit"
            className="send-btn"
            disabled={!inputText.trim()}
            title="Enviar mensaje"
            aria-label="Enviar mensaje"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </main>
  );
};

export default ChatArea;
