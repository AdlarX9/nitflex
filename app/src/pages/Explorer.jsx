import { useMainContext, useAPI } from '../app/hooks'
import './style.scss'
import { Back } from '../components/NavBar'
import Loader from '../components/Loader'
import Movie from '../components/Movie'
import Serie from '../components/Serie'
import OnGoingItem from '../components/OnGoingItem'
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo, useEffect } from 'react'

const fadeIn = (delay = 0) => ({
	initial: { opacity: 0, y: 24, filter: 'blur(4px)' },
	animate: {
		opacity: 1,
		y: 0,
		filter: 'blur(0px)',
		transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }
	}
})

const Explorer = () => {
	const { user, mainMovie, newMoviesPending, newMovies, newSeries, newSeriesPending } =
		useMainContext()
	const [mainBackdrop, setMainBackdrop] = useState(null)

	const { data: ongoingMedia, refetch } = useAPI(
		'GET',
		`/ongoing_media/${user?.id}`,
		{},
		{},
		!!user?.id
	)
	const dedupedOngoing = useMemo(() => {
		if (!Array.isArray(ongoingMedia)) return []
		const seenSeries = new Set()
		const out = []
		for (const it of ongoingMedia) {
			if (it.type === 'episode') {
				if (seenSeries.has(it.seriesId)) continue
				seenSeries.add(it.seriesId)
				out.push(it)
			} else {
				out.push(it)
			}
		}
		return out
	}, [ongoingMedia])
	const hasOngoing = (dedupedOngoing.length || 0) > 0
	const recentList = useMemo(() => newMovies || [], [newMovies])
	const recentSeries = useMemo(() => newSeries || [], [newSeries])

	useEffect(() => {
		if (user?.id) {
			refetch()
		}
		// eslint-disable-next-line
	}, [])

	return (
		<div className='h-dvh scrollable'>
			<motion.div
				key='explorer'
				className='flex items-start flex-col pb-32 min-h-dvh relative w-screen top-0 left-0'
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
			>
				<Back />

				{/* Layered cinematic background */}
				<div className='pointer-events-none absolute inset-0 -z-20 overflow-hidden'>
					{/* Blurred backdrop */}
					{mainBackdrop?.file_path && (
						<motion.img
							key={mainBackdrop.file_path}
							src={'https://image.tmdb.org/t/p/w1280' + mainBackdrop.file_path}
							alt='Décor'
							className='absolute inset-0 w-full h-auto object-cover opacity-50 blur-3xl'
							initial={{ opacity: 0 }}
							animate={{ opacity: 0.6 }}
							transition={{ duration: 0.8, ease: 'easeOut' }}
							loading='lazy'
							decoding='async'
							draggable={false}
						/>
					)}
					{/* Top gradient fade */}
					<div className='absolute top-0 left-0 right-0 h-48 bg-linear-to-b from-black via-transparent to-transparent' />
					{/* Bottom gradient fade */}
					<div className='absolute bottom-0 left-0 right-0 h-72 bg-linear-to-t from-black via-black/30 to-transparent' />
				</div>

				{/* HERO MOVIE */}
				<section className='w-full relative z-10 mt-8 sm:mt-6'>
					<AnimatePresence mode='wait'>
						{mainMovie ? (
							<motion.div
								key={mainMovie.tmdbID || 'hero'}
								className='w-full'
								initial={{ opacity: 0, y: 30, scale: 0.98 }}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								exit={{ opacity: 0, y: -20, scale: 0.98 }}
								transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
							>
								<Movie
									backdropVersion
									movie={mainMovie}
									declareMainBackdrop={setMainBackdrop}
								/>
							</motion.div>
						) : (
							/* Skeleton placeholder when mainMovie not ready */
							<motion.div
								className='w-[96%] ml-[2%] h-150 max-h-[66dvh] rounded-2xl border border-white/10 bg-linear-to-br from-gray-800/50 to-gray-700/40 animate-pulse flex items-center justify-center text-gray-400 text-lg tracking-wide'
								initial={{ opacity: 0 }}
								animate={{ opacity: 0.6 }}
							>
								Chargement du film principal…
							</motion.div>
						)}
					</AnimatePresence>
				</section>

				{/* ONGOING MOVIES */}
				<AnimatePresence>
					{hasOngoing && (
						<motion.section
							key='ongoing'
							className='w-full relative z-10'
							{...fadeIn(0.15)}
						>
							<div className='flex items-baseline justify-between pr-10 mt-12'>
								<h2 className='font-semibold text-[2rem] md:text-[2.4rem] ml-10 tracking-tight text-gray-100 drop-shadow'>
									En cours de visionnage
								</h2>
							</div>

							<div className='relative mt-3'>
								<div
									className='flex gap-5 scrollable scrollable-horizontal mx-10 pt-3 pb-6 scroll-smooth snap-x snap-mandatory'
									style={{ WebkitOverflowScrolling: 'touch' }}
								>
									{dedupedOngoing.map((item, idx) => (
										<div
											key={(item.type || 'm') + '_' + (item.id || idx)}
											className='snap-start'
										>
											<OnGoingItem
												item={item}
												index={idx}
												onDeleted={refetch}
											/>
										</div>
									))}
								</div>
							</div>
						</motion.section>
					)}
				</AnimatePresence>

				{/* RECENT MOVIES */}
				<motion.section
					className='w-full relative z-10'
					{...fadeIn(hasOngoing ? 0.25 : 0.15)}
				>
					<h2 className='font-semibold text-[2rem] md:text-[2.4rem] ml-10 mt-5 mb-4 tracking-tight text-gray-100 drop-shadow'>
						Les plus récents
					</h2>

					{newMoviesPending ? (
						<div className='flex justify-center mt-10'>
							<Loader />
						</div>
					) : recentList.length > 0 ? (
						<div className='flex flex-wrap gap-5 w-full px-10 pt-2'>
							{recentList.map((movie, idx) => (
								<div key={(movie.tmdbID || movie.id || 'm') + '_' + idx}>
									<Movie movie={movie} />
								</div>
							))}
						</div>
					) : (
						<p className='text-gray-300 ml-10 text-lg italic mt-4'>
							Vous n&apos;avez pas de films.
						</p>
					)}
				</motion.section>

				{/* RECENT SERIES */}
				<motion.section className='w-full relative z-10' {...fadeIn(0.2)}>
					<h2 className='font-semibold text-[2rem] md:text-[2.4rem] ml-10 mt-8 mb-4 tracking-tight text-gray-100 drop-shadow'>
						Séries récentes
					</h2>

					{newSeriesPending ? (
						<div className='flex justify-center mt-10'>
							<Loader />
						</div>
					) : recentSeries.length > 0 ? (
						<div className='flex flex-wrap gap-5 w-full px-10 pt-2'>
							{recentSeries.map((series, idx) => (
								<div key={(series.tmdbID || series.id || 's') + '_' + idx}>
									<Serie series={series} />
								</div>
							))}
						</div>
					) : (
						<p className='text-gray-300 ml-10 text-lg italic mt-4'>
							Vous n&apos;avez pas de séries.
						</p>
					)}
				</motion.section>
			</motion.div>
		</div>
	)
}

export default Explorer
