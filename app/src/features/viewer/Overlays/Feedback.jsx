// eslint-disable-next-line
import { motion } from 'framer-motion'

export const BufferingSpinner = () => (
	<motion.div
		className='absolute inset-0 flex items-center justify-center pointer-events-none z-30'
		initial={{ opacity: 0 }}
		animate={{ opacity: 1 }}
		exit={{ opacity: 0 }}
	>
		<div className='w-20 h-20 border-4 border-white/20 border-t-red-600 rounded-full animate-spin' />
	</motion.div>
)

export const SeekToast = ({ text }) => (
	<motion.div
		className='absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-1/1 z-40 pointer-events-none'
		initial={{ opacity: 0, scale: 0.8 }}
		animate={{ opacity: 1, scale: 1 }}
		exit={{ opacity: 0, scale: 0.9 }}
	>
		<div className='px-6 py-3 rounded-full bg-black/70 backdrop-blur-md text-white font-bold text-xl border border-white/10'>
			{text}
		</div>
	</motion.div>
)
