interface ShakeButtonProps {
  onClick: (e: React.MouseEvent) => void;
}

export function ShakeButton({ onClick }: ShakeButtonProps) {
  return (
    <button 
      className="shake-button"
      onClick={onClick}
      aria-label="Оттряхнуть эмодзи"
    >
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4l2 2l-2 2l2 2l-2 2l2 2l-2 2l2 2l-2 2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M12 4l2 2l-2 2l2 2l-2 2l2 2l-2 2l2 2l-2 2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M20 4l2 2l-2 2l2 2l-2 2l2 2l-2 2l2 2l-2 2" stroke="currentColor" strokeWidth="2" fill="none"/>
      </svg>
      <span className="shake-button-tooltip">Оттряхнуть эмодзи</span>
    </button>
  );
} 