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

  // Auto-scroll to bottom whenever messages or typing change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1500);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (onTyping) {
      onTyping(false);
    }

    onSendMessage(trimmed);
    setInputText('');
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setInputText((prev) => prev + emoji);
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
    <main className="chat-area">
      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-title">
          {onOpenSidebar && (
            <button
              type="button"
              className="menu-toggle-btn"
              onClick={onOpenSidebar}
              title="Abrir menú"
            >
              ☰
            </button>
          )}
          <span className="channel-hash">#</span>
          <h2>{roomName}</h2>
        </div>
        <div className="chat-header-actions">
          {onStartCall && (
            <>
              <button
                type="button"
                className="header-call-btn"
                onClick={() => onStartCall(false)}
                title="Llamada de voz"
              >
                📞
              </button>
              <button
                type="button"
                className="header-call-btn"
                onClick={() => onStartCall(true)}
                title="Videollamada"
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
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-messages">
            <div className="empty-icon">💬</div>
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
      <div className="typing-indicator-wrapper">
        {otherTypingUsers.length > 0 && (
          <div className="typing-indicator">
            <span className="typing-dots">
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

        <form onSubmit={handleSend} className="chat-form">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          />

          <button
            type="button"
            className="emoji-toggle-btn attach-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Adjuntar archivo"
          >
            📎
          </button>

          <button
            type="button"
            className="emoji-toggle-btn"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            title="Seleccionar emoji"
          >
            😊
          </button>

          <input
            type="text"
            className="chat-input"
            placeholder={`Enviar mensaje a #${roomName}...`}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />

          <button
            type="submit"
            className="send-btn"
            disabled={!inputText.trim()}
            title="Enviar mensaje"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
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
