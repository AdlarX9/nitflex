import { useRef } from 'react'

const DoubleTapZones = ({ onBack, onForward, onTap }) => {
	// Références pour éviter les conflits
	const lastTapLeft = useRef(0)
	const lastTapRight = useRef(0)

	const handleDoubleTap = (side, action) => {
		const now = Date.now()
		const lastTap = side === 'left' ? lastTapLeft : lastTapRight

		if (now - lastTap.current < 300) {
			action()
			if (onTap) onTap(side === 'left' ? 'back' : 'forward')
		}

		lastTap.current = now
	}

	return (
		<>
			{/* Zone Gauche (Reculer) */}
			<div
				className='absolute inset-y-0 left-0 w-[40%] z-20 cursor-pointer'
				// Gestion Desktop
				onDoubleClick={onBack}
				// Gestion Mobile (Touch)
				onTouchEnd={() => {
					// Empêche le clic de traverser si besoin, ou juste detecte le tap
					// e.preventDefault() // Attention, peut bloquer les clics UI si mal placé
					handleDoubleTap('left', onBack)
				}}
			/>

			{/* Zone Droite (Avancer) */}
			<div
				className='absolute inset-y-0 right-0 w-[40%] z-20 cursor-pointer'
				onDoubleClick={onForward}
				onTouchEnd={() => handleDoubleTap('right', onForward)}
			/>
		</>
	)
}

export default DoubleTapZones
