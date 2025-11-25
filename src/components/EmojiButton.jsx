// Componente helper para renderizar emojis de manera consistente
const EmojiButton = ({ emoji, size = 24, className = '', onClick }) => {
    // Usar emoji nativo con mejor renderizado
    // Asegurar que los modificadores de tono de piel se rendericen correctamente
    return (
        <button
            onClick={onClick}
            className={className}
            style={{
                fontSize: `${size}px`,
                lineHeight: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale'
            }}
        >
            <span
                style={{
                    display: 'inline-block',
                    width: `${size}px`,
                    height: `${size}px`,
                    textAlign: 'center',
                    lineHeight: `${size}px`
                }}
            >
                {emoji}
            </span>
        </button>
    );
};

export default EmojiButton;

