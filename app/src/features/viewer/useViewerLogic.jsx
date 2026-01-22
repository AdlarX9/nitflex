import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Hls from 'hls.js'
import {
	useAPI,
	useAPIAfter,
	useGetEpisodeDetails,
	useGetFullMovie,
	useGoBackToNonVideo,
	useMainContext
} from '../../utils/hooks'

const SEEK_INTERVAL = 10
const AUTO_HIDE_DELAY = 3000
const SAVE_DEBOUNCE = 300
const MIN_SAVE_DELTA = 5
const AUTONEXT_SECONDS = 5

export const useViewerLogic = () => {
	const { tmdbID, episodeID } = useParams()
	const isEpisode = !!episodeID
	const navigate = useNavigate()
	const { user, refetchUser } = useMainContext()
	const goBack = useGoBackToNonVideo()

	// --- 1. DATA FETCHING ---
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

	const { data: onGoingMedias } = useAPI('GET', `/ongoing_media/${user.id}`)

	// Chapters / Credits
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

	// --- 2. STATE ---
	const videoRef = useRef(null)
	const wrapperRef = useRef(null)
	const hlsRef = useRef(null)
	const saveTimeoutRef = useRef(null)
	const lastSavedTimeRef = useRef(0)
	const savingRef = useRef(false)
	const hideTimerRef = useRef(null)
	const seekToastTimerRef = useRef(null)
	const lastTapRef = useRef(0)

	// Refs for stable callbacks in event handlers
	const saveProgressRef = useRef(null)
	const maybeScheduleSaveRef = useRef(null)
	const showControlsRef = useRef(null)
	const startAutoNextRef = useRef(null)

	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [paused, setPaused] = useState(true)
	const [isBuffering, setIsBuffering] = useState(false)
	const [bufferedEnd, setBufferedEnd] = useState(0)
	// eslint-disable-next-line no-unused-vars
	const [isSeeking, setIsSeeking] = useState(false)
	const [controlsVisible, setControlsVisible] = useState(true)
	const [videoError, setVideoError] = useState(null)
	const [timeHover, setTimeHover] = useState(null)
	const [seekToast, setSeekToast] = useState(null)
	const [isFullscreen, setIsFullscreen] = useState(false)

	// Advanced HLS State
	const [playbackRate, setPlaybackRate] = useState(1)
	const [isHls, setIsHls] = useState(false)
	const [levels, setLevels] = useState([])
	const [currentLevel, setCurrentLevel] = useState(-1)
	const [audioTracks, setAudioTracks] = useState([])
	const [audioTrack, setAudioTrack] = useState(-1)
	const [subtitleTracks, setSubtitleTracks] = useState([])
	const [subtitleTrack, setSubtitleTrack] = useState(-1)

	// --- 3. AUTO NEXT LOGIC ---
	const nextEpisode = episodeFewData?.nextEpisode
	const nextEpisodeId = useMemo(
		() => nextEpisode?.id ?? nextEpisode?._id ?? nextEpisode?.episodeId ?? null,
		[nextEpisode]
	)

	const [autoNextVisible, setAutoNextVisible] = useState(false)
	const [autoNextCountdown, setAutoNextCountdown] = useState(AUTONEXT_SECONDS)
	const autoNextTimerRef = useRef(null)
	const autoNextStartedRef = useRef(false)
	const autoNextCancelledRef = useRef(false)

	const performAutoAction = useCallback(() => {
		if (isEpisode && nextEpisodeId) {
			navigate(`/viewer/episode/${nextEpisodeId}`)
			// Reset basic state for next video
			setAutoNextVisible(false)
			setCurrentTime(0)
			setPaused(false)
			if (videoRef.current) videoRef.current.play().catch(() => {})
			autoNextStartedRef.current = false
			autoNextCancelledRef.current = false
		} else {
			goBack()
		}
	}, [isEpisode, nextEpisodeId, navigate, goBack])

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

	// --- 4. VIDEO SOURCES ---
	const progressiveSrc = useMemo(
		() =>
			isEpisode
				? `${import.meta.env.VITE_API}/video/episode/${episodeID}`
				: `${import.meta.env.VITE_API}/video/${tmdbID}`,
		[isEpisode, episodeID, tmdbID]
	)

	const hlsSrc = useMemo(
		() =>
			isEpisode
				? `${import.meta.env.VITE_API}/hls/episode/${episodeID}/master.m3u8`
				: `${import.meta.env.VITE_API}/hls/movie/${tmdbID}/master.m3u8`,
		[isEpisode, episodeID, tmdbID]
	)

	// --- 5. PROGRESS SAVING ---
	const { triggerAsync: updateOnGoingMedia } = useAPIAfter('POST', '/ongoing_media')

	const saveProgress = useCallback(
		(t, force = false) => {
			if (t <= 1 || !user?.id) return
			if (
				!force &&
				Math.abs(t - lastSavedTimeRef.current) < MIN_SAVE_DELTA &&
				!savingRef.current
			)
				return

			const payload = {
				duration: Math.floor(duration),
				position: Math.floor(t),
				user: user.id
			}

			if (isEpisode && episodeFewData?.id) {
				payload.type = 'episode'
				payload.tmdbID = episodeFewData.tmdbID
				payload.episode = episodeFewData.id
				payload.series = episodeFewData.seriesID
			} else if (!isEpisode && movie && storedMovie?.id) {
				payload.type = 'movie'
				payload.tmdbID = parseInt(tmdbID)
				payload.movie = storedMovie.id
			} else {
				return
			}

			savingRef.current = true
			updateOnGoingMedia(payload)
				.then(() => {
					lastSavedTimeRef.current = t
					refetchUser()
				})
				.finally(() => (savingRef.current = false))
		},
		[
			user?.id,
			duration,
			isEpisode,
			episodeFewData,
			movie,
			storedMovie,
			tmdbID,
			updateOnGoingMedia,
			refetchUser
		]
	)

	const maybeScheduleSave = useCallback(
		t => {
			if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
			saveTimeoutRef.current = setTimeout(() => saveProgress(t), SAVE_DEBOUNCE)
		},
		[saveProgress]
	)

	// --- 6. CONTROLS VISIBILITY ---
	const scheduleHide = useCallback(() => {
		if (paused) return
		if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
		hideTimerRef.current = setTimeout(() => setControlsVisible(false), AUTO_HIDE_DELAY)
	}, [paused])

	const showControls = useCallback(() => {
		setControlsVisible(true)
		scheduleHide()
	}, [scheduleHide])

	// Keep refs updated with latest callbacks
	useEffect(() => {
		saveProgressRef.current = saveProgress
	}, [saveProgress])
	useEffect(() => {
		maybeScheduleSaveRef.current = maybeScheduleSave
	}, [maybeScheduleSave])
	useEffect(() => {
		showControlsRef.current = showControls
	}, [showControls])
	useEffect(() => {
		startAutoNextRef.current = startAutoNext
	}, [startAutoNext])

	// --- 7. VIDEO EVENTS & HLS SETUP ---
	useEffect(() => {
		const video = videoRef.current
		if (!video) return

		video.loop = false
		if (hlsRef.current) hlsRef.current.destroy()
		setIsHls(false)
		setLevels([])
		setAudioTracks([])
		setSubtitleTracks([])

		const onTime = () => {
			setCurrentTime(video.currentTime)
			if (video.buffered.length) setBufferedEnd(video.buffered.end(video.buffered.length - 1))
			maybeScheduleSaveRef.current?.(video.currentTime)
		}
		const onLoaded = () => setDuration(video.duration || 0)
		const onPlay = () => {
			setPaused(false)
			setIsBuffering(false)
			showControlsRef.current?.()
		}
		const onPause = () => {
			setPaused(true)
			saveProgressRef.current?.(video.currentTime, true)
			setControlsVisible(true)
		}
		const onWaiting = () => setIsBuffering(true)
		const onPlaying = () => setIsBuffering(false)
		const onError = e => setVideoError(e.target.error?.code || 'Erreur inconnue')
		const onEnded = () => {
			video.pause()
			startAutoNextRef.current?.()
		}

		video.addEventListener('timeupdate', onTime)
		video.addEventListener('loadedmetadata', onLoaded)
		video.addEventListener('play', onPlay)
		video.addEventListener('pause', onPause)
		video.addEventListener('waiting', onWaiting)
		video.addEventListener('playing', onPlaying)
		video.addEventListener('error', onError)
		video.addEventListener('ended', onEnded)

		// HLS Logic
		if (video.canPlayType('application/vnd.apple.mpegurl')) {
			video.src = hlsSrc
			setIsHls(true)
		} else if (Hls.isSupported()) {
			const hls = new Hls({ enableWorker: true, capLevelToPlayerSize: true })
			hlsRef.current = hls
			hls.attachMedia(video)
			hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(hlsSrc))
			hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
				setIsHls(true)
				setLevels(
					data.levels.map((l, i) => ({
						index: i,
						height: l.height,
						bitrate: l.bitrate,
						name: l.name || `${l.height}p`
					}))
				)
			})
			hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
				setAudioTracks(
					data.audioTracks.map((t, i) => ({
						index: i,
						name: t.name || t.lang,
						lang: t.lang
					}))
				)
			})
			hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
				setSubtitleTracks(
					data.subtitleTracks.map((t, i) => ({
						index: i,
						name: t.name || t.lang,
						lang: t.lang
					}))
				)
			})
			hls.on(Hls.Events.ERROR, (_, data) => {
				console.log('HLS error', data)
				if (data.fatal) {
					hls.destroy()
					setIsHls(false)
					video.src = progressiveSrc
				}
			})
		} else {
			video.src = progressiveSrc
		}

		return () => {
			// Cleanup
			video.removeEventListener('timeupdate', onTime)
			video.removeEventListener('loadedmetadata', onLoaded)
			video.removeEventListener('play', onPlay)
			video.removeEventListener('pause', onPause)
			video.removeEventListener('waiting', onWaiting)
			video.removeEventListener('playing', onPlaying)
			video.removeEventListener('error', onError)
			video.removeEventListener('ended', onEnded)
			if (hlsRef.current) hlsRef.current.destroy()
		}
	}, [hlsSrc, progressiveSrc, episodeID, tmdbID])

	// Restore position from onGoingMedias (separate effect to avoid re-running HLS setup)
	useEffect(() => {
		const video = videoRef.current
		if (!video || !onGoingMedias) return
		const it = onGoingMedias.find(og => og?.episodeId === episodeID || og?.tmdbID === tmdbID)
		if (it && it.position > 0) {
			video.currentTime = it.position
		}
	}, [onGoingMedias, episodeID, tmdbID])

	// --- 8. ACTIONS ---
	const togglePlay = useCallback(() => {
		if (videoRef.current?.paused) videoRef.current.play().catch(() => {})
		else videoRef.current?.pause()
	}, [])

	const seek = useCallback(
		delta => {
			if (!videoRef.current) return
			let t = videoRef.current.currentTime + delta
			if (t < 0) t = 0
			if (t > duration) t = duration
			videoRef.current.currentTime = t
			setCurrentTime(t)
			setSeekToast(delta > 0 ? `+${delta}s` : `${delta}s`)
			if (seekToastTimerRef.current) clearTimeout(seekToastTimerRef.current)
			seekToastTimerRef.current = setTimeout(() => setSeekToast(null), 850)
			maybeScheduleSave(t)
		},
		[duration, maybeScheduleSave]
	)

	const handleZoneTap = dir => {
		const now = Date.now()
		if (now - lastTapRef.current < 350) {
			seek(dir === 'back' ? -SEEK_INTERVAL : SEEK_INTERVAL)
		}
		lastTapRef.current = now
	}

	const toggleFullscreen = useCallback(() => {
		if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
		else wrapperRef.current?.requestFullscreen().catch(() => {})
	}, [])

	useEffect(() => {
		const onFs = () => setIsFullscreen(!!document.fullscreenElement)
		document.addEventListener('fullscreenchange', onFs)
		return () => document.removeEventListener('fullscreenchange', onFs)
	}, [])

	// Listeners souris/clavier
	useEffect(() => {
		const moveHandler = () => showControlsRef.current?.()
		window.addEventListener('mousemove', moveHandler)
		window.addEventListener('touchstart', moveHandler)
		return () => {
			window.removeEventListener('mousemove', moveHandler)
			window.removeEventListener('touchstart', moveHandler)
		}
	}, [])

	useEffect(() => {
		const handler = e => {
			if (e.key === ' ' || e.key === 'k') togglePlay()
			if (e.key === 'ArrowRight') seek(SEEK_INTERVAL)
			if (e.key === 'ArrowLeft') seek(-SEEK_INTERVAL)
			if (e.key === 'f') toggleFullscreen()
			if (e.key === 'Escape') goBack()
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [togglePlay, seek, toggleFullscreen, goBack])

	// Auto-next trigger on Credits
	useEffect(() => {
		if (!duration || autoNextVisible) return
		if (creditsStart && currentTime >= creditsStart) {
			startAutoNext()
		} else if (!creditsStart && duration > 0 && currentTime >= duration - 0.2) {
			startAutoNext()
		}
		// Reset auto-next if user seeks back
		if ((autoNextStartedRef.current || autoNextCancelledRef.current) && creditsStart) {
			if (currentTime < creditsStart - 2) {
				autoNextCancelledRef.current = false
				autoNextStartedRef.current = false
				clearAutoNextTimer()
				setAutoNextVisible(false)
			}
		}
	}, [currentTime, creditsStart, duration, autoNextVisible, startAutoNext, clearAutoNextTimer])

	useEffect(() => {
		if (videoRef.current) videoRef.current.playbackRate = playbackRate
	}, [playbackRate])

	// --- 9. METADATA FORMATTING ---
	const meta = {
		title: isEpisode ? episodeData?.name : movie?.title,
		description: isEpisode ? episodeData?.overview : movie?.overview,
		poster: isEpisode ? episodeData?.still_path : movie?.poster,
		nextTitle: nextEpisode?.name || 'Épisode suivant',
		hasNext: isEpisode && !!nextEpisodeId
	}

	return {
		// Refs
		videoRef,
		wrapperRef,
		hlsRef,
		// State
		isPending: isEpisode ? episodePending : moviePending,
		isError: (isEpisode ? episodeError : movieError) || !!movieFetchError,
		errorMessage: movieFetchError?.message,
		videoError,
		isPlaying: !paused,
		isBuffering,
		currentTime,
		duration,
		bufferedEnd,
		controlsVisible,
		timeHover,
		seekToast,
		isFullscreen,
		autoNextVisible,
		autoNextCountdown,
		// HLS State
		isHls,
		playbackRate,
		levels,
		currentLevel,
		audioTracks,
		audioTrack,
		subtitleTracks,
		subtitleTrack,
		// Meta
		meta,
		// Actions
		togglePlay,
		seek,
		setPlaybackRate,
		setLevel: i => {
			if (hlsRef.current) hlsRef.current.currentLevel = i
			setCurrentLevel(i)
		},
		setAudio: i => {
			if (hlsRef.current) hlsRef.current.audioTrack = i
			setAudioTrack(i)
		},
		setSubtitle: i => {
			if (hlsRef.current) hlsRef.current.subtitleTrack = i
			setSubtitleTrack(i)
		},
		toggleFullscreen,
		goBack,
		handleZoneTap,
		performAutoAction,
		cancelAutoNext,
		setControlsVisible,
		showControls,
		scheduleHide,
		setTimeHover,
		setIsSeeking,
		setCurrentTime: t => {
			if (videoRef.current) videoRef.current.currentTime = t
			setCurrentTime(t)
		}
	}
}
