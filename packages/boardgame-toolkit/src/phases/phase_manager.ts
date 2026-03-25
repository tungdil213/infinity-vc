export interface PhaseDefinition {
	readonly id: string;
	readonly next: readonly string[];
	readonly label?: string;
}

export interface PhaseSnapshot {
	readonly current: string;
	readonly history: readonly string[];
}

export class PhaseManager {
	private readonly phases: Map<string, PhaseDefinition>;
	private current: string;
	private readonly initial: string;
	private history: string[] = [];

	constructor(definitions: readonly PhaseDefinition[], initialPhase: string) {
		if (definitions.length === 0) {
			throw new Error('PhaseManager requires at least one phase definition');
		}

		this.phases = new Map(definitions.map((phase) => [phase.id, phase]));
		if (!this.phases.has(initialPhase)) {
			throw new Error(`Initial phase not found: ${initialPhase}`);
		}

		this.current = initialPhase;
		this.initial = initialPhase;
		this.history = [initialPhase];
	}

	getCurrentPhase(): string {
		return this.current;
	}

	canTransitionTo(targetPhase: string): boolean {
		const currentDefinition = this.getCurrentDefinition();
		return currentDefinition.next.includes(targetPhase);
	}

	transitionTo(targetPhase: string): this {
		if (!this.phases.has(targetPhase)) {
			throw new Error(`Unknown phase: ${targetPhase}`);
		}

		if (!this.canTransitionTo(targetPhase)) {
			throw new Error(`Invalid transition ${this.current} -> ${targetPhase}`);
		}

		this.current = targetPhase;
		this.history.push(targetPhase);
		return this;
	}

	getHistory(): readonly string[] {
		return [...this.history];
	}

	reset(): this {
		this.current = this.initial;
		this.history = [this.initial];
		return this;
	}

	toSnapshot(): PhaseSnapshot {
		return {
			current: this.current,
			history: [...this.history],
		};
	}

	private getCurrentDefinition(): PhaseDefinition {
		const definition = this.phases.get(this.current);
		if (!definition) {
			throw new Error(`Unknown current phase: ${this.current}`);
		}

		return definition;
	}
}
