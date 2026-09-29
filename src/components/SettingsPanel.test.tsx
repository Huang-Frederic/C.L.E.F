import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from './SettingsPanel';
import type { Settings } from '@/lib/types';

const settings: Settings = { objectifRentabilitePourcent: 6, tauxCreditParDefaut: 3, dureeCreditParDefautAnnees: 25 };

describe('SettingsPanel', () => {
  it('calls onChange with the updated objectif de rentabilité', async () => {
    const onChange = vi.fn();
    render(<SettingsPanel settings={settings} onChange={onChange} />);

    await userEvent.clear(screen.getByLabelText('Objectif rentabilité (%)'));
    await userEvent.type(screen.getByLabelText('Objectif rentabilité (%)'), '7');

    expect(onChange).toHaveBeenLastCalledWith({ ...settings, objectifRentabilitePourcent: 7 });
  });
});
