import { useEffect, useState, useRef, useMemo } from 'react'
import { useAPI, useAPIAfter } from '../utils/hooks'
import Movie from '../features/preview/Movie.jsx'
import Serie from '../features/preview/Serie.jsx'
import {
	IoSettingsOutline,
	IoClose,
	IoSearchOutline,
	IoRefresh,
	IoFilterCircle,
	IoFlash
} from 'react-icons/io5'
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion'

/* CONFIG */
const ORDERING = {
	'date:desc': 'Récents',
	'date:asc': 'Anciens',
	'title:asc': 'Titre A-Z',
	'title:desc': 'Titre Z-A'
}
const GENRES = {
	'': 'Tout',
	action: 'Action',
	animation: 'Animation',
	adventure: 'Aventure',
	comedy: 'Comédie',
	drama: 'Drame',
	science_fiction: 'Science-fiction',
	thriller: 'Thriller'
}

/* VARIANTS */
const sidebarVariants = {
	hidden: { x: '-100%', opacity: 0 },
	show: { x: 0, opacity: 1, transition: { duration: 0.28, ease: [0.25, 0.8, 0.4, 1] } },
	exit: { x: '-100%', opacity: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } }
}
const chipVariants = {
	initial: { opacity: 0, y: 10, scale: 0.95 },
	animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: 'easeOut' } }
}
const cardVariants = {
	initial: { opacity: 0, y: 14, scale: 0.95 },
	animate: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: { duration: 0.25, ease: [0.25, 0.8, 0.4, 1] }
	}
}
const Skeleton = ({ w = 200, h = 300 }) => (
	<div
		className='relative rounded-2xl overflow-hidden bg-linear-to-br from-gray-700/40 to-gray-800/40 border border-white/10 animate-pulse'
		style={{ width: w, height: h }}
	>
		<div className='absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.18)_50%,rgba(255,255,255,0)_100%)] bg-size-[190%_100%] animate-[shimmer_1.4s_infinite]' />
	</div>
)

