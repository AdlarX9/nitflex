export const pickRandom = arr => {
	if (!arr || arr.length === 0) return null
	return arr[Math.floor(Math.random() * arr.length)]
}
