import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError('Por favor, ingresa un apodo.');
      return;
    }
    if (trimmed.length < 2) {
      setError('El apodo debe tener al menos 2 caracteres.');
      return;
    }
    setError('');
    onLogin(trimmed);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-badge">💬</div>
          <h2>¡Bienvenido al Chat!</h2>
          <p>Únete a la conversación en tiempo real con canales temáticos.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="nickname">Tu apodo / nickname</label>
            <input
              id="nickname"
              type="text"
              placeholder="Ej. CyberGamer, Alex..."
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              maxLength={25}
            />
            {error && <span className="login-error">{error}</span>}
          </div>

          <button type="submit" className="login-button">
            Comenzar a chatear 🚀
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
