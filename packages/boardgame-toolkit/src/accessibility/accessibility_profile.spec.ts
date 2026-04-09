import { describe, expect, it } from 'vitest';
import {
	createAccessibilityUiHints,
	mergeAccessibilityProfiles,
	normalizeAccessibilityProfile,
} from './accessibility_profile.js';

describe('accessibility profile', () => {
	it('normalizes and clamps values', () => {
		const profile = normalizeAccessibilityProfile({
			colorVisionMode: 'deuteranopia',
			contrastMode: 'high',
			motionMode: 'reduced',
			interactionMode: 'large_targets',
			textScale: 5,
			soundEnabled: false,
		});

		expect(profile).toEqual({
			colorVisionMode: 'deuteranopia',
			contrastMode: 'high',
			motionMode: 'reduced',
			interactionMode: 'large_targets',
			textScale: 2,
			soundEnabled: false,
		});
	});

	it('merges profiles with defaults', () => {
		const merged = mergeAccessibilityProfiles(
			{
				motionMode: 'full',
				textScale: 1.2,
			},
			{
				motionMode: 'none',
			}
		);

		expect(merged.motionMode).toBe('none');
		expect(merged.textScale).toBe(1.2);
		expect(merged.colorVisionMode).toBe('default');
	});

	it('creates ui hints', () => {
		const hints = createAccessibilityUiHints({
			motionMode: 'none',
			contrastMode: 'high',
			interactionMode: 'large_targets',
			textScale: 1.4,
			colorVisionMode: 'tritanopia',
		});

		expect(hints).toEqual({
			animationDurationScale: 0,
			useHighContrastPalette: true,
			useLargeTapTargets: true,
			textScale: 1.4,
			colorVisionMode: 'tritanopia',
		});
	});
});
