import { useEffect, useState } from 'react'
import { useGetMovieCovers, useMainContext } from '../app/hooks'
import { IoPlay } from 'react-icons/io5'
/* eslint-disable-next-line */
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { setExplorerColors } from '../app/utils'

const Movie = ({ movie, backdropVersion = false }) => {
	const [imgLoaded, setImgLoaded] = useState(false)
	const posterExists = movie?.poster && movie.poster !== 'N/A'
	const { mainBackdropRef, processMainBackdrop } = useMainContext()
	const [mainBackdrop, setMainBackdrop] = useState(null)

	const { backdrops } = useGetMovieCovers(movie?.imdbID)

	useEffect(() => {
		if (backdropVersion) {
			processMainBackdrop(backdrops)
			setMainBackdrop(mainBackdropRef.current)
		}
	}, [backdrops, processMainBackdrop, mainBackdropRef, backdropVersion])

	useEffect(() => {
		if (mainBackdrop && imgLoaded) {
			setExplorerColors()
		}
	}, [mainBackdrop, imgLoaded])

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
		<Link className={mainStyle} to={`/movie/${movie?.tmdbID}`}>
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
						className={`${backdropVersion && 'main-backdrop'}`}
						src={
							backdropVersion
								? `https://image.tmdb.org/t/p/original${mainBackdrop?.file_path || movie?.poster}`
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
		</Link>
	)
}

export default Movie
