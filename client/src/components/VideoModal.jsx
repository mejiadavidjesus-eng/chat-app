import React, { useEffect, useRef } from 'react';

const VideoModal = ({
  callState, // 'calling' | 'incoming' | 'connected'
  localStream,
  remoteStream,
  callerName,
  isVideo,
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onAcceptCall,
  onEndCall,
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!callState) return null;

  return (
    <div className="video-modal-backdrop">
      <div className="video-modal-container">
        {/* Encabezado */}
        <div className="video-modal-header">
          <div className="call-info">
            <span className="call-icon">{isVideo ? '📹' : '📞'}</span>
            <h3>
              {callState === 'calling' && `Llamando a ${callerName || 'la sala'}...`}
              {callState === 'incoming' && `Llamada entrante de ${callerName}`}
              {callState === 'connected' && `En llamada con ${callerName || 'Participante'}`}
            </h3>
          </div>
          {callState === 'connected' && (
            <span className="call-badge-live">● EN VIVO</span>
          )}
        </div>

        {/* Área de Video o Audio */}
        <div className="video-streams-grid">
          {/* Video / Audio Remoto */}
          <div className="stream-card remote-stream-card">
            {isVideo && remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="stream-video"
              />
            ) : (
              <div className="audio-avatar-card">
                <div className="pulse-avatar">
                  {callerName ? callerName.charAt(0).toUpperCase() : 'U'}
                </div>
                <p>{callerName || 'Esperando conexión...'}</p>
                <audio ref={remoteVideoRef} autoPlay playsInline />
              </div>
            )}
          </div>

          {/* Mi Video en miniatura */}
          {isVideo && localStream && (
            <div className="stream-card local-stream-card">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="stream-video local-video"
              />
              <span className="stream-tag">Tú {isVideoOff ? '(Cámara apagada)' : ''}</span>
            </div>
          )}
        </div>

        {/* Controles de la llamada */}
        <div className="video-modal-controls">
          {callState === 'incoming' ? (
            <div className="incoming-buttons">
              <button
                type="button"
                className="call-btn accept-btn"
                onClick={onAcceptCall}
                title="Aceptar llamada"
              >
                📞 Aceptar
              </button>
              <button
                type="button"
                className="call-btn decline-btn"
                onClick={onEndCall}
                title="Rechazar llamada"
              >
                ✕ Rechazar
              </button>
            </div>
          ) : (
            <div className="active-call-buttons">
              <button
                type="button"
                className={`control-circle-btn ${isMuted ? 'btn-danger' : ''}`}
                onClick={onToggleMute}
                title={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
              >
                {isMuted ? '🔇' : '🎙️'}
              </button>

              {isVideo && (
                <button
                  type="button"
                  className={`control-circle-btn ${isVideoOff ? 'btn-danger' : ''}`}
                  onClick={onToggleVideo}
                  title={isVideoOff ? 'Encender cámara' : 'Apagar cámara'}
                >
                  {isVideoOff ? '🚫' : '📷'}
                </button>
              )}

              <button
                type="button"
                className="control-circle-btn end-call-btn"
                onClick={onEndCall}
                title="Terminar llamada"
              >
                🔴
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoModal;
