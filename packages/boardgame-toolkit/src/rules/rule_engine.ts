export type RuleSeverity = 'error' | 'warning';

export interface RuleViolation {
	readonly code: string;
	readonly message: string;
	readonly severity?: RuleSeverity;
	readonly path?: string;
	readonly details?: unknown;
}

export interface RuleContext<TState, TCommand> {
	readonly state: TState;
	readonly command: TCommand;
}

export type RuleResult = RuleViolation | readonly RuleViolation[] | null | undefined;

export type Rule<TState, TCommand> = (context: RuleContext<TState, TCommand>) => RuleResult;

export interface ValidationResult {
	readonly valid: boolean;
	readonly violations: readonly RuleViolation[];
}

export interface RuleEngineApplyOptions {
	readonly allowWarnings?: boolean;
}

export interface RuleEngineApplyResult<TState> {
	readonly accepted: boolean;
	readonly state: TState;
	readonly violations: readonly RuleViolation[];
}

const normalizeRuleResult = (result: RuleResult): RuleViolation[] => {
	if (!result) {
		return [];
	}

	const violations = Array.isArray(result) ? [...result] : [result];

	for (const violation of violations) {
		if (!violation.code || !violation.message) {
			throw new TypeError('Rule violations must define code and message');
		}
	}

	return violations;
};

export class RuleEngine<TState, TCommand> {
	private readonly rules: Rule<TState, TCommand>[];

	constructor(
		private readonly reducer: (state: TState, command: TCommand) => TState,
		rules: readonly Rule<TState, TCommand>[] = []
	) {
		this.rules = [...rules];
	}

	addRule(rule: Rule<TState, TCommand>): this {
		this.rules.push(rule);
		return this;
	}

	validate(state: TState, command: TCommand): ValidationResult {
		const context: RuleContext<TState, TCommand> = {
			state,
			command,
		};

		const violations: RuleViolation[] = [];
		for (const rule of this.rules) {
			violations.push(...normalizeRuleResult(rule(context)));
		}

		const blockingViolations = violations.filter((violation) => (violation.severity ?? 'error') === 'error');

		return {
			valid: blockingViolations.length === 0,
			violations,
		};
	}

	canApply(state: TState, command: TCommand, options: RuleEngineApplyOptions = {}): boolean {
		const validation = this.validate(state, command);
		const allowWarnings = options.allowWarnings ?? true;
		const hasWarnings = validation.violations.some((violation) => (violation.severity ?? 'error') === 'warning');

		if (!validation.valid) {
			return false;
		}

		if (!allowWarnings && hasWarnings) {
			return false;
		}

		return true;
	}

	apply(state: TState, command: TCommand, options: RuleEngineApplyOptions = {}): RuleEngineApplyResult<TState> {
		const validation = this.validate(state, command);
		const hasErrors = validation.violations.some((violation) => (violation.severity ?? 'error') === 'error');
		const allowWarnings = options.allowWarnings ?? true;

		if (hasErrors) {
			return {
				accepted: false,
				state,
				violations: validation.violations,
			};
		}

		if (!allowWarnings && validation.violations.length > 0) {
			return {
				accepted: false,
				state,
				violations: validation.violations,
			};
		}

		return {
			accepted: true,
			state: this.reducer(state, command),
			violations: validation.violations,
		};
	}
}
