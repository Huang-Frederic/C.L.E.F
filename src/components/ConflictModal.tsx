'use client';

interface ConflictModalProps {
  onReload: () => void;
  onForce: () => void;
}

export function ConflictModal({ onReload, onForce }: ConflictModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-ink/60">
      <div className="max-w-sm space-y-3 border-t-4 border-warn bg-paper p-4 sm:space-y-4 sm:p-6">
        <h2 className="font-serif text-base text-ink sm:text-lg">Conflit de sauvegarde</h2>
        <p className="text-xs text-ink-soft sm:text-sm">
          Quelqu&apos;un d&apos;autre a sauvegardé des changements entre-temps. Que veux-tu faire ?
        </p>
        <div className="flex flex-col justify-end gap-2 sm:flex-row sm:gap-3">
          <button
            onClick={onReload}
            className="border border-line px-3 py-2 text-xs text-ink-soft hover:border-ink-soft hover:text-ink sm:px-4 sm:text-sm"
          >
            Recharger la dernière version
          </button>
          <button
            onClick={onForce}
            className="bg-warn px-3 py-2 text-xs font-medium text-paper hover:bg-warn/90 sm:px-4 sm:text-sm"
          >
            Forcer l&apos;écrasement
          </button>
        </div>
      </div>
    </div>
  );
}
