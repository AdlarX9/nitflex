import { useEffect, useState } from 'react'
import { useAPIAfter } from '../app/hooks'
import Movie from '../components/Movie.jsx'
import { IoSettingsOutline, IoCloseCircleOutline } from 'react-icons/io5'

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

	const [movies, setMovies] = useState(Array(30).fill(null))
	const { triggerAsync: searchMovies } = useAPIAfter('GET', '/movies')
	const [title, setTitle] = useState('')
	const [genre, setGenre] = useState('')
	const [order, setOrder] = useState('title:asc')
	const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth >= 1024) // Side bar ouverte par défaut sur grands écrans

	// Écouteur pour ajuster automatiquement l'état de la side bar selon la largeur de l'écran
	useEffect(() => {
		const handleResize = () => {
			setIsMenuOpen(window.innerWidth >= 1024)
		}

		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	useEffect(() => {
		if (title) {
			searchMovies({ title }).then(res => {
				if (res.error) {
					console.log('error', res.error)
				} else {
					setMovies(res.movies)
				}
			})
		} else {
			setMovies(Array(30).fill(null))
		}
		/* eslint-disable-next-line */
	}, [title, genre, order])

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
						<input
							type='text'
							placeholder='Rechercher...'
							className='flex-1 p-2 rounded-2xl bg-gray-900 text-white border border-gray-600'
							value={title}
							onChange={e => setTitle(e.target.value)}
						/>
					</div>
				</div>
				<div className='scrollable w-full max-h-[calc(100%-100px)] flex flex-wrap gap-5 p-5 justify-center bg-gray-900 pb-20'>
					{movies.length === 0 ? (
						<p className='text-white'>Aucun résultat trouvé</p>
					) : (
						movies.map((movie, idx) => <Movie key={idx} movie={movie} />)
					)}
				</div>
			</section>
		</main>
	)
}

export default Search
