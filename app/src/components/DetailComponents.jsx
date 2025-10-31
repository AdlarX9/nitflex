import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
// eslint-disable-next-line
import { motion } from 'framer-motion'
import { IoArrowBack, IoPlay } from 'react-icons/io5'
import { cardVariant, chipVariant, staggerContainer } from './variants'
import { useAPI, useMainContext } from '../app/hooks'

// Back navigation button (consistent styling)
export const BackButton = () => (
	<Link
		to={-1}
		className='fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-br from-gray-800/70 to-gray-700/40 backdrop-blur-sm hover:from-gray-700/80 hover:to-gray-600/40 border border-white/10 text-base group shadow-lg'
	>
		<IoArrowBack className='text-lg group-hover:-translate-x-0.5 transition' />
		<span className='uppercase tracking-wide font-semibold text-sm'>Retour</span>
	</Link>
)

// Backdrop with parallax + overlays
export const ParallaxBackdrop = ({ src }) => {
	const imgRef = useRef(null)
	const tickingRef = useRef(false)
	const lastYRef = useRef(0)

	useEffect(() => {
		const handleScroll = () => {
			lastYRef.current = window.scrollY
			if (tickingRef.current) return
			tickingRef.current = true
			requestAnimationFrame(() => {
				if (imgRef.current) {
					imgRef.current.style.transform = `translateY(${lastYRef.current / 4}px) scale(1.04)`
				}
				tickingRef.current = false
			})
		}
		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	if (!src) return null
	return (
		<>
			<motion.img
				ref={imgRef}
				key={src}
				src={src}
				alt='Arrière-plan'
				initial={{ opacity: 0, scale: 1.04 }}
				animate={{ opacity: 0.45, scale: 1.04 }}
				transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
				className='absolute inset-0 w-full h-auto object-cover pointer-events-none select-none z-0 will-change-transform'
				loading='lazy'
				decoding='async'
				draggable={false}
			/>
			<motion.div
				aria-hidden
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 1 }}
				className='absolute inset-0 bg-[radial-gradient(at_30%_20%,rgba(255,255,255,0.08),rgba(0,0,0,0)_60%),radial-gradient(at_80%_60%,rgba(255,0,0,0.15),rgba(0,0,0,0)_70%)] mix-blend-screen pointer-events-none'
			/>
			<div className='absolute inset-0 bg-linear-to-b from-black via-black/60 to-[#05070d] z-0 pointer-events-none' />
			<div
				className='absolute inset-0 opacity-[0.18] mix-blend-overlay pointer-events-none z-0'
				style={{
					backgroundImage:
						'repeating-linear-gradient(0deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_2px)'
				}}
			/>
		</>
	)
}

// Genres as chips
export const GenreChips = ({ genres = [] }) => {
	if (!Array.isArray(genres) || genres.length === 0) return null
	return (
		<motion.div
			className='flex flex-wrap gap-2'
			variants={staggerContainer}
			initial='initial'
			animate='animate'
		>
			{genres.map((g, i) => (
				<motion.span
					key={g.id || g.name}
					variants={chipVariant}
					custom={i}
					className='px-3 py-1 rounded-full bg-linear-to-br from-red-600/30 to-red-500/20 border border-red-500/30 text-red-300 text-sm tracking-wide uppercase font-semibold backdrop-blur-sm'
				>
					{g.name}
				</motion.span>
			))}
		</motion.div>
	)
}

// Person card (cast)
export const PersonCard = ({ person, index = 0 }) => {
	if (!person) return null
	return (
		<motion.div
			variants={cardVariant}
			initial='hidden'
			whileInView='show'
			custom={index}
			viewport={{ once: true, margin: '0px 0px -60px 0px' }}
			className='group relative rounded-xl overflow-hidden bg-linear-to-br from-gray-800/40 to-gray-900/40 border border-white/10 shadow-lg'
		>
			<Link
				to={`/person/${person.id}`}
				className='block focus:outline-none focus-visible:ring focus-visible:ring-red-500/60'
			>
				<div className='relative aspect-3/4 overflow-hidden'>
					<img
						src={
							person.profile_path
								? `https://image.tmdb.org/t/p/w185${person.profile_path}`
								: 'https://via.placeholder.com/240x360?text=No+Image'
						}
						alt={person.name}
						className='object-cover w-full h-full transition duration-700 ease-out group-hover:scale-105 group-hover:brightness-90'
						loading='lazy'
					/>
					<div className='absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent opacity-90 group-hover:opacity-95 transition' />
				</div>
				<div className='p-3 flex flex-col gap-1'>
					<p className='text-base font-semibold leading-tight text-gray-100 truncate'>
						{person.name}
					</p>
					{person.character && (
						<p className='text-[11px] text-gray-400 leading-tight line-clamp-2'>
							{person.character}
						</p>
					)}
				</div>
			</Link>
		</motion.div>
	)
}

// Trailer embed section (YouTube preferred)
export const TrailerEmbedSection = ({ trailer, title = 'Bande-annonce' }) => {
	if (!trailer) return null
	const isYoutube = trailer.site === 'YouTube'
	return (
		<motion.div
			initial={{ opacity: 0, y: 30 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 30 }}
			transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
			className='mt-2'
		>
			<div className='text-3xl font-semibold text-gray-200 mb-2'>{title}</div>
			<div className='relative rounded-xl overflow-hidden border border-white/10 shadow-xl bg-black/40 backdrop-blur-sm max-w-xl'>
				{isYoutube ? (
					<iframe
						title={title}
						width='600'
						height='338'
						src={`https://www.youtube.com/embed/${trailer.key}`}
						allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
						allowFullScreen
						className='w-full aspect-video'
					/>
				) : trailer.url ? (
					<a
						href={trailer.url}
						target='_blank'
						rel='noopener noreferrer'
						className='block p-6 text-blue-400 underline'
					>
						Voir la bande-annonce
					</a>
				) : null}
				<div className='absolute inset-0 pointer-events-none bg-linear-to-t from-black/60 via-transparent to-transparent' />
			</div>
		</motion.div>
	)
}

