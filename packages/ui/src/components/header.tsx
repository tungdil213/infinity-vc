import React, { useState } from 'react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from './primitives/dropdown-menu';
import { Button, buttonVariants } from './primitives/button';
import { Badge } from './primitives/badge';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from './primitives/dialog';
import { Input } from './primitives/input';
import { Label } from './primitives/label';
import {
	Users,
	Plus,
	Bell,
	Menu,
	User,
	Settings,
	LogOut,
	Gamepad2,
	Wifi,
	WifiOff,
	Hash,
	Globe,
	Check,
} from 'lucide-react';
import { cn } from '../utils';

interface User {
	uuid: string;
	fullName: string;
	email: string;
}

interface CurrentLobby {
	uuid: string;
	name: string;
	status: string;
	currentPlayers: number;
	maxPlayers: number;
}

interface LocaleOption {
	value: string;
	label: string;
}

interface HeaderLabels {
	connectionConnected: string;
	connectionDisconnected: string;
	createAction: string;
	joinAction: string;
	joinDialogTitle: string;
	joinDialogDescription: string;
	joinCodeLabel: string;
	joinCodePlaceholder: string;
	joinSubmit: string;
	joining: string;
	lobbiesAction: string;
	profile: string;
	settings: string;
	logout: string;
	browseLobbies: string;
	lobbiesShort: string;
	login: string;
	signup: string;
}

interface HeaderProps {
	user?: User;
	currentLobby?: CurrentLobby;
	isConnected?: boolean;
	className?: string;
	onCreateLobby?: () => void;
	onJoinByCode?: (code: string) => Promise<void>;
	onGoToCurrentLobby?: () => void;
	onGoToLobbies?: () => void;
	onLogin?: () => void;
	onRegister?: () => void;
	onLogout?: () => void;
	onProfile?: () => void;
	onSettings?: () => void;
	locale?: string;
	availableLocales?: LocaleOption[];
	onLocaleChange?: (locale: string) => void;
	localeLabel?: string;
	logoHref?: string;
	logoText?: string;
	labels?: Partial<HeaderLabels>;
}

const defaultLabels: HeaderLabels = {
	connectionConnected: 'Connected',
	connectionDisconnected: 'Disconnected',
	createAction: 'Create',
	joinAction: 'Join',
	joinDialogTitle: 'Join a lobby',
	joinDialogDescription: 'Enter the lobby code to join.',
	joinCodeLabel: 'Lobby code',
	joinCodePlaceholder: 'Enter lobby code',
	joinSubmit: 'Join',
	joining: 'Joining...',
	lobbiesAction: 'Lobbies',
	profile: 'Profile',
	settings: 'Settings',
	logout: 'Log out',
	browseLobbies: 'Browse lobbies',
	lobbiesShort: 'Lobbies',
	login: 'Log in',
	signup: 'Sign up',
};

