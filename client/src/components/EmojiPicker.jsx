import React, { useEffect, useRef } from 'react';
import EmojiPickerReact, { Theme } from 'emoji-picker-react';

const EmojiPicker = ({ onSelectEmoji, darkMode, onClose }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleEmojiClick = (emojiData) => {
    if (emojiData && emojiData.emoji) {
      onSelectEmoji(emojiData.emoji);
    }
  };

  return (
    <div className="emoji-picker-container" ref={containerRef}>
      <EmojiPickerReact
        onEmojiClick={handleEmojiClick}
        theme={darkMode ? Theme.DARK : Theme.LIGHT}
        searchPlaceHolder="Buscar emoji..."
        lazyLoadEmojis={true}
        previewConfig={{ showPreview: false }}
        width={320}
        height={380}
      />
    </div>
  );
};

export default EmojiPicker;
