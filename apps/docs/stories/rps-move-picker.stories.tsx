import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { cn } from '@infinity.dev/ui/utils';

type RpsMove = 'rock' | 'paper' | 'scissors';

const MOVE_META: Record<RpsMove, { label: string; picto: string; hint: string; theme: string }> = {
	rock: {
		label: 'Rock',
		picto: '✊',
		hint: 'Crushes scissors',
		theme: 'from-amber-100 via-orange-100 to-orange-200 border-orange-300',
	},
	paper: {
		label: 'Paper',
		picto: '✋',
		hint: 'Covers rock',
		theme: 'from-sky-100 via-cyan-100 to-cyan-200 border-cyan-300',
	},
	scissors: {
		label: 'Scissors',
		picto: '✌',
		hint: 'Cuts paper',
		theme: 'from-violet-100 via-fuchsia-100 to-fuchsia-200 border-fuchsia-300',
	},
};

function ShifumiMovePicker({
	onSelect,
	selectedMove = null,
	disabled = false,
	submitting = false,
}: {
	onSelect: (move: RpsMove) => void;
	selectedMove?: RpsMove | null;
	disabled?: boolean;
	submitting?: boolean;
}) {
	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
			{(Object.keys(MOVE_META) as RpsMove[]).map((move) => {
				const isSelected = selectedMove === move;
				const meta = MOVE_META[move];

				return (
					<button
						key={move}
						type="button"
						onClick={() => onSelect(move)}
						disabled={disabled}
						className={cn(
							'group relative rounded-base border-2 p-3 text-left shadow-shadow transition-all',
							'hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none',
							'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2',
							`bg-linear-to-br ${meta.theme}`,
							disabled && 'cursor-not-allowed opacity-50',
							isSelected && 'translate-x-boxShadowX translate-y-boxShadowY shadow-none ring-2 ring-black'
						)}
					>
						<div className="flex items-start justify-between gap-2">
							<div>
								<p className="text-sm font-base uppercase tracking-wide text-gray-700">{meta.label}</p>
								<p className="text-xs text-gray-600">{meta.hint}</p>
							</div>
							<span className="text-3xl leading-none">{meta.picto}</span>
						</div>

						<div className="mt-3 text-xs font-base text-gray-700">
							{isSelected ? 'Selected' : submitting ? 'Submitting...' : 'Choose move'}
						</div>
					</button>
				);
			})}
		</div>
	);
}

type StoryProps = {
	disabled?: boolean;
	submitting?: boolean;
	selectedMove?: RpsMove | null;
};

function InteractivePicker({ disabled = false, submitting = false, selectedMove = null }: StoryProps) {
	const [move, setMove] = useState<RpsMove | null>(selectedMove);

	return (
		<div className="max-w-4xl mx-auto p-6 bg-secondary-background rounded-base">
			<div className="mb-4">
				<h2 className="font-heading text-xl">Shifumi Move Picker</h2>
				<p className="text-sm text-muted-foreground">
					Current move: {move ? move.toUpperCase() : 'none selected'}
				</p>
			</div>

			<ShifumiMovePicker
				onSelect={(nextMove) => setMove(nextMove)}
				selectedMove={move}
				disabled={disabled}
				submitting={submitting}
			/>
		</div>
	);
}

const meta: Meta<typeof InteractivePicker> = {
	title: 'Game/RPS Move Picker',
	component: InteractivePicker,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
	argTypes: {
		disabled: { control: 'boolean' },
		submitting: { control: 'boolean' },
		selectedMove: {
			control: 'radio',
			options: [null, 'rock', 'paper', 'scissors'],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		disabled: false,
		submitting: false,
		selectedMove: null,
	},
};

export const WithSelection: Story = {
	args: {
		selectedMove: 'paper',
	},
};

export const Submitting: Story = {
	args: {
		submitting: true,
		selectedMove: 'scissors',
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
	},
};
