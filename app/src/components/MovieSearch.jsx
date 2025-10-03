import { useState, useEffect, useRef } from 'react'
import { IoBugOutline, IoSearch, IoCloseCircleOutline } from 'react-icons/io5'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_KEY
const TMDB_ENDPOINT = 'https://api.themoviedb.org/3/search/movie'
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w185'

/**
 * Composant de recherche de films (TMDB)
 * Modernisé : style "glass", transitions, meilleure lisibilité, feedback visuel.
 * - Aucune modification fonctionnelle : même API, même prop onSelect, même structure générale.
 */
const MovieSearch = ({ onSelect }) => {
	const [query, setQuery] = useState('')
	const [results, setResults] = useState([])
	const [loading, setLoading] = useState(false)
	const [focused, setFocused] = useState(false)
	const fetchTimeout = useRef()
	const errorRef = useRef('')

	// Mémorisation de la requête pour éviter le flicker si on tape rapidement
	useEffect(() => {
		if (!query) {
			setResults([])
			setLoading(false)
			return
		}
		setLoading(true)
		clearTimeout(fetchTimeout.current)
		fetchTimeout.current = setTimeout(async () => {
			try {
				errorRef.current = ''
				const res = await fetch(
					`${TMDB_ENDPOINT}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
						query
					)}&include_adult=false&language=fr-FR`
				)
				const data = await res.json()
				if (data?.results?.length) {
					const mapped = data.results.map(movie => ({
						...movie,
						poster: movie.poster_path ? `${TMDB_IMAGE}${movie.poster_path}` : null
					}))
					setResults(mapped)
				} else {
					setResults([])
				}
			} catch (err) {
				setResults([])
				errorRef.current = err.message
			}
			setLoading(false)
		}, 400)
		return () => clearTimeout(fetchTimeout.current)
	}, [query])

	const clearQuery = () => {
		setQuery('')
		setResults([])
		errorRef.current = ''
	}

	return (
		<div className='relative w-full font-sans'>
			{/* Label */}
			<label
				htmlFor='movie-search'
				className='block font-bold text-xl tracking-wide bg-gradient-to-r from-gray-200 to-gray-500 bg-clip-text text-transparent'
			>
				Nom du film
			</label>

			{/* Search wrapper */}
			<div
				className={`relative group rounded-xl overflow-hidden border 
					${focused ? 'border-red-500/70 shadow-[0_0_0_3px_rgba(229,9,20,0.25)]' : 'border-white/10'} 
					bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] 
					backdrop-blur-md transition-all`}
			>
				{/* Icone gauche */}
				<div className='absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none'>
					<IoSearch className='text-gray-400 text-xl' />
				</div>

				<input
					id='movie-search'
					type='text'
					autoComplete='off'
					value={query}
					onChange={e => setQuery(e.target.value)}
					onFocus={() => setFocused(true)}
					onBlur={() => setTimeout(() => setFocused(false), 150)}
					placeholder='Rechercher un film...'
					className='w-full pl-14 pr-12 py-4 bg-transparent text-gray-100 placeholder:text-gray-500 text-lg leading-none outline-none'
				/>

				{/* Clear button */}
				{query && (
					<button
						type='button'
						onClick={clearQuery}
						className='absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-200 transition'
						title='Effacer'
						tabIndex={0}
					>
						<IoCloseCircleOutline size={22} />
					</button>
				)}

				{/* Loader bar (top) */}
				<div
					className={`absolute top-0 left-0 h-[3px] bg-gradient-to-r from-red-500 via-red-400 to-red-600 transition-all duration-500 ${
						loading ? 'w-full opacity-100' : 'w-0 opacity-0'
					}`}
				/>
			</div>

			{/* Dropdown results */}
			<div className='relative'>
				{focused && results.length > 0 && (
					<ul
						className='absolute left-0 right-0 mt-2 z-50 rounded-xl border border-white/10 
						bg-[linear-gradient(145deg,rgba(18,18,20,0.95),rgba(30,30,38,0.92))] backdrop-blur-xl 
						shadow-2xl scrollable max-h-120'
					>
						{results.map((movie, idx) => {
							const year = movie.release_date?.split('-')[0] || '—'
							return (
								<li
									key={`${movie.id}-${idx}`}
									className='flex gap-4 px-4 py-3 cursor-pointer items-center border-b border-white/5 last:border-none hover:bg-white/5 active:bg-white/10 transition-colors'
									onMouseDown={() => {
										setQuery(movie.title)
										setFocused(false)
										setResults([])
										if (onSelect) onSelect(movie)
									}}
								>
									{/* Poster */}
									<div className='h-20 rounded-md overflow-hidden bg-gray-800/40 flex items-center justify-center border border-white/10 flex-shrink-0 shadow-inner'>
										{movie.poster ? (
											<img
												src={movie.poster}
												alt={movie.title}
												className='w-auto h-full object-cover'
												loading='lazy'
											/>
										) : (
											<span className='text-base w-13 text-gray-400 text-center px-1'>
												Aucun visuel
											</span>
										)}
									</div>
									{/* Infos */}
									<div className='flex flex-col min-w-0 flex-1'>
										<span className='text-gray-100 font-semibold truncate leading-tight text-xl'>
											{movie.title}
										</span>
										<span className='text-xs text-gray-400 italic truncate'>
											{movie.original_title &&
											movie.original_title !== movie.title
												? movie.original_title
												: ' '}
										</span>
										<div className='flex items-center gap-2 mt-1 text-sm text-gray-400'>
											<span className='px-2 py-0.5 bg-white/5 rounded-md border border-white/10'>
												{year}
											</span>
											{movie.vote_average ? (
												<span className='px-2 py-0.5 bg-red-600/20 rounded-md border border-red-500/40 text-red-300'>
													{movie.vote_average.toFixed(1)}
												</span>
											) : null}
											{movie.original_language && (
												<span className='px-2 py-0.5 bg-white/5 rounded-md border border-white/10 uppercase tracking-wide'>
													{movie.original_language}
												</span>
											)}
										</div>
									</div>
								</li>
							)
						})}
					</ul>
				)}
			</div>

			{/* Loading text fallback (in case) */}
			{loading && (
				<div className='mt-2 flex items-center gap-2 text-sm text-red-300 animate-pulse'>
					<span className='inline-block w-2 h-2 rounded-full bg-red-500 animate-ping' />
					<span>Recherche…</span>
				</div>
			)}

			{/* Erreur */}
			{errorRef.current && (
				<div className='mt-3 flex items-center gap-2 text-red-400 text-sm'>
					<IoBugOutline className='text-lg' />
					<span className='truncate'>{errorRef.current}</span>
				</div>
			)}
		</div>
	)
}

export default MovieSearch
