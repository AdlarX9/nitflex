import { useEffect, useState, useCallback } from 'react'
import { useGetMovieCovers, useMainContext } from '../../utils/hooks'
import { IoPlay } from 'react-icons/io5'
/* eslint-disable-next-line */
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const fadeVariants = {
	initial: { opacity: 0, scale: 1.015, filter: 'blur(4px)' },
	loaded: {
		opacity: 1,
		scale: 1,
		filter: 'blur(0px)',
		transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
	}
}

const Movie = ({ movie, backdropVersion = false, declareMainBackdrop = null }) => {
	const [imgLoaded, setImgLoaded] = useState(false)
	const [imgError, setImgError] = useState(false)
	const posterExists = movie?.poster && movie.poster !== 'N/A'
	const { mainBackdropRef, processMainBackdrop } = useMainContext()
	const [mainBackdrop, setMainBackdrop] = useState(null)
	const { backdrops } = useGetMovieCovers(movie?.tmdbID)

	useEffect(() => {
		if (backdropVersion) {
			processMainBackdrop(backdrops)
			setMainBackdrop(mainBackdropRef.current)
			declareMainBackdrop(mainBackdropRef.current)
		}
	}, [backdrops, processMainBackdrop, mainBackdropRef, backdropVersion, declareMainBackdrop])

	const handleImgLoad = useCallback(() => setImgLoaded(true), [])
	const handleImgError = useCallback(() => {
		setImgError(true)
		setImgLoaded(true)
	}, [])

	if (!movie) return null

	const linkBaseClasses = backdropVersion
		? 'relative w-[96%] ml-[2%] mt-[2%] h-150 max-h-[66dvh] min-h-[50dvh] shadow-2xl shadow-black border border-gray-600/60 rounded-2xl bg-gray-700/50 flex items-center justify-center overflow-hidden group focus:outline-none focus-visible:ring-4 focus-visible:ring-red-600/50 transition-transform'
		: 'relative p-0 rounded-lg w-40 h-60 overflow-hidden bg-gray-800 flex items-center justify-center group cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-red-600/50 transition-transform'

	const overlayReadable = backdropVersion ? (
		<>
			{/* Soft gradient & vignette */}
			<div className='pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-black/15 to-transparent opacity-95 mix-blend-multiply' />
			<div className='pointer-events-none absolute inset-0 bg-linear-to-br from-black/30 via-transparent to-black/40' />
			{/* Subtle noise */}
			<div
				className='pointer-events-none absolute inset-0 opacity-[0.15] mix-blend-overlay'
				style={{
					backgroundImage:
						'repeating-linear-gradient(0deg,rgba(255,255,255,0.06)_0,rgba(255,255,255,0.06)_1px,transparent_1px,transparent_2px)'
				}}
			/>
		</>
	) : null

	// Build image src
	const imgSrc = backdropVersion
		? `https://image.tmdb.org/t/p/original${mainBackdrop?.file_path || movie?.poster || ''}`
		: `https://image.tmdb.org/t/p/w500${movie?.poster}`

	const showFallbackTitle = !imgLoaded || imgError || !posterExists

	return (
		<div className={backdropVersion ? 'relative w-full' : 'relative'}>
			<Link
				className={`${linkBaseClasses} ${backdropVersion ? 'cursor-pointer' : ''}`}
				to={`/movie/${movie?.tmdbID}`}
				aria-label={`Ouvrir la fiche du film ${movie?.title || 'Film'}`}
			>
				{/* Skeleton / shimmer */}
				{posterExists && !imgLoaded && (
					<div className='absolute inset-0 bg-linear-to-br from-gray-800/60 to-gray-700/40 animate-pulse flex items-center justify-center'>
						<div className='w-16 h-16 rounded-full border-4 border-white/10 border-t-red-500 animate-spin' />
					</div>
				)}

				{/* Title fallback (centered) */}
				{showFallbackTitle && (
					<h3
						className={`z-10 px-4 text-center font-semibold tracking-wide text-sm sm:text-base text-gray-200 ${
							posterExists ? 'opacity-70 animate-pulse' : 'opacity-90'
						}`}
					>
						{movie?.title || 'Film'}
					</h3>
				)}

				{/* Poster / Backdrop */}
				{posterExists && !imgError && (
					<motion.img
						variants={fadeVariants}
						initial='initial'
						animate={imgLoaded ? 'loaded' : 'initial'}
						loading='lazy'
						decoding='async'
						className={`absolute inset-0 w-full h-full object-cover ${
							backdropVersion ? 'will-change-transform' : ''
						} group-hover:scale-[1.025] transition duration-1100 ease-[cubic-bezier(.16,1,.3,1)]`}
						src={imgSrc}
						alt={movie?.title || 'Affiche'}
						onLoad={handleImgLoad}
						onError={handleImgError}
						draggable={false}
					/>
				)}

				{/* Ambient hover highlight (not on fallback) */}
				{posterExists && !imgError && (
					<div className='absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-linear-to-t from-black/50 via-transparent to-black/40 mix-blend-overlay' />
				)}

				{overlayReadable}
			</Link>

			{/* Backdrop version watch button */}
			{backdropVersion && (
				<Link
					to={`/viewer/movie/${movie?.tmdbID}`}
					className='absolute bottom-5 left-[3.5%] text-black bg-white/90 hover:bg-white rounded-2xl font-semibold flex items-center gap-2 cursor-pointer transition px-7 py-3 shadow-lg shadow-black/40 hover:shadow-xl hover:shadow-black/60 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40'
					aria-label={`Lecture du film ${movie?.title}`}
				>
					<IoPlay className='text-xl' />
					<span className='text-sm sm:text-base tracking-wide'>Lecture</span>
				</Link>
			)}
		</div>
	)
}

export default Movie
