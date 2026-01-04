import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
	// Chemins ignorés globalement
	{ ignores: ['dist', 'build', 'node_modules'] },

	// Preset base ESLint (flat)
	js.configs.recommended,

	// Bloc projet
	{
		files: ['**/*.{js,jsx}'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.node
			},
			// IMPORTANT: ecmaFeatures doit être sous parserOptions en flat config
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
				ecmaFeatures: { jsx: true }
			}
		},
		// En flat config, plugins est un objet
		plugins: {
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh
		},
		// Règles explicites (évite les presets legacy)
		rules: {
			// React Hooks (équivalent du preset recommandé)
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'warn',

			// React Refresh (équivalent recommandé/vite)
			'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

			// Tes règles
			'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }]
		}
	}
]
