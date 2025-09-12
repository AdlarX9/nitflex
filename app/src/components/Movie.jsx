const Movie = ({ movie }) => {
	return (
		<div className='p-4 bg-gray-800 rounded-md w-35 h-60 flex items-center justify-center'>
			<h3>{movie?.title ? movie.title : 'Film'}</h3>
		</div>
	)
}

export default Movie
