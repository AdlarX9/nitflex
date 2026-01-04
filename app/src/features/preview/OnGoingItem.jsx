import { Link } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { IoTrash } from 'react-icons/io5'
import {
	useAPI,
	useAPIAfter,
	useGetEpisodeDetails,
	useGetFullMovie,
	useGetFullSerie
} from '../../utils/hooks'
import { useState, memo } from 'react'

const ProgressBar = ({ percent }) => (
	<div className='absolute bottom-0 left-0 right-0 h-1 bg-black'>
		<div
			className='h-full bg-nitflex-red transition-[width] duration-500 ease-out'
			style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
		/>
	</div>
)

const OnGoingItem = ({ item, index = 0, onDeleted }) => {
	const [imgLoaded, setImgLoaded] = useState(false)
	const progressPercent = (item.position / (item.duration || 1)) * 100
	const serieTmdb = item?.type === 'episode' ? item?.tmdbID : null
	const movieTmdb = item?.type === 'movie' ? item?.tmdbID : null
	const { data: episodeDetails } = useGetEpisodeDetails(
		serieTmdb,
		item?.seasonNumber,
		item?.episodeNumber
	)
	const { data: series } = useGetFullSerie(serieTmdb)

	// Always call hooks in same order; enable based on type
	const { data: movie, isLoading: movieLoading } = useGetFullMovie(movieTmdb)
	const { data: episode, isLoading: epLoading } = useAPI(
		'GET',
		`/episode/${item.episodeId}`,
		{},
		{},
		item.type === 'episode'
	)

	// Delete hook (unified)
	const ogId = item?.ogId || item?.id
	const { triggerAsync: deleteOnGoingMedia } = useAPIAfter('DELETE', `/ongoing_media/${ogId}`)

	const onDelete = e => {
		e?.preventDefault?.()
		e?.stopPropagation?.()
		const req = deleteOnGoingMedia()
		Promise.resolve(req).then(() => {
			onDeleted?.()
		})
	}

	if (item.type === 'movie') {
		if (movieLoading || !movie) {
			return (
				<div className='relative w-60 h-36 rounded-lg bg-gray-700 animate-pulse shrink-0' />
			)
		}

		const posterExists = Boolean(movie?.backdrop_path || movie?.poster_path)

		return (
			<Motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
				className='relative w-60 h-36 rounded-lg overflow-hidden bg-gray-800 shrink-0 group'
			>
				<Link to={`/viewer/movie/${item.tmdbID}`} className='absolute inset-0 block'>
					{posterExists ? (
						<>
							{!imgLoaded && (
								<div className='absolute inset-0 flex items-center justify-center text-white text-center p-2'>
									<h3 className='text-sm font-medium'>
										{movie?.title || 'Film'}
									</h3>
								</div>
							)}
							<img
								src={`https://image.tmdb.org/t/p/w500${movie?.backdrop_path || movie?.poster_path}`}
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
				</Link>

				<div className='absolute bottom-0 left-0 right-0 p-2 bg-linear-to-t from-black/90 to-transparent'>
					<h4 className='text-white text-xs font-medium truncate'>{movie?.title}</h4>
					<p className='text-gray-300 text-xs'>
						{Math.round(item.position / 60)} min / {Math.round(item.duration / 60)} min
					</p>
				</div>

				<ProgressBar percent={progressPercent} />

				<button
					onClick={onDelete}
					className='absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10 cursor-pointer'
					title='Supprimer'
				>
					<IoTrash size={16} />
				</button>
			</Motion.div>
		)
	}

	// Episode tile
	// Reuse Viewer hook semantics would require more context; keep it light for the tile
	const episodeTitle = episode?.title || `S${item.seasonNumber}E${item.episodeNumber}`

	if (epLoading || !episode) {
		return <div className='relative w-60 h-36 rounded-lg bg-gray-700 animate-pulse shrink-0' />
	}

	return (
		<Motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
			className='relative w-60 h-36 rounded-lg overflow-hidden bg-gray-800 shrink-0 group'
		>
			<Link
				to={`/viewer/episode/${item.episodeId}`}
				className='absolute inset-0 block cursor-pointer'
			>
				{episodeDetails?.still_path ? (
					<>
						{!imgLoaded && (
							<div className='absolute inset-0 flex items-center justify-center text-white text-center p-2'>
								<h3 className='text-sm font-medium'>
									{episodeDetails?.name || 'Episode'}
								</h3>
							</div>
						)}
						<img
							src={`https://image.tmdb.org/t/p/w500${episodeDetails?.still_path}`}
							alt={episodeDetails?.name}
							className='absolute inset-0 w-full h-full object-cover'
							onLoad={() => setImgLoaded(true)}
						/>
					</>
				) : (
					<div className='absolute inset-0 flex items-center justify-center text-white text-center p-2'>
						<h3 className='text-sm font-medium'>{episodeDetails?.name || 'Episode'}</h3>
					</div>
				)}

				<div className='absolute bottom-0 left-0 right-0 p-2 bg-linear-to-t from-black/90 to-transparent'>
					<h4 className='text-white text-xs font-medium truncate'>
						{series?.name && series.name + ' - '}
						{episodeTitle}
					</h4>
					<p className='text-gray-300 text-xs'>
						{Math.round(item.position / 60)} min / {Math.round(item.duration / 60)} min
					</p>
				</div>
				<ProgressBar percent={progressPercent} />

				<button
					onClick={onDelete}
					className='absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10 cursor-pointer'
					title='Supprimer'
				>
					<IoTrash size={16} />
				</button>
			</Link>
		</Motion.div>
	)
}

export default memo(OnGoingItem)
