import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { EffectsEditor } from '../../../components/workflow/effects-editor';
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
    const effects = [
      { type: 'state.set', raw: { key: 'value' } },
      { type: 'db.push', table: 'users', value: '{{input.body}}' }
    ];
    render(
      <TooltipProvider>
        <EffectsEditor effects={effects as any} onChange={() => {}} />
      </TooltipProvider>
    );
    
    expect(screen.getByText('state.set')).toBeTruthy();
    expect(screen.getByText('db.push')).toBeTruthy();
    expect(screen.getByText(/table: users/i)).toBeTruthy();
  });

  it('allows adding a key-value pair in state.set editor', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const effects = [{ type: 'state.set', raw: {} }];
    
    render(
      <TooltipProvider>
        <EffectsEditor effects={effects as any} onChange={() => {}} />
      </TooltipProvider>
    );

    // This button should exist in the new structured editor
    const addPairButton = screen.queryByRole('button', { name: /add variable/i });
    // In current implementation it doesn't exist, so this will fail if I expect it to be truthy
    expect(addPairButton).toBeTruthy();
  });
});
