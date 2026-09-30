'use client';

import Link from 'next/link';
import type { Bien, ReferentielLoyer, Settings } from '@/lib/types';
import {
  calculMensualiteCredit,
  calculMensualiteBreakeven,
  calculRentabiliteNettePourcent,
  calculMaxEncheres,
  trouverLoyerM2,
} from '@/lib/calculations';

interface BienTableProps {
  biens: Bien[];
  referentielLoyers: ReferentielLoyer[];
  settings: Settings;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const UNKNOWN_RENT = 'loyer inconnu';

/** Computed once per bien and shared by the desktop table and the mobile card list. */
function computeRow(bien: Bien, referentielLoyers: ReferentielLoyer[], settings: Settings) {
  const loyerM2 = trouverLoyerM2(bien, referentielLoyers);
  const rentabilite = loyerM2 === null ? null : calculRentabiliteNettePourcent(bien, referentielLoyers);
  const audessusObjectif = rentabilite !== null && rentabilite >= settings.objectifRentabilitePourcent;
  const accentClass = rentabilite === null ? 'border-line' : audessusObjectif ? 'border-accent' : 'border-warn';
  const rentabiliteClass = rentabilite === null ? 'text-ink' : audessusObjectif ? 'text-accent-dark' : 'text-warn';
  return {
    bien,
    loyerM2,
    rentabilite,
    accentClass,
    rentabiliteClass,
    mensualite: `${calculMensualiteCredit(bien).toFixed(2)} €`,
    breakeven: loyerM2 === null ? null : `${calculMensualiteBreakeven(bien, referentielLoyers).toFixed(2)} €`,
    rentabiliteLabel: rentabilite === null ? null : `${rentabilite.toFixed(2)}%`,
    maxEncheres:
      loyerM2 === null
        ? null
        : `${calculMaxEncheres(bien, referentielLoyers, settings.objectifRentabilitePourcent).toFixed(0)} €`,
  };
}

function ListingLink({ href }: { href: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Voir l'annonce"
      className="ml-2 text-ink-soft hover:text-accent"
    >
      ↗
    </a>
  );
}

export function BienTable({ biens, referentielLoyers, settings, onDelete, onAdd }: BienTableProps) {
  const rows = biens.map((bien) => computeRow(bien, referentielLoyers, settings));

  return (
    <div className="p-3 sm:p-8">
      <div className="mb-3 flex items-end justify-between border-b border-line pb-2 sm:mb-6 sm:pb-4">
        <h1 className="font-serif text-lg text-ink sm:text-2xl">Biens</h1>
        <button
          onClick={onAdd}
          className="bg-accent px-3 py-1.5 text-xs font-medium text-paper transition-colors hover:bg-accent-dark sm:px-4 sm:py-2 sm:text-sm"
        >
          Ajouter un bien
        </button>
      </div>

      {/* Below md, a data-dense multi-column table stops being scannable (headers
          wrap, cells clip) — a stacked card per bien reads far better on a phone.
          Kept tight (small text/padding) so several biens fit on screen at once. */}
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <div key={row.bien.id} className={`border-l-4 ${row.accentClass} border-y border-r border-line bg-paper-raised p-2.5`}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <div>
                <span className="font-serif text-sm text-ink">{row.bien.lieu}</span>
                <ListingLink href={row.bien.lienAnnonce} />
                <span className="ml-2 text-xs text-ink-soft">{row.bien.typePiece}</span>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-y-0.5 text-xs">
              <dt className="text-ink-soft">Mensualité</dt>
              <dd className="text-right font-mono tabular-nums text-ink">{row.mensualite}</dd>
              <dt className="text-ink-soft">Breakeven</dt>
              <dd className="text-right font-mono tabular-nums text-ink">
                {row.breakeven ?? <span className="font-sans text-ink-soft">{UNKNOWN_RENT}</span>}
              </dd>
              <dt className="text-ink-soft">Rentabilité nette</dt>
              <dd className={`text-right font-mono tabular-nums ${row.rentabiliteClass}`}>
                {row.rentabiliteLabel ?? <span className="font-sans text-ink-soft">{UNKNOWN_RENT}</span>}
              </dd>
              <dt className="text-ink-soft">Max enchères</dt>
              <dd className="text-right font-mono tabular-nums text-ink">
                {row.maxEncheres ?? <span className="font-sans text-ink-soft">{UNKNOWN_RENT}</span>}
              </dd>
            </dl>
            <div className="mt-1.5 flex justify-end gap-3 border-t border-line pt-1">
              <Link href={`/biens/${row.bien.id}`} className="text-xs text-ink-soft hover:text-accent hover:underline">
                Modifier
              </Link>
              <button onClick={() => onDelete(row.bien.id)} className="text-xs text-warn hover:underline">
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/20 text-left text-ink-soft">
              <th className="py-2 pr-2 font-normal">Lieu</th>
              <th className="py-2 pr-2 font-normal">Type</th>
              <th className="py-2 pr-2 text-right font-normal">Mensualité crédit</th>
              <th className="py-2 pr-2 text-right font-normal">Breakeven</th>
              <th className="py-2 pr-2 text-right font-normal">Rentabilité nette</th>
              <th className="py-2 pr-2 text-right font-normal">Max enchères</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.bien.id} className="border-b border-line">
                <td className={`border-l-4 ${row.accentClass} py-3 pl-3 pr-2`}>
                  <span className="text-ink">{row.bien.lieu}</span>
                  <ListingLink href={row.bien.lienAnnonce} />
                </td>
                <td className="py-3 pr-2 text-ink-soft">{row.bien.typePiece}</td>
                <td className="py-3 pr-2 text-right font-mono tabular-nums text-ink">{row.mensualite}</td>
                <td className="py-3 pr-2 text-right font-mono tabular-nums text-ink">
                  {row.breakeven ?? <span className="font-sans text-ink-soft">{UNKNOWN_RENT}</span>}
                </td>
                <td className={`py-3 pr-2 text-right font-mono tabular-nums ${row.rentabiliteClass}`}>
                  {row.rentabiliteLabel ?? <span className="font-sans text-ink-soft">{UNKNOWN_RENT}</span>}
                </td>
                <td className="py-3 pr-2 text-right font-mono tabular-nums text-ink">
                  {row.maxEncheres ?? <span className="font-sans text-ink-soft">{UNKNOWN_RENT}</span>}
                </td>
                <td className="py-3 pl-2 text-right">
                  <Link
                    href={`/biens/${row.bien.id}`}
                    className="mr-3 text-xs text-ink-soft hover:text-accent hover:underline"
                  >
                    Modifier
                  </Link>
                  <button onClick={() => onDelete(row.bien.id)} className="text-xs text-warn hover:underline">
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
