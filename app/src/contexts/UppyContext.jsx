import { useEffect, useMemo, useState } from 'react'
import { UppyContext, useEpisodeTitles, useMainContext } from '../utils/hooks'
import Uppy from '@uppy/core'
import XHRUpload from '@uppy/xhr-upload'

export const UppyProvider = ({ children, isMovie }) => {
	const { refetchNewSeries, refetchNewMovies } = useMainContext()
	const [uppyFiles, setUppyFiles] = useState([])
	const [customTitle, setCustomTitle] = useState('')

	const [newMovie, setNewMovie] = useState(null)
	const [tmdbID, setTmdbID] = useState(null)

	// Series state
	const [selectedSeries, setSelectedSeries] = useState(null)
	const [seriesFilesMap, setSeriesFilesMap] = useState({}) // {fileId: {season:'', episode:''}}
	const epTitles = useEpisodeTitles(selectedSeries?.id, seriesFilesMap)

	// Uppy instance
	// On recrée l'instance si isMovie change
	const uppy = useMemo(() => {
		const uppyInstance = new Uppy({
			restrictions: {
				maxFileSize: null,
				allowedFileTypes: ['video/*']
			},
			autoProceed: false
		})

		// On ajoute le plugin XHRUpload directement ici
		uppyInstance.use(XHRUpload, {
			endpoint: import.meta.env.VITE_API + '/' + (isMovie ? 'movies' : 'series'),
			formData: true,
			bundle: isMovie ? false : true,
			fieldName: 'file' + (isMovie ? '' : 's[]')
		})

		return uppyInstance
	}, [isMovie]) // Dépendance ajoutée : isMovie

	// Nettoyage de l'instance quand elle change ou quand le composant est démonté
	useEffect(() => {
		return () => uppy.destroy()
	}, [uppy])

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
			const Title = newMovie?.title || ''
			const Poster = newMovie?.poster || newMovie?.poster_path || ''
			const Rating = newMovie?.vote_average ?? newMovie?.rating ?? ''
			const IsDocu = Array.isArray(newMovie?.genre_ids)
				? newMovie.genre_ids.includes(99)
				: false
			uppy.setMeta({
				TmdbID: tmdbID,
				Title,
				Poster,
				Rating,
				CustomTitle: customTitle,
				IsDocu
			})
		} else {
			if (!selectedSeries) return
			const episodes = uppyFiles.map((f, i) => {
				const m = seriesFilesMap[f.id] || { season: '', episode: '' }
				const s = parseInt(m.season) || 0
				const e = parseInt(m.episode) || 0
				const title = epTitles[s]?.[e] || ''
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
			console.log('selectedSeries', selectedSeries)
			uppy.setMeta({
				TmdbID: selectedSeries.id,
				Title: selectedSeries.name || '',
				Poster: selectedSeries?.poster_path || '',
				IsDocu: isDocu,
				IsKids: isKids,
				CustomTitle: customTitle,
				EpisodesJSON: JSON.stringify(episodes)
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
				uppyFiles,
				newMovie,
				setNewMovie,
				customTitle,
				setCustomTitle,
				setTmdbID,
				selectedSeries,
				setSelectedSeries,
				seriesFilesMap,
				setSeriesFilesMap
			}}
		>
			{children}
		</UppyContext.Provider>
	)
}
