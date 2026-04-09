import { describe, expect, it } from 'vitest';
import { compileValidationDsl, dslAll, dslAny, dslNot, dslRule, validateDsl } from './validation_dsl.js';

interface ValidationContext {
	readonly amount: number;
	readonly status: 'draft' | 'submitted';
}

describe('validation_dsl', () => {
	it('evaluates ALL groups and returns aggregated violations', () => {
		const node = dslAll<ValidationContext>(
			dslRule((context) => context.amount > 0, { code: 'amount.positive', message: 'Amount must be positive' }),
			dslRule((context) => context.status === 'submitted', {
				code: 'status.submitted',
				message: 'Status must be submitted',
			})
		);

		const result = validateDsl(node, { amount: 0, status: 'draft' });
		expect(result.valid).toBe(false);
		expect(result.violations.map((violation) => violation.code)).toEqual(['amount.positive', 'status.submitted']);
	});

	it('supports ANY groups with explicit violation override', () => {
		const node = dslAny<ValidationContext>(
			[
				dslRule((context) => context.amount >= 10, { code: 'amount.min10', message: 'Amount must be >= 10' }),
				dslRule((context) => context.status === 'submitted', {
					code: 'status.submitted',
					message: 'Status must be submitted',
				}),
			],
			{
				code: 'any.failed',
				message: 'At least one condition must pass',
			}
		);

		const result = validateDsl(node, { amount: 2, status: 'draft' });
		expect(result.valid).toBe(false);
		expect(result.violations).toEqual([
			{
				code: 'any.failed',
				message: 'At least one condition must pass',
			},
		]);
	});

	it('supports NOT and conditional rules', () => {
		const positiveRule = dslRule<ValidationContext>((context) => context.amount > 0, {
			code: 'amount.positive',
			message: 'Amount must be positive',
		});

		const mustNotBeDraft = dslNot(
			dslRule((context: ValidationContext) => context.status === 'draft', {
				code: 'status.draft',
				message: 'Status is draft',
			}),
			{ code: 'status.not_draft', message: 'Status cannot stay draft' }
		);

		const onlyWhenSubmitted = dslRule(
			(context: ValidationContext) => context.amount >= 5,
			{ code: 'amount.min5', message: 'Submitted amount must be >= 5' },
			(context) => context.status === 'submitted'
		);

		const tree = dslAll(positiveRule, mustNotBeDraft, onlyWhenSubmitted);
		const compiled = compileValidationDsl(tree);

		const draftResult = compiled({ amount: 1, status: 'draft' });
		expect(draftResult.valid).toBe(false);
		expect(draftResult.violations.map((violation) => violation.code)).toEqual(['status.not_draft']);

		const submittedResult = compiled({ amount: 6, status: 'submitted' });
		expect(submittedResult.valid).toBe(true);
	});

	it('returns explicit error for empty ANY', () => {
		const result = validateDsl(dslAny<ValidationContext>([]), { amount: 1, status: 'submitted' });
		expect(result.valid).toBe(false);
		expect(result.violations[0]?.code).toBe('dsl.any.empty');
	});
});
