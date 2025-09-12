import { useEffect, useState } from 'react'
import { MainContext } from '../hooks/hooks'
import { useNavigate } from 'react-router-dom'

const interactStorage = (key, value = null) => {
	if (value === null) {
		return JSON.parse(localStorage.getItem(key))
	}
	localStorage.setItem(key, JSON.stringify(value))
}

export const MainProvider = ({ children }) => {
	const [user, setUser] = useState(interactStorage('user'))
	const [onGoingMovies, setOnGoingMovies] = useState(null)
	const [bodyBlur, setBodyBlur] = useState(false)
	const navigate = useNavigate()

	useEffect(() => {
		if (!user && window.location.pathname !== '/') {
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

	return (
		<MainContext.Provider
			value={{ user, setUser, onGoingMovies, setOnGoingMovies, setBodyBlur }}
		>
			{children}
		</MainContext.Provider>
	)
}
