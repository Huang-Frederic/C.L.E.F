'use client';

interface ConflictModalProps {
  onReload: () => void;
  onForce: () => void;
}

export function ConflictModal({ onReload, onForce }: ConflictModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="max-w-sm space-y-4 rounded-lg bg-white p-6">
        <h2 className="font-semibold">Conflit de sauvegarde</h2>
        <p className="text-sm">
          Quelqu&apos;un d&apos;autre a sauvegardé des changements entre-temps. Que veux-tu faire ?
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onReload} className="rounded border px-4 py-2">
            Recharger la dernière version
          </button>
          <button onClick={onForce} className="rounded bg-red-600 px-4 py-2 text-white">
            Forcer l&apos;écrasement
          </button>
        </div>
      </div>
    </div>
  );
}
