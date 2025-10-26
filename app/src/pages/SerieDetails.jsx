import { useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAPI } from '../app/hooks'
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion'
import { IoArrowBack } from 'react-icons/io5'

const sectionReveal = {
	initial: { opacity: 0, y: 24 },
	whileInView: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.5 }
	},
	viewport: { once: true, margin: '0px 0px -80px 0px' }
}

const SerieDetails = () => {
	const { id } = useParams()
	const navigate = useNavigate()
	const { data, isPending } = useAPI('GET', `/series/${id}`)

	const episodesBySeason = useMemo(() => {
		const grouped = {}
		if (data?.episodes) {
			for (const ep of data.episodes) {
				if (!grouped[ep.seasonNumber]) grouped[ep.seasonNumber] = []
				grouped[ep.seasonNumber].push(ep)
			}
			console.log(data.episodes)
		}
		return grouped
	}, [data])

	const seasons = useMemo(
		() =>
			Object.keys(episodesBySeason)
				.map(n => parseInt(n, 10))
				.sort((a, b) => a - b),
		[episodesBySeason]
	)

	return (
		<div className='relative w-full min-h-dvh bg-black text-gray-100 overflow-hidden'>
			<button
				onClick={() => navigate(-1)}
				className='fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-br from-gray-800/70 to-gray-700/40 backdrop-blur-sm hover:from-gray-700/80 hover:to-gray-600/40 border border-white/10 text-base group shadow-lg'
				type='button'
			>
				<IoArrowBack className='text-lg group-hover:-translate-x-0.5 transition' />
				<span className='uppercase tracking-wide font-semibold text-sm'>Retour</span>
			</button>

			{data?.series?.backdrop && (
				<>
					<motion.img
						key={data.series.backdrop}
						src={`https://image.tmdb.org/t/p/original${data.series.backdrop}`}
						alt='Arrière-plan'
						initial={{ opacity: 0, scale: 1.08 }}
						animate={{ opacity: 0.5, scale: 1.05 }}
						transition={{ duration: 1.2 }}
						className='absolute inset-0 w-full h-auto object-cover pointer-events-none select-none z-0'
					/>
					<div className='absolute inset-0 bg-gradient-to-b from-black via-black/60 to-[#05070d] z-0 pointer-events-none' />
				</>
			)}

			<main className='relative z-10 pt-24 pb-24 px-6 md:px-10 max-w-7xl mx-auto'>
				<div className='flex gap-8 items-start'>
					{data?.series?.poster && (
						<img
							src={`https://image.tmdb.org/t/p/w500${data.series.poster}`}
							alt={data.series.title}
							className='w-52 rounded-xl border border-white/10 shadow-2xl'
						/>
					)}
					<div className='flex-1 min-w-0'>
						<h1 className='text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight'>
							{data?.series?.title || ''}
						</h1>
						{data?.series?.overview && (
							<p className='mt-4 text-lg text-gray-200/90'>{data.series.overview}</p>
						)}
					</div>
				</div>

				<AnimatePresence>
					{isPending && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className='mt-12 text-gray-400'
						>
							Chargement…
						</motion.div>
					)}
				</AnimatePresence>

				{seasons.length > 0 && (
					<div className='mt-12 space-y-10'>
						{seasons.map(season => (
							<motion.section key={season} {...sectionReveal}>
								<h2 className='text-2xl font-bold mb-4'>Saison {season}</h2>
								<div className='grid gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
									{episodesBySeason[season].map(ep => (
										<Link
											key={ep.id}
											to={`/viewer/episode/${ep.id}`}
											className='group rounded-xl overflow-hidden bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-white/10 shadow hover:shadow-red-500/10 transition relative'
										>
											<div className='relative aspect-[16/9]'>
												{ep.stillPath ? (
													<img
														src={`https://image.tmdb.org/t/p/w342${ep.stillPath}`}
														alt={ep.title}
														className='w-full h-full object-cover transition duration-700 ease-out group-hover:scale-105 group-hover:brightness-90'
													/>
												) : (
													<div className='w-full h-full bg-gray-800' />
												)}
												<div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-90 group-hover:opacity-95 transition' />
											</div>
											<div className='p-3'>
												<p className='text-sm font-semibold leading-tight text-gray-100 truncate'>
													S{String(ep.seasonNumber).padStart(2, '0')}E
													{String(ep.episodeNumber).padStart(2, '0')}{' '}
													{ep.title ? `- ${ep.title}` : ''}
												</p>
												{ep.overview && (
													<p className='text-xs text-gray-400 line-clamp-2'>
														{ep.overview}
													</p>
												)}
											</div>
										</Link>
									))}
								</div>
							</motion.section>
						))}
					</div>
				)}
			</main>
		</div>
	)
}

export default SerieDetails
