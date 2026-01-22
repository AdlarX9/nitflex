// eslint-disable-next-line
import { motion } from 'framer-motion'

export const Gradients = () => (
	<>
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className='pointer-events-none absolute inset-x-0 top-0 h-44 bg-linear-to-b from-black/90 to-transparent z-10'
		/>
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className='pointer-events-none absolute inset-x-0 bottom-0 h-60 bg-linear-to-t from-black/95 to-transparent z-10'
		/>
	</>
)
export default Gradients
