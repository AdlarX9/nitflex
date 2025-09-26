import { useAPI, useMainContext } from '../app/hooks'
import './style.scss'
import { useEffect, useMemo } from 'react'
import { Back } from '../components/NavBar'
import Loader from '../components/Loader'
import Movie from '../components/Movie'

const Explorer = () => {
	const { user, selectLastOngoingMovie, pickRandom } = useMainContext()
	const { data, isPending } = useAPI('GET', '/movies')

	const randomMainMovie = useMemo(() => {
		return pickRandom(data)
	}, [pickRandom, data])
	const mainMovie = selectLastOngoingMovie() || randomMainMovie

	useEffect(() => {
		console.log(user)
	}, [user])

	return (
		<div className='flex items-start flex-col explorer-bg'>
			<Back />
			<Movie backdropVersion movie={mainMovie} />
			{user.onGoingMovies?.length > 0 && (
				<h2 className='font-medium mt-5 ml-10'>En cours de visionnage</h2>
			)}
			<h2 className='font-medium mt-5 ml-10'>Les plus récents</h2>
			{isPending ? (
				<Loader />
			) : data?.length > 0 ? (
				<div className='flex flex-wrap gap-4 w-full px-10 pt-2'>
					{data.map((movie, idx) => (
						<Movie key={idx} movie={movie} />
					))}
				</div>
			) : (
				<p>pas de film</p>
			)}
		</div>
	)
}

export default Explorer
