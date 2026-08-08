import type { Popup, PopupType } from '@/types';

interface ScreenPopupProps {
  popup: Popup | null;
  onClose: () => void;
}

function ScreenPopup({ popup, onClose }: ScreenPopupProps) {
  if (!popup) return null;

  const theme: Record<PopupType, string> = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-amber-600'
  };

  return (
    <div className="fixed top-4 right-4 z-[100] max-w-sm w-full">
      <div className={`${theme[popup.type] || theme.info} text-white rounded-lg shadow-xl p-4`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm whitespace-pre-line">{popup.message}</p>
          <button
            onClick={onClose}
            className="text-white/90 hover:text-white text-sm font-bold"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScreenPopup;
