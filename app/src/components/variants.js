// Animation variants shared
export const fadeInUp = {
	initial: { opacity: 0, y: 24 },
	animate: (i = 0) => ({
		opacity: 1,
		y: 0,
		transition: {
			delay: 0.08 * i,
			duration: 0.55,
			ease: [0.22, 1, 0.36, 1]
		}
	})
}

export const staggerContainer = {
	initial: {},
	animate: {
		transition: {
			staggerChildren: 0.08
		}
	}
}

export const sectionReveal = {
	initial: { opacity: 0, y: 40, scale: 0.98 },
	whileInView: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
	},
	viewport: { once: true, margin: '0px 0px -80px 0px' }
}

export const chipVariant = {
	hidden: { opacity: 0, y: 14, scale: 0.96 },
	show: i => ({
		opacity: 1,
		y: 0,
		scale: 1,
		transition: { delay: 0.04 * i, duration: 0.4, ease: 'easeOut' }
	})
}

export const cardVariant = {
	hidden: { opacity: 0, y: 24 },
	show: i => ({
		opacity: 1,
		y: 0,
		transition: { delay: 0.05 * i, duration: 0.55, ease: [0.22, 1, 0.36, 1] }
	})
}

export const shimmer =
	'after:absolute after:inset-0 after:bg-[linear-gradient(110deg,rgba(255,255,255,0.05),rgba(255,255,255,0.15),rgba(255,255,255,0.05))] after:bg-[length:200%_100%] after:animate-[shimmer_2.5s_infinite]'
