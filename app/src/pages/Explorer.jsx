import { useAPIAfter, useMainContext } from '../app/hooks'
import './style.scss'
import { Back } from '../components/NavBar'
import Loader from '../components/Loader'
import Movie from '../components/Movie'
import OnGoingMovie from '../components/OnGoingMovie'
// eslint-disable-next-line
import { motion } from 'framer-motion'

const Explorer = () => {
	const { user, mainMovie, newMoviesPending, newMovies, refetchUser } = useMainContext()
	const { triggerAsync: deleteOnGoingMovie } = useAPIAfter('DELETE', '/ongoing_movies/')

	const handleDeleteOnGoingMovie = id => {
		deleteOnGoingMovie({}, {}, `/ongoing_movies/${id}`).then(() => {
			refetchUser()
		})
	}

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5 }}
			className='flex items-start flex-col explorer-bg pb-20 h-dvh relative w-screen top-0 left-0 scrollable'
		>
			<Back />
			<Movie backdropVersion movie={mainMovie} />

			{/* Ongoing Movies Section */}
			{user.onGoingMovies?.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
					className='w-full mt-10'
				>
					<h2 className='font-medium text-2xl ml-10 mb-4'>En cours de visionnage</h2>
					<div className='flex gap-4 overflow-x-auto px-10 pt-2 pb-4 scrollbar-thin'>
						{user.onGoingMovies.map((id, idx) => (
							<OnGoingMovie key={idx} id={id} onDelete={handleDeleteOnGoingMovie} />
						))}
					</div>
				</motion.div>
			)}

			{/* Recent Movies Section */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.4 }}
				className='w-full mt-5'
			>
				<h2 className='font-medium text-2xl ml-10 mb-4'>Les plus récents</h2>
				{newMoviesPending ? (
					<div className='flex justify-center'>
						<Loader />
					</div>
				) : newMovies?.length > 0 ? (
					<div className='flex flex-wrap gap-4 w-full px-10 pt-2'>
						{newMovies.map((movie, idx) => (
							<motion.div
								key={idx}
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.3, delay: idx * 0.05 }}
							>
								<Movie movie={movie} />
							</motion.div>
						))}
					</div>
				) : (
					<p className='text-gray-300 ml-10'>Vous n'avez pas de films.</p>
				)}
			</motion.div>
		</motion.div>
	)
}

export default Explorer
