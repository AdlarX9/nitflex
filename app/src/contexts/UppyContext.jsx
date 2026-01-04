import { useEffect, useMemo, useState } from 'react'
import { UppyContext, useEpisodeTitles, useMainContext } from '../utils/hooks'
import Uppy from '@uppy/core'
import XHRUpload from '@uppy/xhr-upload'

export const UppyProvider = ({ children }) => {
	const [isMovie, setIsMovie] = useState()
	const { refetchNewSeries, refetchNewMovies } = useMainContext()
	const [uppyFiles, setUppyFiles] = useState([])
	const [xhrInitialized, setXhrInitialized] = useState(false)
	// eslint-disable-next-line
	const [txSel, setTxSel] = useState({ audioStreams: [], subtitleStreams: [] })
	const [customTitle, setCustomTitle] = useState('')

	const [newMovie, setNewMovie] = useState(null)
	const [tmdbID, setTmdbID] = useState(null)

	// Series state
	const [selectedSeries, setSelectedSeries] = useState(null)
	const [seriesFilesMap, setSeriesFilesMap] = useState({}) // {fileId: {season:'', episode:''}}
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
			endpoint: import.meta.env.VITE_API + '/' + (isMovie ? 'movies' : 'series'),
			formData: true,
			bundle: isMovie ? false : true,
			fieldName: 'file' + (isMovie ? '' : 's[]')
		})
		setXhrInitialized(true)
		return () => uppy.destroy()
	}, [uppy, isMovie])

	useEffect(() => {
		const onComplete = async result => {
			if (result.successful?.length > 0) {
				if (typeof refetchNewSeries === 'function' && !isMovie) refetchNewSeries()
				if (typeof refetchNewMovies === 'function' && isMovie) refetchNewMovies()
			}
		}

		uppy.on('complete', onComplete)
		return () => {
			uppy.off('complete', onComplete)
		}
	}, [uppy, refetchNewSeries, refetchNewMovies, isMovie])

	// Track Uppy files and keep global meta in sync with selections
	useEffect(() => {
		let handleAdded = () => setUppyFiles(uppy.getFiles())
		let handleRemoved = () => setUppyFiles(uppy.getFiles())
		if (!isMovie) {
			handleAdded = file => {
				uppy.setFileMeta(file.id, {})
				setSeriesFilesMap(prev => ({
					...prev,
					[file.id]: prev[file.id] || { season: '', episode: '' }
				}))
				setUppyFiles(uppy.getFiles())
			}
			handleRemoved = file => {
				setSeriesFilesMap(prev => {
					const p = { ...prev }
					delete p[file.id]
					return p
				})
				setUppyFiles(uppy.getFiles())
			}
		}
		uppy.on('file-added', handleAdded)
		uppy.on('file-removed', handleRemoved)
		setUppyFiles(uppy.getFiles())
		return () => {
			uppy.off('file-added', handleAdded)
			uppy.off('file-removed', handleRemoved)
		}
	}, [uppy, isMovie])

	useEffect(() => {
		if (isMovie) {
			const poster = newMovie?.poster || newMovie?.poster_path || ''
			const title = newMovie?.title || ''
			const imdbID = newMovie?.imdb_id || ''
			const rating = newMovie?.vote_average ?? newMovie?.rating ?? ''
			const isDocu = Array.isArray(newMovie?.genre_ids)
				? newMovie.genre_ids.includes(99)
				: false
			uppy.setMeta({
				tmdbID,
				imdbID,
				title,
				poster,
				rating,
				customTitle,
				isDocu
			})
		} else {
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
			const genreIds = Array.isArray(selectedSeries?.genre_ids)
				? selectedSeries.genre_ids
				: []
			const isDocu = genreIds.includes(99)
			const isKids = genreIds.includes(16) || genreIds.includes(10762)
			uppy.setMeta({
				tmdbID: selectedSeries.id,
				imdbID: selectedSeries?.imdb_id || '',
				title: selectedSeries.name || '',
				poster: selectedSeries?.poster_path || '',
				isDocu,
				isKids,
				customTitle,
				episodes: episodes
			})
		}
	}, [
		uppy,
		customTitle,
		tmdbID,
		newMovie,
		selectedSeries,
		seriesFilesMap,
		uppyFiles,
		isMovie,
		epTitles
	])

	return (
		<UppyContext.Provider
			value={{
				uppy,
				setIsMovie,
				uppyFiles,
				setTxSel,
				newMovie,
				setNewMovie,
				customTitle,
				setCustomTitle,
				setTmdbID,
				selectedSeries,
				setSelectedSeries,
				seriesFilesMap,
				setSeriesFilesMap,
				xhrInitialized
			}}
		>
			{children}
		</UppyContext.Provider>
	)
}
