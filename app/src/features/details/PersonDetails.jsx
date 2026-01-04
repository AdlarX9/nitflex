import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Loader from '../../ui/Loader'
import { useGetPerson } from '../../utils/hooks'
import {
	IoArrowBack,
	IoCalendarClearOutline,
	IoLocationOutline,
	IoPlayCircle,
	IoPersonOutline,
	IoFilmOutline,
	IoTvOutline,
	IoImagesOutline,
	IoLinkOutline,
	IoFemale,
	IoMale
} from 'react-icons/io5'
// eslint-disable-next-line
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

/* ========================================================================
   Variants (optimisés pour rapidité & non-blocage du scroll)
   ======================================================================== */
const fadeInSimple = {
	initial: { opacity: 0, y: 16 },
	animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.8, 0.4, 1] } }
}

// Pour petits ensembles seulement (ex: cast connu)
const fastStaggerContainer = {
	initial: { opacity: 0 },
	animate: {
		opacity: 1,
		transition: { staggerChildren: 0.04, when: 'beforeChildren' }
	}
}

const fastItem = {
	initial: { opacity: 0, y: 18 },
	animate: { opacity: 1, y: 0, transition: { duration: 0.38, ease: 'easeOut' } }
}

// Filmographie massive : animation quasi instantanée
const massGridItem = {
	initial: { opacity: 0, y: 12 },
	animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }
}

