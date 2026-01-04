export const fadeInUp = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
}

export const staggerContainer = {
	initial: {},
	animate: {
		transition: {
			staggerChildren: 0.1
		}
	}
}
