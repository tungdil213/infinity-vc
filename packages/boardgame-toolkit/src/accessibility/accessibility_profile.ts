export type ColorVisionMode = 'default' | 'deuteranopia' | 'protanopia' | 'tritanopia' | 'monochrome';

export type ContrastMode = 'default' | 'high';

export type MotionMode = 'full' | 'reduced' | 'none';

export type InteractionMode = 'default' | 'large_targets';

export interface AccessibilityProfile {
	readonly colorVisionMode: ColorVisionMode;
	readonly contrastMode: ContrastMode;
	readonly motionMode: MotionMode;
	readonly interactionMode: InteractionMode;
	readonly textScale: number;
	readonly soundEnabled: boolean;
}

export interface AccessibilityUiHints {
	readonly animationDurationScale: number;
	readonly useHighContrastPalette: boolean;
	readonly useLargeTapTargets: boolean;
	readonly textScale: number;
	readonly colorVisionMode: ColorVisionMode;
}

const DEFAULT_ACCESSIBILITY_PROFILE: AccessibilityProfile = {
	colorVisionMode: 'default',
	contrastMode: 'default',
	motionMode: 'full',
	interactionMode: 'default',
	textScale: 1,
	soundEnabled: true,
};

const clamp = (value: number, min: number, max: number): number => {
	return Math.min(max, Math.max(min, value));
};

export const normalizeAccessibilityProfile = (input: Partial<AccessibilityProfile> = {}): AccessibilityProfile => {
	const colorVisionMode = input.colorVisionMode ?? DEFAULT_ACCESSIBILITY_PROFILE.colorVisionMode;
	const contrastMode = input.contrastMode ?? DEFAULT_ACCESSIBILITY_PROFILE.contrastMode;
	const motionMode = input.motionMode ?? DEFAULT_ACCESSIBILITY_PROFILE.motionMode;
	const interactionMode = input.interactionMode ?? DEFAULT_ACCESSIBILITY_PROFILE.interactionMode;
	const soundEnabled = input.soundEnabled ?? DEFAULT_ACCESSIBILITY_PROFILE.soundEnabled;
	const textScaleInput = input.textScale ?? DEFAULT_ACCESSIBILITY_PROFILE.textScale;

	if (!['default', 'deuteranopia', 'protanopia', 'tritanopia', 'monochrome'].includes(colorVisionMode)) {
		throw new TypeError(`Unsupported colorVisionMode: ${colorVisionMode}`);
	}

	if (!['default', 'high'].includes(contrastMode)) {
		throw new TypeError(`Unsupported contrastMode: ${contrastMode}`);
	}

	if (!['full', 'reduced', 'none'].includes(motionMode)) {
		throw new TypeError(`Unsupported motionMode: ${motionMode}`);
	}

	if (!['default', 'large_targets'].includes(interactionMode)) {
		throw new TypeError(`Unsupported interactionMode: ${interactionMode}`);
	}

	if (typeof soundEnabled !== 'boolean') {
		throw new TypeError('soundEnabled must be a boolean');
	}

	if (!Number.isFinite(textScaleInput)) {
		throw new TypeError('textScale must be a finite number');
	}

	return {
		colorVisionMode,
		contrastMode,
		motionMode,
		interactionMode,
		textScale: clamp(textScaleInput, 0.8, 2),
		soundEnabled,
	};
};

export const mergeAccessibilityProfiles = (
	baseProfile: Partial<AccessibilityProfile>,
	overrideProfile: Partial<AccessibilityProfile>
): AccessibilityProfile => {
	return normalizeAccessibilityProfile({
		...normalizeAccessibilityProfile(baseProfile),
		...overrideProfile,
	});
};

export const createAccessibilityUiHints = (profileInput: Partial<AccessibilityProfile>): AccessibilityUiHints => {
	const profile = normalizeAccessibilityProfile(profileInput);

	const animationDurationScale = profile.motionMode === 'none' ? 0 : profile.motionMode === 'reduced' ? 0.4 : 1;

	return {
		animationDurationScale,
		useHighContrastPalette: profile.contrastMode === 'high',
		useLargeTapTargets: profile.interactionMode === 'large_targets',
		textScale: profile.textScale,
		colorVisionMode: profile.colorVisionMode,
	};
};
