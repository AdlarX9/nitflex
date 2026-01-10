import { useEffect } from 'react'
import fr_FR from '@uppy/locales/lib/fr_FR.js'
import Dashboard from '@uppy/react/dashboard'
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion'
import { useUppyContext } from '../../../utils/hooks.js'
import MediaSearch from '../MediaSearch.jsx'

const MovieUploader = ({ onSelectionChange }) => {
	const {
		uppy,
		newMovie,
		setNewMovie,
		customTitle,
		setCustomTitle,
		setTmdbID,
		setSelectedSeries
	} = useUppyContext()

	useEffect(() => {
		setNewMovie(null)
		setSelectedSeries(null)
	}, [setNewMovie, setSelectedSeries])

	useEffect(() => {
		if (newMovie) {
			setCustomTitle(newMovie.title)
			setTmdbID(newMovie.id)
			onSelectionChange?.(true)
		} else {
			setCustomTitle('')
			setTmdbID(null)
			onSelectionChange?.(false)
		}
	}, [newMovie, onSelectionChange, setCustomTitle, setTmdbID])

	const canUpload = customTitle.length > 0

	return (
		<>
			<div>
				<MediaSearch type="movies" onSelect={movie => setNewMovie(movie)} />
			</div>

			<AnimatePresence mode='wait'>
				{newMovie && (
					<motion.div
						className='flex flex-col gap-6'
						initial='hidden'
						animate='visible'
						exit='hidden'
					>
						{/* Rename movie */}
						<motion.div
							className='flex flex-col gap-1 pt-4'
							variants={afterSelectVariants}
							custom={0}
						>
							<label
								htmlFor='customTitle'
								className='text-lg md:text-xl font-semibold tracking-wide text-gray-200'
							>
								Renommer le film
							</label>
							<motion.input
								whileFocus={{ boxShadow: '0 0 0 4px rgba(229,9,20,0.25)' }}
								id='customTitle'
								type='text'
								value={customTitle}
								onChange={e => setCustomTitle(e.target.value)}
								placeholder='Titre personnalisé…'
								className='w-full px-5 py-4 rounded-xl bg-gray-900/60 border border-white/10 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30 outline-none text-lg md:text-xl font-medium placeholder:text-gray-500 transition'
							/>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Affiche le Dashboard seulement si le plugin XHRUpload est prêt */}
			<AnimatePresence>
				{canUpload && (
					<motion.div
						key='dashboard'
						className='uppy-Root w-full rounded-2xl overflow-hidden border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] backdrop-blur-xl shadow-[0_10px_35px_-10px_rgba(0,0,0,0.55)] z-0'
						variants={dashboardVariants}
						initial='hidden'
						animate='visible'
						exit='exit'
						layout
					>
						<Dashboard
							uppy={uppy}
							height={430}
							width='100%'
							note='Sélectionner un ou plusieurs fichiers vidéo'
							theme='dark'
							showProgressDetails={true}
							lang='fr_FR'
							locale={fr_FR}
							proudlyDisplayPoweredByUppy={false}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	)
}

export default MovieUploader

const afterSelectVariants = {
	hidden: { opacity: 0, y: 24 },
	visible: (i = 0) => ({
		opacity: 1,
		y: 0,
		transition: {
			delay: 0.08 * i,
			duration: 0.5,
			ease: [0.22, 1, 0.36, 1]
		}
	})
}

const dashboardVariants = {
	hidden: { opacity: 0, y: 40, scale: 0.96 },
	visible: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: { duration: 0.55, ease: [0.25, 0.8, 0.4, 1] }
	},
	exit: {
		opacity: 0,
		y: 30,
		scale: 0.97,
		transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
	}
}
