import { useAPI, useMainContext } from '../app/hooks'
import './style.scss'
import { useEffect } from 'react'
import { Back } from '../components/NavBar'
import Loader from '../components/Loader'
import Movie from '../components/Movie'

const OnGoingMovie = ({ id }) => {
	const { data: onGoingMovie } = useAPI('GET', '/ongoing_movies/' + id)
	const { data: movie } = useAPI('GET', '/movie/' + onGoingMovie?.tmdbID)
	console.log(movie)
	return (
		<div>
			<Movie movie={movie} />
		</div>
	)
}

const Explorer = () => {
	const { user, mainMovie, newMoviesPending, newMovies } = useMainContext()

	useEffect(() => {
		console.log(mainMovie)
	}, [mainMovie])

	useEffect(() => {
		console.log(user)
	}, [user])

	return (
		<div className='flex items-start flex-col explorer-bg pb-20 h-dvh relative w-screen top-0 left-0 scrollable'>
			<Back />
			<Movie backdropVersion movie={mainMovie} />
			{user.onGoingMovies?.length > 0 && (
				<h2 className='font-medium mt-10 ml-10'>En cours de visionnage</h2>
			)}
			<div className='flex gap-4 w-[100vw] px-10 pt-2'>
				{user.onGoingMovies.map((id, idx) => (
					<OnGoingMovie key={idx} id={id} />
				))}
			</div>
			<h2 className='font-medium mt-5 ml-10'>Les plus récents</h2>
			{newMoviesPending ? (
				<Loader />
			) : newMovies?.length > 0 ? (
				<div className='flex flex-wrap gap-4 w-full px-10 pt-2'>
					{newMovies.map((movie, idx) => (
						<Movie key={idx} movie={movie} />
					))}
				</div>
			) : (
				<p className='text-gray-300 ml-10'>Vous n'avez pas de films.</p>
			)}
		</div>
	)
}

export default Explorer
