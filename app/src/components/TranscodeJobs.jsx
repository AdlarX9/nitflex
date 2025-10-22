import { useState, useEffect } from 'react'
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion'
import {
	IoClose,
	IoCheckmarkCircle,
	IoAlertCircle,
	IoStopCircle,
	IoChevronDown,
	IoChevronUp,
	IoRefresh
} from 'react-icons/io5'
import axios from 'axios'

const STAGE_LABELS = {
	queued: 'En attente',
	transcoding: 'Transcodage',
	tagging: 'Ajout métadonnées',
	moving: 'Déplacement',
	completed: 'Terminé',
	failed: 'Échec',
	canceled: 'Annulé'
}

const STAGE_COLORS = {
	queued: 'bg-gray-500',
	transcoding: 'bg-blue-500',
	tagging: 'bg-purple-500',
	moving: 'bg-yellow-500',
	completed: 'bg-green-500',
	failed: 'bg-red-500',
	canceled: 'bg-gray-600'
}

const TranscodeJobs = () => {
	const [jobs, setJobs] = useState([])
	const [isCollapsed, setIsCollapsed] = useState(false)

	useEffect(() => {
		// Fetch initial jobs
		fetchJobs()

		// Connect to SSE for real-time updates
		const eventSource = new EventSource(`${import.meta.env.VITE_API}/jobs/stream`)

		eventSource.addEventListener('job-update', e => {
			const update = JSON.parse(e.data)
			updateJob(update)
		})

		eventSource.addEventListener('connected', () => {
			console.log('Connected to job stream')
		})

		eventSource.onerror = () => {
			console.error('SSE connection error')
		}

		return () => {
			eventSource.close()
		}
	}, [])

	const fetchJobs = async () => {
		try {
			const response = await axios.get(`${import.meta.env.VITE_API}/jobs`)
			// Filter to only active jobs (not completed/failed/canceled)
			const activeJobs = response.data.filter(
				job =>
					job.stage !== 'completed' && job.stage !== 'failed' && job.stage !== 'canceled'
			)
			setJobs(activeJobs)
		} catch (error) {
			console.error('Failed to fetch jobs:', error)
		}
	}

	const updateJob = update => {
		setJobs(prevJobs => {
			const existingIndex = prevJobs.findIndex(j => j.id === update.JobID)
			if (existingIndex >= 0) {
				const updated = [...prevJobs]
				updated[existingIndex] = {
					...updated[existingIndex],
					stage: update.Stage,
					progress: update.Progress,
					eta: update.ETA,
					errorMessage: update.Error
				}

				// Remove if completed/failed/canceled
				if (['completed', 'failed', 'canceled'].includes(update.Stage)) {
					setTimeout(() => {
						setJobs(prev => prev.filter(j => j.id !== update.JobID))
					}, 3000)
				}

				return updated
			}
			return prevJobs
		})
	}

	const cancelJob = async jobID => {
		try {
			await axios.post(`${import.meta.env.VITE_API}/jobs/${jobID}/cancel`)
		} catch (error) {
			console.error('Failed to cancel job:', error)
		}
	}

	const retryJob = async job => {
		// Create a new job with same params
		try {
			await axios.post(`${import.meta.env.VITE_API}/jobs`, {
				type: job.type,
				mediaID: job.mediaID,
				tmdbID: job.tmdbID,
				inputPath: job.inputPath,
				transcodeMode: job.transcodeMode,
				transcodeOptions: job.transcodeOptions
			})
			fetchJobs()
		} catch (error) {
			console.error('Failed to retry job:', error)
		}
	}

	const activeJobs = jobs.filter(j => !['completed', 'failed', 'canceled'].includes(j.stage))

	if (activeJobs.length === 0) return null

	return (
		<motion.div
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			className='fixed top-5 left-4 z-50 w-96 max-w-[calc(100vw-2rem)]'
		>
			<div className='bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden'>
				{/* Header */}
				<div className='flex items-center justify-between p-4 border-b border-white/10'>
					<div className='flex items-center gap-3'>
						<div className='w-3 h-3 bg-red-500 rounded-full animate-pulse' />
						<h3 className='font-semibold text-white text-lg'>Tâches de transcodage</h3>
						{activeJobs.length > 0 && (
							<span className='px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded'>
								{activeJobs.length}
							</span>
						)}
					</div>
					<div className='flex items-center gap-2'>
						<button
							onClick={() => setIsCollapsed(!isCollapsed)}
							className='p-2 hover:bg-white/10 rounded-lg transition text-gray-300'
							title={isCollapsed ? 'Développer' : 'Réduire'}
						>
							{isCollapsed ? <IoChevronDown size={20} /> : <IoChevronUp size={20} />}
						</button>
					</div>
				</div>

				{/* Jobs List */}
				<AnimatePresence>
					{!isCollapsed && (
						<motion.div
							initial={{ height: 0 }}
							animate={{ height: 'auto' }}
							exit={{ height: 0 }}
							className='overflow-hidden'
						>
							<div className='max-h-96 overflow-y-auto scrollable p-4 space-y-3'>
								<AnimatePresence mode='popLayout'>
									{activeJobs.map(job => (
										<motion.div
											key={job.id}
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, x: -20 }}
											className='bg-gray-800/50 rounded-lg p-4 border border-white/5'
										>
											{/* Job Title */}
											<div className='flex items-start justify-between mb-3'>
												<div className='flex-1 min-w-0'>
													<h4 className='font-medium text-white truncate'>
														{job.type === 'movie' ? 'Film' : 'Épisode'}{' '}
														- {job.tmdbID}
													</h4>
													<div className='flex items-center gap-2 mt-1'>
														<span
															className={`px-2 py-1 text-xs font-semibold rounded ${
																STAGE_COLORS[job.stage]
															} text-white`}
														>
															{STAGE_LABELS[job.stage]}
														</span>
														{job.transcodeMode && (
															<span className='text-xs text-gray-400'>
																{job.transcodeMode === 'local'
																	? 'Local'
																	: 'Serveur'}
															</span>
														)}
													</div>
												</div>

												{/* Actions */}
												<div className='flex gap-1 ml-2'>
													{job.stage === 'failed' ? (
														<button
															onClick={() => retryJob(job)}
															className='p-2 hover:bg-green-500/20 rounded-lg transition text-green-400'
															title='Réessayer'
														>
															<IoRefresh size={18} />
														</button>
													) : (
														job.stage !== 'completed' &&
														job.stage !== 'canceled' && (
															<button
																onClick={() => cancelJob(job.id)}
																className='p-2 hover:bg-red-500/20 rounded-lg transition text-red-400'
																title='Annuler'
															>
																<IoStopCircle size={18} />
															</button>
														)
													)}
												</div>
											</div>

											{/* Progress Bar */}
											{job.stage !== 'failed' &&
												job.stage !== 'completed' &&
												job.stage !== 'canceled' && (
													<>
														<div className='w-full bg-gray-700 rounded-full h-2 mb-2 overflow-hidden'>
															<motion.div
																className='bg-red-500 h-full'
																initial={{ width: 0 }}
																animate={{
																	width: `${job.progress || 0}%`
																}}
																transition={{ duration: 0.3 }}
															/>
														</div>
														<div className='flex items-center justify-between text-xs text-gray-400'>
															<span>
																{Math.round(job.progress || 0)}%
															</span>
															{job.eta && (
																<span>
																	ETA: {Math.floor(job.eta / 60)}m{' '}
																	{job.eta % 60}s
																</span>
															)}
														</div>
													</>
												)}

											{/* Error Message */}
											{job.stage === 'failed' && job.errorMessage && (
												<div className='mt-2 flex items-start gap-2 text-red-400 text-sm bg-red-500/10 p-2 rounded'>
													<IoAlertCircle
														size={18}
														className='flex-shrink-0 mt-0.5'
													/>
													<span className='text-xs'>
														{job.errorMessage}
													</span>
												</div>
											)}

											{/* Success */}
											{job.stage === 'completed' && (
												<div className='mt-2 flex items-center gap-2 text-green-400 text-sm'>
													<IoCheckmarkCircle size={18} />
													<span>Terminé avec succès</span>
												</div>
											)}
										</motion.div>
									))}
								</AnimatePresence>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	)
}

export default TranscodeJobs
