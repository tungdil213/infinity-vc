import { julr } from '@julr/tooling-configs/eslint';

export default julr(
	{
		typescript: {
			forceDecorators: true,
			tsconfigPath: ['./tsconfig.json', './inertia/tsconfig.json'],
		},
	},
	{
		ignores: ['apps/infinity.dev/.adonisjs/*', 'apps/infinity.dev/types/db.ts'],
	},
	{
		rules: {
			// Not recommended to be turned on
			'@typescript-eslint/no-redeclare': 'off',
			// Common pattern in AdonisJS
			'@typescript-eslint/no-empty-object-type': 'off',
			'perfectionist/sort-imports': [
				'error',
				{
					groups: ['side-effect', 'builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
					internalPattern: ['^#.+', '^~/.+'],
					newlinesBetween: 'never',
					order: 'asc',
					type: 'alphabetical',
				},
			],
		},
	},
	{
		files: ['packages/events/**/*.ts'],
		rules: {
			'unicorn/filename-case': 'off',
			'@typescript-eslint/naming-convention': 'off',
			'node/handle-callback-err': 'off',
		},
	},
	{
		files: ['packages/ui/**/*.{ts,tsx}'],
		rules: {
			'perfectionist/sort-imports': 'off',
			'unicorn/filename-case': 'off',
			'@typescript-eslint/consistent-type-imports': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'no-else-return': 'off',
			'@stylistic/padding-line-between-statements': 'off',
			'object-shorthand': 'off',
			'@typescript-eslint/no-use-before-define': 'off',
			'capitalized-comments': 'off',
		},
	},
	{
		files: ['packages/game-engine/**/*.{ts,tsx}'],
		rules: {
			'perfectionist/sort-imports': 'off',
			'unicorn/filename-case': 'off',
			'@typescript-eslint/naming-convention': 'off',
			'@typescript-eslint/explicit-member-accessibility': 'off',
			'unicorn/custom-error-definition': 'off',
		},
	},
	{
		files: ['packages/**/package.json', 'packages/**/tsconfig.json'],
		rules: {
			'jsonc/sort-keys': 'off',
		},
	},
	{
		files: ['packages/transcript/**/*.{ts,tsx}'],
		rules: {
			'perfectionist/sort-imports': 'off',
			'unicorn/filename-case': 'off',
			'@typescript-eslint/naming-convention': 'off',
			'@typescript-eslint/explicit-member-accessibility': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-invalid-void-type': 'off',
			'@stylistic/padding-line-between-statements': 'off',
			'node/handle-callback-err': 'off',
		},
	},
	{
		files: ['packages/ui/*.js'],
		rules: {
			'perfectionist/sort-imports': 'off',
		},
	},
	{
		files: ['apps/docs/stories/**/*.{ts,tsx}'],
		rules: {
			'perfectionist/sort-imports': 'off',
			'@stylistic/padding-line-between-statements': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/consistent-type-imports': 'off',
			'@typescript-eslint/no-use-before-define': 'off',
			'unicorn/numeric-separators-style': 'off',
			'unicorn/filename-case': 'off',
		},
	}
);
