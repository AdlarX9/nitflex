import { useState } from 'react'
// eslint-disable-next-line
import { motion, useReducedMotion } from 'framer-motion'
import { Back } from '../../ui/NavBar'
import MovieUploader from './movie/MovieUploader'
import SerieUploader from './serie/SerieUploader'
import { UppyProvider } from '../../contexts/UppyContext'

const MediaUploader = () => {
	const [mediaType, setMediaType] = useState('movie') // 'movie' | 'series'
	const [hasSelection, setHasSelection] = useState(false)

	const prefersReducedMotion = useReducedMotion()

	const vignetteAnimate = prefersReducedMotion
		? { opacity: 0.75, scale: 1 }
		: { opacity: [0.65, 0.78, 0.65], scale: [1, 1.02, 1] }

	return (
		<motion.div
			className={`w-full min-h-dvh flex justify-center ${
				hasSelection && 'items-center'
			} scrollable relative`}
			variants={containerVariants}
			initial='hidden'
			animate='visible'
		>
			<Back />

			{/* Background animation overlay */}
			<motion.div
				aria-hidden
				className='pointer-events-none fixed inset-0 -z-10 overflow-hidden'
				// isole la peinture pour limiter l'impact
				style={{ contain: 'paint' }}
			>
				{/* Vignette légère et peu coûteuse (opacity + léger scale) */}
				<motion.div
					className='absolute inset-0 transform-gpu'
					style={{
						background:
							'radial-gradient(circle at 30% 22%, rgba(255,255,255,0.06), rgba(0,0,0,0) 60%)',
						willChange: 'opacity, transform'
					}}
					animate={vignetteAnimate}
					transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
				/>

				{/* Trame légère statique (aucune animation) */}
				<div
					className='absolute inset-0 opacity-[0.12] mix-blend-overlay'
					style={{
						backgroundImage:
							'repeating-linear-gradient(0deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_3px)'
					}}
				/>

				{/* Dégradé principal statique (aucune animation de background-position) */}
				<div
					className='absolute inset-0'
					style={{
						background: 'linear-gradient(140deg,#020305 0%,#0d1117 55%,#111 100%)',
						backgroundSize: '100% 100%'
					}}
				/>
			</motion.div>

			<div className='flex items-center flex-col gap-8 w-full max-w-[860px] px-6 pb-20 mt-10'>
				<motion.h1
					className={`text-[2.8rem] md:text-[3.6rem] font-extrabold tracking-tight text-center bg-linear-to-r from-red-500 via-red-400 to-red-700 bg-clip-text text-transparent ${
						!hasSelection && 'mt-[10vh]'
					}`}
					variants={titleVariants}
					{...glowPulse}
				>
					Importer un média
				</motion.h1>

				<motion.main
					className='w-full rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.02))] backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] p-6 md:p-8 flex flex-col gap-5 text-gray-100 relative z-1'
					variants={cardVariants}
					initial='hidden'
					animate='visible'
				>
					{/* Media Type Selector */}
					<div className='flex gap-4 mb-2'>
						<button
							onClick={() => setMediaType('movie')}
							className={`flex-1 py-3 px-6 rounded-xl text-2xl font-semibold transition cursor-pointer ${
								mediaType === 'movie'
									? 'bg-red-500 text-white'
									: 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
							}`}
						>
							Film
						</button>
						<button
							onClick={() => setMediaType('series')}
							className={`flex-1 py-3 px-6 rounded-xl text-2xl font-semibold transition cursor-pointer ${
								mediaType === 'series'
									? 'bg-red-500 text-white'
									: 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
							}`}
						>
							Série
						</button>
					</div>

					<p className='text-2xl font-semibold tracking-wide uppercase text-gray-200'>
						{mediaType === 'movie' ? 'Identifier le film' : 'Identifier la série'}
					</p>

					<UppyProvider>
						{mediaType === 'movie' ? (
							<MovieUploader onSelectionChange={setHasSelection} />
						) : (
							<SerieUploader onSelectionChange={setHasSelection} />
						)}
					</UppyProvider>
				</motion.main>
			</div>
		</motion.div>
	)
}

export default MediaUploader

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: { duration: 0.45, ease: [0.25, 0.8, 0.4, 1] }
	}
}

const titleVariants = {
	hidden: { opacity: 0, y: 30, scale: 0.98, filter: 'blur(6px)' },
	visible: {
		opacity: 1,
		y: 0,
		scale: 1,
		filter: 'blur(0px)',
		transition: {
			duration: 0.75,
			ease: [0.16, 1, 0.3, 1]
		}
	}
}

const cardVariants = {
	hidden: { opacity: 0, y: 28, scale: 0.97 },
	visible: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
	}
}

const glowPulse = {
	animate: {
		filter: [
			'drop-shadow(0 0 0px rgba(229,0,36,0.0))',
			'drop-shadow(0 0 18px rgba(229,0,36,0.35))',
			'drop-shadow(0 0 0px rgba(229,0,36,0.0))'
		],
		transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' }
	}
}
