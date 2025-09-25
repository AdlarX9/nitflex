import { useAPI, useMainContext } from '../app/hooks'
import { IoPlay } from 'react-icons/io5'
import './style.scss'
import { useEffect } from 'react'
import { Back } from '../components/NavBar'
import Loader from '../components/Loader'
import Movie from '../components/Movie'

const Explorer = () => {
	const { user } = useMainContext()
	const { data, isPending } = useAPI('GET', '/movies')

	useEffect(() => {
		console.log(user)
	}, [user])

	return (
		<div className='flex items-start flex-col explorer-bg'>
			<Back />
			<div className='w-[96%] ml-[2%] mt-[2%] h-150 max-h-[66dvh] box-border bg-gray-700 rounded-2xl shadow-2xl shadow-black border-gray-500 border-1 flex items-center justify-center relative'>
				Dernier film vu
				<button className='absolute bottom-5 left-5 text-black bg-white p-3 px-7 rounded-2xl font-medium flex items-center gap-2 cursor-pointer'>
					<IoPlay />
					Lecture
				</button>
			</div>
			{user.onGoingMovies?.length > 0 && (
				<h2 className='font-medium mt-5 ml-10'>En cours de visionnage</h2>
			)}
			<h2 className='font-medium mt-5 ml-10'>Les plus récents</h2>
			{isPending ? (
				<Loader />
			) : data?.length > 0 ? (
				<div className='flex gap-4 w-full px-10 pt-2'>
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
