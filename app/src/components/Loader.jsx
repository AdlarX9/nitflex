import './style.scss'
/* eslint-disable-next-line */
import { motion } from 'framer-motion'

const Loader = ({ exit }) => {
	return (
		<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={exit}>
			<div className='loader'></div>
		</motion.div>
	)
}

export default Loader
