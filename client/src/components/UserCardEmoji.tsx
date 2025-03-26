interface EmojiCountersProps {
  emojiCounts: [string, number][];
  isFloating: boolean;
}

export function EmojiCounters({ emojiCounts, isFloating }: EmojiCountersProps) {
  // Берем только топ-3 эмодзи для отображения
  const topEmojis = emojiCounts.slice(0, 3);
  
  // Количество скрытых эмодзи
  const hiddenEmojiCount = emojiCounts.length > 3 ? emojiCounts.length - 3 : 0;

  // Определение стилей для бейджиков с эмодзи
  const badgesClass = isFloating ? "emoji-counters float-badges" : "emoji-counters";

  if (emojiCounts.length === 0) return null;

  return (
    <div className={badgesClass}>
      {topEmojis.map(([emoji, count]) => (
        <span key={emoji} className="emoji-counter animate-subtle-pulse">
          <span className="text-base sm:text-lg">{emoji}</span>
          <span className="bg-gray-700 px-1.5 sm:px-2 py-0.5 rounded-full text-xs sm:text-sm">
            {count}
          </span>
        </span>
      ))}
      {hiddenEmojiCount > 0 && (
        <span className="emoji-counter">
          <span className="bg-gray-700 px-1.5 sm:px-2 py-0.5 rounded-full text-xs sm:text-sm" title="Другие эмодзи">
            +{hiddenEmojiCount}
          </span>
        </span>
      )}
    </div>
  );
} 