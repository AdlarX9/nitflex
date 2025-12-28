import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Hls from 'hls.js'
import { AnimatePresence } from 'framer-motion'
import Loader from '../components/Loader'
import {
	Gradients,
	BufferingSpinner,
	ControlsOverlay,
	SeekToastOverlay,
	MetadataErrorOverlay,
	VideoErrorOverlay,
	DoubleTapZones
} from '../components/ViewerComponents'
import {
	useAPI,
	useAPIAfter,
	useGetEpisodeDetails,
	useGetFullMovie,
	useGoBackToNonVideo,
	useMainContext
} from '../app/hooks'
import { IoCloseCircleOutline } from 'react-icons/io5'

const SEEK_INTERVAL = 10
const AUTO_HIDE_DELAY = 3000
const SAVE_DEBOUNCE = 300
const MIN_SAVE_DELTA = 5 // secondes
const AUTONEXT_SECONDS = 5

const Viewer = () => {
	const { tmdbID, episodeID } = useParams()
	const isEpisode = !!episodeID

	// Movie or Episode data
	const { data: storedMovie } = useAPI('GET', `/movie/${tmdbID}`, {}, {}, !!tmdbID)
	const {
		data: movie,
		isPending: moviePending,
		isError: movieError,
		error: movieFetchError
	} = useGetFullMovie(tmdbID)

	const { data: episodeFewData, isPending: episodePending } = useAPI(
		'GET',
		`/episode/${episodeID}`,
		{},
		{},
		!!episodeID
	)
	const { data: episodeData, isError: episodeError } = useGetEpisodeDetails(
		episodeFewData?.tmdbID,
		episodeFewData?.seasonNumber,
		episodeFewData?.episodeNumber
	)

	const { user, refetchUser } = useMainContext()
	const navigate = useNavigate()
	const goBack = useGoBackToNonVideo()

	// Extract data based on type
	const nextEpisode = episodeFewData?.nextEpisode
	const nextEpisodeId = useMemo(
		() => nextEpisode?.id ?? nextEpisode?._id ?? nextEpisode?.episodeId ?? null,
		[nextEpisode]
	)
	const isPending = isEpisode ? episodePending : moviePending
	const isError = isEpisode ? episodeError : movieError
	const error = movieFetchError

	// Chapters for end-credits detection (backend ffprobe)
	const { data: episodeChapters } = useAPI(
		'GET',
		`/video/episode/${episodeID}/chapters`,
		{},
		{},
		!!episodeID
	)
	const { data: movieChapters } = useAPI(
		'GET',
		`/video/${tmdbID}/chapters`,
		{},
		{},
		!!tmdbID && !isEpisode
	)
	const creditsStart = useMemo(() => {
		const arr = isEpisode ? episodeChapters?.chapters : movieChapters?.chapters
		if (!Array.isArray(arr) || arr.length <= 2) return null
		const last = arr[arr.length - 1]
		const start = parseFloat(last?.start || 0)
		return Number.isFinite(start) ? start : null
	}, [isEpisode, episodeChapters, movieChapters])

	// Auto-next overlay state
	const [autoNextVisible, setAutoNextVisible] = useState(false)
	const [autoNextCountdown, setAutoNextCountdown] = useState(AUTONEXT_SECONDS)
	const autoNextTimerRef = useRef(null)
	const autoNextStartedRef = useRef(false)
	const autoNextCancelledRef = useRef(false)

	const performAutoAction = useCallback(() => {
		if (isEpisode && nextEpisodeId) {
			navigate(`/viewer/episode/${nextEpisodeId}`)
			setAutoNextVisible(false)
			setCurrentTime(0)
			if (videoRef.current.paused)
				videoRef.current
					.play()
					.then(() => setPaused(false))
					.catch(() => {})
			autoNextStartedRef.current = false
			autoNextCancelledRef.current = false
		} else {
			goBack()
		}
		// eslint-disable-next-line
	}, [isEpisode, nextEpisodeId, navigate])

	const clearAutoNextTimer = useCallback(() => {
		if (autoNextTimerRef.current) {
			clearInterval(autoNextTimerRef.current)
			autoNextTimerRef.current = null
		}
	}, [])

	const startAutoNext = useCallback(() => {
		if (autoNextStartedRef.current || autoNextCancelledRef.current) return
		autoNextStartedRef.current = true
		clearAutoNextTimer()
		setAutoNextVisible(true)
		setAutoNextCountdown(AUTONEXT_SECONDS)
		autoNextTimerRef.current = setInterval(() => {
			setAutoNextCountdown(prev => {
				if (prev <= 1) {
					clearAutoNextTimer()
					performAutoAction()
					return 0
				}
				return prev - 1
			})
		}, 1000)
	}, [performAutoAction, clearAutoNextTimer])

	const cancelAutoNext = useCallback(() => {
		autoNextCancelledRef.current = true
		autoNextStartedRef.current = false
		clearAutoNextTimer()
		setAutoNextVisible(false)
	}, [clearAutoNextTimer])

	const [currentTime, setCurrentTime] = useState(0)

	// Reset cancel/start flags if l'utilisateur revient avant les crédits
	useEffect(() => {
		if (creditsStart == null) return
		if (autoNextCancelledRef.current || autoNextStartedRef.current) {
			// si on revient suffisamment avant les crédits, on réarme l'autonext
			if (currentTime < creditsStart - 2) {
				autoNextCancelledRef.current = false
				autoNextStartedRef.current = false
				clearAutoNextTimer()
				setAutoNextVisible(false)
			}
		}
	}, [currentTime, creditsStart, clearAutoNextTimer])

	// Clear countdown on unmount
	useEffect(() => {
		return () => {
			clearAutoNextTimer()
		}
	}, [clearAutoNextTimer])

	const { data: onGoingMedias } = useAPI('GET', `/ongoing_media/${user.id}`)

	const videoRef = useRef(null)
	const wrapperRef = useRef(null)
	const hlsRef = useRef(null)

	const [controlsVisible, setControlsVisible] = useState(true)
	const [paused, setPaused] = useState(true)
	const [duration, setDuration] = useState(0)
	const [isSeeking, setIsSeeking] = useState(false)
	const [bufferedEnd, setBufferedEnd] = useState(0)
	const [isBuffering, setIsBuffering] = useState(false)
	const [videoError, setVideoError] = useState(null)
	const [timeHover, setTimeHover] = useState(null)
	const [seekToast, setSeekToast] = useState(null)

	// Advanced playback state
	const [playbackRate, setPlaybackRate] = useState(1)
	const [isHls, setIsHls] = useState(false)
	const [levels, setLevels] = useState([]) // [{height, bitrate, name}]
	const [currentLevel, setCurrentLevel] = useState(-1) // -1 => auto
	const [audioTracks, setAudioTracks] = useState([]) // [{name, lang}]
	const [audioTrack, setAudioTrack] = useState(-1)
	const [subtitleTracks, setSubtitleTracks] = useState([]) // [{name, lang}]
	const [subtitleTrack, setSubtitleTrack] = useState(-1) // -1 => off

	// Fullscreen state + toggle (ne force plus le plein écran au montage)
	const [isFullscreen, setIsFullscreen] = useState(false)
	const getFullscreenElement = () =>
		document.fullscreenElement ||
		document.webkitFullscreenElement ||
		document.mozFullScreenElement ||
		document.msFullscreenElement

	const requestFs = el => {
		if (el.requestFullscreen) return el.requestFullscreen()
		if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen()
		if (el.mozRequestFullScreen) return el.mozRequestFullScreen()
		if (el.msRequestFullscreen) return el.msRequestFullscreen()
	}
	const exitFs = () => {
		if (document.exitFullscreen) return document.exitFullscreen()
		if (document.webkitExitFullscreen) return document.webkitExitFullscreen()
		if (document.mozCancelFullScreen) return document.mozCancelFullScreen()
		if (document.msExitFullscreen) return document.msExitFullscreen()
	}
	const toggleFullscreen = useCallback(() => {
		const fsEl = getFullscreenElement()
		const el = wrapperRef.current
		if (!el) return
		if (fsEl) {
			exitFs()?.catch?.(() => {})
		} else {
			requestFs(el)?.catch?.(() => {})
		}
	}, [])

	useEffect(() => {
		const onFsChange = () => setIsFullscreen(!!getFullscreenElement())
		document.addEventListener('fullscreenchange', onFsChange)
		document.addEventListener('webkitfullscreenchange', onFsChange)
		document.addEventListener('mozfullscreenchange', onFsChange)
		document.addEventListener('MSFullscreenChange', onFsChange)
		return () => {
			document.removeEventListener('fullscreenchange', onFsChange)
			document.removeEventListener('webkitfullscreenchange', onFsChange)
			document.removeEventListener('mozfullscreenchange', onFsChange)
			document.removeEventListener('MSFullscreenChange', onFsChange)
		}
	}, [])

	// Déclenchement de l'autonext au début des crédits
	useEffect(() => {
		if (!duration || autoNextVisible) return
		// si on a un timecode de crédits: déclencher quand on y arrive
		if (creditsStart && currentTime >= creditsStart) {
			startAutoNext()
			return
		}
		// fallback: si pas de chapitres, déclenche juste avant la fin
		if (!creditsStart && duration > 0 && currentTime >= duration - 0.2) {
			startAutoNext()
		}
	}, [currentTime, creditsStart, duration, autoNextVisible, startAutoNext])

	const surfaceClick = e => {
		if (
			['BUTTON', 'INPUT', 'SPAN', 'SVG', 'PATH', 'SELECT', 'LABEL'].includes(
				e.target.tagName
			) ||
			e.target.closest('button') ||
			e.target.closest('select')
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

	const saveTimeoutRef = useRef(null)
	const lastSavedTimeRef = useRef(0)
	const savingRef = useRef(false)
	const hideTimerRef = useRef(null)
	const seekToastTimerRef = useRef(null)
	const lastTapRef = useRef(0)

	// Try HLS first (fallback progressive)
	const progressiveSrc = useMemo(() => {
		if (isEpisode) {
			return `${import.meta.env.VITE_API}/video/episode/${episodeID}`
		}
		return `${import.meta.env.VITE_API}/video/${tmdbID}`
	}, [isEpisode, episodeID, tmdbID])

	const hlsSrc = useMemo(() => {
		if (isEpisode) {
			return `${import.meta.env.VITE_API}/hls/episode/${episodeID}/master.m3u8`
		}
		return `${import.meta.env.VITE_API}/hls/movie/${tmdbID}/master.m3u8`
	}, [isEpisode, episodeID, tmdbID])

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

	useEffect(() => {
		const it = onGoingMedias?.find(og => og?.episodeId === episodeID || og?.tmdbID === tmdbID)
		if (it) {
			setCurrentTime(it?.position)
			if (videoRef.current) videoRef.current.currentTime = it?.position
		}
		// eslint-disable-next-line
	}, [])

	// SUPPRIMÉ: l'effet qui forçait le plein écran au montage
	// -> On laisse l'utilisateur choisir via le bouton toggle.

	// Setup video events + HLS
	useEffect(() => {
		const video = videoRef.current
		if (!video) return

		// Toujours s'assurer que la vidéo ne boucle pas
		video.loop = false

		// Cleanup previous HLS if any
		if (hlsRef.current) {
			try {
				hlsRef.current.destroy()
			} catch (err) {
				console.error('Error destroying HLS:', err)
			}
			hlsRef.current = null
		}
		setIsHls(false)
		setLevels([])
		setCurrentLevel(-1)
		setAudioTracks([])
		setAudioTrack(-1)
		setSubtitleTracks([])
		setSubtitleTrack(-1)

		// Helper to wire DOM events
		const updateBuffered = () => {
			try {
				if (video.buffered.length) {
					const end = video.buffered.end(video.buffered.length - 1)
					setBufferedEnd(end)
				}
			} catch (err) {
				console.error('Error updating buffered:', err)
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
		const onEnded = () => {
			try {
				video.autoplay = false
				video.pause()
			} catch (e) {
				console.error('Error pausing video:', e)
			}
			if (!autoNextVisible) startAutoNext()
		}
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
		video.addEventListener('ended', onEnded)

		// Try HLS first
		const setupHls = () => {
			if (video.canPlayType('application/vnd.apple.mpegurl')) {
				// Safari native HLS
				video.src = hlsSrc
				setIsHls(true)
			} else if (Hls.isSupported()) {
				const hls = new Hls({
					enableWorker: true,
					lowLatencyMode: false,
					backBufferLength: 60,
					capLevelToPlayerSize: true
				})
				hlsRef.current = hls
				hls.attachMedia(video)
				hls.on(Hls.Events.MEDIA_ATTACHED, () => {
					hls.loadSource(hlsSrc)
				})
				hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
					setIsHls(true)
					const lvls = (data.levels || []).map((lvl, i) => ({
						index: i,
						height: lvl.height,
						bitrate: lvl.bitrate,
						name: lvl.name || (lvl.height ? `${lvl.height}p` : `Niveau ${i}`)
					}))
					setLevels(lvls)
					setCurrentLevel(-1) // auto
				})
				hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
					const list = (data.audioTracks || []).map((t, i) => ({
						index: i,
						name: t.name || t.lang || `Piste ${i + 1}`,
						lang: t.lang || ''
					}))
					setAudioTracks(list)
					setAudioTrack(hls.audioTrack ?? -1)
				})
				hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
					const list = (data.subtitleTracks || []).map((t, i) => ({
						index: i,
						name: t.name || t.lang || `Sous-titres ${i + 1}`,
						lang: t.lang || ''
					}))
					setSubtitleTracks(list)
					setSubtitleTrack(hls.subtitleTrack ?? -1)
				})
				hls.on(Hls.Events.ERROR, (_, data) => {
					if (data.fatal) {
						if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
							// fallback to progressive
							try {
								hls.destroy()
							} catch (err) {
								console.error('Error destroying HLS:', err)
							}
							hlsRef.current = null
							setIsHls(false)
							video.src = progressiveSrc
						} else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
							hls.recoverMediaError()
						} else {
							try {
								hls.destroy()
							} catch (err) {
								console.error('Error destroying HLS:', err)
							}
							hlsRef.current = null
							setIsHls(false)
							video.src = progressiveSrc
						}
					}
				})
			} else {
				// Fallback progressive
				video.src = progressiveSrc
			}
		}

		// If we have metadata error, skip setting up media
		if (!isError) {
			// reset base states
			setPaused(video.paused)
			setCurrentTime(video.currentTime || 0)
			setDuration(video.duration || 0)
			updateBuffered()
			setupHls()
			// apply current playback rate
			video.playbackRate = playbackRate
		}

		return () => {
			video.removeEventListener('timeupdate', onTime)
			video.removeEventListener('loadedmetadata', onLoaded)
			video.removeEventListener('play', onPlay)
			video.removeEventListener('pause', onPause)
			video.removeEventListener('waiting', onWaiting)
			video.removeEventListener('playing', onPlaying)
			video.removeEventListener('error', onError)
			video.removeEventListener('ended', onEnded)
			if (hlsRef.current) {
				try {
					hlsRef.current.destroy()
				} catch (err) {
					console.error('Error destroying HLS:', err)
				}
				hlsRef.current = null
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hlsSrc, progressiveSrc, isSeeking, isError, startAutoNext])

	// Apply playback rate to video element on change
	useEffect(() => {
		if (videoRef.current) videoRef.current.playbackRate = playbackRate
	}, [playbackRate])

	const { triggerAsync: updateOnGoingMedia } = useAPIAfter('POST', '/ongoing_media')

	const maybeScheduleSave = t => {
		if (!user?.id) return
		if (isEpisode && !episodeFewData?.id) return
		if (!isEpisode && (!movie || !storedMovie?.id)) return
		if (Math.abs(t - lastSavedTimeRef.current) < MIN_SAVE_DELTA) return
		if (savingRef.current) return
		if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
		saveTimeoutRef.current = setTimeout(() => {
			saveProgress(t)
		}, SAVE_DEBOUNCE)
	}

	const saveProgressImmediate = t => {
		if (!user?.id) return
		if (isEpisode && !episodeFewData?.id) return
		if (!isEpisode && (!movie || !storedMovie?.id)) return
		if (savingRef.current) return
		saveProgress(t, true)
	}

	const saveProgress = (t, force = false) => {
		if (t <= 1) return
		if (!user?.id) return
		if (!force && Math.abs(t - lastSavedTimeRef.current) < MIN_SAVE_DELTA) return

		if (isEpisode && episodeFewData?.id) {
			// Save episode progress
			savingRef.current = true
			updateOnGoingMedia({
				type: 'episode',
				tmdbID: episodeFewData.tmdbID,
				duration: Math.floor(duration),
				position: Math.floor(t),
				user: user.id,
				episode: episodeFewData.id,
				series: episodeFewData.seriesID
			})
				.then(() => {
					lastSavedTimeRef.current = t
					refetchUser()
				})
				.finally(() => {
					savingRef.current = false
				})
		} else if (!isEpisode && movie && storedMovie?.id) {
			// Save movie progress
			savingRef.current = true
			updateOnGoingMedia({
				type: 'movie',
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
	}

	useEffect(() => {
		return () => {
			if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
			// eslint-disable-next-line
			if (videoRef.current && videoRef.current.currentTime > 1)
				saveProgressImmediate(videoRef.current.currentTime)
		}
		// eslint-disable-next-line
	}, [movie, user?.id, storedMovie?.id, isEpisode, episodeFewData])

	// Keyboard shortcuts
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
				case '>':
					setPlaybackRate(r => Math.min(4, Math.round((r + 0.25) * 100) / 100))
					break
				case '<':
					setPlaybackRate(r => Math.max(0.25, Math.round((r - 0.25) * 100) / 100))
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
		goBack()
	}

	// Display info
	let title = ''
	let description = ''
	let poster = ''

	if (isEpisode && episodeData) {
		title = `${episodeData.name}`
		description = episodeData.overview
		poster = episodeData.still_path
	} else if (movie) {
		title = movie.title || ''
		description = movie.overview || ''
		poster = movie.poster || ''
	}

	// Quality selection
	const handleSelectLevel = useCallback(
		levelIndex => {
			if (!isHls || !hlsRef.current) return
			// -1 => auto
			hlsRef.current.currentLevel = levelIndex
			setCurrentLevel(levelIndex)
		},
		[isHls]
	)

	// Audio selection
	const handleSelectAudio = useCallback(
		trackIndex => {
			if (!isHls || !hlsRef.current) return
			if (trackIndex === -1) return
			hlsRef.current.audioTrack = trackIndex
			setAudioTrack(trackIndex)
		},
		[isHls]
	)

	// Subtitle selection
	const handleSelectSubtitle = useCallback(
		trackIndex => {
			if (!isHls || !hlsRef.current) return
			// -1 => off
			hlsRef.current.subtitleTrack = trackIndex
			setSubtitleTrack(trackIndex)
		},
		[isHls]
	)

	// Video element only when no metadata error and no fatal video error
	const canShowVideo = !isError && !videoError

	// Déterminer l'action principale et le libellé de l'overlay de fin
	const hasNext = !!(isEpisode && nextEpisodeId)
	const autoActionLabel = hasNext ? 'Épisode suivant' : 'Retourner au menu'

	return (
		<div
			ref={wrapperRef}
			className='fixed top-0 left-0 w-screen h-screen bg-black select-none overflow-hidden'
			style={{ WebkitTapHighlightColor: 'transparent' }}
			onClick={surfaceClick}
		>
			{canShowVideo && (
				<video
					ref={videoRef}
					poster={poster ? `https://image.tmdb.org/t/p/w780${poster}` : undefined}
					autoPlay
					playsInline
					controls={false}
					className='absolute top-0 left-0 w-full h-full object-contain bg-black'
					tabIndex={-1}
				/>
			)}

			<AnimatePresence>{controlsVisible && canShowVideo && <Gradients />}</AnimatePresence>

			{/* Zones double tap */}
			<DoubleTapZones
				onBack={() => seek(-SEEK_INTERVAL)}
				onForward={() => seek(SEEK_INTERVAL)}
				onTap={handleZoneTap}
			/>

			{/* Buffering spinner */}
			<AnimatePresence>{isBuffering && <BufferingSpinner />}</AnimatePresence>

			{/* Overlay contrôles */}
			<AnimatePresence>
				{controlsVisible && canShowVideo && (
					<ControlsOverlay
						title={title}
						description={description}
						paused={paused}
						onExit={exitViewer}
						onPlayPause={handlePlayPause}
						onSeekBack={() => seek(-SEEK_INTERVAL)}
						onSeekForward={() => seek(SEEK_INTERVAL)}
						// Progress
						timeHover={timeHover}
						formatTime={formatTime}
						currentTime={currentTime}
						duration={duration}
						progressBackground={progressBackground}
						onProgressChange={handleProgressChange}
						onRangeMouseMove={handleRangeMouseMove}
						onRangeLeave={handleRangeLeave}
						onTouchStart={handleTouchStart}
						onTouchMove={handleTouchMove}
						onTouchEnd={handleTouchEnd}
						remaining={remaining}
						isBuffering={isBuffering}
						// Advanced controls
						playbackRate={playbackRate}
						setPlaybackRate={setPlaybackRate}
						isHls={isHls}
						qualityLevels={levels}
						currentLevel={currentLevel}
						onSelectLevel={handleSelectLevel}
						audioTracks={audioTracks}
						audioTrack={audioTrack}
						onSelectAudio={handleSelectAudio}
						subtitleTracks={subtitleTracks}
						subtitleTrack={subtitleTrack}
						onSelectSubtitle={handleSelectSubtitle}
					/>
				)}
			</AnimatePresence>

			{/* Bouton plein écran / fenêtre (style YouTube, en bas à droite) */}
			{controlsVisible && canShowVideo && (
				<button
					onClick={toggleFullscreen}
					className='absolute bottom-4 right-4 z-60 bg-black/50 hover:bg-black/60 text-white rounded px-3 py-2 text-sm'
					title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
				>
					{isFullscreen ? 'Fenêtre' : 'Plein écran'}
				</button>
			)}

			{/* Toast seek */}
			<AnimatePresence>{seekToast && <SeekToastOverlay text={seekToast} />}</AnimatePresence>

			{/* Overlay chargement métadonnées */}
			<AnimatePresence>
				{isPending && (
					<div className='absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm z-50'>
						<Loader />
						<p className='text-white text-2xl tracking-wide mt-6'>Chargement…</p>
					</div>
				)}
			</AnimatePresence>

			{/* Erreur chargement métadonnées */}
			<AnimatePresence>
				{!isPending && isError && (
					<MetadataErrorOverlay message={error?.message} onBack={() => goBack()} />
				)}
			</AnimatePresence>

			{/* Erreur vidéo */}
			<AnimatePresence>
				{videoError && (
					<VideoErrorOverlay
						message={videoError}
						onRetry={() => window.location.reload()}
						onBack={exitViewer}
					/>
				)}
			</AnimatePresence>

			{/* Auto-next / Return overlay amélioré */}
			{autoNextVisible && (
				<div className='absolute bottom-6 right-6 z-60 flex flex-col items-end gap-2'>
					<div className='bg-black/75 text-white rounded-lg shadow-lg p-4 max-w-sm'>
						<div className='flex items-start gap-3'>
							<div className='flex-1'>
								<p className='text-sm opacity-80'>
									{hasNext
										? 'Lecture de l’épisode suivant dans'
										: 'Retour au menu dans'}{' '}
									{autoNextCountdown}s…
								</p>
								<p className='font-semibold mt-1'>
									{hasNext
										? nextEpisode?.name || 'Épisode suivant'
										: 'Retourner au menu'}
								</p>
							</div>
							<button
								onClick={cancelAutoNext}
								title='Rester sur la vidéo'
								className='text-white/80 hover:text-white text-lg leading-none'
							>
								<IoCloseCircleOutline />
							</button>
						</div>
						<div className='mt-3 flex justify-end gap-2'>
							<button
								onClick={performAutoAction}
								className='px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-sm'
							>
								{autoActionLabel}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default Viewer
