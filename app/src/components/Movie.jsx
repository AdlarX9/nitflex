import { useEffect, useState } from 'react'
import PopUp from './PopUp'
import { useGetMovieCovers, useMainContext } from '../app/hooks'
import { IoPlay } from 'react-icons/io5'
/* eslint-disable-next-line */
import { motion } from 'framer-motion'

const Backdrop = () => {
	return (
		<div className='w-[96%] ml-[2%] mt-[2%] h-150 max-h-[66dvh] box-border bg-gray-700 rounded-2xl shadow-2xl shadow-black border-gray-500 border-1 flex items-center justify-center relative'>
			Dernier film vu
			<button className='absolute bottom-5 left-5 text-black bg-white p-3 px-7 rounded-2xl font-medium flex items-center gap-2 cursor-pointer'>
				<IoPlay />
				Lecture
			</button>
		</div>
	)
}

const Movie = ({ movie, backdropVersion = false }) => {
	const [imgLoaded, setImgLoaded] = useState(false)
	const posterExists = movie?.poster && movie.poster !== 'N/A'
	const [open, setOpen] = useState(false)
	const { pickRandom } = useMainContext()

	const { posters, backdrops, logos } = useGetMovieCovers(movie?.imdbID)

	useEffect(() => {
		console.log(posters, backdrops, logos)
	}, [posters, backdrops, logos])

	useEffect(() => {
		console.log(movie)
	}, [movie])

	if (!movie || movie === null) {
		return null
	}

	let mainStyle = ''
	if (backdropVersion) {
		mainStyle =
			'w-[96%] ml-[2%] mt-[2%] h-150 max-h-[66dvh] box-border shadow-2xl shadow-black border-gray-600 border-1 rounded-2xl bg-gray-700 flex items-center justify-center relative cursor-pointer overflow-hidden'
	} else {
		mainStyle =
			'p-4 rounded-md w-40 h-60 overflow-hidden bg-gray-800 flex items-center justify-center relative cursor-pointer lighten'
	}

	return (
		<button className={mainStyle} onClick={() => setOpen(true)}>
			{posterExists ? (
				<>
					{!imgLoaded && (
						<>
							<h3>{movie?.title ? movie.title : 'Film'}</h3>
						</>
					)}
					<motion.img
						initial={{ opacity: 0 }}
						animate={{ opacity: imgLoaded ? 1 : 0 }}
						src={
							backdropVersion
								? `https://image.tmdb.org/t/p/original${pickRandom(backdrops)?.file_path}`
								: `https://image.tmdb.org/t/p/w500${movie?.poster}`
						}
						alt={movie?.title}
						style={{
							display: imgLoaded ? 'block' : 'none',
							position: 'absolute',
							top: 0,
							left: 0,
							width: '100%',
							height: '100%',
							objectFit: 'cover'
						}}
						onLoad={() => setImgLoaded(true)}
					/>
					{backdropVersion && (
						<button className='absolute bottom-5 left-5 text-black bg-white p-3 px-7 rounded-2xl font-medium flex items-center gap-2 cursor-pointer'>
							<IoPlay />
							Lecture
						</button>
					)}
				</>
			) : (
				<h3>{movie?.title ? movie.title : 'Film'}</h3>
			)}
			{open && (
				<PopUp close={() => setOpen(false)}>
					<div className='scrollable max-h-[80vh] max-w-[80vw] flex flex-wrap gap-2'>
						{backdrops.map((p, idx) => (
							<img
								key={idx}
								src={`https://image.tmdb.org/t/p/w500${p.file_path}`}
								alt='Backdrop'
								className='max-h-60 w-auto'
							/>
						))}
					</div>
				</PopUp>
			)}
		</button>
	)
}

export default Movie
