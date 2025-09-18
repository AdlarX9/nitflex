import { useEffect, useState } from 'react'
import { useAPIAfter } from '../app/hooks'
import Movie from '../components/Movie.jsx'

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
		<main className='flex h-svh w-screen'>
			<section className='h-svh min-w-80 w-1/4 bg-gray-700 flex flex-col flex-shrink-0'>
				<h2 className='text-center my-15 text-5xl font-bold'>Paramètres</h2>
				<div className='scrollable'>
					<legend className='ml-4 text-4xl font-medium'>Genre</legend>
					{Object.entries(GENRES).map(([key, value]) => {
						return (
							<label
								className='pl-5 dotted-txt box-border flex items-center gap-2'
								key={key}
							>
								<input
									type='radio'
									value={key}
									name='genre'
									checked={key === genre}
									onChange={() => setGenre(key)}
								/>
								{value}
							</label>
						)
					})}
					<br />
					<legend className='ml-4 text-4xl font-medium'>Ordre</legend>
					{Object.entries(ORDERING).map(([key, value]) => {
						return (
							<label
								className='pl-5 dotted-txt box-border flex items-center gap-2'
								key={key}
							>
								<input
									type='radio'
									value={key}
									name='order'
									checked={key === order}
									onChange={() => setOrder(key)}
								/>
								{value}
							</label>
						)
					})}
					<br />
					<br />
				</div>
			</section>
			<section className='flex flex-col flex-1'>
				<input
					type='text'
					placeholder='Rechercher...'
					className='m-5 p-2 rounded-2xl bg-gray-800 border-1 border-gray-700'
					value={title}
					onChange={e => setTitle(e.target.value)}
				/>
				<h2 className='text-5xl red p-5'>Résultats</h2>
				<div className='scrollable w-[100%] max-h-[100%] flex flex-wrap gap-5 p-5 justify-center'>
					{movies.length === 0 ? (
						<p className='pl-5'>Aucun résultat trouvé</p>
					) : (
						movies.map((movie, idx) => <Movie key={idx} movie={movie} />)
					)}
				</div>
			</section>
		</main>
	)
}

export default Search