const Search = () => {
	const { triggerAsync: searchMovies } = useAPIAfter('GET', '/movies')
	const { data: seriesList } = useAPI('GET', '/series')

	const [mode, setMode] = useState('movies')
	const [movies, setMovies] = useState([])
	const [seriesResults, setSeriesResults] = useState([])
	const [isLoading, setIsLoading] = useState(false)
	const [hasSearched, setHasSearched] = useState(false)

	const [title, setTitle] = useState('')
	const [genre, setGenre] = useState('')
	const [order, setOrder] = useState('date:desc')

	const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024)
	const [pending, setPending] = useState(false)
	const abortRef = useRef(null)

	/* Responsive */
	useEffect(() => {
		const handleResize = () => setIsSidebarOpen(window.innerWidth >= 1024)
		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	/* Params */
	const params = useMemo(
		() => ({
			...(title && { title }),
			...(mode === 'movies' && genre && { genre }),
			orderBy: order,
			limit: 50
		}),
		[title, genre, order, mode]
	)

	/* Search */
	const performSearch = () => {
		if (abortRef.current) abortRef.current.abort()
		const controller = new AbortController()
		abortRef.current = controller

		if (mode === 'movies' && !title && !genre) {
			setMovies([])
			setHasSearched(false)
			setIsLoading(false)
			setPending(false)
			return
		}
		if (mode === 'series' && !title) {
			setSeriesResults([])
			setHasSearched(false)
			setIsLoading(false)
			setPending(false)
			return
		}

		setIsLoading(true)
		setHasSearched(true)
		setPending(false)

		if (mode === 'movies') {
			searchMovies({ signal: controller.signal }, params)
				.then(res => {
					if (controller.signal.aborted) return
					setMovies(Array.isArray(res) ? res : [])
					setIsLoading(false)
				})
				.catch(() => {
					if (controller.signal.aborted) return
					setMovies([])
					setIsLoading(false)
				})
		} else {
			const list = Array.isArray(seriesList) ? seriesList : []
			const filtered = title
				? list.filter(s => (s.title || '').toLowerCase().includes(title.toLowerCase()))
				: list
			const sorted = [...filtered]
			const [field, dir] = order.split(':')
			const asc = dir === 'asc' ? 1 : -1
			sorted.sort((a, b) => {
				if (field === 'date') {
					const aDate = a.date ? new Date(a.date) : 0
					const bDate = b.date ? new Date(b.date) : 0
					return aDate > bDate ? asc : aDate < bDate ? -asc : 0
				}
				if (field === 'title') {
					return (a.title || '').localeCompare(b.title || '') * asc
				}
				return 0
			})
			setSeriesResults(sorted)
			setIsLoading(false)
		}
	}

	/* Debounce */
	useEffect(() => {
		// eslint-disable-next-line
		setPending(mode === 'movies' ? Boolean(title || genre) : Boolean(title))
		performSearch()
		// eslint-disable-next-line
	}, [title, genre, order, mode, seriesList])

	const clearAll = () => {
		setTitle('')
		setGenre('')
		setOrder('date:desc')
		setMovies([])
		setHasSearched(false)
		setPending(false)
		setIsLoading(false)
	}

	const activeFilters = useMemo(() => {
		const list = []
		if (genre) list.push(GENRES[genre])
		if (order !== 'date:desc') list.push(ORDERING[order])
		return list
	}, [genre, order])

	return (
		<div className='relative min-h-dvh w-full bg-black text-gray-100 overflow-hidden font-sans'>
			{/* Background */}
			<div className='pointer-events-none absolute inset-0 -z-10'>
				<div className='absolute inset-0 bg-[radial-gradient(circle_at_32%_20%,rgba(255,255,255,0.11),rgba(0,0,0,0)_60%)] mix-blend-screen opacity-60' />
				<div
					className='absolute inset-0 opacity-[0.16] mix-blend-overlay'
					style={{
						backgroundImage:
							'repeating-linear-gradient(0deg,rgba(255,255,255,0.05)_0,rgba(255,255,255,0.05)_1px,transparent_1px,transparent_3px)'
					}}
				/>
				<div className='absolute inset-0 bg-linear-to-b from-black via-[#0c1219] to-black' />
			</div>

			<div className='flex min-h-dvh w-full'>
				{/* SIDEBAR */}
				<AnimatePresence initial={false}>
					{isSidebarOpen && (
						<>
							<motion.div
								key='overlay'
								initial={{ opacity: 0 }}
								animate={{ opacity: 0.55 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.2 }}
								className='fixed inset-0 bg-black/70 backdrop-blur-sm lg:hidden z-40'
								onClick={() => setIsSidebarOpen(false)}
							/>
							<motion.aside
								key='aside'
								variants={sidebarVariants}
								initial='hidden'
								animate='show'
								exit='exit'
								className='z-50 flex flex-col h-dvh w-[85%] max-w-[320px] lg:max-w-none lg:w-[360px] fixed lg:static top-0 left-0 bg-linear-to-b from-[#111924]/95 to-[#0d141c]/90 backdrop-blur-2xl border-r border-white/10 shadow-2xl lg:shadow-none pb-18'
							>
								{/* Header inside sidebar */}
								<div className='flex items-center justify-between px-7 pt-7 pb-5'>
									<h2 className='text-[1.6rem] leading-none font-bold tracking-wide uppercase bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent'>
										Filtres
									</h2>
									<button
										onClick={() => setIsSidebarOpen(false)}
										className='lg:hidden w-12 h-12 inline-flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10'
										title='Fermer'
									>
										<IoClose className='text-3xl' />
									</button>
								</div>

								<div className='flex-1 overflow-y-auto px-7 pb-10 space-y-12'>
									{/* GENRES */}
									{mode === 'movies' && (
										<section>
											<p className='text-[1rem] font-semibold uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2'>
												<span className='w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(255,0,0,0.55)]' />
												Genre
											</p>
											<div className='flex flex-wrap gap-3'>
												{Object.entries(GENRES).map(([key, label], idx) => {
													const active = key === genre
													return (
														<motion.button
															key={key}
															variants={chipVariants}
															initial='initial'
															animate='animate'
															custom={idx}
															onClick={() => setGenre(key)}
															className={`px-5 py-2.5 rounded-full text-[0.95rem] font-medium border transition ${
																active
																	? 'bg-red-500/25 border-red-400/60 text-red-200 shadow-[0_0_0_1px_rgba(255,0,0,0.35)]'
																	: 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
															}`}
														>
															{label}
														</motion.button>
													)
												})}
											</div>
										</section>
									)}

									{/* ORDER */}
									<section>
										<p className='text-[1rem] font-semibold uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2'>
											<span className='w-3 h-3 rounded-full bg-blue-500/80 shadow-[0_0_8px_rgba(56,132,255,0.55)]' />
											Ordre
										</p>
										<div className='flex flex-wrap gap-3'>
											{Object.entries(ORDERING).map(([key, label], idx) => {
												const active = key === order
												return (
													<motion.button
														key={key}
														variants={chipVariants}
														initial='initial'
														animate='animate'
														custom={idx}
														onClick={() => setOrder(key)}
														className={`px-5 py-2.5 rounded-full text-[0.95rem] font-medium border transition ${
															active
																? 'bg-blue-500/25 border-blue-400/60 text-blue-200 shadow-[0_0_0_1px_rgba(56,132,255,0.35)]'
																: 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
														}`}
													>
														{label}
													</motion.button>
												)
											})}
										</div>
									</section>
								</div>

								{/* Footer */}
								<div className='px-7 pt-6 pb-8 border-t border-white/10'>
									<button
										onClick={clearAll}
										className='w-full inline-flex items-center justify-center gap-4 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[1rem] font-semibold uppercase tracking-wide transition disabled:opacity-40 disabled:cursor-not-allowed'
										disabled={!title && !genre && order === 'date:desc'}
									>
										<IoRefresh className='text-2xl opacity-80' />
										Réinitialiser
									</button>
									<p className='mt-4 text-[0.8rem] text-center text-gray-500 leading-snug'>
										Mise à jour automatique des résultats.
									</p>
								</div>
							</motion.aside>
						</>
					)}
				</AnimatePresence>

				{/* MAIN */}
				<div className='flex flex-col flex-1 min-w-0 h-dvh'>
					{/* HEADER */}
					<header className='flex flex-col gap-5 px-7 2xl:px-12 pt-7 pb-5 border-b border-white/10 bg-gray-900/40 backdrop-blur-2xl sticky top-0 z-30'>
						<div className='flex items-center gap-6'>
							<button
								onClick={() => setIsSidebarOpen(o => !o)}
								className='lg:hidden inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition'
								title='Filtres'
							>
								{isSidebarOpen ? (
									<IoClose className='text-4xl' />
								) : (
									<IoSettingsOutline className='text-4xl' />
								)}
							</button>
							<div className='relative flex-1'>
								<IoSearchOutline className='absolute left-5 top-1/2 -translate-y-1/2 text-[1.9rem]' />
								<input
									type='text'
									placeholder={
										mode === 'movies'
											? 'Rechercher un film...'
											: 'Rechercher une série...'
									}
									className='w-full pl-20 pr-6 py-5 rounded-2xl bg-gray-950/75 backdrop-blur border border-white/10 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30 outline-none text-[1.35rem] leading-none placeholder:text-gray-500 font-semibold tracking-wide transition'
									value={title}
									onChange={e => setTitle(e.target.value)}
									autoFocus
								/>
								<AnimatePresence>
									{pending && !isLoading && (
										<motion.div
											initial={{ opacity: 0, x: 12 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: 12 }}
											className='absolute right-5 top-1/2 -translate-y-1/2 text-[0.85rem] font-semibold uppercase tracking-wider text-amber-300/90 flex items-center gap-2'
										>
											<IoFlash className='text-2xl animate-pulse' />
											<span className='hidden md:inline'>Recherche…</span>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
							<div className='hidden md:flex items-center gap-2'>
								<button
									onClick={() => setMode('movies')}
									className={`px-4 h-14 text-xl rounded-2xl font-semibold uppercase tracking-wide transition border ${mode === 'movies' ? 'bg-red-600 text-white border-red-500' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}
								>
									Films
								</button>
								<button
									onClick={() => setMode('series')}
									className={`px-4 h-14 text-xl rounded-2xl font-semibold uppercase tracking-wide transition border ${mode === 'series' ? 'bg-red-600 text-white border-red-500' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}
								>
									Séries
								</button>
							</div>
							<button
								onClick={clearAll}
								className='hidden md:inline-flex items-center gap-4 px-7 h-14 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[0.95rem] font-semibold uppercase tracking-wide transition disabled:opacity-40 disabled:cursor-not-allowed'
								disabled={!title && !genre && order === 'date:desc'}
							>
								<IoRefresh className='text-2xl opacity-80' />
								Réinitialiser
							</button>
						</div>

						{/* Active filters */}
						<AnimatePresence>
							{(activeFilters.length > 0 || order !== 'date:desc') && (
								<motion.div
									initial={{ opacity: 0, y: -10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									className='flex flex-wrap items-center gap-4'
								>
									<span className='text-[0.95rem] uppercase tracking-wider font-bold text-gray-400 flex items-center gap-2'>
										<IoFilterCircle className='text-2xl' />
										Actifs :
									</span>
									{activeFilters.map((f, i) => (
										<motion.span
											key={f}
											variants={chipVariants}
											initial='initial'
											animate='animate'
											custom={i}
											className='px-5 py-2 rounded-full text-[0.85rem] font-medium bg-white/10 border border-white/10 backdrop-blur-sm text-gray-100'
										>
											{f}
										</motion.span>
									))}
									{mode === 'movies' && genre && (
										<button
											onClick={() => setGenre('')}
											className='text-[0.8rem] px-5 py-2 rounded-full bg-red-500/30 hover:bg-red-500/40 text-red-100 border border-red-500/50 transition font-semibold'
										>
											Supprimer genre
										</button>
									)}
									{order !== 'date:desc' && (
										<button
											onClick={() => setOrder('date:desc')}
											className='text-[0.8rem] px-5 py-2 rounded-full bg-blue-500/30 hover:bg-blue-500/40 text-blue-100 border border-blue-500/50 transition font-semibold'
										>
											Ordre par défaut
										</button>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</header>

					{/* RESULTS SCROLL AREA */}
					<div className='flex-1 overflow-y-auto px-7 2xl:px-12 pt-8 pb-24'>
						{/* Stats Row */}
						<div className='flex flex-wrap items-end justify-between gap-8 mb-10'>
							<div className='flex flex-col'>
								<h3 className='text-[1.9rem] font-extrabold tracking-tight text-gray-100 flex items-center gap-4'>
									Résultats
									<AnimatePresence mode='popLayout'>
										{hasSearched && !isLoading && (
											<motion.span
												key={
													mode === 'movies'
														? movies.length
														: seriesResults.length
												}
												initial={{ opacity: 0, y: -8 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: 8 }}
												className='text-[0.95rem] font-bold px-4 py-1.5 rounded-full bg-white/10 border border-white/10'
											>
												{mode === 'movies'
													? movies.length
													: seriesResults.length}
											</motion.span>
										)}
									</AnimatePresence>
								</h3>
								<span className='text-[0.9rem] uppercase tracking-wider text-gray-500 font-medium'>
									{!hasSearched
										? mode === 'movies'
											? 'Tapez un titre ou choisissez un genre'
											: 'Tapez un titre'
										: isLoading
											? 'Chargement...'
											: mode === 'movies'
												? movies.length === 0
													? 'Aucun résultat'
													: 'Films trouvés'
												: seriesResults.length === 0
													? 'Aucun résultat'
													: 'Séries trouvées'}
								</span>
							</div>
						</div>

						{/* Content States */}
						<AnimatePresence mode='wait'>
							{isLoading ? (
								<motion.div
									key='loading'
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									className='grid gap-8 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6'
								>
									{Array.from({ length: 12 }).map((_, i) => (
										<Skeleton key={i} />
									))}
								</motion.div>
							) : !hasSearched ? (
								<motion.div
									key='prompt'
									initial={{ opacity: 0, y: 25 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0 }}
									className='w-full flex flex-col items-center justify-center py-32 text-gray-400'
								>
									<IoSearchOutline size={140} className='mb-10 opacity-25' />
									<p className='text-[2rem] font-extrabold tracking-tight'>
										{mode === 'movies'
											? 'Recherchez un film'
											: 'Recherchez une série'}
									</p>
									<p className='text-[1rem] mt-5 text-gray-500 font-medium'>
										{mode === 'movies'
											? 'Saisissez un titre ou appliquez un genre'
											: 'Saisissez un titre'}
									</p>
								</motion.div>
							) : (
									mode === 'movies'
										? movies.length === 0
										: seriesResults.length === 0
							  ) ? (
								<motion.div
									key='no-results'
									initial={{ opacity: 0, y: 25 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0 }}
									className='w-full flex flex-col items-center justify-center py-32 text-gray-400'
								>
									<p className='text-[2rem] font-extrabold tracking-tight'>
										Aucun {mode === 'movies' ? 'film' : 'résultat'} trouvé
									</p>
									<p className='text-[1rem] mt-5 text-gray-500 font-medium'>
										{mode === 'movies'
											? 'Modifiez vos critères ou réinitialisez les filtres'
											: 'Modifiez votre recherche'}
									</p>
								</motion.div>
							) : (
								<motion.div
									key='results-grid'
									className='grid gap-8 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6'
									initial='initial'
									animate='animate'
								>
									{mode === 'movies'
										? movies.map((movie, idx) => (
												<motion.div
													key={movie?.id || idx}
													variants={cardVariants}
													custom={idx}
													initial='initial'
													animate='animate'
												>
													<Movie movie={movie} />
												</motion.div>
											))
										: seriesResults.map((s, idx) => (
												<motion.div
													key={s?.id || idx}
													variants={cardVariants}
													custom={idx}
													initial='initial'
													animate='animate'
												>
													<Serie series={s} />
												</motion.div>
											))}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>
			</div>

			{/* Bottom gradient */}
			<div className='pointer-events-none fixed bottom-0 left-0 right-0 h-40 bg-linear-to-t from-black to-transparent' />
		</div>
	)
}

export default Search
