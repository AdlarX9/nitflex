import { Link } from 'react-router-dom'
import { useAPI, useAPIAfter, useMainContext } from '../app/hooks'
import { motion as Motion } from 'framer-motion'
import { IoPlay, IoTrash } from 'react-icons/io5'
import { useState } from 'react'

const OnGoingMovie = ({ id }) => {
	const { data: onGoingMovie, isLoading: onGoingLoading } = useAPI('GET', '/ongoing_movies/' + id)
	const { data: movie, isLoading: movieLoading } = useAPI(
		'GET',
		`/movie/${onGoingMovie?.tmdbID}`,
		{},
		{}
	)
	const { refetchUser } = useMainContext()
	const [imgLoaded, setImgLoaded] = useState(false)
	const [isHovered, setIsHovered] = useState(false)
	const { triggerAsync: deleteOnGoingMovie } = useAPIAfter('DELETE', '/ongoing_movies/' + id)

	const onDelete = () => {
		deleteOnGoingMovie().then(() => {
			refetchUser()
		})
	}

	if (onGoingLoading || movieLoading || !movie || !onGoingMovie) {
		return <div className='relative w-60 h-36 rounded-lg bg-gray-700 animate-pulse shrink-0' />
	}

	const progressPercent = (onGoingMovie.position / onGoingMovie.duration) * 100
	const posterExists = movie?.poster && movie.poster !== 'N/A'

	return (
		<Motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className='relative w-60 h-36 rounded-lg overflow-hidden bg-gray-800 shrink-0 group'
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{/* Poster Image */}
			<Link to={`/viewer/movie/${movie?.tmdbID}`} className='absolute inset-0'>
				{posterExists ? (
					<>
						{!imgLoaded && (
							<div className='absolute inset-0 flex items-center justify-center text-white text-center p-2'>
								<h3 className='text-sm font-medium'>{movie?.title || 'Film'}</h3>
							</div>
						)}
						<Motion.img
							initial={{ opacity: 0 }}
							animate={{ opacity: imgLoaded ? 1 : 0 }}
							transition={{ duration: 0.3 }}
							src={`https://image.tmdb.org/t/p/w500${movie?.poster}`}
							alt={movie?.title}
							className='absolute inset-0 w-full h-full object-cover'
							onLoad={() => setImgLoaded(true)}
						/>
					</>
				) : (
					<div className='absolute inset-0 flex items-center justify-center text-white text-center p-2'>
						<h3 className='text-sm font-medium'>{movie?.title || 'Film'}</h3>
					</div>
				)}

				{/* Dark overlay on hover */}
				<Motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: isHovered ? 0.7 : 0 }}
					transition={{ duration: 0.2 }}
					className='absolute inset-0 bg-black flex items-center justify-center'
				>
					<IoPlay size={40} className='text-white' />
				</Motion.div>
			</Link>

			{/* Title overlay at bottom */}
			<div className='absolute bottom-0 left-0 right-0 p-2 bg-linear-to-t from-black/90 to-transparent'>
				<h4 className='text-white text-xs font-medium truncate'>{movie?.title}</h4>
				<p className='text-gray-300 text-xs'>
					{Math.round(onGoingMovie.position / 60)} min /{' '}
					{Math.round(onGoingMovie.duration / 60)} min
				</p>
			</div>

			{/* Progress bar */}
			<div className='absolute bottom-0 left-0 right-0 h-1 bg-black'>
				<Motion.div
					initial={{ width: 0 }}
					animate={{ width: `${progressPercent}%` }}
					transition={{ duration: 0.5, ease: 'easeOut' }}
					className='h-full bg-nitflex-red'
				/>
			</div>

			{/* Delete button */}
			{onDelete && (
				<button
					onClick={e => {
						e.preventDefault()
						onDelete()
					}}
					className='absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10'
					title='Supprimer'
				>
					<IoTrash size={16} />
				</button>
			)}
		</Motion.div>
	)
}

export default OnGoingMovie
