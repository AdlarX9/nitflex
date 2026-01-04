export const pickRandom = arr => {
	if (!arr || arr.length === 0) return null
	return arr[Math.floor(Math.random() * arr.length)]
}

export const interactStorage = (key, value = null) => {
	if (value === null) {
		return JSON.parse(localStorage.getItem(key))
	}
	localStorage.setItem(key, JSON.stringify(value))
}
