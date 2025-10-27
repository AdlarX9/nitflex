import { useEffect, useRef, useState } from 'react'
import { MainContext, useAPI, useAPIAfter } from './hooks'
import { useNavigate } from 'react-router-dom'
import { pickRandom } from './utils'

const interactStorage = (key, value = null) => {
	if (value === null) {
		return JSON.parse(localStorage.getItem(key))
	}
	localStorage.setItem(key, JSON.stringify(value))
}

export const MainProvider = ({ children }) => {
	const [user, setUser] = useState(interactStorage('user') || {})
	const [bodyBlur, setBodyBlur] = useState(false)
	const navigate = useNavigate()
	const { triggerAsync: fetchUser } = useAPIAfter('GET', '/users/' + user?.id)

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

	const { data: newMovies, isPending: newMoviesPending, refetch } = useAPI('GET', '/movies', {}, { limit: 20 })
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
				refetchUser
			}}
		>
			{children}
		</MainContext.Provider>
	)
}
