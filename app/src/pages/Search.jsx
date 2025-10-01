import { useEffect, useState, useCallback } from 'react'
import { useAPIAfter } from '../app/hooks'
import Movie from '../components/Movie.jsx'
import { IoSettingsOutline, IoCloseCircleOutline, IoSearchOutline } from 'react-icons/io5'
import { motion, AnimatePresence } from 'framer-motion'
import Loader from '../components/Loader.jsx'

const Search = () => {
	const ORDERING = {
		'title:asc': 'Titre A-Z',
		'title:desc': 'Titre Z-A',
		'date:desc': "Récents d'abord",
		'date:asc': "Vieux d'abord"
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

	const [movies, setMovies] = useState([])
	const [isLoading, setIsLoading] = useState(false)
	const [hasSearched, setHasSearched] = useState(false)
	const { triggerAsync: searchMovies } = useAPIAfter('GET', '/movies')
	const [title, setTitle] = useState('')
	const [genre, setGenre] = useState('')
	const [order, setOrder] = useState('date:desc')
	const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth >= 1024)

	// Écouteur pour ajuster automatiquement l'état de la side bar selon la largeur de l'écran
	useEffect(() => {
		const handleResize = () => {
			setIsMenuOpen(window.innerWidth >= 1024)
		}

		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	// Debounced search function
	const performSearch = useCallback(() => {
		if (!title && !genre) {
			setMovies([])
			setHasSearched(false)
			return
		}

		setIsLoading(true)
		setHasSearched(true)
		
		const params = {
			...(title && { title }),
			...(genre && { genre }),
			orderBy: order,
			limit: 50
		}

		searchMovies({}, params).then(res => {
			setIsLoading(false)
			if (res && Array.isArray(res)) {
				setMovies(res)
			} else {
				setMovies([])
			}
		}).catch(() => {
			setIsLoading(false)
			setMovies([])
		})
	}, [title, genre, order, searchMovies])

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			performSearch()
		}, 500) // Debounce by 500ms

		return () => clearTimeout(timeoutId)
	}, [performSearch])

	return (
		<main className='flex h-dvh w-screen bg-gray-800'>
			{/* Side bar */}
			<div
				className={`flex flex-col fixed inset-y-0 left-0 z-40 bg-gray-700 p-5 transform transition-transform duration-300 ease-in-out lg:static lg:w-1/4 lg:min-w-[250px] ${
					isMenuOpen ? 'translate-x-0' : '-translate-x-full'
				}`}
			>
				<div className='flex flex-shrink-0 justify-between items-center mb-5'>
					<h2 className='font-bold text-4xl text-white'>Paramètres</h2>
					{/* Bouton pour fermer la side bar (visible sur petits écrans uniquement) */}
					<button
						className='bg-nitflex-red text-white p-2 rounded-md lg:hidden cursor-pointer'
						onClick={() => setIsMenuOpen(false)}
					>
						<IoCloseCircleOutline />
					</button>
				</div>
				<div className='scrollable flex-1'>
					<legend className='ml-2 font-medium text-white'>Genre</legend>
					{Object.entries(GENRES).map(([key, value]) => (
						<label
							className='pl-5 box-border flex items-center gap-2 text-white'
							key={key}
						>
							<input
								type='radio'
								value={key}
								name='genre'
								checked={key === genre}
								onChange={() => setGenre(key)}
								className='flex-shrink-0'
							/>
							<span className='flex-1 dotted-txt'>{value}</span>
						</label>
					))}
					<br />
					<legend className='ml-2 font-medium text-white'>Ordre</legend>
					{Object.entries(ORDERING).map(([key, value]) => (
						<label
							className='pl-5 box-border flex items-center gap-2 text-white'
							key={key}
						>
							<input
								type='radio'
								value={key}
								name='order'
								checked={key === order}
								onChange={() => setOrder(key)}
								className='flex-shrink-0'
							/>
							<span className='flex-1 dotted-txt'>{value}</span>
						</label>
					))}
					<br />
				</div>
			</div>

			{/* Section principale */}
			<section className='flex flex-col flex-1 overflow-hidden'>
				<div className='flex flex-col p-5'>
					<div className='flex gap-4 items-center'>
						{/* Bouton pour ouvrir la side bar (petits écrans uniquement) */}
						{!isMenuOpen && (
							<button
								className='h-full flex-shrink-0 top-5 left-5 z-50 bg-nitflex-red text-white p-2 rounded-md lg:hidden cursor-pointer'
								onClick={() => setIsMenuOpen(true)}
							>
								<IoSettingsOutline className='w-auto h-full' />
							</button>
						)}
						<div className='relative flex-1'>
							<IoSearchOutline className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' size={20} />
							<input
								type='text'
								placeholder='Rechercher un film...'
								className='w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-900 text-white border border-gray-600 focus:border-nitflex-red focus:outline-none transition-colors'
								value={title}
								onChange={e => setTitle(e.target.value)}
							/>
						</div>
					</div>
				</div>
				<div className='scrollable w-full max-h-[calc(100%-100px)] flex flex-wrap gap-5 p-5 justify-center bg-gray-900 pb-20'>
					<AnimatePresence mode='wait'>
						{isLoading ? (
							<motion.div
								key='loader'
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className='w-full flex justify-center items-center py-20'
							>
								<Loader />
							</motion.div>
						) : !hasSearched ? (
							<motion.div
								key='prompt'
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0 }}
								className='w-full flex flex-col items-center justify-center py-20 text-gray-400'
							>
								<IoSearchOutline size={64} className='mb-4 opacity-50' />
								<p className='text-xl'>Recherchez un film par titre</p>
								<p className='text-sm mt-2'>Utilisez les filtres pour affiner votre recherche</p>
							</motion.div>
						) : movies.length === 0 ? (
							<motion.div
								key='no-results'
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0 }}
								className='w-full flex flex-col items-center justify-center py-20 text-gray-400'
							>
								<p className='text-xl'>Aucun film trouvé</p>
								<p className='text-sm mt-2'>Essayez avec d'autres critères de recherche</p>
							</motion.div>
						) : (
							<motion.div
								key='results'
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className='w-full flex flex-wrap gap-5 justify-center'
							>
								{movies.map((movie, idx) => (
									<motion.div
										key={movie?.id || idx}
										initial={{ opacity: 0, scale: 0.9 }}
										animate={{ opacity: 1, scale: 1 }}
										transition={{ duration: 0.2, delay: idx * 0.03 }}
									>
										<Movie movie={movie} />
									</motion.div>
								))}
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</section>
		</main>
	)
}

export default Search
