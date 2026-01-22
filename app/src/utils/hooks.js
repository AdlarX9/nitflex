import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export const MainContext = createContext()
export const useMainContext = () => useContext(MainContext)

export const UppyContext = createContext()
export const useUppyContext = () => useContext(UppyContext)

export const mainColor = '#D53522'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_KEY
const LANG = 'fr-FR'

const logAPIError = error => {
	console.error('API Error:', error)
}

// Fetch episode titles for a set of selected seasons derived from a map {fileId: {season, episode}}
// Returns: { [seasonNumber]: { [episodeNumber]: title } }
export function useEpisodeTitles(tvId, seriesFilesMap) {
	const [titles, setTitles] = useState({})

	useEffect(() => {
		if (!tvId) {
			setTitles({})
			return
		}
		const seasons = Array.from(
			new Set(
				Object.values(seriesFilesMap || {})
					.map(m => parseInt(m?.season) || 0)
					.filter(s => s > 0)
			)
		)
		if (seasons.length === 0) {
			setTitles({})
			return
		}
		let cancelled = false
		;(async () => {
			const next = {}
			for (const s of seasons) {
				try {
					const url = `https://api.themoviedb.org/3/tv/${tvId}/season/${s}?api_key=${TMDB_API_KEY}&language=${LANG}`
					const res = await fetch(url)
					if (!res.ok) continue
					const data = await res.json()
					const map = {}
					if (Array.isArray(data?.episodes)) {
						for (const ep of data.episodes) {
							const num = parseInt(ep?.episode_number)
							if (Number.isInteger(num)) map[num] = ep?.name || ''
						}
					}
					next[s] = map
				} catch {
					// ignore
				}
			}
			if (!cancelled) setTitles(next)
		})()
		return () => {
			cancelled = true
		}
	}, [tvId, seriesFilesMap])

	return titles
}

const axiosGET = async (endpoint, params) => {
	return axios
		.get(import.meta.env.VITE_API + endpoint, { params })
		.then(res => res.data)
		.catch(err => logAPIError(err))
}

const axiosPOST = async (endpoint, body) => {
	return axios
		.post(import.meta.env.VITE_API + endpoint, body)
		.then(res => res.data)
		.catch(err => logAPIError(err))
}

const axiosDELETE = async (endpoint, body) => {
	return axios
		.delete(import.meta.env.VITE_API + endpoint, { data: body })
		.then(res => res.data)
		.catch(err => logAPIError(err))
}

const axiosPATCH = async (endpoint, body) => {
	return axios
		.patch(import.meta.env.VITE_API + endpoint, body)
		.then(res => res.data)
		.catch(err => logAPIError(err))
}

export const axiosAPI = async (method, endpoint, body = {}, params = {}) => {
	switch (method) {
		case 'GET':
			return axiosGET(endpoint, params)
		case 'POST':
			return axiosPOST(endpoint, body)
		case 'PATCH':
			return axiosPATCH(endpoint, body)
		case 'DELETE':
			return axiosDELETE(endpoint, body)
		default:
			return null
	}
}

export const useAPI = (method, endpoint, body = {}, params = {}, enabled = true) => {
	const query = useQuery({
		queryKey: [
			method,
			endpoint,
			body ? JSON.stringify(body) : 'null',
			params ? JSON.stringify(params) : 'null'
		],
		queryFn: () => axiosAPI(method, endpoint, body, params),
		retry: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		refetchOnMount: false,
		keepPreviousData: true,
		staleTime: 1000 * 60 * 10, // 10 minutes
		gcTime: 1000 * 60 * 60, // 1 hour cache
		enabled
	})

	return query
}

export const useAPIAfter = (method, endpoint) => {
	const mutation = useMutation({
		mutationKey: [method, endpoint],
		mutationFn: ({ body, params, newEndpoint }) =>
			axiosAPI(method, newEndpoint || endpoint, body, params),
		retry: 0
	})

	const trigger = (body = {}, params = {}, newEndpoint = null) => {
		mutation.mutate({ body, params, newEndpoint })
	}

	const triggerAsync = async (body = {}, params = {}, newEndpoint = null) => {
		return mutation.mutateAsync({ body, params, newEndpoint })
	}

	return { ...mutation, trigger, triggerAsync }
}

const axiosGetMovieCovers = async tmdbID => {
	try {
		const res = await axios.get(
			`https://api.themoviedb.org/3/movie/${tmdbID}/images?api_key=${TMDB_API_KEY}`
		)
		return res.data || {}
	} catch {
		return {}
	}
}

