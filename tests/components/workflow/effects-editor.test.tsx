import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { type EffectItem, EffectsEditor } from '../../../components/workflow/effects-editor';
import { TooltipProvider } from '../../../components/ui/tooltip';

describe('EffectsEditor', () => {
  afterEach(cleanup);

  it('renders "No effects" message when list is empty', () => {
    render(
      <TooltipProvider>
        <EffectsEditor effects={[]} onChange={() => {}} />
      </TooltipProvider>
    );
    expect(screen.getByText(/no effects defined yet/i)).toBeTruthy();
  });

  it('renders a list of effects', () => {
    const effects: EffectItem[] = [
      { type: 'state.set', raw: { key: 'value' } },
      { type: 'db.push', table: 'users', value: '{{input.body}}' }
    ];
    render(
      <TooltipProvider>
        <EffectsEditor effects={effects} onChange={() => {}} />
      </TooltipProvider>
    );
    
    expect(screen.getByText('state.set')).toBeTruthy();
    expect(screen.getByText('db.push')).toBeTruthy();
    expect(screen.getByText(/table: users/i)).toBeTruthy();
  });

  it('allows adding a key-value pair in state.set editor', async () => {
    const effects: EffectItem[] = [{ type: 'state.set', raw: {} }];
    
    render(
      <TooltipProvider>
        <EffectsEditor effects={effects} onChange={() => {}} />
      </TooltipProvider>
    );

    const addPairButton = screen.getByRole('button', { name: /add state/i });
    expect(addPairButton).toBeTruthy();
  });
});