// Episode item (card or list layout) with "available" play triangle indicator
export const EpisodeCard = ({
	episode,
	available = false,
	layout = 'card', // 'card' | 'list'
	index = 0
}) => {
	// Ongoing progress lookup must be declared before any return (hooks order)
	const { user } = useMainContext()
	const { data: ongoingMedia } = useAPI('GET', `/ongoing_media/${user?.id}`, {}, {}, !!user?.id)
	const progress = useMemo(() => {
		if (!ongoingMedia || !episode?.id) return 0
		const it = ongoingMedia.find(i => i.type === 'episode' && i.episodeId === episode.id)
		if (!it) return 0
		const pct = (it.position / it.duration) * 100
		return Math.max(0, Math.min(100, pct))
	}, [ongoingMedia, episode?.id])

	if (!episode) return null
	const sNum = episode.seasonNumber ?? episode.season_number
	const eNum = episode.episodeNumber ?? episode.episode_number
	const title = episode.title || episode.name
	const still = episode.stillPath || episode.still_path

	const Wrapper = ({ children }) =>
		available ? (
			<Link to={`/viewer/episode/${episode.id}`} className='block'>
				{children}
			</Link>
		) : (
			<div className='block cursor-not-allowed'>{children}</div>
		)

	const PlayBadge = () =>
		available ? (
			<div className='absolute left-0 right-0 top-0 bottom-0 z-10 flex items-center justify-center bg-black/10'>
				<span className='w-12 h-12 rounded-full bg-black/60 border border-red-600 shadow flex items-center justify-center'>
					<IoPlay className='text-white text-2xl translate-x-px' />
				</span>
			</div>
		) : null

	if (layout === 'list') {
		return (
			<motion.div
				variants={cardVariant}
				initial='hidden'
				whileInView='show'
				custom={index}
				viewport={{ once: true, margin: '0px 0px -60px 0px' }}
				className={`relative rounded-xl overflow-hidden bg-linear-to-br from-gray-800/40 to-gray-900/40 border border-white/10 shadow ${available ? 'hover:shadow-red-500/10 transition' : 'opacity-95'}`}
			>
				<Wrapper>
					<div className='flex gap-4 p-3 sm:p-4'>
						<div className='relative w-40 sm:w-52 aspect-video shrink-0 overflow-hidden rounded-lg'>
							{still ? (
								<img
									src={`https://image.tmdb.org/t/p/w342${still}`}
									alt={title}
									className='w-full h-full object-cover transition duration-700 ease-out hover:scale-[1.02] hover:brightness-90'
									loading='lazy'
								/>
							) : (
								<div className='w-full h-full bg-gray-800' />
							)}
							<div className='absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent opacity-90' />
							<PlayBadge />
						</div>
						<div className='min-w-0 flex-1 py-1'>
							<p className='text-sm font-semibold leading-tight text-gray-100 truncate'>
								S{String(sNum).padStart(2, '0')}E{String(eNum).padStart(2, '0')}
								{title ? ` — ${title}` : ''}
							</p>
							{episode.overview && (
								<p className='text-xs text-gray-400 line-clamp-3 mt-1'>
									{episode.overview}
								</p>
							)}
						</div>
					</div>
				</Wrapper>
				{progress > 0 && (
					<div className='absolute bottom-0 left-0 right-0 h-1 bg-black/60'>
						<div className='h-full bg-nitflex-red' style={{ width: `${progress}%` }} />
					</div>
				)}
			</motion.div>
		)
	}

	// card layout
	return (
		<motion.div
			variants={cardVariant}
			initial='hidden'
			whileInView='show'
			custom={index}
			viewport={{ once: true, margin: '0px 0px -60px 0px' }}
			className={`group rounded-xl overflow-hidden bg-linear-to-br from-gray-800/40 to-gray-900/40 border border-white/10 shadow hover:shadow-red-500/10 transition relative ${available ? '' : 'opacity-95 cursor-not-allowed'}`}
		>
			<Wrapper>
				<div className='relative aspect-video'>
					{still ? (
						<img
							src={`https://image.tmdb.org/t/p/w342${still}`}
							alt={title}
							className='w-full h-full object-cover transition duration-700 ease-out group-hover:scale-105 group-hover:brightness-90'
							loading='lazy'
						/>
					) : (
						<div className='w-full h-full bg-gray-800' />
					)}
					<div className='absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent opacity-90 group-hover:opacity-95 transition' />
					<PlayBadge />
				</div>
				<div className='p-3'>
					<p className='text-sm font-semibold leading-tight text-gray-100 truncate'>
						S{String(sNum).padStart(2, '0')}E{String(eNum).padStart(2, '0')}
						{title ? ` — ${title}` : ''}
					</p>
					{episode.overview && (
						<p className='text-xs text-gray-400 line-clamp-2 mt-1'>
							{episode.overview}
						</p>
					)}
				</div>
			</Wrapper>
			{progress > 0 && (
				<div className='absolute bottom-0 left-0 right-0 h-1 bg-black/60'>
					<div className='h-full bg-nitflex-red' style={{ width: `${progress}%` }} />
				</div>
			)}
		</motion.div>
	)
}
