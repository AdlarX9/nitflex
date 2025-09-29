import { useState, useEffect, useRef } from 'react'
import { IoBugOutline } from 'react-icons/io5'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_KEY
const TMDB_ENDPOINT = 'https://api.themoviedb.org/3/search/movie'
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w185'

/**
 * Reusable component for searching movies using TMDB API
 *
 * @param {function} onSelect - callback function to handle movie selection
 * @returns {JSX.Element} - the search component
 */
const MovieSearch = ({ onSelect }) => {
	/**
	 * State variables
	 */
	const [query, setQuery] = useState('') // query to search for
	const [results, setResults] = useState([]) // search results
	const [loading, setLoading] = useState(false) // loading state
	const [focused, setFocused] = useState(false) // whether the input is focused
	const fetchTimeout = useRef() // timeout for debouncing the search fetch
	const errorRef = useRef('') // ref to store any error message

	useEffect(() => {
		/**
		 * Clear the search results when the query is empty
		 */
		if (!query) {
			setResults([])
			setLoading(false)
			return
		}

		/**
		 * Fetch the search results when the query changes
		 */
		setLoading(true)

		clearTimeout(fetchTimeout.current)
		fetchTimeout.current = setTimeout(async () => {
			try {
				errorRef.current = ''
				const res = await fetch(
					`${TMDB_ENDPOINT}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false&language=fr-FR`
				)
				const data = await res.json()
				if (data && data.results && data.results.length > 0) {
					// Adapt results to match OMDB format minimally
					const mappedResults = data.results.map(movie => ({
						...movie,
						poster: movie.poster_path ? `${TMDB_IMAGE}${movie.poster_path}` : null // on garde l'objet original si besoin
					}))
					setResults(mappedResults)
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

	return (
		<div className='relative'>
			<label htmlFor='movie-search' className='block font-semibold mb-2 text-3xl'>
				Nom du film
			</label>
			<input
				id='movie-search'
				type='text'
				autoComplete='off'
				value={query}
				onChange={e => setQuery(e.target.value)}
				onFocus={() => setFocused(true)}
				onBlur={() => setTimeout(() => setFocused(false), 150)}
				placeholder='Rechercher...'
				className='w-full px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500'
			/>
			{focused && results.length > 0 && (
				<ul className='absolute left-0 right-0 z-1 bg-gray-600 rounded-b-md max-h-120 mt-1 scrollable w-[100%]'>
					{results.map((movie, idx) => (
						<li
							key={idx}
							className='flex items-center px-4 py-2 cursor-pointer hover:bg-gray-500 transition-colors border-b last:border-b-0 border-gray-800 w-full overflow-hidden'
							onMouseDown={() => {
								setQuery(movie.title)
								setFocused(false)
								setResults([])
								if (onSelect) onSelect(movie)
							}}
						>
							{movie.poster && (
								<img
									src={movie.poster}
									alt={movie.title}
									className='h-20 w-auto mr-4 rounded flex-shrink-0'
								/>
							)}
							<div className='flex flex-row items-center w-full min-w-0'>
								<span className='font-medium text-gray-100 truncate block flex-1 min-w-0'>
									{movie.title}
								</span>
								<span className='text-sm text-gray-200 flex-shrink-0 ml-2'>
									({movie.release_date ? movie.release_date.split('-')[0] : ''})
								</span>
							</div>
						</li>
					))}
				</ul>
			)}
			{loading && <div className='text-blue-300 text-sm animate-pulse'>Chargement...</div>}
			<div className='text-red-500 mt-1 flex gap-2 items-center'>
				{errorRef.current.length > 0 && <IoBugOutline />}
				<span>{errorRef.current}</span>
			</div>
		</div>
	)
}

export default MovieSearch
