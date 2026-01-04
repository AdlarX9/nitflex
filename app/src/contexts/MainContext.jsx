import { useEffect, useMemo, useRef, useState } from 'react'
import { MainContext, useAPI, useAPIAfter } from '../utils/hooks'
import { useLocation, useNavigate } from 'react-router-dom'
import { interactStorage, pickRandom } from '../utils/utils'

export const MainProvider = ({ children }) => {
	const [user, setUser] = useState(interactStorage('user') || {})
	const [bodyBlur, setBodyBlur] = useState(false)
	const navigate = useNavigate()
	const { triggerAsync: fetchUser } = useAPIAfter('GET', '/users/' + user?.id)

	const location = useLocation()
	const stackRef = useRef([])

	useEffect(() => {
		const loc = {
			pathname: location.pathname,
			search: location.search,
			hash: location.hash,
			key: location.key
		}
		const arr = stackRef.current
		const last = arr[arr.length - 1]
		if (
			!last ||
			last.pathname !== loc.pathname ||
			last.search !== loc.search ||
			last.hash !== loc.hash
		) {
			arr.push(loc)
			if (arr.length > 30) arr.shift()
		}
	}, [location])

	const api = useMemo(() => {
		function findDeltaToLastNonPrefix(prefix = '/viewer') {
			const arr = stackRef.current
			if (arr.length === 0) return { delta: null, path: null }

			const prefixes = Array.isArray(prefix) ? prefix : [prefix]
			const isPrefixed = p => prefixes.some(pref => p.startsWith(pref))

			const currentIndex = arr.length - 1
			for (let i = currentIndex - 1; i >= 0; i--) {
				if (!isPrefixed(arr[i].pathname)) {
					return {
						delta: i - currentIndex,
						path: arr[i].pathname + (arr[i].search || '') + (arr[i].hash || '')
					}
				}
			}
			return { delta: null, path: '/explorer' } // fallback
		}
		return { stackRef, findDeltaToLastNonPrefix }
	}, [])

	useEffect(() => {
		if ((!user || JSON.stringify(user) === '{}') && window.location.pathname !== '/') {
			navigate('/')
		}
	}, [user, navigate])

	useEffect(() => {
		interactStorage('user', user)
	}, [user])

	useEffect(() => {
		if (bodyBlur) {
			document.body.style.setProperty('--body-sizing', 0.9)
			document.body.style.setProperty('--body-blur', '10px')
		} else {
			document.body.style.setProperty('--body-sizing', 1)
			document.body.style.setProperty('--body-blur', '0px')
		}
	}, [bodyBlur])

	const {
		data: newMovies,
		isPending: newMoviesPending,
		refetch
	} = useAPI('GET', '/movies', {}, { limit: 20 })
	const {
		data: newSeries,
		isPending: newSeriesPending,
		refetch: refetchSeries
	} = useAPI('GET', '/series', {}, { limit: 20 })

	// Utilise useRef pour garder le film principal sélectionné à l'initialisation et ne pas le changer lors de re-render
	const randomMovieRef = useRef(null)
	if (randomMovieRef.current === null && newMovies && newMovies.length > 0) {
		randomMovieRef.current = pickRandom(newMovies)
	}
	const mainMovie = randomMovieRef.current

	// Ne jamais changer mainBackdrop pendant la session (sauf reload fenêtre)
	const mainBackdropRef = useRef(null)
	const processMainBackdrop = backdrops => {
		if (mainBackdropRef.current === null && backdrops && backdrops.length > 0) {
			mainBackdropRef.current = pickRandom(backdrops)
		}
	}

	const refetchUser = () => {
		fetchUser().then(user => {
			if (user) setUser(user)
		})
	}

	return (
		<MainContext.Provider
			value={{
				user,
				setUser,
				setBodyBlur,
				pickRandom,
				newMovies,
				newMoviesPending,
				mainMovie,
				mainBackdropRef,
				processMainBackdrop,
				refetchNewMovies: refetch,
				newSeries,
				newSeriesPending,
				refetchNewSeries: refetchSeries,
				refetchUser,
				...api
			}}
		>
			{children}
		</MainContext.Provider>
	)
}
