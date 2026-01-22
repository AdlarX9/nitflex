import { IoClose } from 'react-icons/io5'
// eslint-disable-next-line
import { motion } from 'framer-motion'

const ErrorBase = ({ title, message, children }) => (
	<motion.div
		className='absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-8'
		initial={{ opacity: 0 }}
		animate={{ opacity: 1 }}
		exit={{ opacity: 0 }}
	>
		<IoClose size={80} className='text-red-600 mb-6' />
		<h2 className='text-3xl font-bold text-white mb-2'>{title}</h2>
		<p className='text-gray-400 text-center max-w-lg mb-8 text-lg'>{message}</p>
		<div className='flex gap-4'>{children}</div>
	</motion.div>
)

export const MetadataError = ({ message, onBack }) => (
	<ErrorBase title='Média introuvable' message={message}>
		<button
			onClick={onBack}
			className='px-8 py-3 bg-red-600 rounded-xl text-white font-semibold hover:bg-red-700'
		>
			Retour
		</button>
	</ErrorBase>
)

export const VideoError = ({ message, onRetry, onBack }) => (
	<ErrorBase title='Erreur de lecture' message={message}>
		<button
			onClick={onRetry}
			className='px-6 py-3 bg-gray-700 rounded-xl text-white font-semibold hover:bg-gray-600'
		>
			Réessayer
		</button>
		<button
			onClick={onBack}
			className='px-6 py-3 bg-red-600 rounded-xl text-white font-semibold hover:bg-red-700'
		>
			Quitter
		</button>
	</ErrorBase>
)
