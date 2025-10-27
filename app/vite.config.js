import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		host: true,
		port: 5173,
		strictPort: true,
		proxy: {
			// Toutes les requêtes commençant par /api vont vers le backend
			'/jobs': {
				target: 'http://api:8080', // nom du service Docker (même réseau)
				changeOrigin: true,
				// rewrite: path => path.replace(/^\/jobs/, '')
			}
		}
	},
	build: {
		outDir: 'dist',
		sourcemap: false,
		rollupOptions: {
			output: {
				manualChunks: {
					'react-vendor': ['react', 'react-dom', 'react-router-dom'],
					'framer-motion': ['framer-motion'],
					'query-vendor': ['@tanstack/react-query', 'axios']
				}
			}
		}
	},
	preview: {
		host: true,
		port: 5173
	}
})