export function useGetMovieCovers(tmdbID) {
	const [posters, setPosters] = useState([])
	const [backdrops, setBackdrops] = useState([])
	const [logos, setLogos] = useState([])

	useEffect(() => {
		let cancelled = false
		async function fetchImages() {
			setPosters([])
			setBackdrops([])
			setLogos([])
			if (!tmdbID) return
			const covers = await axiosGetMovieCovers(tmdbID)
			if (!cancelled && covers) {
				setPosters(
					Array.isArray(covers.posters)
						? covers.posters.filter(p => p.iso_639_1 === 'fr' || p.iso_639_1 === 'en')
						: []
				)
				setBackdrops(
					Array.isArray(covers.backdrops)
						? covers.backdrops.filter(p => p.iso_639_1 === 'fr' || p.iso_639_1 === 'en')
						: []
				)
				setLogos(
					Array.isArray(covers.logos)
						? covers.logos.filter(p => p.iso_639_1 === 'fr' || p.iso_639_1 === 'en')
						: []
				)
			}
		}
		fetchImages()
		return () => {
			cancelled = true
		}
	}, [tmdbID])

	return { posters, backdrops, logos }
}

export const fetchFullMovie = async tmdbID => {
	const url = `https://api.themoviedb.org/3/movie/${tmdbID}?api_key=${TMDB_API_KEY}&append_to_response=credits,images,videos,release_dates,external_ids,keywords,reviews,similar,recommendations&language=${LANG}`
	return axios
		.get(url, {})
		.then(res => res.data)
		.catch(err => err.message)
}

export const useGetFullMovie = tmdbID => {
	return useQuery({
		queryKey: ['fullMovie', tmdbID],
		queryFn: () => fetchFullMovie(tmdbID),
		enabled: !!tmdbID, // ne lance que si tmdbID est défini
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		keepPreviousData: true,
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 60
	})
}

const fetchFullPerson = async personID => {
	const url = `https://api.themoviedb.org/3/person/${personID}?api_key=${TMDB_API_KEY}&append_to_response=movie_credits,tv_credits,images,videos,external_ids&language=${LANG}`
	return axios
		.get(url, {})
		.then(res => res.data)
		.catch(err => err.message)
}

export const useGetPerson = personID => {
	return useQuery({
		queryKey: ['fullPerson', personID],
		queryFn: () => fetchFullPerson(personID),
		enabled: !!personID // ne lance que si personID est défini
	})
}

export const fetchFullSerie = async tmdbID => {
	const url = `https://api.themoviedb.org/3/tv/${tmdbID}?api_key=${TMDB_API_KEY}&append_to_response=credits,images,videos,release_dates,external_ids,keywords,reviews,similar,recommendations&language=${LANG}`
	return axios
		.get(url, {})
		.then(res => res.data)
		.catch(err => err.message)
}

export const useGetFullSerie = tmdbID => {
	return useQuery({
		queryKey: ['fullSerie', tmdbID],
		queryFn: () => fetchFullSerie(tmdbID),
		enabled: !!tmdbID // ne lance que si tmdbID est défini
	})
}

export function useGetFullSeason(tvId, seasonNumber) {
	return useQuery({
		queryKey: ['tmdb', 'tv', tvId, 'season', seasonNumber, LANG],
		enabled: Boolean(tvId) && Number.isInteger(Number(seasonNumber)) && Boolean(TMDB_API_KEY),
		queryFn: async () => {
			const url = `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=${LANG}`
			const res = await fetch(url)
			if (!res.ok) {
				throw new Error(`TMDB season fetch failed: ${res.status}`)
			}
			const json = await res.json()
			return json
		},
		staleTime: 1000 * 60 * 10, // 10 minutes de cache
		gcTime: 1000 * 60 * 60, // 1h en mémoire
		retry: 1
	})
}

export const fetchEpisodeDetails = async (seriesTmdbID, seasonNumber, episodeNumber) => {
	const url = `https://api.themoviedb.org/3/tv/${seriesTmdbID}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${TMDB_API_KEY}&language=${LANG}`
	return axios
		.get(url, {})
		.then(res => res.data)
		.catch(err => err.message)
}

export const useGetEpisodeDetails = (seriesTmdbID, seasonNumber, episodeNumber) => {
	return useQuery({
		queryKey: [
			'tmdb',
			'tv',
			seriesTmdbID,
			'season',
			seasonNumber,
			'episode',
			episodeNumber,
			LANG
		],
		queryFn: () => fetchEpisodeDetails(seriesTmdbID, seasonNumber, episodeNumber),
		enabled: !!seriesTmdbID && !!seasonNumber && !!episodeNumber,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		keepPreviousData: true,
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 60
	})
}

export function useGoBackToNonVideo(prefix = '/viewer') {
	const ctx = useMainContext()
	const navigate = useNavigate()
	if (!ctx) throw new Error('useGoBackToNonVideo must be used within <HistoryTrackerProvider>')

	return useCallback(() => {
		const { path } = ctx.findDeltaToLastNonPrefix(prefix)
		// Use absolute navigation for reliability (history delta may be unavailable)
		if (path) {
			navigate(path, { replace: true })
			return
		}
		navigate('/explorer', { replace: true })
	}, [navigate, ctx, prefix])
}
