// Inicializar Emoji Mart de forma dinámica
import { init } from 'emoji-mart';

let emojiMartInitialized = false;

export const initializeEmojiMart = async () => {
    if (emojiMartInitialized) return;
    try {
        const data = await import('@emoji-mart/data');
        init({ data: data.default || data });
        emojiMartInitialized = true;
    } catch (e) {
        console.warn('Emoji Mart no pudo inicializarse:', e);
    }
};

// Inicializar en el montaje del módulo
if (typeof window !== 'undefined') {
    initializeEmojiMart();
}

