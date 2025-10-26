import { useEffect, useMemo, useRef, useState } from 'react'
import Uppy from '@uppy/core'
import XHRUpload from '@uppy/xhr-upload'
import fr_FR from '@uppy/locales/lib/fr_FR.js'
import { Dashboard } from '@uppy/react'
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion'
import '../../node_modules/@uppy/core/dist/style.css'
import '../../node_modules/@uppy/dashboard/dist/style.css'
import MovieSearch from '../components/MovieSearch'
import SeriesSearch from '../components/SeriesSearch'
import { Back } from '../components/NavBar'
import { useMainContext, useAPIAfter, fetchFullSerie, fetchEpisodeDetails } from '../app/hooks'

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: { duration: 0.45, ease: [0.25, 0.8, 0.4, 1] }
	}
}

const titleVariants = {
	hidden: { opacity: 0, y: 30, scale: 0.98, filter: 'blur(6px)' },
	visible: {
		opacity: 1,
		y: 0,
		scale: 1,
		filter: 'blur(0px)',
		transition: {
			duration: 0.75,
			ease: [0.16, 1, 0.3, 1]
		}
	}
}

const cardVariants = {
	hidden: { opacity: 0, y: 28, scale: 0.97 },
	visible: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
	}
}

const afterSelectVariants = {
	hidden: { opacity: 0, y: 24 },
	visible: (i = 0) => ({
		opacity: 1,
		y: 0,
		transition: {
			delay: 0.08 * i,
			duration: 0.5,
			ease: [0.22, 1, 0.36, 1]
		}
	})
}

const dashboardVariants = {
	hidden: { opacity: 0, y: 40, scale: 0.96 },
	visible: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: { duration: 0.55, ease: [0.25, 0.8, 0.4, 1] }
	},
	exit: {
		opacity: 0,
		y: 30,
		scale: 0.97,
		transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
	}
}

const glowPulse = {
	animate: {
		filter: [
			'drop-shadow(0 0 0px rgba(229,0,36,0.0))',
			'drop-shadow(0 0 18px rgba(229,0,36,0.35))',
			'drop-shadow(0 0 0px rgba(229,0,36,0.0))'
		],
		transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' }
	}
}

