import { useEffect, useState } from 'react'
import { MainContext } from './hooks'
import { useNavigate } from 'react-router-dom'

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

	const selectLastOngoingMovie = () => {
		if (user?.onGoingMovies?.length > 0) {
			return user.onGoingMovies[0]
		} else {
			return null
		}
	}

	const pickRandom = arr => {
		if (!arr || arr.length === 0) return null
		return arr[Math.floor(Math.random() * arr.length)]
	}

	return (
		<MainContext.Provider
			value={{ user, setUser, setBodyBlur, selectLastOngoingMovie, pickRandom }}
		>
			{children}
		</MainContext.Provider>
	)
}
