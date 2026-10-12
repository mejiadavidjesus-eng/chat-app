import React from 'react';

// Generates a consistent pastel color based on user string
const getAvatarColor = (name) => {
  if (!name) return '#6366f1';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#6366f1', '#ec4899', '#8b5cf6', '#10b981',
    '#f59e0b', '#06b6d4', '#3b82f6', '#ef4444'
  ];
  return colors[Math.abs(hash) % colors.length];
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return isNaN(date.getTime())
    ? timestamp
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Message = ({ message, isOwn }) => {
  const { user, text, timestamp, isSystem } = message;

  if (isSystem) {
    return (
      <div className="message-item system-message">
        <span className="system-text">{text}</span>
        {timestamp && <span className="message-time">{formatTime(timestamp)}</span>}
      </div>
    );
  }

  const avatarColor = getAvatarColor(user);
  const initial = user ? user.charAt(0).toUpperCase() : '?';

  const serverBaseUrl = typeof window !== 'undefined' && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `http://${window.location.hostname}:3001`
    : 'https://chat-app-server-gvw2.onrender.com';

  return (
    <div className={`message-item ${isOwn ? 'own-message' : 'other-message'}`}>
      {!isOwn && (
        <div
          className="message-avatar"
          style={{ backgroundColor: avatarColor }}
        >
          {initial}
        </div>
      )}

      <div className="message-content-wrapper">
        <div className="message-meta">
          <span className="message-author">{isOwn ? 'Tú' : user}</span>
          <span className="message-time">{formatTime(timestamp)}</span>
        </div>
        <div className="message-bubble">
          <p className="message-text">{text}</p>
          {message.fileUrl && (
            message.fileType?.startsWith('image/') ? (
              <img
                src={serverBaseUrl + message.fileUrl}
                alt={message.fileName}
                className="message-image"
              />
            ) : (
              <a
                href={serverBaseUrl + message.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="message-file-link"
              >
                📄 {message.fileName}
              </a>
            )
          )}
        </div>
      </div>

      {isOwn && (
        <div
          className="message-avatar own-avatar"
          style={{ backgroundColor: avatarColor }}
        >
          {initial}
        </div>
      )}
    </div>
  );
};

export default Message;
