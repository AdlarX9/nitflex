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
	const [bodySizing, setBodySizing] = useState(1)
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
		document.body.style.setProperty('--body-sizing', bodySizing)
	}, [bodySizing])

	return (
		<MainContext.Provider
			value={{ user, setUser, onGoingMovies, setOnGoingMovies, setBodySizing }}
		>
			{children}
		</MainContext.Provider>
	)
}
