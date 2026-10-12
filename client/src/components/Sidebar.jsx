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
  onClose
}) => {
  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <div className="app-brand">
          <span className="brand-icon">⚡</span>
          <span className="brand-title">DevChat</span>
        </div>
        {onClose && (
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            title="Cerrar menú"
          >
            ✕
          </button>
        )}
      </div>

      <div className="sidebar-section">
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
                >
                  <span className="room-prefix">#</span>
                  <span className="room-name">{room.name}</span>
                  {room.badge && (
                    <span className="room-badge">{room.badge}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            {username ? username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{username}</span>
            <span className="user-status">En línea</span>
          </div>
        </div>

        <div className="sidebar-actions">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={onToggleDarkMode}
            title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          {onLogout && (
            <button
              type="button"
              className="logout-btn"
              onClick={onLogout}
              title="Cerrar sesión"
            >
              🚪
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
