import { useState, useEffect, useRef } from 'react'
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion'
import { IoBugOutline, IoSearch, IoCloseCircleOutline } from 'react-icons/io5'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3/search'
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w185'

/**
 * Composant unifié de recherche (Films & Séries)
 * Props:
 * - type: 'movies' | 'series' (défaut: 'movies')
 * - onSelect: fonction callback retournant l'item sélectionné
 */
const MediaSearch = ({ type = 'movies', onSelect }) => {
	const [query, setQuery] = useState('')
	const [results, setResults] = useState([])
	const [loading, setLoading] = useState(false)
	const [focused, setFocused] = useState(false)
	const [selectedItem, setSelectedItem] = useState(null)

	const fetchTimeout = useRef()
	const errorRef = useRef('')

	// Réinitialiser la sélection si le type change (ex: switch onglet)
	useEffect(() => {
		setQuery('')
		setResults([])
		setSelectedItem(null)
		errorRef.current = ''
	}, [type])

	// Logique de recherche (Debounce + Fetch)
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

				// Détermine l'endpoint et les champs à mapper selon le type
				const endpoint = type === 'series' ? 'tv' : 'movie'

				const res = await fetch(
					`${TMDB_BASE_URL}/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
						query
					)}&language=fr-FR`
				)

				const data = await res.json()

				if (data?.results?.length) {
					// Normalisation des données (Films: title/release_date vs Séries: name/first_air_date)
					const mapped = data.results.map(item => ({
						...item,
						// Champs normalisés pour l'affichage
						displayTitle: item.title || item.name,
						displayDate: item.release_date || item.first_air_date,
						originalTitle: item.original_title || item.original_name,
						poster: item.poster_path ? `${TMDB_IMAGE}${item.poster_path}` : null,
						// Conserver l'ID et le type pour le parent
						mediaType: type
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
		}, 400) // Debounce 400ms

		return () => clearTimeout(fetchTimeout.current)
	}, [query, type])

	const clearQuery = () => {
		setQuery('')
		setResults([])
		errorRef.current = ''
	}

	const handleSelection = item => {
		setQuery(item.displayTitle)
		setFocused(false)
		setResults([])
		setSelectedItem(item)
		if (onSelect) onSelect(item)
	}

	const handleClearSelection = () => {
		setSelectedItem(null)
		if (onSelect) onSelect(null)
	}

	const placeholderText =
		type === 'series'
			? 'Rechercher une série (The Office...)'
			: 'Rechercher un film (Inception...)'

	return (
		<div className='relative w-full font-sans'>
			{/* Zone de recherche (Input) ou Carte sélectionnée */}
			{!selectedItem ? (
				<div
					className={`relative group rounded-xl overflow-hidden border 
					${focused ? 'border-red-500/70 shadow-[0_0_0_3px_rgba(229,9,20,0.25)]' : 'border-white/10'} 
					bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] 
					backdrop-blur-md transition-all`}
				>
					{/* Icone Loupe */}
					<div className='absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none'>
						<IoSearch className='text-gray-400 text-xl' />
					</div>

					<input
						id='media-search'
						type='text'
						autoComplete='off'
						value={query}
						onChange={e => setQuery(e.target.value)}
						onFocus={() => setFocused(true)}
						onBlur={() => setTimeout(() => setFocused(false), 200)}
						placeholder={placeholderText}
						className='w-full pl-14 pr-12 py-4 bg-transparent text-gray-100 placeholder:text-gray-500 text-lg leading-none outline-none'
					/>

					{/* Bouton Effacer */}
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

					{/* Barre de chargement */}
					<div
						className={`absolute top-0 left-0 h-[3px] bg-linear-to-r from-red-500 via-red-400 to-red-600 transition-all duration-500 ${
							loading ? 'w-full opacity-100' : 'w-0 opacity-0'
						}`}
					/>
				</div>
			) : (
				// Carte de l'élément sélectionné
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					className='mt-4 p-4 rounded-xl bg-linear-to-r from-red-500/20 to-red-700/20 border border-red-500/30 flex items-center gap-4'
				>
					{selectedItem.poster && (
						<img
							src={selectedItem.poster}
							alt={selectedItem.displayTitle}
							className='w-20 h-30 rounded object-cover shadow-lg'
						/>
					)}
					<div className='flex-1 min-w-0'>
						<h3 className='text-lg font-semibold text-white truncate'>
							{selectedItem.displayTitle}
						</h3>
						<p className='text-sm text-gray-300'>
							{selectedItem.displayDate
								? new Date(selectedItem.displayDate).getFullYear()
								: 'Année inconnue'}
						</p>
						{/* Affichage conditionnel de la saison/type si besoin */}
						<span className='inline-block mt-1 text-xs px-2 py-0.5 bg-red-500/30 rounded border border-red-500/20 text-red-100 uppercase tracking-wider'>
							{type === 'series' ? 'Série TV' : 'Film'}
						</span>
					</div>
					<button
						onClick={handleClearSelection}
						className='px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white transition text-sm font-medium border border-red-500/30'
					>
						Changer
					</button>
				</motion.div>
			)}

			{/* Liste déroulante des résultats */}
			<div className='relative'>
				<AnimatePresence>
					{focused && results.length > 0 && (
						<motion.ul
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{ duration: 0.2 }}
							className='absolute left-0 right-0 mt-2 z-50 rounded-xl border border-white/10 
							bg-[linear-gradient(145deg,rgba(18,18,20,0.95),rgba(30,30,38,0.92))] backdrop-blur-xl 
							shadow-2xl scrollable max-h-120 overflow-y-auto'
						>
							{results.map((item, idx) => {
								const year = item.displayDate?.split('-')[0] || '—'
								return (
									<li
										key={`${item.id}-${idx}`}
										className='flex gap-4 px-4 py-3 cursor-pointer items-center border-b border-white/5 last:border-none hover:bg-white/5 active:bg-white/10 transition-colors'
										onMouseDown={e => {
											e.preventDefault() // Empêche la perte de focus avant le click
											handleSelection(item)
										}}
									>
										{/* Poster */}
										<div className='h-20 w-13 rounded-md overflow-hidden bg-gray-800/40 flex items-center justify-center border border-white/10 shrink-0 shadow-inner'>
											{item.poster ? (
												<img
													src={item.poster}
													alt={item.displayTitle}
													className='w-full h-full object-cover'
													loading='lazy'
												/>
											) : (
												<span className='text-[10px] text-gray-500 text-center px-1'>
													No img
												</span>
											)}
										</div>

										{/* Infos */}
										<div className='flex flex-col min-w-0 flex-1'>
											<span className='text-gray-100 font-semibold truncate leading-tight text-lg'>
												{item.displayTitle}
											</span>

											<div className='flex items-center gap-2 mt-1.5 text-sm text-gray-400'>
												<span className='px-2 py-0.5 bg-white/5 rounded-md border border-white/10 font-mono text-xs'>
													{year}
												</span>
												{item.vote_average > 0 && (
													<span className='px-2 py-0.5 bg-red-600/20 rounded-md border border-red-500/40 text-red-300 text-xs font-bold'>
														{item.vote_average.toFixed(1)}
													</span>
												)}
												{item.original_language && (
													<span className='px-2 py-0.5 bg-white/5 rounded-md border border-white/10 uppercase tracking-wide text-xs'>
														{item.original_language}
													</span>
												)}
											</div>

											<span className='text-xs text-gray-500 italic truncate mt-1'>
												{item.originalTitle &&
												item.originalTitle !== item.displayTitle
													? item.originalTitle
													: ''}
											</span>
										</div>
									</li>
								)
							})}
						</motion.ul>
					)}
				</AnimatePresence>
			</div>

			{/* Texte de chargement fallback */}
			{loading && focused && results.length === 0 && (
				<div className='absolute top-full left-0 mt-2 flex items-center gap-2 text-sm text-red-300 animate-pulse z-40'>
					<span className='inline-block w-2 h-2 rounded-full bg-red-500 animate-ping' />
					<span>Recherche en cours...</span>
				</div>
			)}

			{/* Gestion des erreurs */}
			{errorRef.current && (
				<div className='mt-3 flex items-center gap-2 text-red-400 text-sm'>
					<IoBugOutline className='text-lg' />
					<span className='truncate'>{errorRef.current}</span>
				</div>
			)}
		</div>
	)
}

export default MediaSearch
