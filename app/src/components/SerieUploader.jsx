import { useEffect, useMemo, useState } from 'react'
import Uppy from '@uppy/core'
import XHRUpload from '@uppy/xhr-upload'
import fr_FR from '@uppy/locales/lib/fr_FR.js'
import { Dashboard } from '@uppy/react'
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion'
import '../../node_modules/@uppy/core/dist/style.css'
import '../../node_modules/@uppy/dashboard/dist/style.css'
import SeriesSearch from '../components/SeriesSearch'
import { useMainContext, useEpisodeTitles } from '../app/hooks'

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

const SerieUploader = ({
	isElectron,
	processingLocation,
	setProcessingLocation,
	transcodeMode,
	setTranscodeMode,
	onSelectionChange
}) => {
	const { refetchNewSeries } = useMainContext()

	// All files + metadata go to POST /series in one bundled request

	// Series state
	const [selectedSeries, setSelectedSeries] = useState(null)
	const [seriesFolderName, setSeriesFolderName] = useState('')
	const [uppyFiles, setUppyFiles] = useState([])
	const [seriesFilesMap, setSeriesFilesMap] = useState({}) // {fileId: {season:'', episode:''}}
	// Episode titles from TMDB based on selected seasons
	const epTitles = useEpisodeTitles(selectedSeries?.id, seriesFilesMap)

	// Uppy instance
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
			endpoint: import.meta.env.VITE_API + '/series',
			formData: true,
			bundle: true,
			fieldName: 'files[]'
		})
		return () => uppy.destroy()
	}, [uppy])

	useEffect(() => {
		const onComplete = async result => {
			if (result.successful?.length > 0) {
				if (typeof refetchNewSeries === 'function') refetchNewSeries()
			}
		}

		uppy.on('complete', onComplete)
		return () => {
			uppy.off('complete', onComplete)
		}
	}, [
		uppy,
		refetchNewSeries,
		processingLocation,
		selectedSeries,
		transcodeMode,
		seriesFolderName,
		seriesFilesMap,
		uppyFiles
	])

	useEffect(() => {
		const handleAdded = file => {
			uppy.setFileMeta(file.id, {})
			setSeriesFilesMap(prev => ({
				...prev,
				[file.id]: prev[file.id] || { season: '', episode: '' }
			}))
			setUppyFiles(uppy.getFiles())
		}
		const handleRemoved = file => {
			setSeriesFilesMap(prev => {
				const p = { ...prev }
				delete p[file.id]
				return p
			})
			setUppyFiles(uppy.getFiles())
		}
		uppy.on('file-added', handleAdded)
		uppy.on('file-removed', handleRemoved)
		return () => {
			uppy.off('file-added', handleAdded)
			uppy.off('file-removed', handleRemoved)
		}
	}, [uppy, seriesFolderName, selectedSeries?.name, processingLocation, transcodeMode])

	// Reflect selection to parent (for layout spacing)
	useEffect(() => {
		onSelectionChange?.(Boolean(selectedSeries))
	}, [selectedSeries, onSelectionChange])

	// Default folder name to TMDB name on selection
	useEffect(() => {
		if (selectedSeries && !seriesFolderName) {
			setSeriesFolderName(selectedSeries.name || '')
		}
	}, [selectedSeries, seriesFolderName])

	// Keep uploader meta up-to-date before upload (bundle)
	useEffect(() => {
		if (!selectedSeries) return
		const episodes = uppyFiles.map((f, i) => {
			const m = seriesFilesMap[f.id] || { season: '', episode: '' }
			const s = parseInt(m.season) || 0
			const e = parseInt(m.episode) || 0
			const title = epTitles[s]?.[e] || ''
			console.log(epTitles, s, e, title)
			return {
				index: i,
				fileName: f.name,
				seasonNumber: s,
				episodeNumber: e,
				title
			}
		})
		const genreIds = Array.isArray(selectedSeries?.genre_ids) ? selectedSeries.genre_ids : []
		const isDocu = genreIds.includes(99)
		const isKids = genreIds.includes(16) || genreIds.includes(10762)
		uppy.setMeta({
			tmdbID: selectedSeries.id,
			title: selectedSeries.name || '',
			imdbID: selectedSeries?.imdb_id || '',
			poster: selectedSeries?.poster_path || '',
			folderName: seriesFolderName || '',
			transcodeMode,
			episodes: JSON.stringify(episodes),
			isDocu,
			isKids
		})
	}, [uppy, selectedSeries, seriesFolderName, transcodeMode, uppyFiles, seriesFilesMap, epTitles])

	const filesCount = uppyFiles?.length || 0

	return (
		<>
			<div>
				<SeriesSearch onSelect={series => setSelectedSeries(series)} />
			</div>

			<AnimatePresence mode='wait'>
				{selectedSeries && (
					<motion.div
						className='flex flex-col gap-6'
						initial='hidden'
						animate='visible'
						exit='hidden'
					>
						{filesCount >= 1 && (
							<motion.div
								className='flex flex-col gap-3'
								variants={afterSelectVariants}
								custom={1}
							>
								<label className='block text-lg font-semibold text-gray-200'>
									Associer chaque fichier à une saison/épisode
								</label>
								<div className='flex flex-col gap-2'>
									{uppyFiles.map((f, idx) => {
										const map = seriesFilesMap[f.id] || {
											season: '',
											episode: ''
										}
										return (
											<div
												key={f.id}
												className='flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 border border-white/10'
											>
												<div className='pl-3 w-8 text-lg text-gray-400'>
													{idx + 1}
												</div>
												<div className='flex-1 truncate text-xl'>
													{f.name}
												</div>
												<div className='flex items-center gap-2'>
													<input
														type='number'
														min='1'
														value={map.season}
														onChange={e =>
															setSeriesFilesMap(prev => ({
																...prev,
																[f.id]: {
																	...prev[f.id],
																	season: e.target.value
																}
															}))
														}
														placeholder='Saison'
														className='w-28 px-3 py-2 rounded bg-gray-800 border border-white/10 focus:border-red-500/60 outline-none text-sm'
													/>
													<input
														type='number'
														min='1'
														value={map.episode}
														onChange={e =>
															setSeriesFilesMap(prev => ({
																...prev,
																[f.id]: {
																	...prev[f.id],
																	episode: e.target.value
																}
															}))
														}
														placeholder='Épisode'
														className='w-28 px-3 py-2 rounded bg-gray-800 border border-white/10 focus:border-red-500/60 outline-none text-sm'
													/>
												</div>
											</div>
										)
									})}
								</div>
							</motion.div>
						)}

						{/* Series folder name */}
						<motion.div
							className='flex flex-col gap-1 pt-4'
							variants={afterSelectVariants}
							custom={2}
						>
							<label
								htmlFor='seriesFolder'
								className='text-lg md:text-xl font-semibold tracking-wide text-gray-200'
							>
								Nom du dossier
							</label>
							<motion.input
								whileFocus={{ boxShadow: '0 0 0 4px rgba(229,9,20,0.25)' }}
								id='seriesFolder'
								type='text'
								value={seriesFolderName}
								onChange={e => setSeriesFolderName(e.target.value)}
								placeholder={selectedSeries?.name || 'Nom du dossier…'}
								className='w-full px-5 py-4 rounded-xl bg-gray-900/60 border border-white/10 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30 outline-none text-lg md:text-xl font-medium placeholder:text-gray-500 transition'
							/>
						</motion.div>

						{/* Transcoding options */}
						{/* <motion.div
							className='flex flex-col pt-2 gap-4'
							variants={afterSelectVariants}
							custom={3}
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
								custom={4}
							>
								{transcodeMode === 'none' &&
									'Le fichier sera utilisé tel quel sans transcodage.'}
								{transcodeMode === 'server' &&
									'Le transcodage sera effectué sur le serveur.'}
								{transcodeMode === 'local' &&
									'Le transcodage sera effectué localement sur votre ordinateur.'}
							</motion.p>
						</motion.div> */}
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{selectedSeries && (
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
		</>
	)
}

export default SerieUploader
