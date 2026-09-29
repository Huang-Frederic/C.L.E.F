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
    render(<EmailTemplateList templates={templates} onSave={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Copier' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Bonjour Maître,');
  });

  it('adds a new empty template locally, without saving', async () => {
    const onSave = vi.fn();
    render(<EmailTemplateList templates={[]} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un modèle' }));
    expect(screen.getByLabelText('Titre du modèle 1')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  // Regression: fully-controlled inputs reverted every keystroke, so no email
  // template could be written at all.
  it('keeps every typed character and submits them on Enregistrer', async () => {
    const onSave = vi.fn();
    render(<EmailTemplateList templates={[{ titre: '', corps: '' }]} onSave={onSave} />);

    const titre = screen.getByLabelText('Titre du modèle 1');
    const corps = screen.getByLabelText('Corps du modèle 1');
    await userEvent.type(titre, 'Relance notaire');
    await userEvent.type(corps, 'Bonjour,');
    expect(titre).toHaveValue('Relance notaire');
    expect(corps).toHaveValue('Bonjour,');
    expect(onSave).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onSave).toHaveBeenCalledWith([{ titre: 'Relance notaire', corps: 'Bonjour,' }]);
  });

  it('resyncs when the templates prop changes externally (post-conflict reload)', async () => {
    const onSave = vi.fn();
    const { rerender } = render(<EmailTemplateList templates={templates} onSave={onSave} />);
    await userEvent.type(screen.getByLabelText('Titre du modèle 1'), 'X');

    rerender(<EmailTemplateList templates={[{ titre: 'Autre', corps: 'Corps' }]} onSave={onSave} />);

    expect(screen.getByLabelText('Titre du modèle 1')).toHaveValue('Autre');
  });
});
