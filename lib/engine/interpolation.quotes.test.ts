import { describe, expect, it } from 'bun:test';
import { replaceTemplates } from './interpolation';

describe('replaceTemplates Nested Quotes', () => {
  it('should handle Handlebars with quotes inside an object', () => {
    const context = {
      $: { headers: { 'x-role': 'admin' } }
    };

    const data = {
      permissions: "{{#if (eq $.headers.[x-role] 'admin')}}admin{{else}}user{{/if}}"
    };

    const result = replaceTemplates(data, context as any) as any;
    expect(result.permissions).toBe('admin');
  });
});
