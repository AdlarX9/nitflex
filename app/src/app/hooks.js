import { createContext, useContext, useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'

export const MainContext = createContext()
export const useMainContext = () => useContext(MainContext)
export const mainColor = '#D53522'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_KEY

const axiosGET = async (endpoint, params) => {
	return axios
		.get(import.meta.env.VITE_API + endpoint, { params })
		.then(res => res.data)
		.catch(() => null)
}

const axiosPOST = async (endpoint, body) => {
	return axios
		.post(import.meta.env.VITE_API + endpoint, body)
		.then(res => res.data)
		.catch(() => null)
}

const axiosDELETE = async (endpoint, body) => {
	return axios
		.delete(import.meta.env.VITE_API + endpoint, { data: body })
		.then(res => res.data)
		.catch(() => null)
}

const axiosAPI = async (method, endpoint, body, params) => {
	switch (method) {
		case 'GET':
			return axiosGET(endpoint, params)
		case 'POST':
			return axiosPOST(endpoint, body)
		case 'DELETE':
			return axiosDELETE(endpoint, body)
		default:
			return null
	}
}

export const useAPI = (method, endpoint, body = {}, params = {}) => {
	const query = useQuery({
		queryKey: [method, endpoint, body, params],
		queryFn: () => axiosAPI(method, endpoint, body, params),
		retry: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false
	})

	return query
}

export const useAPIAfter = (method, endpoint) => {
	const mutation = useMutation({
		mutationKey: [method, endpoint],
		mutationFn: ({ body, params, newEndpoint }) =>
			axiosAPI(method, newEndpoint || endpoint, body, params)
	})

	const trigger = (body = {}, params = {}, newEndpoint = null) => {
		mutation.mutate({ body, params, newEndpoint })
	}

	const triggerAsync = async (body = {}, params = {}) => {
		return mutation.mutateAsync({ body, params })
	}

	return { ...mutation, trigger, triggerAsync }
}

const axiosGetTMDBID = async imdbID => {
	try {
		const res = await axios.get(
			`https://api.themoviedb.org/3/find/${imdbID}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
		)
		return res.data?.movie_results?.[0]?.id || null
	} catch {
		return null
	}
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

export function useGetMovieCovers(imdbID) {
	const [posters, setPosters] = useState([])
	const [backdrops, setBackdrops] = useState([])
	const [logos, setLogos] = useState([])

	useEffect(() => {
		let cancelled = false
		async function fetchImages() {
			setPosters([])
			setBackdrops([])
			setLogos([])
			if (!imdbID) return
			const tmdbID = await axiosGetTMDBID(imdbID)
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
	}, [imdbID])

	return { posters, backdrops, logos }
}

export const fetchFullMovie = async tmdbID => {
	const url = `https://api.themoviedb.org/3/movie/${tmdbID}?api_key=${TMDB_API_KEY}&append_to_response=credits,images,videos,release_dates,external_ids,keywords,reviews,similar,recommendations`
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
	})
}

const fetchFullPerson = async personID => {
	const url = `https://api.themoviedb.org/3/person/${personID}?api_key=${TMDB_API_KEY}&append_to_response=movie_credits,tv_credits,images,videos,external_ids`
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
