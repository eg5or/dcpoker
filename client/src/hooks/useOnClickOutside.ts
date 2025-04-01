import { RefObject, useEffect } from 'react';

// Хук для обработки кликов вне указанного элемента
export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // Если не указан ref или событие произошло внутри элемента, ничего не делаем
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }

      handler(event);
    };

    // Добавляем обработчики событий
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    // Удаляем обработчики при размонтировании
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
} 