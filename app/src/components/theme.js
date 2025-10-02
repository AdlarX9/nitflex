export const colors = {
	primary: '#e50914', // Nitflex red
	secondary: '#221f1f',
	dark: '#000000',
	light: '#ffffff',
	gray: {
		100: '#f5f5f5',
		200: '#e5e5e5',
		300: '#d5d5d5',
		400: '#b5b5b5',
		500: '#999999',
		600: '#757575',
		700: '#535353',
		800: '#333333',
		900: '#1a1a1a'
	},
	overlay: {
		light: 'rgba(255, 255, 255, 0.1)',
		dark: 'rgba(0, 0, 0, 0.7)'
	}
}

export const animations = {
	fadeInUp: {
		initial: { opacity: 0, y: 20 },
		animate: { opacity: 1, y: 0 },
		transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
	},
	stagger: {
		initial: {},
		animate: {
			transition: {
				staggerChildren: 0.1
			}
		}
	},
	cardHover: {
		hover: { scale: 1.03 },
		tap: { scale: 0.98 }
	}
}

export const shadows = {
	sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
	md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
	lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
	xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
}
