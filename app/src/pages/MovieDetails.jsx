import { useEffect, useRef, useState, useMemo } from 'react'
import { useAPI, useGetFullMovie, useMainContext } from '../app/hooks'
import Loader from '../components/Loader'
import { Link, useParams } from 'react-router-dom'
import { IoPlayCircle, IoTimeOutline, IoFilmOutline, IoStar } from 'react-icons/io5'
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion'

import {
	BackButton,
	ParallaxBackdrop,
	GenreChips,
	PersonCard,
	TrailerEmbedSection
} from '../components/DetailComponents'

import { fadeInUp, staggerContainer, sectionReveal, shimmer } from '../components/variants'

const MovieDetails = () => {
	const { tmdbID } = useParams()
	const { data: fullMovie, isLoading, error } = useGetFullMovie(tmdbID)
	const { pickRandom } = useMainContext()
	const randomBackdropRef = useRef(null)
	const [randomBackdrop, setRandomBackdrop] = useState(null)
	const [available, setAvailable] = useState(false)
	const { data, isPending } = useAPI('GET', '/movie/' + tmdbID)

	useEffect(() => {
		if (data && !isPending && !data.error) setAvailable(true)
		else setAvailable(false)
	}, [data, isPending])

	// Backdrop random pick
	useEffect(() => {
		if (!randomBackdropRef.current && fullMovie?.images?.backdrops?.length > 0) {
			randomBackdropRef.current = pickRandom(
				fullMovie.images.backdrops.filter(
					b => b.iso_639_1 === 'fr' || b.iso_639_1 === 'en' || b.iso_639_1 === null
				)
			)
			setRandomBackdrop(randomBackdropRef.current?.file_path)
		}
	}, [fullMovie, pickRandom])

	const trailer = useMemo(
		() =>
			fullMovie?.videos?.results?.find(
				v =>
					v.type === 'Trailer' &&
					(v.iso_639_1 === 'fr' || v.iso_639_1 === 'fr-FR') &&
					(v.site === 'YouTube' || v.site === 'Vimeo')
			) ||
			fullMovie?.videos?.results?.find(
				v => v.type === 'Trailer' && (v.site === 'YouTube' || v.site === 'Vimeo')
			),
		[fullMovie]
	)

	if (isLoading) {
		return (
			<div className='min-h-dvh flex items-center justify-center bg-black'>
				<Loader />
			</div>
		)
	}
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
		credits,
		reviews,
		keywords,
		external_ids,
		similar,
		recommendations,
		tagline,
		vote_average,
		production_countries
	} = fullMovie

	// Poster FR preference
	let posterFR = null
	if (images?.posters?.length > 0) {
		const frPoster = images.posters.find(p => p.iso_639_1 === 'fr')
		posterFR = frPoster ? `https://image.tmdb.org/t/p/w500${frPoster.file_path}` : null
	}
	const posterUrl =
		posterFR || (poster_path ? `https://image.tmdb.org/t/p/w500${poster_path}` : null)

	const backdropUrl = randomBackdrop
		? `https://image.tmdb.org/t/p/original${randomBackdrop}`
		: null

	const cast = credits?.cast?.slice(0, 8) || []
	const crew = credits?.crew || []
	const directors = crew.filter(c => c.job === 'Director')
	const writers = crew.filter(c => c.job === 'Writer' || c.job === 'Screenplay')
	const countries =
		production_countries?.map(c => c.name).join(', ') ||
		fullMovie?.production_countries?.map(c => c.name).join(', ') ||
		''
	const noteSur10 = vote_average ? vote_average.toFixed(1) : null
	const noteSur5 = vote_average ? (vote_average / 2).toFixed(1) : null

	return (
		<div className='relative w-full min-h-dvh bg-black text-gray-100 overflow-hidden'>
			<BackButton />

			{/* Backdrop */}
			{backdropUrl && <ParallaxBackdrop src={backdropUrl} />}

			{/* Main Content */}
			<main className='relative z-10 pt-28 pb-24 px-6 md:px-10 max-w-7xl mx-auto'>
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
							<div
								className={`group relative w-64 md:w-72 rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-linear-to-br from-gray-800/40 to-gray-900/30 backdrop-blur-sm ${available ? 'cursor-pointer' : 'opacity-70'}`}
							>
								<img
									src={posterUrl}
									alt={title}
									className='w-full h-auto block transition duration-700 ease-out group-hover:scale-[1.03] group-hover:brightness-[0.85]'
									loading='lazy'
								/>
								<div className='pointer-events-none absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-70 mix-blend-multiply' />
								<AnimatePresence>
									{available && (
										<motion.div
											initial={{ opacity: 0, scale: 0.9 }}
											animate={{ opacity: 1, scale: 1 }}
											exit={{ opacity: 0, scale: 0.9 }}
											transition={{
												type: 'spring',
												stiffness: 260,
												damping: 22
											}}
											className='absolute inset-0 flex items-center justify-center'
										>
											<Link
												to={`/viewer/movie/${tmdbID}`}
												className='flex flex-col items-center text-white drop-shadow-md'
											>
												<motion.div
													whileHover={{ scale: 1.1 }}
													whileTap={{ scale: 0.94 }}
													className='relative'
												>
													<IoPlayCircle className='w-20 h-20 text-red-500/90 drop-shadow-[0_0_12px_rgba(255,0,0,0.5)]' />
													<span className='absolute inset-0 animate-ping rounded-full bg-red-500/20' />
												</motion.div>
												<span className='mt-2 text-base tracking-wide font-semibold uppercase opacity-90 group-hover:opacity-100'>
													Regarder
												</span>
											</Link>
										</motion.div>
									)}
								</AnimatePresence>
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
							className='text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight bg-linear-to-br from-white to-gray-300 bg-clip-text text-transparent'
							custom={0}
							variants={fadeInUp}
						>
							{title}
						</motion.h1>

						<motion.div
							className='flex flex-wrap items-center gap-3 text-base md:text-xl text-gray-300 font-medium'
							custom={1}
							variants={fadeInUp}
						>
							{release_date && (
								<span className='px-3 py-1 rounded-full bg-white/5 border border-white/10'>
									{release_date.slice(0, 4)}
								</span>
							)}
							{runtime && (
								<span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10'>
									<IoTimeOutline className='text-lg opacity-70' />
									{Math.floor(runtime / 60)}h {runtime % 60}m
								</span>
							)}
							{countries && (
								<span className='px-3 py-1 rounded-full bg-white/5 border border-white/10'>
									{countries}
								</span>
							)}
							{noteSur10 && (
								<span className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-linear-to-r from-yellow-500/20 to-yellow-400/10 border border-yellow-400/30 text-yellow-300'>
									<IoStar className='text-lg' />
									{noteSur10} / 10
									<span className='text-sm opacity-70'>({noteSur5} / 5)</span>
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

						{/* Crew */}
						<motion.div className='flex flex-col gap-3' custom={4} variants={fadeInUp}>
							{directors.length > 0 && (
								<div className='text-base md:text-xl'>
									<span className='font-semibold text-gray-200'>
										Réalisateur{directors.length > 1 && 's'}:&nbsp;
									</span>
									<span className='text-gray-300'>
										{directors.map(d => d.name).join(', ')}
									</span>
								</div>
							)}
							{writers.length > 0 && (
								<div className='text-base md:text-xl'>
									<span className='font-semibold text-gray-200'>
										Scénario:&nbsp;
									</span>
									<span className='text-gray-300'>
										{writers.map(w => w.name).join(', ')}
									</span>
								</div>
							)}
						</motion.div>

						{/* Trailer */}
						<AnimatePresence>
							{trailer && (
								<TrailerEmbedSection trailer={trailer} title='Bande-annonce' />
							)}
						</AnimatePresence>
					</motion.div>
				</motion.div>

				{/* Cast */}
				<AnimatePresence>
					{cast.length > 0 && (
						<motion.section {...sectionReveal} className='mt-16'>
							<h2 className='text-3xl font-bold mb-6 tracking-tight'>
								Acteurs principaux
							</h2>
							<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6'>
								{cast.map((actor, i) => (
									<PersonCard key={actor.id} person={actor} index={i} />
								))}
							</div>
						</motion.section>
					)}
				</AnimatePresence>

				{/* Keywords */}
				{keywords?.keywords?.length > 0 && (
					<motion.section {...sectionReveal} className='mt-16'>
						<h2 className='text-2xl font-semibold mb-4'>Mots-clés</h2>
						<div className='flex flex-wrap gap-2'>
							{keywords.keywords.slice(0, 24).map((k, i) => (
								<motion.span
									key={k.id || k.name}
									initial={{ opacity: 0, y: 12 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ delay: i * 0.02, duration: 0.4 }}
									className='px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm tracking-wide uppercase text-gray-300 hover:bg-white/10 transition'
								>
									{k.name}
								</motion.span>
							))}
						</div>
					</motion.section>
				)}

				{/* Reviews */}
				{reviews?.results?.length > 0 && (
					<motion.section {...sectionReveal} className='mt-20'>
						<h2 className='text-3xl font-bold mb-6 tracking-tight'>Avis spectateurs</h2>
						<div className='grid gap-6 md:grid-cols-3'>
							{reviews.results.slice(0, 3).map((review, i) => (
								<motion.div
									key={review.id}
									initial={{ opacity: 0, y: 30 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{
										delay: i * 0.1,
										duration: 0.55,
										ease: [0.22, 1, 0.36, 1]
									}}
									className='relative p-5 rounded-xl bg-linear-to-br from-gray-800/40 to-gray-900/40 border border-white/10 shadow-lg'
								>
									<div className='absolute -left-1 top-4 w-1 h-10 rounded-r-full bg-linear-to-b from-red-500 to-red-600 shadow-[0_0_8px_rgba(255,0,0,0.4)]' />
									<div className='flex items-center justify-between mb-3'>
										<p className='font-semibold text-gray-100 text-xl'>
											{review.author}
										</p>
										<span className='text-[10px] uppercase tracking-wide text-gray-400 font-medium'>
											{new Date(review.created_at).toLocaleDateString(
												'fr-FR'
											)}
										</span>
									</div>
									<p className='text-base leading-relaxed text-gray-300/90'>
										{review.content.slice(0, 380)}
										{review.content.length > 380 && '…'}
									</p>
								</motion.div>
							))}
						</div>
					</motion.section>
				)}

				{/* Similar & Recommendations */}
				<div className='mt-24 space-y-24'>
					{similar?.results?.length > 0 && (
						<motion.section {...sectionReveal}>
							<h2 className='text-3xl font-bold mb-6 tracking-tight'>
								Films similaires
							</h2>
							<div className='flex gap-5 overflow-x-auto pb-4 pr-3 snap-x snap-mandatory scrollable scrollable-horizontal'>
								{similar.results.slice(0, 14).map((mov, i) => (
									<motion.div
										key={mov.id}
										initial={{ opacity: 0, y: 30 }}
										whileInView={{ opacity: 1, y: 0 }}
										viewport={{ once: true }}
										transition={{ delay: i * 0.05, duration: 0.5 }}
										className='snap-start shrink-0 w-40 group'
									>
										<Link
											to={`/movie/${mov.id}`}
											className='block rounded-xl overflow-hidden bg-linear-to-br from-gray-800/40 to-gray-900/40 border border-white/10 shadow hover:shadow-red-500/10 transition relative'
										>
											<div className='relative aspect-2/3 overflow-hidden'>
												<img
													src={
														mov.poster_path
															? `https://image.tmdb.org/t/p/w342${mov.poster_path}`
															: 'https://via.placeholder.com/200x300?text=No+Image'
													}
													alt={mov.title}
													className='w-full h-full object-cover transition duration-700 ease-out group-hover:scale-105 group-hover:brightness-90'
													loading='lazy'
												/>
												<div className='absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent opacity-90 group-hover:opacity-95 transition' />
											</div>
											<div className='p-2'>
												<p className='text-sm font-medium leading-tight text-gray-100 line-clamp-2'>
													{mov.title}
												</p>
											</div>
										</Link>
									</motion.div>
								))}
							</div>
						</motion.section>
					)}

					{recommendations?.results?.length > 0 && (
						<motion.section {...sectionReveal}>
							<h2 className='text-3xl font-bold mb-6 tracking-tight'>
								Recommandations
							</h2>
							<div className='flex gap-5 overflow-x-auto pb-4 pr-3 snap-x snap-mandatory scrollable scrollable-horizontal'>
								{recommendations.results.slice(0, 14).map((mov, i) => (
									<motion.div
										key={mov.id}
										initial={{ opacity: 0, y: 30 }}
										whileInView={{ opacity: 1, y: 0 }}
										viewport={{ once: true }}
										transition={{ delay: i * 0.05, duration: 0.5 }}
										className='snap-start shrink-0 w-40 group'
									>
										<Link
											to={`/movie/${mov.id}`}
											className='block rounded-xl overflow-hidden bg-linear-to-br from-gray-800/40 to-gray-900/40 border border-white/10 shadow hover:shadow-red-500/10 transition relative'
										>
											<div className='relative aspect-2/3 overflow-hidden'>
												<img
													src={
														mov.poster_path
															? `https://image.tmdb.org/t/p/w342${mov.poster_path}`
															: 'https://via.placeholder.com/200x300?text=No+Image'
													}
													alt={mov.title}
													className='w-full h-full object-cover transition duration-700 ease-out group-hover:scale-105 group-hover:brightness-90'
													loading='lazy'
												/>
												<div className='absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent opacity-90 group-hover:opacity-95 transition' />
											</div>
											<div className='p-2'>
												<p className='text-sm font-medium leading-tight text-gray-100 line-clamp-2'>
													{mov.title}
												</p>
											</div>
										</Link>
									</motion.div>
								))}
							</div>
						</motion.section>
					)}
				</div>

				{/* External links */}
				{(external_ids?.imdb_id ||
					external_ids?.facebook_id ||
					external_ids?.instagram_id ||
					external_ids?.twitter_id) && (
					<motion.section className='mt-28' {...sectionReveal}>
						<h2 className='text-xl font-semibold mb-4 tracking-wide uppercase text-gray-200'>
							Présence officielle
						</h2>
						<div className='flex gap-4 flex-wrap items-center'>
							{external_ids?.imdb_id && (
								<a
									href={`https://www.imdb.com/title/${external_ids.imdb_id}`}
									target='_blank'
									rel='noopener noreferrer'
									className='px-5 py-2.5 rounded-full text-base font-semibold bg-[#f5c518]/15 border border-[#f5c518]/40 text-[#f5c518] hover:bg-[#f5c518]/25 transition shadow-sm'
								>
									IMDb
								</a>
							)}
							{external_ids?.facebook_id && (
								<a
									href={`https://facebook.com/${external_ids.facebook_id}`}
									target='_blank'
									rel='noopener noreferrer'
									className='px-5 py-2.5 rounded-full text-base font-semibold bg-[#1877f3]/15 border border-[#1877f3]/40 text-[#1877f3] hover:bg-[#1877f3]/25 transition shadow-sm'
								>
									Facebook
								</a>
							)}
							{external_ids?.instagram_id && (
								<a
									href={`https://instagram.com/${external_ids.instagram_id}`}
									target='_blank'
									rel='noopener noreferrer'
									className='px-5 py-2.5 rounded-full text-base font-semibold bg-[#E4405F]/15 border border-[#E4405F]/40 text-[#E4405F] hover:bg-[#E4405F]/25 transition shadow-sm'
								>
									Instagram
								</a>
							)}
							{external_ids?.twitter_id && (
								<a
									href={`https://twitter.com/${external_ids.twitter_id}`}
									target='_blank'
									rel='noopener noreferrer'
									className='px-5 py-2.5 rounded-full text-base font-semibold bg-[#1DA1F2]/15 border border-[#1DA1F2]/40 text-[#1DA1F2] hover:bg-[#1DA1F2]/25 transition shadow-sm'
								>
									Twitter/X
								</a>
							)}
						</div>
					</motion.section>
				)}
			</main>

			<div className='pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-linear-to-t from-black to-transparent' />
		</div>
	)
}

export default MovieDetails
