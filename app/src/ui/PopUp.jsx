/* eslint-disable-next-line */
import { motion } from 'framer-motion'
import { useMainContext } from '../utils/hooks'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const PopUp = ({ children, close, className }) => {
	const { setBodyBlur } = useMainContext()
	const [opacity, setOpacity] = useState(1)

	useEffect(() => {
		setBodyBlur(true)
		return () => setBodyBlur(false)
	}, [setBodyBlur])

	// handler pour fermer si clic sur le backdrop (fond)
	const handleBackdropClick = event => {
		if (event.target === event.currentTarget) {
			setOpacity(0)
			setBodyBlur(false)
			setTimeout(() => {
				close()
			}, 200)
		}
	}

	return (
		<>
			{createPortal(
				<motion.div
					className='h-screen w-screen fixed top-0 left-0 flex items-center justify-center'
					initial={{ backdropFilter: 'blur(0)' }}
					animate={{ backdropFilter: 'blur(5px)' }}
					onClick={handleBackdropClick}
					style={{ opacity, transition: 'opacity 0.2s ease' }}
				>
					<motion.section
						initial={{ opacity: 0, filter: 'blur(10px)' }}
						animate={{ opacity: 1, filter: 'blur(0px)' }}
						className={`bg-gray-800 rounded-md border border-gray-300 max-w-5/6 ${className}`}
					>
						{children}
					</motion.section>
				</motion.div>,
				document.body
			)}
		</>
	)
}

export default PopUp
