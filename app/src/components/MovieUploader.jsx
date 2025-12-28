import { useEffect, useMemo, useState } from 'react'
import Uppy from '@uppy/core'
import XHRUpload from '@uppy/xhr-upload'
import fr_FR from '@uppy/locales/lib/fr_FR.js'
import Dashboard from '../../node_modules/@uppy/react/lib/Dashboard.js'
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion'
import '../../node_modules/@uppy/core/dist/style.css'
import '../../node_modules/@uppy/dashboard/dist/style.css'
import MovieSearch from '../components/MovieSearch'
import TranscodeOptions from '../components/TranscodeOptions'
import { useMainContext } from '../app/hooks'

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

const MovieUploader = ({
	isElectron,
	processingLocation,
	setProcessingLocation,
	transcodeMode,
	setTranscodeMode,
	onSelectionChange
}) => {
	const { refetchNewMovies, refetchNewSeries } = useMainContext()

	// Movie state
	const [newMovie, setNewMovie] = useState(null)
	const [customTitle, setCustomTitle] = useState('')
	const [tmdbID, setTmdbID] = useState(null)

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

	const [uppyFiles, setUppyFiles] = useState([])
	const [txSel, setTxSel] = useState({ audioStreams: [], subtitleStreams: [] })

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
				// Local processing (Electron)
				if (
					isElectron &&
					processingLocation === 'local' &&
					result.successful[0].response?.body?.movie
				) {
					if (window.electronAPI?.processMovie) {
						const movie = result.successful[0].response.body.movie
						window.electronAPI
							.processMovie(movie, {
								transcodeMode,
								audioStreams: txSel?.audioStreams || [],
								subtitleStreams: txSel?.subtitleStreams || []
							})
							.then(r => console.log('Local processing result:', r))
							.catch(err => console.error('Local processing failed:', err))
					}
				}

				// Refresh lists
				refetchNewMovies()
				if (typeof refetchNewSeries === 'function') refetchNewSeries()
			}
		}

		uppy.on('complete', onComplete)
		return () => {
			uppy.off('complete', onComplete)
		}
	}, [uppy, refetchNewMovies, refetchNewSeries, isElectron, processingLocation, transcodeMode, txSel])

	// Track Uppy files and keep global meta in sync with selections
	useEffect(() => {
		const handleAdded = () => setUppyFiles(uppy.getFiles())
		const handleRemoved = () => setUppyFiles(uppy.getFiles())
		uppy.on('file-added', handleAdded)
		uppy.on('file-removed', handleRemoved)
		setUppyFiles(uppy.getFiles())
		return () => {
			uppy.off('file-added', handleAdded)
			uppy.off('file-removed', handleRemoved)
		}
	}, [uppy])

	useEffect(() => {
		uppy.setMeta({
			transcodeMode,
			audioStreams: JSON.stringify(txSel.audioStreams || []),
			subtitleStreams: JSON.stringify(txSel.subtitleStreams || [])
		})
	}, [uppy, transcodeMode, txSel])

	useEffect(() => {
		const handleAdded = file => {
			const poster = newMovie?.poster || newMovie?.poster_path || ''
			const title = newMovie?.title || ''
			const imdbID = newMovie?.imdb_id || ''
			const rating = newMovie?.vote_average ?? newMovie?.rating ?? ''
			const isDocumentary = Array.isArray(newMovie?.genre_ids)
				? newMovie.genre_ids.includes(99)
				: false
			uppy.setFileMeta(file.id, {
				customTitle,
				tmdbID,
				processingLocation,
				transcodeMode,
				poster,
				title,
				imdbID,
				rating,
				isDocumentary
			})
		}
		uppy.on('file-added', handleAdded)
		return () => {
			uppy.off('file-added', handleAdded)
		}
	}, [uppy, customTitle, tmdbID, processingLocation, transcodeMode, newMovie])

	useEffect(() => {
		if (newMovie) {
			setCustomTitle(newMovie.title)
			setTmdbID(newMovie.id)
			onSelectionChange?.(true)
		} else {
			setCustomTitle('')
			setTmdbID(null)
			onSelectionChange?.(false)
		}
	}, [newMovie, onSelectionChange])

	const canUpload = customTitle.length > 0

	return (
		<>
			<div>
				<MovieSearch onSelect={movie => setNewMovie(movie)} />
			</div>

			<AnimatePresence mode='wait'>
				{newMovie && (
					<motion.div
						className='flex flex-col gap-6'
						initial='hidden'
						animate='visible'
						exit='hidden'
					>
						{/* Rename movie */}
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
								whileFocus={{ boxShadow: '0 0 0 4px rgba(229,9,20,0.25)' }}
								id='customTitle'
								type='text'
								value={customTitle}
								onChange={e => setCustomTitle(e.target.value)}
								placeholder='Titre personnalisé…'
								className='w-full px-5 py-4 rounded-xl bg-gray-900/60 border border-white/10 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30 outline-none text-lg md:text-xl font-medium placeholder:text-gray-500 transition'
							/>
						</motion.div>

						{/* Transcoding options */}
						<TranscodeOptions
							files={uppyFiles}
							transcodeMode={transcodeMode}
							setTranscodeMode={v => {
								setTranscodeMode(v)
								if (v === 'local') setProcessingLocation('local')
							}}
							onChange={sel => setTxSel(sel)}
							isElectron={isElectron}
						/>
					</motion.div>
				)}
			</AnimatePresence>

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
		</>
	)
}

export default MovieUploader
