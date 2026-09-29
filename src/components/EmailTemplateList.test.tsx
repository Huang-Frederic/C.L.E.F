import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailTemplateList } from './EmailTemplateList';
import type { EmailTemplate } from '@/lib/types';

const templates: EmailTemplate[] = [{ titre: 'Contact avocat', corps: 'Bonjour Maître,' }];

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

describe('EmailTemplateList', () => {
  it('copies the template body to the clipboard', async () => {
    render(<EmailTemplateList templates={templates} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Copier' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Bonjour Maître,');
  });

  it('adds a new empty template', async () => {
    const onChange = vi.fn();
    render(<EmailTemplateList templates={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un modèle' }));
    expect(onChange).toHaveBeenCalledWith([{ titre: '', corps: '' }]);
  });
});
