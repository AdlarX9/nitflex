import { useState, useEffect } from 'react'
import axios from 'axios'
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion'
import Loader from './Loader'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_KEY

const SeriesSearch = ({ onSelect }) => {
	const [query, setQuery] = useState('')
	const [results, setResults] = useState([])
	const [loading, setLoading] = useState(false)
	const [selectedSeries, setSelectedSeries] = useState(null)

	useEffect(() => {
		if (query.length < 2) {
			setResults([])
			return
		}

		const timer = setTimeout(() => {
			searchSeries(query)
		}, 500)

		return () => clearTimeout(timer)
	}, [query])

	const searchSeries = async searchQuery => {
		setLoading(true)
		try {
			const response = await axios.get(
				`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
					searchQuery
				)}&language=fr-FR`
			)
			setResults(response.data.results || [])
		} catch (error) {
			console.error('Error searching series:', error)
			setResults([])
		} finally {
			setLoading(false)
		}
	}

	const handleSelect = series => {
		setSelectedSeries(series)
		onSelect(series)
		setQuery('')
		setResults([])
	}

	return (
		<div className='relative'>
			<input
				type='text'
				value={query}
				onChange={e => setQuery(e.target.value)}
				placeholder='Rechercher une série (The Office, Breaking Bad...)'
				className='w-full px-5 py-4 rounded-xl bg-gray-900/60 border border-white/10 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30 outline-none text-lg font-medium placeholder:text-gray-500 transition'
			/>

			{selectedSeries && (
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					className='mt-4 p-4 rounded-xl bg-gradient-to-r from-red-500/20 to-red-700/20 border border-red-500/30 flex items-center gap-4'
				>
					{selectedSeries.poster_path && (
						<img
							src={`https://image.tmdb.org/t/p/w92${selectedSeries.poster_path}`}
							alt={selectedSeries.name}
							className='w-12 h-18 rounded object-cover'
						/>
					)}
					<div className='flex-1'>
						<h3 className='text-lg font-semibold text-white'>{selectedSeries.name}</h3>
						<p className='text-sm text-gray-300'>
							{selectedSeries.first_air_date
								? new Date(selectedSeries.first_air_date).getFullYear()
								: 'N/A'}
						</p>
					</div>
					<button
						onClick={() => {
							setSelectedSeries(null)
							onSelect(null)
						}}
						className='px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white transition'
					>
						Changer
					</button>
				</motion.div>
			)}

			<AnimatePresence>
				{loading && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className='absolute top-full left-0 right-0 mt-2 p-4 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 flex justify-center'
					>
						<Loader />
					</motion.div>
				)}

				{!loading && results.length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className='absolute top-full left-0 right-0 mt-2 max-h-96 overflow-y-auto bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl z-50 scrollable'
					>
						{results.map(series => (
							<motion.button
								key={series.id}
								onClick={() => handleSelect(series)}
								whileHover={{
									scale: 1.02,
									backgroundColor: 'rgba(229, 9, 20, 0.1)'
								}}
								whileTap={{ scale: 0.98 }}
								className='w-full p-4 flex items-start gap-4 text-left hover:bg-red-500/10 transition border-b border-white/5 last:border-0'
							>
								{series.poster_path ? (
									<img
										src={`https://image.tmdb.org/t/p/w92${series.poster_path}`}
										alt={series.name}
										className='w-12 h-18 rounded object-cover flex-shrink-0'
									/>
								) : (
									<div className='w-12 h-18 rounded bg-gray-700 flex-shrink-0' />
								)}
								<div className='flex-1 min-w-0'>
									<h3 className='text-base font-semibold text-white truncate'>
										{series.name}
									</h3>
									<p className='text-sm text-gray-400 mt-1'>
										{series.first_air_date
											? new Date(series.first_air_date).getFullYear()
											: 'N/A'}
									</p>
									{series.overview && (
										<p className='text-xs text-gray-500 mt-2 line-clamp-2'>
											{series.overview}
										</p>
									)}
								</div>
							</motion.button>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

export default SeriesSearch
