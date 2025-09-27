import { useParams, Link } from 'react-router-dom'
import Loader from '../components/Loader'
import { useGetPerson } from '../app/hooks'

const PersonDetails = () => {
	const { personID } = useParams()
	const { data: person, isLoading, error } = useGetPerson(personID)

	if (isLoading) return <Loader />
	if (error || !person)
		return (
			<div className='p-8 text-red-500'>
				Erreur lors du chargement des détails de la personne.
			</div>
		)

	const {
		name,
		profile_path,
		images,
		birthday,
		deathday,
		place_of_birth,
		biography,
		known_for_department,
		gender,
		external_ids,
		movie_credits,
		tv_credits
	} = person

	const mainProfile =
		images?.profiles?.find(p => p.file_path) ||
		(profile_path ? { file_path: profile_path } : null)

	const profileUrl = mainProfile
		? `https://image.tmdb.org/t/p/w500${mainProfile.file_path}`
		: 'https://via.placeholder.com/300x450?text=No+Image'

	const genderLabel = gender === 1 ? 'Femme' : gender === 2 ? 'Homme' : '—'

	// Movies et séries connus
	const knownMovies =
		movie_credits?.cast?.sort((a, b) => b.popularity - a.popularity).slice(0, 10) || []
	const knownTv = tv_credits?.cast?.sort((a, b) => b.popularity - a.popularity).slice(0, 10) || []
	const allKnown = [...knownMovies, ...knownTv]
		.sort((a, b) => b.popularity - a.popularity)
		.slice(0, 10)

	// Filmographie complète
	const fullMovies =
		movie_credits?.cast?.sort((a, b) =>
			(b.release_date || '').localeCompare(a.release_date || '')
		) || []
	const fullTv =
		tv_credits?.cast?.sort((a, b) =>
			(b.first_air_date || '').localeCompare(a.first_air_date || '')
		) || []

	return (
		<div className='relative w-full min-h-screen bg-gradient-to-b from-black via-slate-900 to-slate-950 text-gray-100'>
			<div className='relative z-10 flex flex-col md:flex-row gap-8 px-8 pt-14 max-w-6xl mx-auto'>
				{/* Profile image */}
				<div className='flex-shrink-0'>
					<img
						src={profileUrl}
						alt={name}
						className='w-72 rounded-lg shadow-lg border border-gray-800 object-cover'
					/>
				</div>
				{/* Details */}
				<div className='flex flex-col gap-4 flex-1'>
					<h1 className='text-4xl font-bold mb-2'>{name}</h1>
					<div className='flex flex-wrap items-center gap-4 text-xl text-gray-300 mb-2'>
						<span>
							<b className='text-gray-400'>Métier :</b> {known_for_department || '—'}
						</span>
						<span>
							<b className='text-gray-400'>Sexe :</b> {genderLabel}
						</span>
						{birthday && (
							<span>
								<b className='text-gray-400'>Date de naissance :</b>{' '}
								{new Date(birthday).toLocaleDateString('fr-FR')}
							</span>
						)}
						{deathday && (
							<span>
								<b className='text-gray-400'>Décédé :</b> {deathday}
							</span>
						)}
						{place_of_birth && (
							<span>
								<b className='text-gray-400'>Lieu de naissance :</b>{' '}
								{place_of_birth}
							</span>
						)}
					</div>
					{/* Liens externes */}
					<div className='mt-2 flex gap-4 flex-wrap items-center'>
						{external_ids?.imdb_id && (
							<a
								href={`https://www.imdb.com/name/${external_ids.imdb_id}`}
								target='_blank'
								rel='noopener noreferrer'
								className='text-xl px-4 py-2 rounded shadow transition border'
								style={{
									color: '#f5c518',
									borderColor: '#f5c518',
									background: 'rgba(245,197,24,0.12)'
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
									color: '#1877f3',
									borderColor: '#1877f3',
									background: 'rgba(24,119,243,0.12)'
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
									color: '#E4405F',
									borderColor: '#E4405F',
									background: 'rgba(228,64,95,0.12)'
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
									color: '#1DA1F2',
									borderColor: '#1DA1F2',
									background: 'rgba(29,161,242,0.12)'
								}}
							>
								Twitter/X
							</a>
						)}
					</div>
					{/* Bio */}
					{biography && (
						<div className='mt-4'>
							<b className='text-gray-300'>Biographie :</b>
							<p className='mt-1 text-xl text-gray-100 whitespace-pre-line'>
								{biography}
							</p>
						</div>
					)}
					{/* Films et séries connus */}
					{allKnown.length > 0 && (
						<div className='mt-6'>
							<b className='text-gray-300'>Œuvres les plus connues :</b>
							<div className='flex gap-4 flex-wrap pb-2 mt-2'>
								{allKnown.map(item => (
									<Link
										key={item.id}
										to={
											item.media_type === 'tv'
												? `/tv/${item.id}`
												: `/movie/${item.id}`
										}
										className='flex flex-col items-center w-32 flex-shrink-0 hover:scale-105 transition'
									>
										<img
											src={
												item.poster_path
													? `https://image.tmdb.org/t/p/w185${item.poster_path}`
													: 'https://via.placeholder.com/92x138?text=No+Image'
											}
											alt={item.title || item.name}
											className='w-24 h-36 object-cover rounded shadow'
										/>
										<span className='text-sm text-gray-100 mt-1 text-center truncate w-full'>
											{item.title || item.name}
										</span>
										{item.character && (
											<span className='text-xs text-gray-400 text-center'>
												({item.character})
											</span>
										)}
									</Link>
								))}
							</div>
						</div>
					)}
					{/* Autres images */}
					{images?.profiles?.length > 1 && (
						<div className='mt-8'>
							<b className='text-gray-300'>Galerie :</b>
							<div className='flex gap-3 mt-2'>
								{images.profiles.slice(1, 6).map((img, idx) => (
									<img
										key={idx}
										src={`https://image.tmdb.org/t/p/w185${img.file_path}`}
										alt={`Portrait ${idx + 1}`}
										className='w-24 h-36 object-cover rounded shadow border border-gray-800'
									/>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
			{/* Liste de tous les films/séries joués */}
			<div className='relative z-10 px-8 pb-16 pt-5 max-w-6xl mx-auto'>
				{(fullMovies.length > 0 || fullTv.length > 0) && (
					<>
						<h2 className='text-5xl font-bold mb-4 mt-12'>Filmographie complète</h2>
						<div className='space-y-4'>
							{fullMovies.length > 0 && (
								<div>
									<h3 className='text-4xl font-semibold text-gray-200 mb-2'>
										Films
									</h3>
									<ul className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
										{fullMovies.map(movie => (
											<li
												key={movie.id}
												className='flex flex-col items-center'
											>
												<Link to={`/movie/${movie.id}`}>
													<img
														src={
															movie.poster_path
																? `https://image.tmdb.org/t/p/w185${movie.poster_path}`
																: 'https://via.placeholder.com/92x138?text=No+Image'
														}
														alt={movie.title}
														className='w-34 h-51 object-cover rounded shadow mb-1'
													/>
												</Link>
												<span className='text-xs text-gray-100 text-center truncate w-full'>
													{movie.title}
												</span>
												{movie.character && (
													<span className='text-xs text-gray-400 text-center'>
														({movie.character})
													</span>
												)}
												{movie.release_date && (
													<span className='text-xs text-gray-500 text-center'>
														{movie.release_date.slice(0, 4)}
													</span>
												)}
											</li>
										))}
									</ul>
								</div>
							)}
							{fullTv.length > 0 && (
								<div>
									<h3 className='text-4xl font-semibold text-gray-200 mb-2 mt-8'>
										Séries TV
									</h3>
									<ul className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
										{fullTv.map(tv => (
											<li key={tv.id} className='flex flex-col items-center'>
												<Link to={`/tv/${tv.id}`}>
													<img
														src={
															tv.poster_path
																? `https://image.tmdb.org/t/p/w185${tv.poster_path}`
																: 'https://via.placeholder.com/92x138?text=No+Image'
														}
														alt={tv.name}
														className='w-34 h-51 object-cover rounded shadow mb-1'
													/>
												</Link>
												<span className='text-xs text-gray-100 text-center truncate w-full'>
													{tv.name}
												</span>
												{tv.character && (
													<span className='text-xs text-gray-400 text-center'>
														({tv.character})
													</span>
												)}
												{tv.first_air_date && (
													<span className='text-xs text-gray-500 text-center'>
														{tv.first_air_date.slice(0, 4)}
													</span>
												)}
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	)
}

export default PersonDetails
