import { useEffect } from 'react'
import fr_FR from '@uppy/locales/lib/fr_FR.js'
import Dashboard from '@uppy/react/dashboard'
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion'
import { useUppyContext } from '../../../utils/hooks.js'
import MediaSearch from '../MediaSearch.jsx'

const SerieUploader = ({ onSelectionChange }) => {
	const {
		uppy,
		uppyFiles,
		selectedSeries,
		seriesFilesMap,
		setSeriesFilesMap,
		customTitle,
		setCustomTitle,
		setSelectedSeries,
		setNewMovie
	} = useUppyContext()

	useEffect(() => {
		setNewMovie(null)
		setSelectedSeries(null)
		setCustomTitle('')
	}, [setNewMovie, setSelectedSeries, setCustomTitle])

	// Reflect selection to parent (for layout spacing)
	useEffect(() => {
		onSelectionChange?.(Boolean(selectedSeries))
	}, [selectedSeries, onSelectionChange])

	// Default folder name to TMDB name on selection
	useEffect(() => {
		if (selectedSeries && !customTitle) {
			setCustomTitle(selectedSeries.name || '')
		}
	}, [selectedSeries, customTitle, setCustomTitle])

	const filesCount = uppyFiles?.length || 0

	return (
		<>
			<div>
				<MediaSearch type="series" onSelect={series => setSelectedSeries(series)} />
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
								value={customTitle}
								onChange={e => setCustomTitle(e.target.value)}
								placeholder={selectedSeries?.name || 'Nom du dossier…'}
								className='w-full px-5 py-4 rounded-xl bg-gray-900/60 border border-white/10 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30 outline-none text-lg md:text-xl font-medium placeholder:text-gray-500 transition'
							/>
						</motion.div>
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
