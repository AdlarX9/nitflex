import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
// eslint-disable-next-line
import { motion } from 'framer-motion'

const fadeVariants = {
	initial: { opacity: 0, scale: 1.015, filter: 'blur(4px)' },
	loaded: {
		opacity: 1,
		scale: 1,
		filter: 'blur(0px)',
		transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
	}
}

const Serie = ({ series }) => {
	const [imgLoaded, setImgLoaded] = useState(false)
	const [imgError, setImgError] = useState(false)
	const posterExists = series?.poster && series.poster !== 'N/A'

	const handleImgLoad = useCallback(() => setImgLoaded(true), [])
	const handleImgError = useCallback(() => {
		setImgError(true)
		setImgLoaded(true)
	}, [])

	if (!series) return null

	const imgSrc = posterExists ? `https://image.tmdb.org/t/p/w500${series.poster}` : null

	return (
		<div className='relative'>
			<Link
				className='relative p-0 rounded-lg w-40 h-60 overflow-hidden bg-gray-800 flex items-center justify-center group cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-red-600/50 transition-transform'
				to={`/series/${series?.id}`}
				aria-label={`Ouvrir la fiche de la série ${series?.title || 'Série'}`}
			>
				{posterExists && !imgLoaded && (
					<div className='absolute inset-0 bg-gradient-to-br from-gray-800/60 to-gray-700/40 animate-pulse flex items-center justify-center'>
						<div className='w-16 h-16 rounded-full border-4 border-white/10 border-t-red-500 animate-spin' />
					</div>
				)}

				{(!imgLoaded || imgError || !posterExists) && (
					<h3
						className={`z-10 px-4 text-center font-semibold tracking-wide text-sm sm:text-base text-gray-200 ${posterExists ? 'opacity-70 animate-pulse' : 'opacity-90'}`}
					>
						{series?.title || 'Série'}
					</h3>
				)}

				{posterExists && !imgError && (
					<motion.img
						variants={fadeVariants}
						initial='initial'
						animate={imgLoaded ? 'loaded' : 'initial'}
						loading='lazy'
						decoding='async'
						className='absolute inset-0 w-full h-full object-cover group-hover:scale-[1.025] transition duration-[1100ms] ease-[cubic-bezier(.16,1,.3,1)]'
						src={imgSrc}
						alt={series?.title || 'Affiche'}
						onLoad={handleImgLoad}
						onError={handleImgError}
						draggable={false}
					/>
				)}
			</Link>
		</div>
	)
}

export default Serie