const MediaUploader = () => {
	const { refetchNewMovies, refetchNewSeries } = useMainContext()
	const createSeries = useAPIAfter('POST', '/series')
	const addEpisode = useAPIAfter('POST', '/series/:id/episodes')
	const addEpisodesBatch = useAPIAfter('POST', '/series/:id/episodes/batch')
	const updateSeries = useAPIAfter('PATCH', '/series/:id')
	const [mediaType, setMediaType] = useState('movie') // 'movie' or 'series'
	const [processingLocation, setProcessingLocation] = useState('server')
	const [transcodeMode, setTranscodeMode] = useState('server') // 'none', 'server', 'local'
	const [isElectron, setIsElectron] = useState(false)

	// Movie state
	const [newMovie, setNewMovie] = useState(null)
	const [customTitle, setCustomTitle] = useState('')
	const [tmdbID, setTmdbID] = useState(null)

	// Series state
	const [selectedSeries, setSelectedSeries] = useState(null)
	const [seriesID, setSeriesID] = useState(null)
	const [seasonNumber, setSeasonNumber] = useState('')
	const [episodeNumber, setEpisodeNumber] = useState('')
	const [seriesFolderName, setSeriesFolderName] = useState('')
	const [uppyFiles, setUppyFiles] = useState([])
	const [seriesFilesMap, setSeriesFilesMap] = useState({}) // {fileId: {season:'', episode:''}}
	const [fileOrder, setFileOrder] = useState([]) // ordering of fileIds
	const [fileEpisodeInfo, setFileEpisodeInfo] = useState({}) // {fileId: {title, tmdbID, loading}}

	useEffect(() => {
		const checkElectron = () =>
			typeof window !== 'undefined' && window.process && window.process.type
		setIsElectron(checkElectron())
	}, [])

	const uppy = useMemo(
		() =>
			new Uppy({
				restrictions: {
					maxFileSize: null,
					allowedFileTypes: ['video/*']
				},
				autoProceed: false
			}),
		[]
	)

	useEffect(() => {
		uppy.use(XHRUpload, {
			endpoint: import.meta.env.VITE_API + '/movies',
			formData: true,
			fieldName: 'file'
		})
		return () => uppy.destroy()
	}, [uppy])

	useEffect(() => {
		const onComplete = async result => {
			if (result.successful?.length > 0) {
				if (mediaType === 'series' && seriesID) {
					try {
						// Ensure series custom folder is up to date
						if (seriesFolderName && seriesID) {
							await updateSeries.triggerAsync(
								{ customTitle: seriesFolderName },
								{},
								`/series/${seriesID}`
							)
						}

						const files = result.successful
						// Build payloads per file
						const episodes = []
						for (const f of files) {
							const resp = f.response?.body
							const map = seriesFilesMap[f.id] || {
								season: seasonNumber,
								episode: episodeNumber
							}
							const s = parseInt(map.season)
							const e = parseInt(map.episode)
							let info = fileEpisodeInfo[f.id]
							if (!info || !info.title || !info.tmdbID) {
								const data = await fetchEpisodeDetails(selectedSeries.id, s, e)
								info = { title: data?.name || '', tmdbID: data?.id || null }
							}
							episodes.push({
								seasonNumber: s,
								episodeNumber: e,
								filePath: resp?.movie?.filePath || '',
								title: info.title,
								tmdbID: info.tmdbID,
								transcodeMode
							})
						}

						// Use batch endpoint for episodes
						await addEpisodesBatch.triggerAsync(
							{ episodes },
							{},
							`/series/${seriesID}/episodes/batch`
						)

						if (typeof refetchNewSeries === 'function') refetchNewSeries()
					} catch (error) {
						console.error('Failed to create episodes (batch):', error)
					}
				}

				if (
					isElectron &&
					processingLocation === 'local' &&
					result.successful[0].response?.body?.movie
				) {
					if (window.electronAPI?.processMovie) {
						window.electronAPI
							.processMovie(result.successful[0].response.body.movie)
							.then(r => console.log('Local processing result:', r))
							.catch(err => console.error('Local processing failed:', err))
					}
				}

				refetchNewMovies()
				if (typeof refetchNewSeries === 'function') refetchNewSeries()
			}
		}

		uppy.on('complete', onComplete)
		return () => {
			uppy.off('complete', onComplete)
		}
	}, [
		uppy,
		refetchNewMovies,
		refetchNewSeries,
		isElectron,
		processingLocation,
		mediaType,
		seriesID,
		selectedSeries,
		seasonNumber,
		episodeNumber,
		customTitle,
		transcodeMode,
		addEpisode,
		addEpisodesBatch,
		updateSeries,
		seriesFolderName,
		seriesFilesMap,
		fileEpisodeInfo
	])

	useEffect(() => {
		const handleAdded = file => {
			if (mediaType === 'movie') {
				uppy.setFileMeta(file.id, {
					customTitle,
					tmdbID,
					processingLocation,
					transcodeMode
				})
			} else {
				uppy.setFileMeta(file.id, {
					customTitle: seriesFolderName || selectedSeries?.name || '',
					processingLocation,
					transcodeMode,
					type: 'series'
				})
				setSeriesFilesMap(prev => ({
					...prev,
					[file.id]: prev[file.id] || { season: '', episode: '' }
				}))
				setFileOrder(prev => (prev.includes(file.id) ? prev : [...prev, file.id]))
			}
			setUppyFiles(uppy.getFiles())
		}
		const handleRemoved = file => {
			setSeriesFilesMap(prev => {
				const p = { ...prev }
				delete p[file.id]
				return p
			})
			setFileOrder(prev => prev.filter(id => id !== file.id))
			setUppyFiles(uppy.getFiles())
		}
		uppy.on('file-added', handleAdded)
		uppy.on('file-removed', handleRemoved)
		return () => {
			uppy.off('file-added', handleAdded)
			uppy.off('file-removed', handleRemoved)
		}
	}, [
		customTitle,
		tmdbID,
		processingLocation,
		transcodeMode,
		mediaType,
		uppy,
		seriesFolderName,
		selectedSeries?.name
	])

	useEffect(() => {
		if (newMovie) {
			setCustomTitle(newMovie.title)
			setTmdbID(newMovie.id)
		} else {
			setCustomTitle('')
			setTmdbID(null)
		}
	}, [newMovie])

	// Create series in backend when selected (guard against repeated calls)
	const lastCreatedSeriesId = useRef(null)
	useEffect(() => {
		const sid = selectedSeries?.id
		if (!sid || seriesID) return
		if (lastCreatedSeriesId.current === sid) return
		lastCreatedSeriesId.current = sid
		;(async () => {
			try {
				const { data } = await fetchFullSerie(sid)
				console.log(data)
				const payload = {
					title: data?.name || selectedSeries?.name || '',
					tmdbID: sid,
					imdbID: data?.external_ids?.imdb_id || '',
					poster: data?.poster_path || selectedSeries?.poster_path || '',
					customTitle: seriesFolderName || selectedSeries?.name || ''
				}
				const res = await createSeries.triggerAsync(payload)
				if (res?.id) setSeriesID(res.id)
			} catch (err) {
				console.error('Failed to create series:', err)
			}
		})()
	}, [
		selectedSeries?.id,
		selectedSeries?.name,
		selectedSeries?.poster_path,
		seriesID,
		createSeries,
		seriesFolderName
	])

	// Default series folder name to TMDB name on selection
	useEffect(() => {
		if (selectedSeries && !seriesFolderName) {
			setSeriesFolderName(selectedSeries.name || '')
		}
	}, [selectedSeries, seriesFolderName])

	// Auto-fetch episode titles when mapping numbers are set
	useEffect(() => {
		if (!selectedSeries?.id) return
		const fetchInfos = async () => {
			for (const fid of fileOrder) {
				const m = seriesFilesMap[fid]
				if (!m) continue
				const s = parseInt(m.season)
				const e = parseInt(m.episode)
				if (!s || !e) continue
				const cur = fileEpisodeInfo[fid]
				if (cur && cur.title) continue
				setFileEpisodeInfo(prev => ({
					...prev,
					[fid]: { ...(prev[fid] || {}), loading: true }
				}))
				const data = await fetchEpisodeDetails(selectedSeries.id, s, e)
				setFileEpisodeInfo(prev => ({
					...prev,
					[fid]: { title: data?.name || '', tmdbID: data?.id || null, loading: false }
				}))
			}
		}
		fetchInfos()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fileOrder, seriesFilesMap, selectedSeries?.id])

	const isSeries = mediaType === 'series'
	const multi = isSeries && (uppyFiles?.length || 0) >= 2
	const canUpload =
		mediaType === 'movie'
			? customTitle.length > 0
			: selectedSeries &&
				seriesFolderName?.length > 0 &&
				(multi ? true : seasonNumber && episodeNumber)

	return (
		<motion.div
			className={`w-screen h-dvh flex justify-center ${(newMovie || selectedSeries) && 'items-center'} scrollable relative`}
			variants={containerVariants}
			initial='hidden'
			animate='visible'
		>
			<Back />

			{/* Background animation overlay */}
			<motion.div aria-hidden className='pointer-events-none absolute inset-0 -z-10'>
				<motion.div
					className='absolute inset-0'
					style={{
						background:
							'radial-gradient(circle at 30% 22%, rgba(255,255,255,0.08), rgba(0,0,0,0) 60%)'
					}}
					animate={{
						scale: [1, 1.08, 1],
						opacity: [0.65, 0.85, 0.65]
					}}
					transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
				/>
				<div
					className='absolute inset-0 opacity-[0.15] mix-blend-overlay'
					style={{
						backgroundImage:
							'repeating-linear-gradient(0deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_3px)'
					}}
				/>
				<motion.div
					className='absolute inset-0'
					animate={{
						backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
					}}
					style={{
						background: 'linear-gradient(140deg,#020305 0%,#0d1117 55%,#111 100%)',
						backgroundSize: '200% 200%'
					}}
					transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
				/>
			</motion.div>

			<div className='flex items-center flex-col gap-8 w-full max-w-[860px] px-6 pb-20'>
				<motion.h1
					className={`text-[2.8rem] md:text-[3.6rem] font-extrabold tracking-tight text-center bg-gradient-to-r from-red-500 via-red-400 to-red-700 bg-clip-text text-transparent ${
						!(newMovie || selectedSeries) && 'mt-[10vh]'
					}`}
					variants={titleVariants}
					{...glowPulse}
				>
					Importer un média
				</motion.h1>

				<motion.main
					className='w-full rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.02))] backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] p-6 md:p-8 flex flex-col gap-5 text-gray-100 relative z-1'
					variants={cardVariants}
				>
					{/* Media Type Selector */}
					<div className='flex gap-4 mb-2'>
						<button
							onClick={() => setMediaType('movie')}
							className={`flex-1 py-3 px-6 rounded-xl text-2xl font-semibold transition cursor-pointer ${
								mediaType === 'movie'
									? 'bg-red-500 text-white'
									: 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
							}`}
						>
							Film
						</button>
						<button
							onClick={() => setMediaType('series')}
							className={`flex-1 py-3 px-6 rounded-xl text-2xl font-semibold transition cursor-pointer ${
								mediaType === 'series'
									? 'bg-red-500 text-white'
									: 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
							}`}
						>
							Série
						</button>
					</div>

					<p className='text-2xl font-semibold tracking-wide uppercase text-gray-200'>
						{mediaType === 'movie' ? 'Identifier le film' : 'Identifier la série'}
					</p>

					<div>
						{mediaType === 'movie' ? (
							<MovieSearch onSelect={movie => setNewMovie(movie)} />
						) : (
							<SeriesSearch onSelect={series => setSelectedSeries(series)} />
						)}
					</div>

					<AnimatePresence mode='wait'>
						{((mediaType === 'movie' && newMovie) ||
							(mediaType === 'series' && selectedSeries)) && (
							<motion.div
								className='flex flex-col gap-6'
								initial='hidden'
								animate='visible'
								exit='hidden'
							>
								{/* Series-specific fields */}
								{mediaType === 'series' && (
									<>
										<motion.div
											className='flex gap-4'
											variants={afterSelectVariants}
											custom={0}
										>
											{!multi && (
												<>
													<div className='flex-1'>
														<label
															htmlFor='seasonNumber'
															className='block text-lg font-semibold mb-2 text-gray-200'
														>
															Saison
														</label>
														<input
															id='seasonNumber'
															type='number'
															min='1'
															value={seasonNumber}
															onChange={e =>
																setSeasonNumber(e.target.value)
															}
															placeholder='1'
															className='w-full px-5 py-4 rounded-xl bg-gray-900/60 border border-white/10 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30 outline-none text-lg font-medium'
														/>
													</div>
													<div className='flex-1'>
														<label
															htmlFor='episodeNumber'
															className='block text-lg font-semibold mb-2 text-gray-200'
														>
															Épisode
														</label>
														<input
															id='episodeNumber'
															type='number'
															min='1'
															value={episodeNumber}
															onChange={e =>
																setEpisodeNumber(e.target.value)
															}
															placeholder='1'
															className='w-full px-5 py-4 rounded-xl bg-gray-900/60 border border-white/10 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30 outline-none text-lg font-medium'
														/>
													</div>
												</>
											)}
										</motion.div>

										{/* Multi-episodes mapping UI */}
										{multi && (
											<motion.div
												className='flex flex-col gap-3'
												variants={afterSelectVariants}
												custom={1}
											>
												<label className='block text-lg font-semibold text-gray-200'>
													Associer chaque fichier à une saison/épisode
												</label>
												<div className='flex flex-col gap-2'>
													{fileOrder.map((fid, idx) => {
														const f = uppyFiles.find(
															ff => ff.id === fid
														)
														if (!f) return null
														const map = seriesFilesMap[fid] || {
															season: '',
															episode: ''
														}
														const info = fileEpisodeInfo[fid] || {}
														return (
															<div
																key={fid}
																className='flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 border border-white/10'
															>
																<div className='w-8 text-sm text-gray-400'>
																	{idx + 1}
																</div>
																<div className='flex-1 truncate'>
																	{f.name}
																</div>
																<div className='flex items-center gap-2'>
																	<input
																		type='number'
																		min='1'
																		value={map.season}
																		onChange={e =>
																			setSeriesFilesMap(
																				prev => ({
																					...prev,
																					[fid]: {
																						...prev[
																							fid
																						],
																						season: e
																							.target
																							.value
																					}
																				})
																			)
																		}
																		placeholder='Saison'
																		className='w-28 px-3 py-2 rounded bg-gray-800 border border-white/10 focus:border-red-500/60 outline-none text-sm'
																	/>
																	<input
																		type='number'
																		min='1'
																		value={map.episode}
																		onChange={e =>
																			setSeriesFilesMap(
																				prev => ({
																					...prev,
																					[fid]: {
																						...prev[
																							fid
																						],
																						episode:
																							e.target
																								.value
																					}
																				})
																			)
																		}
																		placeholder='Épisode'
																		className='w-28 px-3 py-2 rounded bg-gray-800 border border-white/10 focus:border-red-500/60 outline-none text-sm'
																	/>
																</div>
																<div className='min-w-[180px] text-xs text-gray-400'>
																	{info.loading
																		? 'Chargement…'
																		: info.title || ''}
																</div>
																<div className='flex items-center gap-1'>
																	<button
																		type='button'
																		onClick={() =>
																			setFileOrder(prev => {
																				if (idx === 0)
																					return prev
																				const cp = [...prev]
																				const [it] =
																					cp.splice(
																						idx,
																						1
																					)
																				cp.splice(
																					idx - 1,
																					0,
																					it
																				)
																				return cp
																			})
																		}
																		className='px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs'
																	>
																		↑
																	</button>
																	<button
																		type='button'
																		onClick={() =>
																			setFileOrder(prev => {
																				if (
																					idx ===
																					prev.length - 1
																				)
																					return prev
																				const cp = [...prev]
																				const [it] =
																					cp.splice(
																						idx,
																						1
																					)
																				cp.splice(
																					idx + 1,
																					0,
																					it
																				)
																				return cp
																			})
																		}
																		className='px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs'
																	>
																		↓
																	</button>
																</div>
															</div>
														)
													})}
												</div>
											</motion.div>
										)}
									</>
								)}

								{/* Names: movie rename vs series folder name */}
								{mediaType === 'movie' ? (
									<motion.div
										className='flex flex-col gap-1 pt-4'
										variants={afterSelectVariants}
										custom={0}
									>
										<label
											htmlFor='customTitle'
											className='text-lg md:text-xl font-semibold tracking-wide text-gray-200'
										>
											Renommer le film
										</label>
										<motion.input
											whileFocus={{
												boxShadow: '0 0 0 4px rgba(229,9,20,0.25)'
											}}
											id='customTitle'
											type='text'
											value={customTitle}
											onChange={e => setCustomTitle(e.target.value)}
											placeholder='Titre personnalisé…'
											className='w-full px-5 py-4 rounded-xl bg-gray-900/60 border border-white/10 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30 outline-none text-lg md:text-xl font-medium placeholder:text-gray-500 transition'
										/>
									</motion.div>
								) : (
									<motion.div
										className='flex flex-col gap-1 pt-4'
										variants={afterSelectVariants}
										custom={1}
									>
										<label
											htmlFor='seriesFolder'
											className='text-lg md:text-xl font-semibold tracking-wide text-gray-200'
										>
											Nom du dossier
										</label>
										<motion.input
											whileFocus={{
												boxShadow: '0 0 0 4px rgba(229,9,20,0.25)'
											}}
											id='seriesFolder'
											type='text'
											value={seriesFolderName}
											onChange={e => setSeriesFolderName(e.target.value)}
											placeholder={selectedSeries?.name || 'Nom du dossier…'}
											className='w-full px-5 py-4 rounded-xl bg-gray-900/60 border border-white/10 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30 outline-none text-lg md:text-xl font-medium placeholder:text-gray-500 transition'
										/>
									</motion.div>
								)}

								{/* Transcoding Options */}
								<motion.div
									className='flex flex-col pt-2 gap-4'
									variants={afterSelectVariants}
									custom={mediaType === 'series' ? 2 : 1}
								>
									<label className='text-lg md:text-xl font-semibold uppercase tracking-wide text-gray-200'>
										Transcodage
									</label>
									<div className='flex flex-wrap gap-4'>
										<motion.label
											whileHover={{ scale: 1.03 }}
											whileTap={{ scale: 0.97 }}
											className='flex items-center gap-3 text-base text-gray-100 cursor-pointer group'
										>
											<input
												type='radio'
												name='transcodeMode'
												value='none'
												checked={transcodeMode === 'none'}
												onChange={e => setTranscodeMode(e.target.value)}
												className='accent-red-600 scale-125'
											/>
											<span className='px-4 py-2 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/10 transition font-medium'>
												Aucun
											</span>
										</motion.label>
										<motion.label
											whileHover={{ scale: 1.03 }}
											whileTap={{ scale: 0.97 }}
											className='flex items-center gap-3 text-base text-gray-100 cursor-pointer group'
										>
											<input
												type='radio'
												name='transcodeMode'
												value='server'
												checked={transcodeMode === 'server'}
												onChange={e => setTranscodeMode(e.target.value)}
												className='accent-red-600 scale-125'
											/>
											<span className='px-4 py-2 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/10 transition font-medium'>
												Serveur
											</span>
										</motion.label>
										{isElectron && (
											<motion.label
												whileHover={{ scale: 1.03 }}
												whileTap={{ scale: 0.97 }}
												className='flex items-center gap-3 text-base text-gray-100 cursor-pointer group'
											>
												<input
													type='radio'
													name='transcodeMode'
													value='local'
													checked={transcodeMode === 'local'}
													onChange={e => {
														setTranscodeMode(e.target.value)
														setProcessingLocation('local')
													}}
													className='accent-red-600 scale-125'
												/>
												<span className='px-4 py-2 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/10 transition font-medium'>
													Local
												</span>
											</motion.label>
										)}
									</div>
									<motion.p
										className='text-gray-400 text-sm md:text-base leading-snug'
										variants={afterSelectVariants}
										custom={mediaType === 'series' ? 3 : 2}
									>
										{transcodeMode === 'none' &&
											'Le fichier sera utilisé tel quel sans transcodage.'}
										{transcodeMode === 'server' &&
											'Le transcodage sera effectué sur le serveur.'}
										{transcodeMode === 'local' &&
											'Le transcodage sera effectué localement sur votre ordinateur.'}
									</motion.p>
								</motion.div>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.main>

				<AnimatePresence>
					{canUpload && (
						<motion.div
							key='dashboard'
							className='uppy-Root w-full rounded-2xl overflow-hidden border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] backdrop-blur-xl shadow-[0_10px_35px_-10px_rgba(0,0,0,0.55)] z-0'
							variants={dashboardVariants}
							initial='hidden'
							animate='visible'
							exit='exit'
							layout
						>
							<Dashboard
								uppy={uppy}
								height={430}
								width='100%'
								note='Sélectionner un ou plusieurs fichiers vidéo'
								theme='dark'
								showProgressDetails={true}
								lang='fr_FR'
								locale={fr_FR}
								proudlyDisplayPoweredByUppy={false}
							/>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	)
}

export default MediaUploader
