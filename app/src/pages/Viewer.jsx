import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Loader from '../components/Loader'
import { IoPlay, IoPause, IoClose, IoPlayBack, IoPlayForward, IoTimeOutline } from 'react-icons/io5'
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion'
import { useAPI, useAPIAfter, useGetFullMovie, useMainContext } from '../app/hooks'

const SEEK_INTERVAL = 10
const AUTO_HIDE_DELAY = 3000
const SAVE_DEBOUNCE = 1200
const MIN_SAVE_DELTA = 5 // secondes

const Viewer = () => {
	const { tmdbID } = useParams()
	const { data: movie, isPending, isError, error } = useGetFullMovie(tmdbID)
	const { data: storedMovie } = useAPI('GET', `/movie/${tmdbID}`)
	const { user, refetchUser } = useMainContext()
	const navigate = useNavigate()

	const videoRef = useRef(null)
	const wrapperRef = useRef(null)

	const [controlsVisible, setControlsVisible] = useState(true)
	const [paused, setPaused] = useState(true)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [isSeeking, setIsSeeking] = useState(false)
	const [bufferedEnd, setBufferedEnd] = useState(0)
	const [isBuffering, setIsBuffering] = useState(false)
	const [videoError, setVideoError] = useState(null)
	const [timeHover, setTimeHover] = useState(null)
	const [seekToast, setSeekToast] = useState(null)

	const { triggerAsync: updateOnGoingMovie } = useAPIAfter('POST', '/ongoing_movies')
	const saveTimeoutRef = useRef(null)
	const lastSavedTimeRef = useRef(0)
	const savingRef = useRef(false)
	const hideTimerRef = useRef(null)
	const seekToastTimerRef = useRef(null)
	const lastTapRef = useRef(0)

	const src = useMemo(() => `${import.meta.env.VITE_API}/video/${tmdbID}`, [tmdbID])

	const formatTime = useCallback(t => {
		if (isNaN(t)) return '0:00'
		const h = Math.floor(t / 3600)
		const m = Math.floor((t % 3600) / 60)
		const s = Math.floor(t % 60)
		return h > 0
			? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
			: `${m}:${s.toString().padStart(2, '0')}`
	}, [])

	const remaining = duration - currentTime

	// Plein écran (sécurisé)
	useEffect(() => {
		const el = wrapperRef.current
		if (!el) return
		const fsEl =
			document.fullscreenElement ||
			document.webkitFullscreenElement ||
			document.mozFullScreenElement ||
			document.msFullscreenElement
		if (!fsEl) {
			try {
				if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
				else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
				else if (el.mozRequestFullScreen) el.mozRequestFullScreen()
				else if (el.msRequestFullscreen) el.msRequestFullscreen()
				// eslint-disable-next-line
			} catch (_) {
				/* Ignorer */
			}
		}
	}, [])

	const surfaceClick = e => {
		if (
			['BUTTON', 'INPUT', 'SPAN', 'SVG', 'PATH'].includes(e.target.tagName) ||
			e.target.closest('button')
		)
			return
		setControlsVisible(v => !v)
		if (!paused) scheduleHide()
	}

	const scheduleHide = useCallback(() => {
		if (paused) return
		if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
		hideTimerRef.current = setTimeout(() => setControlsVisible(false), AUTO_HIDE_DELAY)
	}, [paused])

	const showControls = useCallback(() => {
		setControlsVisible(true)
		scheduleHide()
	}, [scheduleHide])

	useEffect(() => {
		const moveHandler = () => showControls()
		window.addEventListener('mousemove', moveHandler)
		window.addEventListener('touchstart', moveHandler)
		window.addEventListener('touchmove', moveHandler)
		return () => {
			window.removeEventListener('mousemove', moveHandler)
			window.removeEventListener('touchstart', moveHandler)
			window.removeEventListener('touchmove', moveHandler)
		}
	}, [showControls])

	useEffect(() => {
		const video = videoRef.current
		if (!video) return

		const updateBuffered = () => {
			try {
				if (video.buffered.length) {
					const end = video.buffered.end(video.buffered.length - 1)
					setBufferedEnd(end)
				}
			} catch (e) {
				console.error(e)
			}
		}

		const onTime = () => {
			if (!isSeeking) setCurrentTime(video.currentTime)
			updateBuffered()
			maybeScheduleSave(video.currentTime)
		}
		const onLoaded = () => {
			setDuration(video.duration || 0)
			updateBuffered()
		}
		const onPlay = () => {
			setPaused(false)
			setIsBuffering(false)
			showControls()
		}
		const onPause = () => {
			setPaused(true)
			saveProgressImmediate(video.currentTime)
			setControlsVisible(true)
		}
		const onWaiting = () => setIsBuffering(true)
		const onPlaying = () => setIsBuffering(false)
		const onError = e => {
			const code = e.target.error?.code
			const map = {
				1: 'Chargement interrompu',
				2: 'Erreur réseau',
				3: 'Erreur de décodage',
				4: 'Format / source non supporté'
			}
			setVideoError(map[code] || 'Erreur vidéo inconnue')
		}

		video.addEventListener('timeupdate', onTime)
		video.addEventListener('loadedmetadata', onLoaded)
		video.addEventListener('play', onPlay)
		video.addEventListener('pause', onPause)
		video.addEventListener('waiting', onWaiting)
		video.addEventListener('playing', onPlaying)
		video.addEventListener('error', onError)

		// init
		setPaused(video.paused)
		setCurrentTime(video.currentTime)
		setDuration(video.duration || 0)
		updateBuffered()

		return () => {
			video.removeEventListener('timeupdate', onTime)
			video.removeEventListener('loadedmetadata', onLoaded)
			video.removeEventListener('play', onPlay)
			video.removeEventListener('pause', onPause)
			video.removeEventListener('waiting', onWaiting)
			video.removeEventListener('playing', onPlaying)
			video.removeEventListener('error', onError)
		}
		// eslint-disable-next-line
	}, [isSeeking, showControls])

	const maybeScheduleSave = t => {
		if (!movie || !user?.id || !storedMovie?.id) return
		if (Math.abs(t - lastSavedTimeRef.current) < MIN_SAVE_DELTA) return
		if (savingRef.current) return
		if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
		saveTimeoutRef.current = setTimeout(() => {
			saveProgress(t)
		}, SAVE_DEBOUNCE)
	}

	const saveProgressImmediate = t => {
		if (!movie || !user?.id || !storedMovie?.id) return
		if (savingRef.current) return
		saveProgress(t, true)
	}

	const saveProgress = (t, force = false) => {
		if (!movie || !user?.id || !storedMovie?.id) return
		if (!force && Math.abs(t - lastSavedTimeRef.current) < MIN_SAVE_DELTA) return
		savingRef.current = true
		updateOnGoingMovie({
			tmdbID: parseInt(tmdbID),
			duration: Math.floor(duration),
			position: Math.floor(t),
			user: user.id,
			movie: storedMovie.id
		})
			.then(() => {
				lastSavedTimeRef.current = t
				refetchUser()
			})
			.finally(() => {
				savingRef.current = false
			})
	}

	useEffect(() => {
		const beforeUnload = () => {
			if (videoRef.current) saveProgressImmediate(videoRef.current.currentTime)
		}
		window.addEventListener('beforeunload', beforeUnload)
		return () => {
			window.removeEventListener('beforeunload', beforeUnload)
			if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
			// eslint-disable-next-line
			if (videoRef.current) saveProgressImmediate(videoRef.current.currentTime)
		}
		// eslint-disable-next-line
	}, [movie, user?.id, storedMovie?.id])

	useEffect(() => {
		const handler = e => {
			if (!videoRef.current) return
			switch (e.key.toLowerCase()) {
				case ' ':
				case 'k':
					e.preventDefault()
					togglePlay()
					break
				case 'arrowright':
					seek(SEEK_INTERVAL)
					break
				case 'arrowleft':
					e.preventDefault()
					seek(-SEEK_INTERVAL)
					break
				case 'escape':
					e.preventDefault()
					exitViewer()
					break
				default:
					break
			}
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	})

	const togglePlay = useCallback(() => {
		const video = videoRef.current
		if (!video) return
		if (video.paused) video.play().catch(() => {})
		else video.pause()
	}, [])

	const handlePlayPause = () => togglePlay()

	const seek = delta => {
		const video = videoRef.current
		if (!video) return
		let t = video.currentTime + delta
		if (t < 0) t = 0
		if (t > duration) t = duration
		video.currentTime = t
		setCurrentTime(t)
		showSeekToast(delta)
		maybeScheduleSave(t)
	}

	const showSeekToast = delta => {
		setSeekToast(delta > 0 ? `+${delta}s` : `${delta}s`)
		if (seekToastTimerRef.current) clearTimeout(seekToastTimerRef.current)
		seekToastTimerRef.current = setTimeout(() => setSeekToast(null), 850)
	}

	const handleZoneTap = dir => {
		const now = Date.now()
		if (now - lastTapRef.current < 350) {
			seek(dir === 'back' ? -SEEK_INTERVAL : SEEK_INTERVAL)
		}
		lastTapRef.current = now
	}

	const handleProgressChange = e => {
		const t = parseFloat(e.target.value)
		if (videoRef.current) videoRef.current.currentTime = t
		setCurrentTime(t)
		maybeScheduleSave(t)
	}
	const handleRangeMouseMove = e => {
		const rect = e.target.getBoundingClientRect()
		const ratio = (e.clientX - rect.left) / rect.width
		const t = ratio * duration
		if (t >= 0 && t <= duration) setTimeHover(t)
	}
	const handleRangeLeave = () => setTimeHover(null)
	const handleTouchStart = () => setIsSeeking(true)
	const handleTouchMove = e => {
		if (!e.touches?.length) return
		const rect = e.target.getBoundingClientRect()
		const x = e.touches[0].clientX - rect.left
		const percent = Math.max(0, Math.min(1, x / rect.width))
		const t = percent * duration
		if (videoRef.current) videoRef.current.currentTime = t
		setCurrentTime(t)
	}
	const handleTouchEnd = () => {
		setIsSeeking(false)
		if (videoRef.current) maybeScheduleSave(videoRef.current.currentTime)
	}

	const progressBackground = useMemo(() => {
		if (!duration) return '#e50914'
		const played = (currentTime / duration) * 100
		const buff = (bufferedEnd / duration) * 100
		return `linear-gradient(90deg,
			#e50914 0%,
			#e50914 ${played}%,
			#a5272d ${played}%,
			#a5272d ${buff}%,
			#444 ${buff}%,
			#444 100%)`
	}, [currentTime, duration, bufferedEnd])

	const exitViewer = () => {
		if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
		if (videoRef.current) saveProgressImmediate(videoRef.current.currentTime)
		navigate(-1)
	}

	const title = movie?.title || ''
	const description = movie?.overview || ''
	const poster = movie?.poster || ''

	return (
		<div
			ref={wrapperRef}
			className='fixed inset-0 bg-black select-none overflow-hidden'
			style={{ WebkitTapHighlightColor: 'transparent' }}
			onClick={surfaceClick}
		>
			<video
				ref={videoRef}
				src={src}
				poster={poster ? `https://image.tmdb.org/t/p/w780${poster}` : undefined}
				autoPlay
				playsInline
				controls={false}
				className='absolute inset-0 w-full h-full object-contain bg-black'
				tabIndex={-1}
			/>

			{/* Gradients */}
			<div className='pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/90 to-transparent' />
			<div className='pointer-events-none absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-black/95 to-transparent' />

			{/* Zones double tap */}
			<div
				className='absolute inset-y-0 left-0 w-1/2'
				onDoubleClick={() => seek(-SEEK_INTERVAL)}
				onTouchEnd={() => handleZoneTap('back')}
			/>
			<div
				className='absolute inset-y-0 right-0 w-1/2'
				onDoubleClick={() => seek(SEEK_INTERVAL)}
				onTouchEnd={() => handleZoneTap('forward')}
			/>

			{/* Buffering spinner */}
			<AnimatePresence>
				{isBuffering && (
					<motion.div
						className='absolute inset-0 flex items-center justify-center pointer-events-none z-30'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<div className='w-24 h-24 border-4 border-white/20 border-t-red-500 rounded-full animate-spin' />
					</motion.div>
				)}
			</AnimatePresence>

			{/* Overlay contrôles */}
			<AnimatePresence>
				{controlsVisible && (
					<motion.div
						className='absolute inset-0 z-40 flex flex-col justify-between pointer-events-none'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.25 }}
					>
						{/* Top */}
						<div className='flex items-start justify-between px-10 pt-10 pointer-events-auto'>
							<button
								onClick={exitViewer}
								className='rounded-full p-4 bg-black/65 hover:bg-black/80 transition text-white border border-white/10'
								title='Retour'
							>
								<IoClose size={40} />
							</button>
							<div className='flex flex-col max-w-[55%] items-end text-right gap-2'>
								{title && (
									<motion.h1
										className='text-white font-bold text-3xl md:text-4xl leading-tight'
										initial={{ y: -10, opacity: 0 }}
										animate={{ y: 0, opacity: 1 }}
									>
										{title}
									</motion.h1>
								)}
								{description && (
									<motion.p
										className='text-gray-300 text-lg md:text-xl line-clamp-2'
										initial={{ y: -8, opacity: 0 }}
										animate={{ y: 0, opacity: 1 }}
									>
										{description}
									</motion.p>
								)}
							</div>
						</div>

						{/* Centre */}
						<div className='flex items-center justify-center gap-[14vw] md:gap-32 pointer-events-auto'>
							<button
								onClick={() => seek(-SEEK_INTERVAL)}
								className='rounded-full p-6 bg-black/55 hover:bg-black/70 transition text-white border border-white/10'
								title={`Reculer ${SEEK_INTERVAL} s`}
							>
								<IoPlayBack className='w-15 h-auto' />
							</button>
							<button
								onClick={handlePlayPause}
								className='rounded-full p-8 bg-black/60 hover:bg-black/75 transition text-white border border-white/10 shadow-2xl'
								title={paused ? 'Lecture' : 'Pause'}
							>
								{paused ? (
									<IoPlay className='w-20 h-auto' />
								) : (
									<IoPause className='w-20 h-auto' />
								)}
							</button>
							<button
								onClick={() => seek(SEEK_INTERVAL)}
								className='rounded-full p-6 bg-black/55 hover:bg-black/70 transition text-white border border-white/10'
								title={`Avancer ${SEEK_INTERVAL} s`}
							>
								<IoPlayForward className='w-15 h-auto' />
							</button>
						</div>

						{/* Bas */}
						<div className='relative w-full px-10 pb-12 pointer-events-auto'>
							{timeHover != null && (
								<div
									className='absolute -top-8 left-0 translate-x-[-50%] px-4 py-2 rounded-xl bg-black/80 text-white text-sm font-semibold border border-white/10'
									style={{
										transform: `translateX(calc(${(timeHover / duration) * 100}% - 50%))`
									}}
								>
									{formatTime(timeHover)}
								</div>
							)}

							<div className='flex items-center gap-5 mb-5'>
								<span className='text-gray-200 font-mono text-base md:text-xl min-w-[62px] text-right'>
									{formatTime(currentTime)}
								</span>
								<div className='flex-1 relative'>
									<input
										type='range'
										min={0}
										max={duration || 0}
										step={0.1}
										value={currentTime}
										onChange={handleProgressChange}
										onMouseMove={handleRangeMouseMove}
										onMouseLeave={handleRangeLeave}
										onTouchStart={handleTouchStart}
										onTouchMove={handleTouchMove}
										onTouchEnd={handleTouchEnd}
										className='w-full h-2 rounded appearance-none cursor-pointer flex items-center'
										style={{
											background: progressBackground,
											outline: 'none'
										}}
									/>
								</div>
								<span className='text-gray-200 font-mono text-base md:text-xl min-w-[62px]'>
									{formatTime(duration)}
								</span>
							</div>

							<div className='flex items-center justify-between text-gray-300 text-base md:text-lg'>
								<div className='flex items-center gap-6'>
									<div className='flex items-center gap-3'>
										<IoTimeOutline className='text-3xl' />
										<span className='font-mono text-lg'>
											-{formatTime(remaining > 0 ? remaining : 0)}
										</span>
									</div>
									{isBuffering && (
										<span className='text-amber-300 animate-pulse font-semibold'>
											Buffering…
										</span>
									)}
								</div>
								<p className='text-sm md:text-lg text-gray-500 select-none'>
									Espace / ← → / Esc
								</p>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Toast seek */}
			<AnimatePresence>
				{seekToast && (
					<motion.div
						className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[50%] z-50 pointer-events-none '
						initial={{ opacity: 0, y: 24, scale: 0.9 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -12, scale: 0.95 }}
						transition={{ duration: 0.25 }}
					>
						<div className='px-5 py-2.5 rounded-full bg-black/75 backdrop-blur-md text-white text-lg font-bold border border-white/10 shadow-xl shadow-black'>
							{seekToast}
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Overlay chargement métadonnées */}
			<AnimatePresence>
				{isPending && (
					<motion.div
						className='absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-50'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<Loader />
						<p className='text-white text-2xl tracking-wide mt-6'>
							Chargement du film…
						</p>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Erreur chargement métadonnées */}
			<AnimatePresence>
				{!isPending && isError && !movie && (
					<motion.div
						className='absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-[60] text-red-500 p-10'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<IoClose size={100} className='mb-8' />
						<h2 className='text-4xl font-bold mb-4'>Film introuvable</h2>
						<p className='text-gray-400 text-center max-w-xl mb-10 text-xl'>
							{error?.message || 'Impossible de charger les informations.'}
						</p>
						<button
							onClick={() => navigate(-1)}
							className='px-10 py-5 rounded-2xl bg-red-600 text-white hover:bg-red-500 transition font-semibold text-lg'
						>
							Retour
						</button>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Erreur vidéo */}
			<AnimatePresence>
				{videoError && (
					<motion.div
						className='absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-[70] text-red-500 p-10'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<IoClose size={100} className='mb-8' />
						<h2 className='text-4xl font-bold mb-4'>Erreur de lecture</h2>
						<p className='text-gray-400 text-center max-w-xl mb-10 text-xl'>
							{videoError}
						</p>
						<div className='flex gap-6'>
							<button
								onClick={() => window.location.reload()}
								className='px-10 py-5 rounded-2xl bg-gray-700 text-white hover:bg-gray-600 transition font-semibold text-lg'
							>
								Réessayer
							</button>
							<button
								onClick={exitViewer}
								className='px-10 py-5 rounded-2xl bg-red-600 text-white hover:bg-red-500 transition font-semibold text-lg'
							>
								Retour
							</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

export default Viewer