const PersonDetails = () => {
	const { personID } = useParams()
	const { data: person, isLoading, error } = useGetPerson(personID)
	const prefersReducedMotion = useReducedMotion()

	const [expandedBio, setExpandedBio] = useState(false)

	// Scroll top on person change
	useEffect(() => {
		window.scrollTo({ top: 0, behavior: 'instant' })
	}, [personID])

	// Préparation des données
	const processed = useMemo(() => {
		if (!person) return null
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
			: 'https://via.placeholder.com/400x600?text=No+Image'

		const genderLabel = gender === 1 ? 'Femme' : gender === 2 ? 'Homme' : '—'

		const knownMovies =
			movie_credits?.cast
				?.slice()
				.sort((a, b) => b.popularity - a.popularity)
				.slice(0, 8) || []
		const knownTv =
			tv_credits?.cast
				?.slice()
				.sort((a, b) => b.popularity - a.popularity)
				.slice(0, 8) || []

		const allKnown = [...knownMovies, ...knownTv]
			.sort((a, b) => b.popularity - a.popularity)
			.slice(0, 10)

		const fullMovies =
			movie_credits?.cast
				?.slice()
				.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || '')) || []

		const fullTv =
			tv_credits?.cast
				?.slice()
				.sort((a, b) => (b.first_air_date || '').localeCompare(a.first_air_date || '')) ||
			[]

		const secondaryImages = images?.profiles?.slice(1, 10) || []

		return {
			name,
			profileUrl,
			genderLabel,
			birthday,
			deathday,
			place_of_birth,
			biography,
			known_for_department,
			external_ids,
			allKnown,
			fullMovies,
			fullTv,
			secondaryImages
		}
	}, [person])

	if (isLoading) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-black'>
				<Loader />
			</div>
		)
	}

	if (error || !processed) {
		return (
			<div className='p-8 text-red-500'>
				Erreur lors du chargement des détails de la personne.
			</div>
		)
	}

	const {
		name,
		profileUrl,
		genderLabel,
		birthday,
		deathday,
		place_of_birth,
		biography,
		known_for_department,
		external_ids,
		allKnown,
		fullMovies,
		fullTv,
		secondaryImages
	} = processed

	const truncatedBio =
		biography && biography.length > 750 && !expandedBio
			? biography.slice(0, 750) + '…'
			: biography

	// Choix du variant filmographie (pas de délais lourds)
	const FilmItemMotion = ({ children }) => {
		if (prefersReducedMotion) return <div>{children}</div>
		return (
			<motion.div
				variants={massGridItem}
				initial='initial'
				whileInView='animate'
				viewport={{ once: true, margin: '0px 0px -140px 0px' }}
			>
				{children}
			</motion.div>
		)
	}

	return (
		<div className='relative w-full min-h-screen bg-linear-to-b from-black via-[#0a0d13] to-black text-gray-100 overflow-x-hidden'>
			{/* Bouton retour optimisé */}
			<Link
				to={-1}
				className='fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-br from-gray-800/70 to-gray-700/30 backdrop-blur-md border border-white/10 shadow-lg hover:from-gray-700/80 hover:to-gray-600/40 transition text-sm group'
			>
				<IoArrowBack className='text-lg group-hover:-translate-x-0.5 transition' />
				<span className='uppercase tracking-wide font-semibold text-xs'>Retour</span>
			</Link>

			{/* Fond ambiance + bruit */}
			<div className='pointer-events-none absolute inset-0 z-0'>
				<div className='absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.08),rgba(0,0,0,0)_60%)] mix-blend-screen opacity-70' />
				<div
					className='absolute inset-0 opacity-[0.18] mix-blend-overlay'
					style={{
						backgroundImage:
							'repeating-linear-gradient(0deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_2px)'
					}}
				/>
			</div>

			<main className='relative z-10 pt-24 pb-24 px-5 sm:px-7 md:px-10 max-w-7xl mx-auto'>
				<div className='grid grid-cols-1 lg:grid-cols-[minmax(0,260px)_1fr] gap-12 xl:gap-16 items-start'>
					{/* Colonne gauche compacte */}
					<div className='flex flex-col gap-8'>
						<motion.div
							className='relative w-52 sm:w-60 mx-auto lg:mx-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-linear-to-br from-gray-800/40 to-gray-900/30 backdrop-blur-sm'
							variants={fadeInSimple}
							initial='initial'
							animate='animate'
						>
							<img
								src={profileUrl}
								alt={name}
								className='w-full h-auto block object-cover'
								loading='lazy'
							/>
							<div className='absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent pointer-events-none' />
							{/* Tags */}
							<div className='absolute bottom-0 left-0 right-0 p-4 flex flex-wrap gap-2'>
								{known_for_department && (
									<span className='px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase font-semibold tracking-wide'>
										{known_for_department}
									</span>
								)}
								<span className='px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] inline-flex items-center gap-1'>
									<IoPersonOutline className='text-xs opacity-70' />
									{genderLabel}
								</span>
							</div>
						</motion.div>

						{/* Infos brèves */}

						<motion.ul
							className='space-y-2 text-xs sm:text-[13px] text-gray-300/90'
							variants={fadeInSimple}
							initial='initial'
							animate='animate'
						>
							{birthday && (
								<li className='flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/5'>
									<IoCalendarClearOutline className='text-base opacity-70' />
									<span>
										<span className='text-gray-400'>Naissance : </span>
										{new Date(birthday).toLocaleDateString('fr-FR')}
									</span>
								</li>
							)}
							{deathday && (
								<li className='flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/5'>
									<IoCalendarClearOutline className='text-base opacity-70' />
									<span>
										<span className='text-gray-400'>Décès : </span>
										{deathday}
									</span>
								</li>
							)}
							{place_of_birth && (
								<li className='flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/5'>
									<IoLocationOutline className='text-base opacity-70' />
									<span className='leading-snug'>{place_of_birth}</span>
								</li>
							)}
						</motion.ul>

						{/* Petite galerie horizontale (ne prend pas de largeur supplémentaire) */}
						{secondaryImages.length > 0 && (
							<motion.div
								className='flex flex-col gap-2'
								variants={fadeInSimple}
								initial='initial'
								animate='animate'
							>
								<h3 className='text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-2 px-1'>
									<IoImagesOutline className='text-base opacity-70' />
									Galerie
								</h3>
								<div className='flex gap-2 overflow-x-auto pb-1 pr-1 scrollable scrollable-horizontal'>
									{secondaryImages.slice(0, 8).map((img, i) => (
										<div
											key={img.file_path + i}
											className='relative shrink-0 w-20 h-28 rounded-lg overflow-hidden bg-gray-800/40 border border-white/10'
										>
											<img
												src={`https://image.tmdb.org/t/p/w185${img.file_path}`}
												alt={'Portrait ' + (i + 1)}
												className='w-full h-full object-cover'
												loading='lazy'
											/>
											<div className='absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent opacity-80 pointer-events-none' />
										</div>
									))}
								</div>
							</motion.div>
						)}

						{/* Liens externes */}
						{(external_ids?.imdb_id ||
							external_ids?.facebook_id ||
							external_ids?.instagram_id ||
							external_ids?.twitter_id) && (
							<motion.div
								className='flex flex-wrap gap-2'
								variants={fadeInSimple}
								initial='initial'
								animate='animate'
							>
								{external_ids?.imdb_id && (
									<a
										href={`https://www.imdb.com/name/${external_ids.imdb_id}`}
										target='_blank'
										rel='noopener noreferrer'
										className='px-3 py-1.5 rounded-full text-sm font-semibold bg-[#f5c518]/15 border border-[#f5c518]/40 text-[#f5c518] hover:bg-[#f5c518]/25 transition shadow-sm inline-flex items-center gap-1'
									>
										<IoLinkOutline className='text-sm' />
										IMDb
									</a>
								)}
								{external_ids?.facebook_id && (
									<a
										href={`https://facebook.com/${external_ids.facebook_id}`}
										target='_blank'
										rel='noopener noreferrer'
										className='px-3 py-1.5 rounded-full text-sm font-semibold bg-[#1877f3]/15 border border-[#1877f3]/40 text-[#1877f3] hover:bg-[#1877f3]/25 transition shadow-sm inline-flex items-center gap-1'
									>
										<IoLinkOutline className='text-sm' />
										Facebook
									</a>
								)}
								{external_ids?.instagram_id && (
									<a
										href={`https://instagram.com/${external_ids.instagram_id}`}
										target='_blank'
										rel='noopener noreferrer'
										className='px-3 py-1.5 rounded-full text-sm font-semibold bg-[#E4405F]/15 border border-[#E4405F]/40 text-[#E4405F] hover:bg-[#E4405F]/25 transition shadow-sm inline-flex items-center gap-1'
									>
										<IoLinkOutline className='text-sm' />
										Instagram
									</a>
								)}
								{external_ids?.twitter_id && (
									<a
										href={`https://twitter.com/${external_ids.twitter_id}`}
										target='_blank'
										rel='noopener noreferrer'
										className='px-3 py-1.5 rounded-full text-sm font-semibold bg-[#1DA1F2]/15 border border-[#1DA1F2]/40 text-[#1DA1F2] hover:bg-[#1DA1F2]/25 transition shadow-sm inline-flex items-center gap-1'
									>
										<IoLinkOutline className='text-sm' />
										Twitter/X
									</a>
								)}
							</motion.div>
						)}
					</div>

					{/* Colonne droite */}
					<div className='flex flex-col gap-10 min-w-0'>
						<motion.header
							className='flex flex-col gap-5'
							variants={fadeInSimple}
							initial='initial'
							animate='animate'
						>
							<h1 className='text-3xl sm:text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight bg-linear-to-br from-white to-gray-300 bg-clip-text text-transparent'>
								{name}
							</h1>
							{biography && (
								<div className='flex flex-col gap-3'>
									<h2 className='text-sm font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-2'>
										<IoPersonOutline className='text-lg opacity-60' />
										Biographie
									</h2>
									<p className='text-sm sm:text-base md:text-lg leading-relaxed text-gray-200/90 whitespace-pre-line'>
										{truncatedBio}
									</p>
									{biography.length > 750 && (
										<button
											onClick={() => setExpandedBio(e => !e)}
											className='self-start text-[11px] tracking-wide font-semibold uppercase px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition'
										>
											{expandedBio ? 'Réduire' : 'Lire plus'}
										</button>
									)}
								</div>
							)}
						</motion.header>

						{/* Œuvres les plus connues */}
						<AnimatePresence>
							{allKnown.length > 0 && (
								<motion.section
									variants={fastStaggerContainer}
									initial='initial'
									animate='animate'
									exit='initial'
									className='flex flex-col gap-4'
								>
									<h2 className='text-lg font-semibold uppercase tracking-wide flex items-center gap-2 text-gray-300'>
										<IoPlayCircle className='text-2xl text-red-500/70 drop-shadow-[0_0_6px_rgba(255,0,0,0.4)]' />
										Œuvres les plus connues
									</h2>
									<div className='flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollable scrollable-horizontal pr-1'>
										{allKnown.map((item, idx) => (
											<motion.div
												key={`${item.media_type}-${item.id}-${idx}`}
												className='snap-start shrink-0 w-36 sm:w-40 group'
												variants={fastItem}
											>
												<Link
													to={
														item.first_air_date
															? `/series/${item.id}`
															: `/movie/${item.id}`
													}
													className='block rounded-xl overflow-hidden bg-linear-to-br from-gray-800/40 to-gray-900/40 border border-white/10 shadow hover:shadow-red-500/10 transition relative focus:outline-none focus-visible:ring focus-visible:ring-red-500/60'
												>
													<div className='relative aspect-2/3 overflow-hidden'>
														<img
															src={
																item.poster_path
																	? `https://image.tmdb.org/t/p/w342${item.poster_path}`
																	: 'https://via.placeholder.com/200x300?text=No+Image'
															}
															alt={item.title || item.name}
															className='w-full h-full object-cover transition duration-500 ease-out group-hover:scale-105 group-hover:brightness-90'
															loading='lazy'
														/>
														<div className='absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent opacity-90 group-hover:opacity-95 transition' />
													</div>
													<div className='p-2'>
														<p className='text-[11px] font-medium leading-snug text-gray-100 line-clamp-2'>
															{item.title || item.name}
														</p>
														{item.character && (
															<p className='text-[10px] text-gray-400 mt-0.5 truncate'>
																({item.character})
															</p>
														)}
													</div>
												</Link>
											</motion.div>
										))}
									</div>
								</motion.section>
							)}
						</AnimatePresence>

						{/* Filmographie */}
						{(fullMovies.length > 0 || fullTv.length > 0) && (
							<section className='flex flex-col gap-12'>
								<h2 className='text-2xl sm:text-3xl font-extrabold tracking-tight bg-linear-to-r from-white to-gray-300 bg-clip-text text-transparent flex items-center gap-3'>
									<IoFilmOutline className='text-3xl text-red-500/70 drop-shadow-[0_0_8px_rgba(255,0,0,0.4)]' />
									Filmographie complète
								</h2>

								{fullMovies.length > 0 && (
									<div className='space-y-5'>
										<div className='flex items-center gap-2'>
											<IoFilmOutline className='text-xl text-red-400/80' />
											<h3 className='text-xl font-semibold tracking-tight'>
												Films
											</h3>
										</div>
										<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5'>
											{fullMovies.map((movie, idx) => (
												<FilmItemMotion key={`${movie.id}-${idx}`}>
													<Link
														to={`/movie/${movie.id}`}
														className='group relative block rounded-xl overflow-hidden bg-linear-to-br from-gray-800/40 to-gray-900/40 border border-white/10 shadow hover:shadow-red-500/10 transition focus:outline-none focus-visible:ring focus-visible:ring-red-500/60'
													>
														<div className='relative aspect-2/3 overflow-hidden'>
															<img
																src={
																	movie.poster_path
																		? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
																		: 'https://via.placeholder.com/200x300?text=No+Image'
																}
																alt={movie.title}
																className='object-cover w-full h-full transition duration-400 ease-out group-hover:scale-105 group-hover:brightness-[0.92]'
																loading='lazy'
															/>
															<div className='absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent opacity-90 group-hover:opacity-95 transition' />
														</div>
														<div className='p-2 flex flex-col gap-1'>
															<p className='text-[11px] font-medium leading-tight text-gray-100 line-clamp-2'>
																{movie.title}
															</p>
															<div className='flex items-center justify-between text-[10px] text-gray-400 gap-1'>
																{movie.release_date && (
																	<span>
																		{movie.release_date.slice(
																			0,
																			4
																		)}
																	</span>
																)}
																{movie.character && (
																	<span className='truncate max-w-[65%] text-right'>
																		{movie.character}
																	</span>
																)}
															</div>
														</div>
													</Link>
												</FilmItemMotion>
											))}
										</div>
									</div>
								)}

								{fullTv.length > 0 && (
									<div className='space-y-5'>
										<div className='flex items-center gap-2'>
											<IoTvOutline className='text-xl text-purple-400/80' />
											<h3 className='text-xl font-semibold tracking-tight'>
												Séries TV
											</h3>
										</div>
										<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5'>
											{fullTv.map((tv, idx) => (
												<FilmItemMotion key={`${tv.id}-${idx}`}>
													<Link
														to={`/series/${tv.id}`}
														className='group relative block rounded-xl overflow-hidden bg-linear-to-br from-gray-800/40 to-gray-900/40 border border-white/10 shadow hover:shadow-purple-500/10 transition focus:outline-none focus-visible:ring focus-visible:ring-purple-500/60'
													>
														<div className='relative aspect-2/3 overflow-hidden'>
															<img
																src={
																	tv.poster_path
																		? `https://image.tmdb.org/t/p/w342${tv.poster_path}`
																		: 'https://via.placeholder.com/200x300?text=No+Image'
																}
																alt={tv.name}
																className='object-cover w-full h-full transition duration-400 ease-out group-hover:scale-105 group-hover:brightness-[0.92]'
																loading='lazy'
															/>
															<div className='absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent opacity-90 group-hover:opacity-95 transition' />
														</div>
														<div className='p-2 flex flex-col gap-1'>
															<p className='text-[11px] font-medium leading-tight text-gray-100 line-clamp-2'>
																{tv.name}
															</p>
															<div className='flex items-center justify-between text-[10px] text-gray-400 gap-1'>
																{tv.first_air_date && (
																	<span>
																		{tv.first_air_date.slice(
																			0,
																			4
																		)}
																	</span>
																)}
																{tv.character && (
																	<span className='truncate max-w-[65%] text-right'>
																		{tv.character}
																	</span>
																)}
															</div>
														</div>
													</Link>
												</FilmItemMotion>
											))}
										</div>
									</div>
								)}
							</section>
						)}
					</div>
				</div>
			</main>

			{/* Décoration genre (subtile & non intrusive) */}
			<AnimatePresence>
				<motion.div
					initial={{ opacity: 0, y: 40, scale: 0.9 }}
					animate={{ opacity: 0.07, y: 0, scale: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
					className='pointer-events-none fixed bottom-10 right-6 text-[140px] md:text-[180px] text-white/5 select-none hidden xl:block'
				>
					{genderLabel === 'Femme' ? (
						<IoFemale />
					) : genderLabel === 'Homme' ? (
						<IoMale />
					) : (
						<IoPersonOutline />
					)}
				</motion.div>
			</AnimatePresence>

			{/* Footer gradient */}
			<div className='pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-linear-to-t from-black to-transparent' />
		</div>
	)
}

export default PersonDetails
