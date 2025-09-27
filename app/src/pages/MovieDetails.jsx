import { useEffect, useRef, useState } from 'react'
import { useGetFullMovie, useMainContext } from '../app/hooks'
import Loader from '../components/Loader'
import { Link, useParams } from 'react-router-dom'

const MovieDetails = () => {
	const { tmdbID } = useParams()
	const { data: fullMovie, isLoading, error } = useGetFullMovie(tmdbID)
	const { pickRandom } = useMainContext()
	const randomBackdropRef = useRef(null)
	const [randomBackdrop, setRandomBackdrop] = useState(null)

	// Sélection du backdrop
	useEffect(() => {
		if (randomBackdropRef.current === null && fullMovie?.images?.backdrops?.length > 0) {
			randomBackdropRef.current = pickRandom(
				fullMovie.images.backdrops.filter(
					b => b.iso_639_1 === 'fr' || b.iso_639_1 === 'en' || b.iso_639_1 === null
				)
			)
			setRandomBackdrop(randomBackdropRef.current?.file_path)
		}
	}, [fullMovie, pickRandom])

	if (isLoading) return <Loader />
	if (error)
		return (
			<div className='p-8 text-red-500'>Erreur lors du chargement des détails du film.</div>
		)
	if (!fullMovie) return null

	const {
		title,
		release_date,
		genres,
		runtime,
		overview,
		poster_path,
		images,
		videos,
		credits,
		reviews,
		keywords,
		external_ids,
		similar,
		recommendations,
		tagline,
		vote_average
	} = fullMovie

	// Tenter d'obtenir un poster FR
	let posterFR = null
	if (images?.posters?.length > 0) {
		const frPoster = images.posters.find(p => p.iso_639_1 === 'fr')
		posterFR = frPoster ? `https://image.tmdb.org/t/p/w500${frPoster.file_path}` : null
	}
	const posterUrl =
		posterFR || (poster_path ? `https://image.tmdb.org/t/p/w500${poster_path}` : null)

	// Backdrop
	const backdropUrl = randomBackdrop ? `https://image.tmdb.org/t/p/original${randomBackdrop}` : null

	// Bande-annonce FR en priorité
	const trailer =
		videos?.results?.find(
			v =>
				v.type === 'Trailer' &&
				(v.iso_639_1 === 'fr' || v.iso_639_1 === 'fr-FR') &&
				(v.site === 'YouTube' || v.site === 'Vimeo')
		) ||
		videos?.results?.find(
			v => v.type === 'Trailer' && (v.site === 'YouTube' || v.site === 'Vimeo')
		)

	const cast = credits?.cast?.slice(0, 8) || []
	const crew = credits?.crew || []
	const directors = crew.filter(c => c.job === 'Director')
	const writers = crew.filter(c => c.job === 'Writer' || c.job === 'Screenplay')

	const countries = fullMovie?.production_countries?.map(c => c.name).join(', ') || ''

	// Notation
	const noteSur10 = vote_average ? vote_average.toFixed(1) : null
	const noteSur5 = vote_average ? (vote_average / 2).toFixed(1) : null

	return (
		<div className='relative w-full min-h-screen bg-gradient-to-b from-black via-slate-900 to-slate-950 text-gray-100'>
			{/* Backdrop */}
			{backdropUrl && (
				<img
					src={backdropUrl}
					alt='Arrière-plan'
					className='absolute inset-0 w-full h-auto object-cover opacity-70 pointer-events-none select-none'
					style={{ zIndex: 0 }}
				/>
			)}
			{/* Overlay for readability */}
			<div
				className='absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent'
				style={{ zIndex: 1 }}
			/>

			{/* Main content */}
			<div className='relative z-10 flex flex-col md:flex-row gap-8 px-8 pt-14 max-w-6xl mx-auto'>
				{/* Poster */}
				<div className='flex-shrink-0'>
					{posterUrl && (
						<img
							src={posterUrl}
							alt={title}
							className='w-72 rounded-lg shadow-lg border border-gray-800'
						/>
					)}
				</div>
				{/* Details */}
				<div className='flex flex-col gap-4 flex-1'>
					<h1 className='text-4xl font-bold mb-2'>{title}</h1>
					<div className='flex flex-wrap items-center gap-2 text-xl text-gray-300'>
						{release_date && (
							<span className='font-semibold'>{release_date.slice(0, 4)}</span>
						)}
						{genres?.length > 0 && <span>{genres.map(g => g.name).join(' / ')}</span>}
						{runtime && (
							<span>
								{Math.floor(runtime / 60)}h {runtime % 60}min
							</span>
						)}
						{countries && <span>({countries})</span>}
						{/* Affichage de la note */}
						{noteSur10 && (
							<span className='ml-4 flex items-center gap-2 text-yellow-400 font-semibold'>
								Note : <span>{noteSur10} / 10</span>
								<span className='text-gray-200'>({noteSur5} / 5)</span>
							</span>
						)}
					</div>
					{/* Tagline */}
					{tagline && <p className='italic text-gray-400'>{tagline}</p>}
					{/* Overview */}
					<p className='text-xl mt-2'>{overview}</p>
					{/* Directors / Writers */}
					<div className='flex flex-wrap gap-4 text-gray-400 mt-2'>
						{directors.length > 0 && (
							<div className='text-3xl'>
								<b className='text-gray-300'>
									Réalisateur{directors.length > 1 && 's'} :
								</b>{' '}
								{directors.map(d => d.name).join(', ')}
							</div>
						)}
						{writers.length > 0 && (
							<div className='text-3xl'>
								<b className='text-gray-300'>Scénario :</b>{' '}
								{writers.map(w => w.name).join(', ')}
							</div>
						)}
					</div>
					{/* Cast */}
					{cast.length > 0 && (
						<div className='mt-4'>
							<b className='text-gray-300'>Acteurs principaux :</b>
							<div className='flex flex-wrap gap-4 mt-2'>
								{cast.map(actor => (
									<Link
										to={`/person/${actor.id}`}
										key={actor.id}
										className='flex flex-col items-center w-24 cursor-pointer hover:scale-103 transition lighten'
									>
										<img
											src={
												actor.profile_path
													? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
													: 'https://via.placeholder.com/92x138?text=No+Image'
											}
											alt={actor.name}
											className='w-20 h-28 object-cover rounded shadow'
										/>
										<span className='text-sm text-gray-200 text-center mt-1 truncate w-full'>
											{actor.name}
										</span>
										{actor.character && (
											<span className='text-xs text-gray-400 text-center'>
												{actor.character}
											</span>
										)}
									</Link>
								))}
							</div>
						</div>
					)}
					{/* Trailer */}
					{trailer && (
						<div className='mt-6'>
							<b className='text-gray-300'>Bande-annonce :</b>
							<div className='mt-2'>
								{trailer.site === 'YouTube' ? (
									<iframe
										title='Bande-annonce'
										width='600'
										height='315'
										src={`https://www.youtube.com/embed/${trailer.key}`}
										frameBorder='0'
										allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
										allowFullScreen
										className='rounded-lg shadow-lg border border-gray-800'
									/>
								) : (
									<a
										href={trailer.url}
										target='_blank'
										rel='noopener noreferrer'
										className='text-blue-400 underline'
									>
										Voir la bande-annonce
									</a>
								)}
							</div>
						</div>
					)}
					{/* Keywords */}
					{keywords?.keywords?.length > 0 && (
						<div className='mt-4 text-2xl'>
							<b className='text-gray-200'>Mots-clés :</b>{' '}
							<span className='text-gray-300'>
								{keywords.keywords.map(k => k.name).join(', ')}
							</span>
						</div>
					)}
					{/* Reviews */}
					{reviews?.results?.length > 0 && (
						<div className='mt-8'>
							<b className='text-gray-200 text-3xl'>Avis spectateurs :</b>
							<div className='mt-2 space-y-4 max-h-80 scrollable pr-2'>
								{reviews.results.slice(0, 3).map(review => (
									<div key={review.id} className='border-l-4 border-red-400 pl-4'>
										<div className='flex gap-2 items-center mb-1'>
											<span className='text-xl font-semibold text-gray-300'>
												{review.author}
											</span>
											<span className='text-sm text-gray-400'>
												{new Date(review.created_at).toLocaleDateString(
													'fr-FR'
												)}
											</span>
										</div>
										<p className='text-gray-300 text-xl'>
											{review.content.slice(0, 400)}
											{review.content.length > 400 ? '...' : ''}
										</p>
									</div>
								))}
							</div>
						</div>
					)}
					{/* External links */}
					<div className='mt-8 flex gap-4 flex-wrap items-center'>
						{external_ids?.imdb_id && (
							<a
								href={`https://www.imdb.com/title/${external_ids.imdb_id}`}
								target='_blank'
								rel='noopener noreferrer'
								className='text-xl px-4 py-2 rounded shadow transition border'
								style={{
									color: '#f5c518', // Jaune IMDb
									borderColor: '#f5c518',
									background: 'rgba(245,197,24,0.12)' // Jaune IMDb très foncé
								}}
							>
								IMDb
							</a>
						)}
						{external_ids?.facebook_id && (
							<a
								href={`https://facebook.com/${external_ids.facebook_id}`}
								target='_blank'
								rel='noopener noreferrer'
								className='text-xl px-4 py-2 rounded shadow transition border'
								style={{
									color: '#1877f3', // Bleu Facebook
									borderColor: '#1877f3',
									background: 'rgba(24,119,243,0.12)' // Bleu Facebook très foncé
								}}
							>
								Facebook
							</a>
						)}
						{external_ids?.instagram_id && (
							<a
								href={`https://instagram.com/${external_ids.instagram_id}`}
								target='_blank'
								rel='noopener noreferrer'
								className='text-xl px-4 py-2 rounded shadow transition border'
								style={{
									color: '#E4405F', // Rose Instagram
									borderColor: '#E4405F',
									background: 'rgba(228,64,95,0.12)' // Rose Instagram très foncé
								}}
							>
								Instagram
							</a>
						)}
						{external_ids?.twitter_id && (
							<a
								href={`https://twitter.com/${external_ids.twitter_id}`}
								target='_blank'
								rel='noopener noreferrer'
								className='text-xl px-4 py-2 rounded shadow transition border'
								style={{
									color: '#1DA1F2', // Bleu Twitter
									borderColor: '#1DA1F2',
									background: 'rgba(29,161,242,0.12)' // Bleu Twitter très foncé
								}}
							>
								Twitter/X
							</a>
						)}
					</div>
				</div>
			</div>
			{/* Similar & Recommendations */}
			<div className='relative z-10 px-8 pb-16 max-w-6xl mx-auto'>
				{/* Similar movies */}
				{similar?.results?.length > 0 && (
					<div className='mt-12'>
						<h2 className='text-4xl font-bold mb-4'>Films similaires</h2>
						<div className='flex gap-4 scrollable scrollable-horizontal pb-2'>
							{similar.results.slice(0, 10).map(mov => (
								<a
									key={mov.id}
									href={`/movie/${mov.id}`}
									className='flex flex-col items-center w-32 flex-shrink-0 lighten hover:scale-103 transition'
								>
									<img
										src={
											mov.poster_path
												? `https://image.tmdb.org/t/p/w185${mov.poster_path}`
												: 'https://via.placeholder.com/92x138?text=No+Image'
										}
										alt={mov.title}
										className='w-40 h-60 object-cover rounded shadow'
									/>
									<span className='text-sm text-gray-100 mt-1 text-center truncate w-full'>
										{mov.title}
									</span>
								</a>
							))}
						</div>
					</div>
				)}
				{/* Recommendations */}
				{recommendations?.results?.length > 0 && (
					<div className='mt-12'>
						<h2 className='text-4xl font-bold mb-4'>Recommandations</h2>
						<div className='flex gap-4 scrollable scrollable-horizontal pb-2'>
							{recommendations.results.slice(0, 10).map(mov => (
								<a
									key={mov.id}
									href={`/movie/${mov.id}`}
									className='flex flex-col items-center w-32 flex-shrink-0 lighten hover:scale-103 transition'
								>
									<img
										src={
											mov.poster_path
												? `https://image.tmdb.org/t/p/w185${mov.poster_path}`
												: 'https://via.placeholder.com/92x138?text=No+Image'
										}
										alt={mov.title}
										className='w-40 h-60 object-cover rounded shadow'
									/>
									<span className='text-sm text-gray-100 mt-1 text-center truncate w-full'>
										{mov.title}
									</span>
								</a>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

export default MovieDetails