export function Header({
	user,
	currentLobby,
	isConnected = true,
	className = '',
	onCreateLobby,
	onJoinByCode,
	onGoToCurrentLobby,
	onGoToLobbies,
	onLogin,
	onRegister,
	onLogout,
	onProfile,
	onSettings,
	locale = 'en',
	availableLocales = [],
	onLocaleChange,
	localeLabel = 'Language',
	logoHref = '/',
	logoText = '♾️ Infinity Game',
	labels,
}: HeaderProps) {
	const ui = { ...defaultLabels, ...labels };
	const [lobbyCode, setLobbyCode] = useState('');
	const [isJoining, setIsJoining] = useState(false);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const handleJoinByCode = async () => {
		if (!lobbyCode.trim() || !onJoinByCode) return;

		setIsJoining(true);
		try {
			await onJoinByCode(lobbyCode.trim());
			setIsDialogOpen(false);
			setLobbyCode('');
		} catch (error) {
			console.error('Failed to join lobby:', error);
		} finally {
			setIsJoining(false);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status.toUpperCase()) {
			case 'WAITING':
			case 'READY':
			case 'OPEN':
				return 'bg-yellow-500';
			case 'PLAYING':
			case 'IN_GAME':
				return 'bg-green-500';
			case 'FINISHED':
				return 'bg-gray-500';
			default:
				return 'bg-blue-500';
		}
	};

	const selectedLocale = availableLocales.find((option) => option.value === locale);

	return (
		<>
			<nav className={`bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50 ${className}`}>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col gap-3 py-3 sm:min-h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0">
						{/* Logo */}
						<div className="flex min-w-0 items-center">
							<a href={logoHref} className="block min-w-0 flex-shrink-0">
								<h1 className="truncate text-xl font-bold text-primary transition-opacity hover:opacity-80 sm:text-2xl">
									{logoText}
								</h1>
							</a>
						</div>

						{/* Navigation */}
						<div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-3">
							{/* Connection Status */}
							<div
								className="flex shrink-0 items-center gap-2"
								title={isConnected ? ui.connectionConnected : ui.connectionDisconnected}
							>
								{isConnected ? (
									<Wifi className="w-4 h-4 text-green-500" />
								) : (
									<WifiOff className="w-4 h-4 text-red-500" />
								)}
							</div>

							{availableLocales.length > 0 && onLocaleChange && (
								<DropdownMenu>
									<DropdownMenuTrigger
										className={cn(buttonVariants({ variant: 'neutral', size: 'sm' }), 'flex items-center gap-2')}
									>
										<Globe className="w-4 h-4" />
										<span className="hidden sm:inline">{selectedLocale?.label ?? locale.toUpperCase()}</span>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-48">
										<div className="px-2 py-1.5 text-xs text-muted-foreground">{localeLabel}</div>
										<DropdownMenuSeparator />
										{availableLocales.map((option) => (
											<DropdownMenuItem
												key={option.value}
												onClick={() => onLocaleChange(option.value)}
												className="flex items-center justify-between"
											>
												<span>{option.label}</span>
												{option.value === locale && <Check className="w-4 h-4" />}
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							)}

							{user ? (
								<>
									<div className="hidden md:flex md:items-center md:gap-2">
										{/* Current Lobby Indicator */}
										{currentLobby && (
											<Button
												onClick={onGoToCurrentLobby}
												variant="neutral"
												size="sm"
												className="flex min-w-0 max-w-full shrink-0 items-center gap-2"
											>
												<div className={`w-2 h-2 rounded-full ${getStatusColor(currentLobby.status)}`} />
												<span className="hidden max-w-40 truncate md:inline md:max-w-56">{currentLobby.name}</span>
												<Badge variant="secondary" className="shrink-0 text-xs">
													{currentLobby.currentPlayers}/{currentLobby.maxPlayers}
												</Badge>
											</Button>
										)}

										{/* Quick Actions */}
										<div className="flex shrink-0 items-center gap-2">
											<Button onClick={onCreateLobby} size="sm" className="flex items-center gap-2">
												<Plus className="w-4 h-4" />
												<span className="hidden md:inline">{ui.createAction}</span>
											</Button>
											<Button
												variant="neutral"
												size="sm"
												className="flex items-center gap-2"
												onClick={() => setIsDialogOpen(true)}
											>
												<Hash className="w-4 h-4" />
												<span className="hidden md:inline">{ui.joinAction}</span>
											</Button>
										</div>

										{/* Browse Lobbies */}
										<Button
											onClick={onGoToLobbies}
											variant="neutral"
											size="sm"
											className="flex shrink-0 items-center gap-2"
										>
											<Gamepad2 className="w-4 h-4" />
											<span className="hidden md:inline">{ui.lobbiesAction}</span>
										</Button>

										{/* Notifications */}
										<Button variant="neutral" size="sm" className="relative shrink-0">
											<Bell className="w-4 h-4" />
										</Button>

										{/* User Menu */}
										<DropdownMenu>
											<DropdownMenuTrigger
												className={cn(
													buttonVariants({ variant: 'neutral', size: 'sm' }),
													'flex max-w-full shrink-0 items-center gap-2'
												)}
											>
												<User className="w-4 h-4" />
												<span className="hidden max-w-32 truncate md:inline">{user.fullName}</span>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end" className="w-56">
												<div className="px-2 py-1.5">
													<p className="text-sm font-medium">{user.fullName}</p>
													<p className="text-xs text-muted-foreground">{user.email}</p>
												</div>
												<DropdownMenuSeparator />
												<DropdownMenuItem onClick={onProfile}>
													<User className="w-4 h-4 mr-2" />
													{ui.profile}
												</DropdownMenuItem>
												<DropdownMenuItem onClick={onSettings}>
													<Settings className="w-4 h-4 mr-2" />
													{ui.settings}
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem onClick={onLogout}>
													<LogOut className="w-4 h-4 mr-2" />
													{ui.logout}
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>

									<div className="flex md:hidden md:items-center md:gap-2">
										<DropdownMenu>
											<DropdownMenuTrigger className={buttonVariants({ variant: 'neutral', size: 'sm' })}>
												<Menu className="h-4 w-4" />
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end" className="w-56">
												{currentLobby && (
													<>
														<DropdownMenuItem onClick={onGoToCurrentLobby}>
															<Gamepad2 className="w-4 h-4 mr-2" />
															<span className="truncate">{currentLobby.name}</span>
															<Badge variant="secondary" className="ml-auto text-xs">
																{currentLobby.currentPlayers}/{currentLobby.maxPlayers}
															</Badge>
														</DropdownMenuItem>
														<DropdownMenuSeparator />
													</>
												)}

												<DropdownMenuItem onClick={onCreateLobby}>
													<Plus className="w-4 h-4 mr-2" />
													{ui.createAction}
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
													<Hash className="w-4 h-4 mr-2" />
													{ui.joinAction}
												</DropdownMenuItem>
												<DropdownMenuItem onClick={onGoToLobbies}>
													<Gamepad2 className="w-4 h-4 mr-2" />
													{ui.lobbiesAction}
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem onClick={onProfile}>
													<User className="w-4 h-4 mr-2" />
													{ui.profile}
												</DropdownMenuItem>
												<DropdownMenuItem onClick={onSettings}>
													<Settings className="w-4 h-4 mr-2" />
													{ui.settings}
												</DropdownMenuItem>
												<DropdownMenuItem onClick={onLogout}>
													<LogOut className="w-4 h-4 mr-2" />
													{ui.logout}
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>

									<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
										<DialogTrigger className="hidden" />
										<DialogContent className="sm:max-w-md">
											<DialogHeader>
												<DialogTitle>{ui.joinDialogTitle}</DialogTitle>
												<DialogDescription>{ui.joinDialogDescription}</DialogDescription>
											</DialogHeader>
											<div className="grid gap-4 py-4">
												<div className="grid gap-2">
													<Label htmlFor="lobby-code">{ui.joinCodeLabel}</Label>
													<Input
														id="lobby-code"
														value={lobbyCode}
														onChange={(e) => setLobbyCode(e.target.value)}
														placeholder={ui.joinCodePlaceholder}
														onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
													/>
												</div>
											</div>
											<DialogFooter>
												<Button onClick={handleJoinByCode} disabled={!lobbyCode.trim() || isJoining} className="w-full">
													{isJoining ? ui.joining : ui.joinSubmit}
												</Button>
											</DialogFooter>
										</DialogContent>
									</Dialog>
								</>
							) : (
								<>
									{/* Public Lobbies Preview */}
									<div className="hidden md:flex md:items-center md:gap-2">
										<Button
											onClick={onGoToLobbies}
											variant="neutral"
											size="sm"
											className="flex shrink-0 items-center gap-2"
										>
											<Users className="w-4 h-4" />
											<span className="hidden md:inline">{ui.browseLobbies}</span>
											<span className="md:hidden">{ui.lobbiesShort}</span>
										</Button>

										{/* Auth Buttons */}
										<Button onClick={onLogin} variant="neutral" size="sm">
											{ui.login}
										</Button>
										<Button onClick={onRegister} size="sm">
											{ui.signup}
										</Button>
									</div>

									<div className="flex md:hidden">
										<DropdownMenu>
											<DropdownMenuTrigger className={buttonVariants({ variant: 'neutral', size: 'sm' })}>
												<Menu className="h-4 w-4" />
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end" className="w-48">
												<DropdownMenuItem onClick={onGoToLobbies}>
													<Users className="w-4 h-4 mr-2" />
													{ui.browseLobbies}
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem onClick={onLogin}>{ui.login}</DropdownMenuItem>
												<DropdownMenuItem onClick={onRegister}>{ui.signup}</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			</nav>
		</>
	);
}
