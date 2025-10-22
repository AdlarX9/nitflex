import { useMainContext } from '../app/hooks'
import './style.scss'
import { Back } from '../components/NavBar'
import Loader from '../components/Loader'
import Movie from '../components/Movie'
import Serie from '../components/Serie'
import OnGoingMovie from '../components/OnGoingMovie'
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo } from 'react'

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

	const hasOngoing = (user?.onGoingMovies?.length || 0) > 0
	const recentList = useMemo(() => newMovies || [], [newMovies])
	const recentSeries = useMemo(() => newSeries || [], [newSeries])

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
					{/* Blurred backdrop image */}
					{mainBackdrop?.file_path && (
						<motion.img
							key={mainBackdrop.file_path}
							src={'https://image.tmdb.org/t/p/original' + mainBackdrop.file_path}
							alt='Décor'
							className='absolute inset-0 w-full h-auto max-h-2/3 object-cover opacity-60 blur-[140rem]'
							initial={{ opacity: 0 }}
							animate={{ opacity: 0.7 }}
							transition={{ duration: 1.2, ease: 'easeOut' }}
						/>
					)}
					{/* Top gradient fade */}
					<div className='absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black via-transparent to-transparent' />
					{/* Bottom gradient fade */}
					<div className='absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-black via-black/30 to-transparent' />
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
								className='w-[96%] ml-[2%] h-150 max-h-[66dvh] rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/50 to-gray-700/40 animate-pulse flex items-center justify-center text-gray-400 text-lg tracking-wide'
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
									className='flex gap-5 scrollable scrollable-horizontal px-10 pt-3 pb-6 scroll-smooth snap-x snap-mandatory'
									style={{ WebkitOverflowScrolling: 'touch' }}
								>
									{user.onGoingMovies.map((id, idx) => (
										<motion.div
											key={id + '_' + idx}
											className='snap-start'
											initial={{ opacity: 0, y: 18 }}
											whileInView={{ opacity: 1, y: 0 }}
											viewport={{ once: true, margin: '0px 0px -40px 0px' }}
											transition={{
												duration: 0.45,
												delay: idx * 0.04,
												ease: [0.22, 1, 0.36, 1]
											}}
										>
											<OnGoingMovie id={id} />
										</motion.div>
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
								<motion.div
									key={(movie.tmdbID || movie.id || 'm') + '_' + idx}
									initial={{ opacity: 0, scale: 0.9, y: 20 }}
									whileInView={{ opacity: 1, scale: 1, y: 0 }}
									viewport={{ once: true, margin: '0px 0px -60px 0px' }}
									transition={{
										duration: 0.45,
										delay: Math.min(idx * 0.03, 0.4),
										ease: [0.22, 1, 0.36, 1]
									}}
								>
									<Movie movie={movie} />
								</motion.div>
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
								<motion.div
									key={(series.tmdbID || series.id || 's') + '_' + idx}
									initial={{ opacity: 0, scale: 0.9, y: 20 }}
									whileInView={{ opacity: 1, scale: 1, y: 0 }}
									viewport={{ once: true, margin: '0px 0px -60px 0px' }}
									transition={{
										duration: 0.45,
										delay: Math.min(idx * 0.03, 0.4),
										ease: [0.22, 1, 0.36, 1]
									}}
								>
									<Serie series={series} />
								</motion.div>
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
