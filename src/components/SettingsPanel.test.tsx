import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from './SettingsPanel';
import type { Settings } from '@/lib/types';

const settings: Settings = { objectifRentabilitePourcent: 6, tauxCreditParDefaut: 3, dureeCreditParDefautAnnees: 25 };

describe('SettingsPanel', () => {
  it('reports the updated objectif de rentabilité on explicit save only', async () => {
    const onSave = vi.fn();
    render(<SettingsPanel settings={settings} onSave={onSave} />);

    await userEvent.clear(screen.getByLabelText('Objectif rentabilité (%)'));
    await userEvent.type(screen.getByLabelText('Objectif rentabilité (%)'), '7');
    expect(onSave).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer les paramètres' }));
    expect(onSave).toHaveBeenCalledWith({ ...settings, objectifRentabilitePourcent: 7 });
  });

  it('discards a stale unsaved edit and resyncs when the settings prop changes externally (e.g. a post-conflict reload)', async () => {
    const onSave = vi.fn();
    const { rerender } = render(<SettingsPanel settings={settings} onSave={onSave} />);

    // Simulate the user typing an edit that never gets saved (e.g. save() 409-conflicts).
    await userEvent.clear(screen.getByLabelText('Objectif rentabilité (%)'));
    await userEvent.type(screen.getByLabelText('Objectif rentabilité (%)'), '9');
    expect(screen.getByLabelText('Objectif rentabilité (%)')).toHaveValue(9);

    // Simulate a reload: the parent hands down a fresh settings object from the server,
    // without remounting SettingsPanel.
    const reloaded: Settings = { ...settings, objectifRentabilitePourcent: 42 };
    rerender(<SettingsPanel settings={reloaded} onSave={onSave} />);

    expect(screen.getByLabelText('Objectif rentabilité (%)')).toHaveValue(42);
  });
});
