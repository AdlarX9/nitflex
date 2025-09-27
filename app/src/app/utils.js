export const pickRandom = arr => {
	if (!arr || arr.length === 0) return null
	return arr[Math.floor(Math.random() * arr.length)]
}

// Fonction utilitaire pour compter les fréquences des couleurs
export const getMainColors = () => {
	return new Promise((resolve, reject) => {
		const img = document.querySelector('.main-backdrop')
		if (!img) {
			reject(new Error('Aucune image avec la classe "main-backdrop" trouvée dans le DOM.'))
			return
		}

		// Vérifie que l'image est chargée
		if (!img.complete) {
			img.onload = () => extractColors(img, resolve, reject)
			img.onerror = err => reject(err)
		} else {
			extractColors(img, resolve, reject)
		}
	})
}

function extractColors(img, resolve, reject) {
	try {
		const canvas = document.createElement('canvas')
		const ctx = canvas.getContext('2d')
		canvas.width = img.naturalWidth || img.width
		canvas.height = img.naturalHeight || img.height
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data

		const colorCount = {}
		for (let i = 0; i < imageData.length; i += 4) {
			const r = Math.round(imageData[i] / 32) * 32
			const g = Math.round(imageData[i + 1] / 32) * 32
			const b = Math.round(imageData[i + 2] / 32) * 32
			const key = `${r},${g},${b}`
			colorCount[key] = (colorCount[key] || 0) + 1
		}

		const sortedColors = Object.entries(colorCount)
			.sort((a, b) => b[1] - a[1])
			.map(([color]) => {
				const [r, g, b] = color.split(',').map(Number)
				return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
			})

		resolve({
			primary: sortedColors[0] || '#000000',
			secondary: sortedColors[1] || '#000000'
		})
	} catch (err) {
		reject(err)
	}
}

export const setExplorerColors = async () => {
	getMainColors()
		.then(({ primary, secondary }) => {
			document.body.style.setProperty('--explorer-primary', primary)
			document.body.style.setProperty('--explorer-secondary', secondary)
		})
		.catch(err => {
			console.error('Erreur lors de la récupération des couleurs principales :', err)
		})
}
