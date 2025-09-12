/* eslint-disable-next-line */
import { motion } from 'framer-motion'

const Button = ({ children }) => {
	return (
		<motion.div
			className='lighten cursor-pointer bg-white/20 rounded-full p-1 border-1 border-white/25 flex items-center justify-center'
			style={{ backdropFilter: 'blur(5px)' }}
			whileTap={{ scale: 0.95 }}
			transition={{ duration: 0.01 }}
		>
			{children}
		</motion.div>
	)
}

export default Button
