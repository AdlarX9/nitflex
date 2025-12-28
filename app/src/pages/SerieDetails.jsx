import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion'
import { IoTimeOutline, IoStar } from 'react-icons/io5'

import { useAPI, useGetFullSerie, useMainContext, useGetFullSeason } from '../app/hooks'
import Loader from '../components/Loader'

import {
	BackButton,
	ParallaxBackdrop,
	GenreChips,
	PersonCard,
	TrailerEmbedSection,
	EpisodeCard
} from '../components/DetailComponents'
import { fadeInUp, staggerContainer, sectionReveal, shimmer } from '../components/variants'

function formatYear(d) {
	if (!d) return ''
	try {
		return new Date(d).getFullYear()
	} catch {
		return ''
	}
}

const SerieDetails = () => {
	const { tmdbID } = useParams()
	const { pickRandom } = useMainContext()

	// Épisodes disponibles en BDD (pour indiquer la dispo)
	const { data: backendData } = useAPI('GET', `/series/${tmdbID}`)

	// Détails complets TMDB (sans épisodes par saison)
	const { data: series, isPending, isError, error } = useGetFullSerie(tmdbID)

	// Sécuriser l'accès aux champs tant que "series" est null
	const s = useMemo(() => series ?? {}, [series])

	// Backdrop aléatoire
	const [randomBackdrop, setRandomBackdrop] = useState(null)
	const randomBackdropRef = useRef(null)

	useEffect(() => {
		randomBackdropRef.current = null
		setRandomBackdrop(null)
	}, [tmdbID])

	useEffect(() => {
		const bks = s?.images?.backdrops || []
		if (!randomBackdropRef.current && Array.isArray(bks) && bks.length > 0) {
			const pickable = bks.filter(
				b => b.iso_639_1 === 'fr' || b.iso_639_1 === 'en' || b.iso_639_1 === null
			)
			randomBackdropRef.current = pickRandom(pickable.length ? pickable : bks)
			setRandomBackdrop(randomBackdropRef.current?.file_path)
		} else if ((!bks || bks.length === 0) && s?.backdrop_path) {
			setRandomBackdrop(s.backdrop_path)
		}
	}, [s, pickRandom])

	const backdropUrl = randomBackdrop ? `https://image.tmdb.org/t/p/w1280${randomBackdrop}` : null

	// Poster (préférence FR)
	let posterUrl = null
	if (s?.images?.posters?.length > 0) {
		const frPoster = s.images.posters.find(p => p.iso_639_1 === 'fr')
		posterUrl = frPoster ? `https://image.tmdb.org/t/p/w500${frPoster.file_path}` : null
	}
	if (!posterUrl && s?.poster_path) {
		posterUrl = `https://image.tmdb.org/t/p/w500${s.poster_path}`
	}

	// Champs principaux
	const title = s.name || s.title || ''
	const overview = s.overview || ''
	const tagline = s.tagline || ''
	const firstAirDate = s.first_air_date || s.firstAirDate || ''
	const voteAverage = (s.vote_average ?? s.voteAverage) || null
	const vote5 = voteAverage ? (voteAverage / 2).toFixed(1) : null
	const vote10 = voteAverage ? voteAverage.toFixed(1) : null
	const genres = s.genres || []
	const episodeRunTime = s.episode_run_time || s.episodeRunTime || []
	const countries =
		(Array.isArray(s.origin_country) && s.origin_country.length > 0
			? s.origin_country.join(', ')
			: Array.isArray(s.production_countries)
				? s.production_countries.map(c => c.name).join(', ')
				: '') || ''

	// Casting
	const credits = s.credits || {}
	const cast = credits.cast?.slice(0, 8) || []
	const crew = credits.crew || []
	const creators = s.created_by || s.createdBy || crew?.filter(p => p.job === 'Creator') || []

	// Vidéos
	const videos = useMemo(() => s?.videos?.results || [], [s])
	const trailer = useMemo(() => {
		const trFr = videos.find(
			v =>
				v.type === 'Trailer' &&
				(v.iso_639_1 === 'fr' || v.iso_639_1 === 'fr-FR') &&
				(v.site === 'YouTube' || v.site === 'Vimeo')
		)
		return (
			trFr ||
			videos.find(
				v => v.type === 'Trailer' && (v.site === 'YouTube' || v.site === 'Vimeo')
			) ||
			null
		)
	}, [videos])

	// Épisodes BDD -> map pour vérifier disponibilité (S/E)
	const dbEpisodes = useMemo(
		() => (Array.isArray(backendData?.episodes) ? backendData.episodes : []),
		[backendData]
	)
	const dbEpBySE = useMemo(() => {
		const map = new Map()
		for (const ep of dbEpisodes) {
			const sNum = ep.seasonNumber ?? ep.season_number
			const eNum = ep.episodeNumber ?? ep.episode_number
			if (sNum != null && eNum != null) map.set(`${sNum}-${eNum}`, ep)
		}
		return map
	}, [dbEpisodes])

	// Liste des saisons TMDB (pour le sélecteur)
	const seasonsList = useMemo(() => {
		const arr = Array.isArray(s?.seasons)
			? s.seasons.filter(sea => typeof sea?.season_number === 'number')
			: []
		return arr.sort((a, b) => (a.season_number || 0) - (b.season_number || 0))
	}, [s])

	const defaultSeason = useMemo(() => {
		const positives = seasonsList.filter(x => (x.season_number || 0) > 0)
		const target = (positives.length ? positives : seasonsList).slice(0)[0]
		return target?.season_number ?? null
	}, [seasonsList])

	const [selectedSeason, setSelectedSeason] = useState(
		localStorage.getItem(`${tmdbID}-selectedSeason`) || null
	)
	useEffect(() => {
		if (defaultSeason != null && selectedSeason == null) setSelectedSeason(defaultSeason)
		localStorage.setItem(`${tmdbID}-selectedSeason`, selectedSeason)
	}, [defaultSeason, selectedSeason, tmdbID])

	// Hook TMDB: récupérer la saison sélectionnée (inclut episodes[])
	const {
		data: seasonData,
		isPending: seasonLoading,
		isError: seasonIsError,
		error: seasonError
	} = useGetFullSeason(tmdbID, selectedSeason)

	const tmdbEpisodesForSelected = seasonData?.episodes || []

	// Adapter un épisode TMDB pour EpisodeCard
	const adaptTmdbEpisode = tmdbEp => {
		const sNum = tmdbEp?.season_number ?? selectedSeason
		const eNum = tmdbEp?.episode_number
		const dbMatch = dbEpBySE.get(`${sNum}-${eNum}`)
		return {
			id: dbMatch?.id, // utile si disponible
			seasonNumber: sNum,
			episodeNumber: eNum,
			title: tmdbEp?.name,
			name: tmdbEp?.name,
			overview: tmdbEp?.overview,
			stillPath: tmdbEp?.still_path
		}
	}

	if (isPending) {
		return (
			<div className='min-h-dvh flex items-center justify-center bg-black'>
				<Loader />
			</div>
		)
	}

	if (isError) {
		return (
			<div className='p-8 text-red-500'>
				Erreur lors du chargement des détails de la série : {error?.message || 'inconnue'}
			</div>
		)
	}

	return (
		<div className='relative w-full min-h-dvh bg-black text-gray-100 overflow-hidden'>
			<BackButton />

			{/* Backdrop aléatoire (parallax) */}
			{backdropUrl && <ParallaxBackdrop src={backdropUrl} />}

			<main className='relative z-10 pt-28 pb-24 px-6 md:px-10 max-w-7xl mx-auto'>
				{/* Header */}
				<motion.div
					variants={staggerContainer}
					initial='initial'
					animate='animate'
					className='flex flex-col md:flex-row gap-12'
				>
					{/* Poster */}
					<motion.div
						className='relative w-full md:w-auto md:shrink-0'
						custom={0}
						variants={fadeInUp}
					>
						{posterUrl ? (
							<div className='group relative w-64 md:w-72 rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-linear-to-t from-gray-800/40 to-gray-900/30 backdrop-blur-sm'>
								<img
									src={posterUrl}
									alt={title}
									className='w-full h-auto block transition duration-700 ease-out group-hover:scale-[1.03] group-hover:brightness-[0.85]'
									loading='lazy'
								/>
								<div className='pointer-events-none absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-70 mix-blend-multiply' />
							</div>
						) : (
							<div
								className={`w-64 md:w-72 h-[384px] rounded-xl bg-gray-800/30 border border-white/10 flex items-center justify-center text-base text-gray-500 ${shimmer}`}
							>
								Pas d&apos;affiche
							</div>
						)}
					</motion.div>

					{/* Textual info */}
					<motion.div
						className='flex flex-col gap-6 flex-1'
						variants={staggerContainer}
						initial='initial'
						animate='animate'
					>
						<motion.h1
							className='text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight bg-linear-to-t from-white to-gray-300 bg-clip-text text-transparent'
							custom={0}
							variants={fadeInUp}
						>
							{title}
							{firstAirDate ? (
								<span className='text-gray-300/70 font-semibold'>
									{' '}
									({formatYear(firstAirDate)})
								</span>
							) : null}
						</motion.h1>

						<motion.div
							className='flex flex-wrap items-center gap-3 text-base md:text-xl text-gray-300 font-medium'
							custom={1}
							variants={fadeInUp}
						>
							{episodeRunTime?.length ? (
								<span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10'>
									<IoTimeOutline className='text-lg opacity-70' />
									{episodeRunTime[0]} min/épisode
								</span>
							) : null}
							{countries && (
								<span className='px-3 py-1 rounded-full bg-white/5 border border-white/10'>
									{countries}
								</span>
							)}
							{vote10 && (
								<span className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-linear-to-r from-yellow-500/20 to-yellow-400/10 border border-yellow-400/30 text-yellow-300'>
									<IoStar className='text-lg' /> {vote10} / 10{' '}
									<span className='text-sm opacity-70'>({vote5} / 5)</span>
								</span>
							)}
						</motion.div>

						{/* Genres */}
						<GenreChips genres={genres} />

						{/* Tagline */}
						{tagline && (
							<motion.p
								custom={2}
								variants={fadeInUp}
								className='italic text-gray-300/80 text-lg'
							>
								{tagline}
							</motion.p>
						)}

						{/* Overview */}
						{overview && (
							<motion.p
								custom={3}
								variants={fadeInUp}
								className='text-xl md:text-lg leading-relaxed text-gray-200/90'
							>
								{overview}
							</motion.p>
						)}

						{/* Creators */}
						<motion.div className='flex flex-col gap-3' custom={4} variants={fadeInUp}>
							{Array.isArray(creators) && creators.length > 0 && (
								<div className='text-base md:text-xl'>
									<span className='font-semibold text-gray-200'>
										Créé par:&nbsp;
									</span>
									<span className='text-gray-300'>
										{creators
											.map(p => p.name)
											.filter(Boolean)
											.join(', ')}
									</span>
								</div>
							)}
						</motion.div>
					</motion.div>
				</motion.div>

				{/* Épisodes (style Netflix, toutes les saisons via sélecteur) */}
				{seasonsList.length > 0 && (
					<motion.section {...sectionReveal} className='mt-16 space-y-6'>
						<div className='flex items-center justify-between gap-4 flex-wrap'>
							<h2 className='text-3xl font-bold tracking-tight'>Épisodes</h2>
							<div>
								<label htmlFor='season-select' className='sr-only'>
									Saison
								</label>
								<select
									id='season-select'
									value={selectedSeason ?? ''}
									onChange={e => setSelectedSeason(parseInt(e.target.value, 10))}
									className='px-4 py-2 text-xl rounded-md bg-white/5 border border-white/10 text-gray-100 hover:bg-white/10 transition'
								>
									{seasonsList.map(sea => (
										<option
											key={sea.id || sea.season_number}
											value={sea.season_number}
										>
											Saison {sea.season_number}
										</option>
									))}
								</select>
							</div>
						</div>

						{/* Liste des épisodes de la saison sélectionnée */}
						{seasonLoading && (
							<div className='w-full flex items-center justify-center py-8'>
								<Loader />
							</div>
						)}
						{seasonIsError && (
							<div className='text-red-400 text-sm'>
								Impossible de charger les épisodes de la saison {selectedSeason}.{' '}
								{seasonError?.message || ''}
							</div>
						)}
						{!seasonLoading && !seasonIsError && (
							<div className='space-y-3'>
								{tmdbEpisodesForSelected.map((tmdbEp, i) => {
									const displayEp = adaptTmdbEpisode(tmdbEp)
									const dbMatch = dbEpBySE.get(
										`${displayEp.seasonNumber}-${displayEp.episodeNumber}`
									)
									return (
										<EpisodeCard
											key={`${displayEp.seasonNumber}-${displayEp.episodeNumber}`}
											episode={displayEp}
											available={dbMatch}
											layout='list'
											index={i}
										/>
									)
								})}
								{tmdbEpisodesForSelected.length === 0 && (
									<div className='text-gray-400 text-sm'>
										Aucun épisode trouvé pour cette saison.
									</div>
								)}
							</div>
						)}
					</motion.section>
				)}

				{/* Trailer */}
				<AnimatePresence>
					{trailer && (
						<div className='mt-16 w-full text-center flex flex-col items-center'>
							<TrailerEmbedSection trailer={trailer} title='Bande-annonce' />
						</div>
					)}
				</AnimatePresence>

				{/* Cast */}
				<AnimatePresence>
					{cast.length > 0 && (
						<motion.section {...sectionReveal} className='mt-16'>
							<h2 className='text-3xl font-bold mb-6 tracking-tight'>
								Distribution principale
							</h2>
							<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6'>
								{cast.map((actor, i) => (
									<PersonCard key={actor.id} person={actor} index={i} />
								))}
							</div>
						</motion.section>
					)}
				</AnimatePresence>

				{/* Séries similaires (avant les mots-clés) */}
				{s?.similar?.results?.length > 0 && (
					<motion.section {...sectionReveal} className='mt-20'>
						<h2 className='text-3xl font-bold mb-6 tracking-tight'>
							Séries similaires
						</h2>
						<div className='flex gap-5 overflow-x-auto pb-4 pr-3 snap-x snap-mandatory scrollable scrollable-horizontal'>
							{s.similar.results.slice(0, 14).map(tv => (
								<div key={tv.id} className='snap-start shrink-0 w-40 group'>
									<Link
										to={`/series/${tv.id}`}
										className='block rounded-xl overflow-hidden bg-linear-to-t from-gray-800/40 to-gray-900/40 border border-white/10 shadow hover:shadow-red-500/10 transition relative'
									>
										<div className='relative aspect-2/3 overflow-hidden'>
											<img
												src={
													tv.poster_path
														? `https://image.tmdb.org/t/p/w342${tv.poster_path}`
														: 'https://via.placeholder.com/200x300?text=No+Image'
												}
												alt={tv.name || tv.title}
												className='w-full h-full object-cover transition duration-700 ease-out group-hover:scale-105 group-hover:brightness-90'
												loading='lazy'
											/>
											<div className='absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent opacity-90 group-hover:opacity-95 transition' />
										</div>
										<div className='p-2'>
											<p className='text-sm font-medium leading-tight text-gray-100 line-clamp-2'>
												{tv.name || tv.title}
											</p>
										</div>
									</Link>
								</div>
							))}
						</div>
					</motion.section>
				)}

				{/* Keywords (if available) */}
				{Array.isArray(s?.keywords?.results) && s.keywords.results.length > 0 && (
					<motion.section {...sectionReveal} className='mt-16'>
						<h2 className='text-2xl font-semibold mb-4'>Mots-clés</h2>
						<div className='flex flex-wrap gap-2'>
							{s.keywords.results.slice(0, 24).map(k => (
								<span
									key={k.id || k.name}
									className='px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm tracking-wide uppercase text-gray-300 hover:bg-white/10 transition'
								>
									{k.name}
								</span>
							))}
						</div>
					</motion.section>
				)}
			</main>

			<div className='pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-linear-to-t from-black to-transparent' />
		</div>
	)
}

export default SerieDetails
