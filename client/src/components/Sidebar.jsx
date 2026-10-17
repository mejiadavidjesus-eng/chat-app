import React from 'react';

const Sidebar = ({
  rooms,
  currentRoom,
  onSelectRoom,
  darkMode,
  onToggleDarkMode,
  username,
  onLogout,
  isOpen,
  onClose,
  installPrompt,
  onInstallApp
}) => {
  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`} aria-label="Menú principal de canales y opciones">
      <div className="sidebar-header">
        <div className="app-brand">
          <span className="brand-icon" aria-hidden="true">⚡</span>
          <span className="brand-title">DevChat</span>
        </div>
        {onClose && (
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            title="Cerrar menú"
            aria-label="Cerrar menú lateral"
          >
            ✕
          </button>
        )}
      </div>

      {installPrompt && (
        <div className="pwa-install-banner">
          <button
            type="button"
            className="pwa-install-btn"
            onClick={onInstallApp}
            aria-label="Instalar DevChat en el dispositivo"
          >
            <span aria-hidden="true">📲</span> Instalar como App
          </button>
        </div>
      )}

      <nav className="sidebar-section" aria-label="Lista de canales">
        <div className="section-title">CANALES</div>
        <ul className="room-list">
          {rooms.map((room) => {
            const isActive = currentRoom === room.id;
            return (
              <li key={room.id}>
                <button
                  type="button"
                  className={`room-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectRoom(room.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={`Canal ${room.name}`}
                >
                  <span className="room-prefix" aria-hidden="true">#</span>
                  <span className="room-name">{room.name}</span>
                  {room.badge && (
                    <span className="room-badge">{room.badge}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar" aria-hidden="true">
            {username ? username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{username}</span>
            <span className="user-status">
              <span className="status-dot" aria-hidden="true">●</span> En línea
            </span>
          </div>
        </div>

        <div className="sidebar-actions">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={onToggleDarkMode}
            title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            <span aria-hidden="true">{darkMode ? '☀️' : '🌙'}</span>
          </button>
          {onLogout && (
            <button
              type="button"
              className="logout-btn"
              onClick={onLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión y cambiar apodo"
            >
              <span aria-hidden="true">🚪</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
