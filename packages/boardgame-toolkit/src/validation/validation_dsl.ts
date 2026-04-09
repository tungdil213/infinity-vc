export interface ValidationDslViolation {
	readonly code: string;
	readonly message: string;
	readonly path?: string;
	readonly details?: unknown;
}

export interface ValidationDslRuleNode<TContext> {
	readonly kind: 'rule';
	readonly check: (context: TContext) => boolean;
	readonly violation: ValidationDslViolation;
	readonly when?: (context: TContext) => boolean;
}

export interface ValidationDslAllNode<TContext> {
	readonly kind: 'all';
	readonly nodes: readonly ValidationDslNode<TContext>[];
}

export interface ValidationDslAnyNode<TContext> {
	readonly kind: 'any';
	readonly nodes: readonly ValidationDslNode<TContext>[];
	readonly violation?: ValidationDslViolation;
}

export interface ValidationDslNotNode<TContext> {
	readonly kind: 'not';
	readonly node: ValidationDslNode<TContext>;
	readonly violation: ValidationDslViolation;
}

export type ValidationDslNode<TContext> =
	| ValidationDslRuleNode<TContext>
	| ValidationDslAllNode<TContext>
	| ValidationDslAnyNode<TContext>
	| ValidationDslNotNode<TContext>;

export interface ValidationDslResult {
	readonly valid: boolean;
	readonly violations: readonly ValidationDslViolation[];
}

const assertViolation = (violation: ValidationDslViolation): void => {
	if (!violation.code || !violation.message) {
		throw new TypeError('DSL violations require non-empty code and message');
	}
};

const assertNode = <TContext>(node: ValidationDslNode<TContext>): void => {
	if (node.kind === 'rule') {
		assertViolation(node.violation);
		return;
	}

	if (node.kind === 'not') {
		assertViolation(node.violation);
		assertNode(node.node);
		return;
	}

	for (const child of node.nodes) {
		assertNode(child);
	}

	if (node.kind === 'any' && node.violation) {
		assertViolation(node.violation);
	}
};

const evaluateNode = <TContext>(node: ValidationDslNode<TContext>, context: TContext): ValidationDslResult => {
	if (node.kind === 'rule') {
		if (node.when && !node.when(context)) {
			return {
				valid: true,
				violations: [],
			};
		}

		if (node.check(context)) {
			return {
				valid: true,
				violations: [],
			};
		}

		return {
			valid: false,
			violations: [node.violation],
		};
	}

	if (node.kind === 'all') {
		const violations: ValidationDslViolation[] = [];
		for (const child of node.nodes) {
			const childResult = evaluateNode(child, context);
			violations.push(...childResult.violations);
		}

		return {
			valid: violations.length === 0,
			violations,
		};
	}

	if (node.kind === 'any') {
		if (node.nodes.length === 0) {
			return {
				valid: false,
				violations: [
					node.violation ?? {
						code: 'dsl.any.empty',
						message: 'ANY node must contain at least one child rule',
					},
				],
			};
		}

		const violations: ValidationDslViolation[] = [];
		for (const child of node.nodes) {
			const childResult = evaluateNode(child, context);
			if (childResult.valid) {
				return {
					valid: true,
					violations: [],
				};
			}

			violations.push(...childResult.violations);
		}

		return {
			valid: false,
			violations: node.violation ? [node.violation] : violations,
		};
	}

	const childResult = evaluateNode(node.node, context);
	if (childResult.valid) {
		return {
			valid: false,
			violations: [node.violation],
		};
	}

	return {
		valid: true,
		violations: [],
	};
};

export const dslRule = <TContext>(
	check: (context: TContext) => boolean,
	violation: ValidationDslViolation,
	when?: (context: TContext) => boolean
): ValidationDslRuleNode<TContext> => ({
	kind: 'rule',
	check,
	violation,
	when,
});

export const dslAll = <TContext>(...nodes: ValidationDslNode<TContext>[]): ValidationDslAllNode<TContext> => ({
	kind: 'all',
	nodes,
});

export const dslAny = <TContext>(
	nodes: readonly ValidationDslNode<TContext>[],
	violation?: ValidationDslViolation
): ValidationDslAnyNode<TContext> => ({
	kind: 'any',
	nodes,
	violation,
});

export const dslNot = <TContext>(
	node: ValidationDslNode<TContext>,
	violation: ValidationDslViolation
): ValidationDslNotNode<TContext> => ({
	kind: 'not',
	node,
	violation,
});

export const validateDsl = <TContext>(node: ValidationDslNode<TContext>, context: TContext): ValidationDslResult => {
	assertNode(node);
	return evaluateNode(node, context);
};

export const compileValidationDsl = <TContext>(node: ValidationDslNode<TContext>) => {
	assertNode(node);
	return (context: TContext): ValidationDslResult => evaluateNode(node, context);
};
