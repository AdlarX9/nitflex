import { useEffect, useState } from 'react'

const Movie = ({ movie }) => {
	const [imgLoaded, setImgLoaded] = useState(false)
	const posterExists = movie?.poster && movie.poster !== 'N/A'

	useEffect(() => {
		console.log(movie)
	}, [movie])

	return (
		<div className='p-4 bg-gray-800 rounded-md w-35 h-60 flex items-center justify-center relative overflow-hidden'>
			{posterExists ? (
				<>
					{!imgLoaded && (
						<>
							<h3>{movie?.title ? movie.title : 'Film'}</h3>
						</>
					)}
					<img
						src={movie.poster}
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
				</>
			) : (
				<h3>{movie?.title ? movie.title : 'Film'}</h3>
			)}
		</div>
	)
}

export default Movie
