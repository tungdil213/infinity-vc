import React, { useEffect, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from './primitives/dialog';
import { Button } from './primitives/button';
import { Input } from './primitives/input';
import { Label } from './primitives/label';

export interface LobbyPasswordDialogProps {
	open: boolean;
	lobbyName?: string;
	loading?: boolean;
	error?: string | null;
	onOpenChange: (open: boolean) => void;
	onSubmit: (password: string) => void;
	labels?: Partial<LobbyPasswordDialogLabels>;
}

interface LobbyPasswordDialogLabels {
	title: string;
	descriptionWithLobby: string;
	descriptionWithoutLobby: string;
	passwordLabel: string;
	passwordPlaceholder: string;
	passwordRequired: string;
	cancel: string;
	join: string;
	joining: string;
}

const defaultLabels: LobbyPasswordDialogLabels = {
	title: 'Protected lobby',
	descriptionWithLobby: 'Enter the password to join "{lobbyName}".',
	descriptionWithoutLobby: 'Enter the password to join this lobby.',
	passwordLabel: 'Password',
	passwordPlaceholder: 'Enter lobby password',
	passwordRequired: 'Password is required.',
	cancel: 'Cancel',
	join: 'Join',
	joining: 'Joining...',
};

export function LobbyPasswordDialog({
	open,
	lobbyName,
	loading = false,
	error,
	onOpenChange,
	onSubmit,
	labels,
}: LobbyPasswordDialogProps) {
	const ui = { ...defaultLabels, ...labels };
	const [password, setPassword] = useState('');
	const [localError, setLocalError] = useState<string | null>(null);

	useEffect(() => {
		if (open) {
			setPassword('');
			setLocalError(null);
		}
	}, [open]);

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		if (!password.trim()) {
			setLocalError(ui.passwordRequired);
			return;
		}

		setLocalError(null);
		onSubmit(password.trim());
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{ui.title}</DialogTitle>
						<DialogDescription>
							{lobbyName
								? ui.descriptionWithLobby.replace('{lobbyName}', lobbyName)
								: ui.descriptionWithoutLobby}
						</DialogDescription>
					</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="lobby-password">{ui.passwordLabel}</Label>
						<Input
							id="lobby-password"
							type="password"
							value={password}
							onChange={(event) => {
								setPassword(event.target.value);
								if (localError) {
									setLocalError(null);
								}
							}}
							placeholder={ui.passwordPlaceholder}
							disabled={loading}
							className={error || localError ? 'border-destructive' : ''}
						/>
						{(localError || error) && (
							<p className="text-sm text-destructive">{localError || error}</p>
						)}
					</div>

					<DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Button
							type="button"
							variant="neutral"
							onClick={() => onOpenChange(false)}
							disabled={loading}
						>
							{ui.cancel}
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? ui.joining : ui.join}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
