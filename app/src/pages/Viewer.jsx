import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Loader from '../components/Loader'
import { IoPlay, IoPause, IoClose, IoPlayBack, IoPlayForward } from 'react-icons/io5'
/* eslint-disable-next-line */
import { motion, AnimatePresence } from 'framer-motion'
import { useAPI, useAPIAfter, useGetFullMovie, useMainContext } from '../app/hooks'

const Viewer = () => {
	const { tmdbID } = useParams()
	const { data: movie, isPending, isError, error } = useGetFullMovie(tmdbID)
	const [controlsVisible, setControlsVisible] = useState(true)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [paused, setPaused] = useState(true)
	const [isSeeking, setIsSeeking] = useState(false)
	const videoRef = useRef(null)
	const navigate = useNavigate()
	const wrapperRef = useRef(null)
	const { triggerAsync: updateOnGoingMovie } = useAPIAfter('POST', '/ongoing_movies')
	const { data: storedMovie } = useAPI('GET', `/movie/${tmdbID}`)
	const { user, refetchUser } = useMainContext()

	// Met la vidéo en fullscreen à l'arrivée sur la page
	useEffect(() => {
		const enterFullscreen = () => {
			const el = wrapperRef.current
			if (!el) return
			const fullscreenEl =
				document.fullscreenElement ||
				document.webkitFullscreenElement ||
				document.mozFullScreenElement ||
				document.msFullscreenElement
			if (!fullscreenEl) {
				if (el.requestFullscreen) el.requestFullscreen()
				else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
				else if (el.mozRequestFullScreen) el.mozRequestFullScreen()
				else if (el.msRequestFullscreen) el.msRequestFullscreen()
			}
		}
		enterFullscreen()
	}, [])

	// Affichage/masquage des contrôles (clic ou tactile sur écran)
	const toggleControls = e => {
		if (e.target.tagName !== 'DIV' && e.target.tagName !== 'VIDEO') return
		setControlsVisible(v => !v)
	}

	useEffect(() => {
		const current = wrapperRef.current
		if (current) {
			current.addEventListener('click', toggleControls)
		}
		return () => {
			if (current) {
				current.removeEventListener('click', toggleControls)
			}
		}
	}, [wrapperRef])

	useEffect(() => {
		let timer
		const handleMouseMove = () => {
			setControlsVisible(true)
			clearTimeout(timer)
			timer = setTimeout(() => setControlsVisible(false), 3000)
		}
		window.addEventListener('mousemove', handleMouseMove)
		window.addEventListener('touchmove', handleMouseMove)
		return () => {
			window.removeEventListener('mousemove', handleMouseMove)
			window.removeEventListener('touchmove', handleMouseMove)
			clearTimeout(timer)
		}
	}, [])

	// Mise à jour du temps courant et durée de la vidéo + état pause/play
	useEffect(() => {
		// Tant que la vidéo n'est pas montée dans le DOM, attend
		if (!videoRef.current) return

		const video = videoRef.current

		const handleTimeUpdate = () => {
			if (!isSeeking) setCurrentTime(video.currentTime)
		}
		const handleLoadedMetadata = () => setDuration(video.duration)

		const handlePlay = () => setPaused(false)
		const handlePause = () => setPaused(true)

		video.addEventListener('timeupdate', handleTimeUpdate)
		video.addEventListener('loadedmetadata', handleLoadedMetadata)
		video.addEventListener('play', handlePlay)
		video.addEventListener('pause', handlePause)

		// Synchronise l'état initial (pour un reload)
		setPaused(video.paused)
		setCurrentTime(video.currentTime)
		setDuration(video.duration || 0)

		return () => {
			video.removeEventListener('timeupdate', handleTimeUpdate)
			video.removeEventListener('loadedmetadata', handleLoadedMetadata)
			video.removeEventListener('play', handlePlay)
			video.removeEventListener('pause', handlePause)
		}
		// Ajoute movie à la dépendance pour être sûr de ré-attacher sur nouveau film
	}, [movie, isSeeking])

	if (isPending) return <Loader />
	if (isError || !movie) {
		return (
			<div className='flex flex-col items-center justify-center h-screen bg-black text-red-500'>
				Impossible de charger la vidéo : {error?.message}
				<button
					onClick={() => navigate(-1)}
					className='mt-4 px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700'
				>
					Retour
				</button>
			</div>
		)
	}

	const { title, overview: description, poster } = movie
	const src = `${import.meta.env.VITE_API}/video/${tmdbID}`

	const saveProgress = () => {
		if (!movie) return
		if (!user?.id) return
		if (!storedMovie?.id) return
		updateOnGoingMovie({
			tmdbID: parseInt(tmdbID),
			duration: Math.floor(duration),
			position: Math.floor(currentTime),
			user: user.id,
			movie: storedMovie?.id
		}).then(() => {
			refetchUser()
		})
	}

	const handlePlayPause = () => {
		saveProgress()
		const video = videoRef.current
		if (!video) return
		if (video.paused) {
			video.play().catch(() => {})
		} else {
			video.pause()
		}
	}

	const handleSeek = seconds => {
		const video = videoRef.current
		if (!video) return
		let newTime = video.currentTime + seconds
		if (newTime < 0) newTime = 0
		if (newTime > duration) newTime = duration
		video.currentTime = newTime
		setCurrentTime(newTime)
	}

	const handleProgressBarChange = e => {
		const newTime = parseFloat(e.target.value)
		const video = videoRef.current
		if (video) {
			video.currentTime = newTime
		}
		setCurrentTime(newTime)
	}

	// Mobile: drag sur la barre de progression
	const handleTouchStart = () => {
		setIsSeeking(true)
	}
	const handleTouchMove = e => {
		if (!e.touches || e.touches.length === 0) return
		const input = e.target
		const rect = input.getBoundingClientRect()
		const x = e.touches[0].clientX - rect.left
		const percent = Math.max(0, Math.min(1, x / rect.width))
		const newTime = percent * (duration || 1)
		const video = videoRef.current
		if (video) {
			video.currentTime = newTime
		}
		setCurrentTime(newTime)
	}
	const handleTouchEnd = () => {
		setIsSeeking(false)
	}

	// Formatage du temps (mm:ss ou hh:mm:ss si > 1h)
	const formatTime = t => {
		if (isNaN(t)) return '0:00'
		const h = Math.floor(t / 3600)
		const m = Math.floor((t % 3600) / 60)
		const s = Math.floor(t % 60)
		return h > 0
			? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
			: `${m}:${s.toString().padStart(2, '0')}`
	}

	return (
		<div
			className='fixed inset-0 z-[9999] bg-black overflow-hidden select-none'
			ref={wrapperRef}
			style={{
				WebkitTapHighlightColor: 'transparent',
				userSelect: 'none',
				width: '100vw',
				height: '100vh'
			}}
		>
			{/* Video */}
			<video
				ref={videoRef}
				src={src}
				poster={`https://image.tmdb.org/t/p/w500${poster}`}
				controls={false}
				autoPlay
				playsInline
				className='absolute w-full h-full object-contain bg-black'
				tabIndex={-1}
			/>

			{/* AnimatePresence for controls */}
			<AnimatePresence>
				{controlsVisible && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3 }}
						className='absolute inset-0 z-20 flex flex-col justify-center'
						onClick={e => e.stopPropagation()}
						onTouchStart={e => e.stopPropagation()}
					>
						{/* Bouton retour en haut à gauche */}
						<button
							onClick={() => {
								saveProgress()
								navigate(-1)
							}}
							className='absolute cursor-pointer top-8 left-8 bg-black/70 rounded-full p-3 hover:bg-white/20 transition text-white z-30'
							title='Retour'
							tabIndex={0}
						>
							<IoClose size={36} />
						</button>

						{/* Titre et description en haut au centre */}
						<div className='absolute top-8 left-0 right-0 flex flex-col items-center select-none'>
							<div className='px-6 py-2 rounded bg-black/60 backdrop-blur-sm max-w-4/5'>
								<div className='text-2xl md:text-3xl text-white font-bold text-center mb-2'>
									{title}
								</div>
								<div className='text-base md:text-lg text-gray-200 text-center truncate'>
									{description}
								</div>
							</div>
						</div>

						{/* Progress bar - mouse & touch */}
						<div className='absolute left-0 right-0 bottom-10 px-8 z-20'>
							<div className='w-full flex items-center gap-3 select-none'>
								<span className='text-base text-gray-300 font-mono'>
									{formatTime(currentTime)}
								</span>
								<input
									type='range'
									min={0}
									max={duration || 0}
									step={0.1}
									value={currentTime}
									onChange={handleProgressBarChange}
									className='w-full accent-red-600 h-1'
									style={{ background: '#e50914', touchAction: 'none' }}
									onTouchStart={handleTouchStart}
									onTouchMove={handleTouchMove}
									onTouchEnd={handleTouchEnd}
								/>
								<span className='text-base text-gray-300 font-mono'>
									{formatTime(duration)}
								</span>
							</div>
						</div>

						{/* Main controls */}
						<div className='w-full flex items-center justify-center gap-[15vw] z-20'>
							<button
								onClick={() => handleSeek(-10)}
								className='bg-black/70 rounded-full p-4 hover:bg-white/20 transition text-white cursor-pointer'
								title='Reculer de 10 secondes'
								tabIndex={0}
							>
								<IoPlayBack size={32} />
							</button>
							<button
								onClick={handlePlayPause}
								className='bg-black/70 rounded-full p-6 hover:bg-white/20 transition text-white mx-4 cursor-pointer'
								style={{ boxShadow: '0 0 24px #000' }}
								title={paused ? 'Lecture' : 'Pause'}
								tabIndex={0}
							>
								{paused ? <IoPlay size={48} /> : <IoPause size={48} />}
							</button>
							<button
								onClick={() => handleSeek(10)}
								className='bg-black/70 rounded-full p-4 hover:bg-white/20 transition text-white cursor-pointer'
								title='Avancer de 10 secondes'
								tabIndex={0}
							>
								<IoPlayForward size={32} />
							</button>
						</div>

						{/* Dégradé foncé en bas sous la barre rouge */}
						<div
							className='absolute left-0 right-0 bottom-0 h-36 pointer-events-none z-10'
							style={{
								background: 'linear-gradient(to bottom, transparent 0%, black 100%)'
							}}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

export default Viewer
