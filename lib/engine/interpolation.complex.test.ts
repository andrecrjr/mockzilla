import { describe, expect, it } from 'bun:test';
import { replaceTemplates } from './interpolation';

describe('replaceTemplates Complex Objects', () => {
  it('should interpolate Handlebars blocks inside nested objects', () => {
    const context = {
      state: { user_id: 1 },
      $: { headers: { 'x-role': 'admin' } },
      faker: { person: { fullName: () => 'John Doe' } },
      now: () => '2026-04-25T12:00:00Z'
    };

    const data = {
      user: "{{faker.person.fullName}}",
      permissions: "{{#if (eq $.headers.[x-role] 'admin')}}admin{{else}}user{{/if}}",
      debug: {
        time: "{{now}}"
      }
    };

    const result = replaceTemplates(data, context as Record<string, unknown>) as {
      user: string;
      permissions: string;
      debug: { time: string };
    };
    
    expect(result.user).toBe('John Doe');
    expect(result.permissions).toBe('admin');
    expect(result.debug.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
