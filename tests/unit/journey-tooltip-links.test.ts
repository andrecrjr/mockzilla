import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Journey contextual help', () => {
	it('covers Journey creation fields with public documentation links', () => {
		const source = read('app/app/journeys/page.tsx');

		expect(source).toContain('TooltipProvider');
		expect(source).toContain('label="Name"');
		expect(source).toContain('label="Slug"');
		expect(source).toContain('label="Description"');
		expect(source).toContain('/docs/guides/creating-journeys');
	});

	it('covers Action authoring and runtime concepts with documentation links', () => {
		const source = read('app/app/journeys/[slug]/page.tsx');

		for (const label of [
			'Lifecycle tracks',
			'Carried Fields',
			'Requires',
			'Transitions',
			'Field writes',
			'Request runner',
			'Action name',
			'Method and path',
			'Response type',
			'Response headers',
			'Response body',
		]) {
			expect(source).toContain(`label="${label}"`);
		}

		expect(source).toContain('/docs/concepts/journeys#actions-move-the-story-forward');
		expect(source).toContain('/docs/guides/creating-journeys#3-add-actions');
	});

	it('keeps public Journey documentation aligned with the live runtime', () => {
		const concept = read('content/docs/concepts/journeys.mdx');
		const guide = read('content/docs/guides/creating-journeys.mdx');

		expect(concept).not.toContain('**Planned product:**');
		expect(guide).not.toContain('**Planned product:**');
		expect(concept).toContain('Journeys are live');
		expect(guide).toContain('request runner');
	});

	it('documents business-oriented Journey use cases beyond checkout', () => {
		const concept = read('content/docs/concepts/journeys.mdx');

		for (const useCase of [
			'B2B purchase approval',
			'Seller onboarding and compliance',
			'Insurance or warranty claim',
			'Subscription dunning',
			'Incident response',
			'Release governance',
		]) {
			expect(concept).toContain(useCase);
		}
		expect(concept).toContain('### Example: B2B purchase approval');
	});
});
