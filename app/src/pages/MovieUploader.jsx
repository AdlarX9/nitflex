import { useEffect, useMemo, useState } from 'react'
import Uppy from '@uppy/core'
import XHRUpload from '@uppy/xhr-upload'
import fr_FR from '@uppy/locales/lib/fr_FR.js'
import { Dashboard } from '@uppy/react'
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion'
import '../../node_modules/@uppy/core/dist/style.css'
import '../../node_modules/@uppy/dashboard/dist/style.css'
import MovieSearch from '../components/MovieSearch'
import { Back } from '../components/NavBar'
import { useMainContext } from '../app/hooks'

/**
 * Animations ajoutées (Framer Motion) sans modifier la fonction ni la structure :
 * - Fade + slight upscale d'entrée globale
 * - Titre avec reveal (clip-path) + glow pulsé subtil
 * - Main card : fade/slide
 * - Section "après sélection" apparition douce + stagger
 * - Dashboard Uppy : scale + drop-in
 * - Radio options & input renom : hover / tap scaling & focus ring animé
 * - Arrière-plan : léger gradient animé (motion.div overlay)
 */

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: { duration: 0.45, ease: [0.25, 0.8, 0.4, 1] }
	}
}

const titleVariants = {
	hidden: { opacity: 0, y: 30, scale: 0.98, filter: 'blur(6px)' },
	visible: {
		opacity: 1,
		y: 0,
		scale: 1,
		filter: 'blur(0px)',
		transition: {
			duration: 0.75,
			ease: [0.16, 1, 0.3, 1]
		}
	}
}

const cardVariants = {
	hidden: { opacity: 0, y: 28, scale: 0.97 },
	visible: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
	}
}

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

const glowPulse = {
	animate: {
		filter: [
			'drop-shadow(0 0 0px rgba(229,0,36,0.0))',
			'drop-shadow(0 0 18px rgba(229,0,36,0.35))',
			'drop-shadow(0 0 0px rgba(229,0,36,0.0))'
		],
		transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' }
	}
}

const MovieUploader = () => {
	const { refetchNewMovies } = useMainContext()
	const [processingLocation, setProcessingLocation] = useState('server')
	const [isElectron, setIsElectron] = useState(false)

	useEffect(() => {
		const checkElectron = () =>
			typeof window !== 'undefined' && window.process && window.process.type
		setIsElectron(checkElectron())
	}, [])

	const uppy = useMemo(
		() =>
			new Uppy({
				restrictions: {
					maxFileSize: null,
					allowedFileTypes: ['video/*']
				},
				autoProceed: false
			}),
		[]
	)

	useEffect(() => {
		uppy.use(XHRUpload, {
			endpoint: import.meta.env.VITE_API + '/movies',
			formData: true,
			fieldName: 'file'
		})
		return () => uppy.destroy()
	}, [uppy, refetchNewMovies])

	useEffect(() => {
		uppy.on('complete', result => {
			if (isElectron && processingLocation === 'local' && result.successful?.length > 0) {
				const uploadedFile = result.successful[0]
				const response = uploadedFile.response?.body
				if (response?.movie && window.electronAPI?.processMovie) {
					window.electronAPI
						.processMovie(response.movie)
						.then(r => console.log('Local processing result:', r))
						.catch(err => console.error('Local processing failed:', err))
				}
			}
			refetchNewMovies()
		})
	}, [uppy, refetchNewMovies, isElectron, processingLocation])

	const [customTitle, setCustomTitle] = useState('')
	const [tmdbID, setTmdbID] = useState(null)
	const [newMovie, setNewMovie] = useState(null)

	useEffect(() => {
		uppy.on('file-added', file => {
			uppy.setFileMeta(file.id, {
				customTitle,
				tmdbID,
				processingLocation
			})
		})
	}, [customTitle, uppy, tmdbID, processingLocation])

	useEffect(() => {
		if (newMovie) {
			setCustomTitle(newMovie.title)
			setTmdbID(newMovie.id)
		} else {
			setCustomTitle('')
			setTmdbID(null)
		}
	}, [newMovie])

	return (
		<motion.div
			className={`w-screen h-dvh flex justify-center ${newMovie && 'items-center'} scrollable relative`}
			variants={containerVariants}
			initial='hidden'
			animate='visible'
		>
			<Back />

			{/* Background animation overlay */}
			<motion.div aria-hidden className='pointer-events-none absolute inset-0 -z-10'>
				<motion.div
					className='absolute inset-0'
					style={{
						background:
							'radial-gradient(circle at 30% 22%, rgba(255,255,255,0.08), rgba(0,0,0,0) 60%)'
					}}
					animate={{
						scale: [1, 1.08, 1],
						opacity: [0.65, 0.85, 0.65]
					}}
					transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
				/>
				<div
					className='absolute inset-0 opacity-[0.15] mix-blend-overlay'
					style={{
						backgroundImage:
							'repeating-linear-gradient(0deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_3px)'
					}}
				/>
				<motion.div
					className='absolute inset-0'
					animate={{
						backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
					}}
					style={{
						background: 'linear-gradient(140deg,#020305 0%,#0d1117 55%,#111 100%)',
						backgroundSize: '200% 200%'
					}}
					transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
				/>
			</motion.div>

			<div className='flex items-center flex-col gap-8 w-full max-w-[860px] px-6 pb-20'>
				<motion.h1
					className={`text-[2.8rem] md:text-[3.6rem] font-extrabold tracking-tight text-center bg-gradient-to-r from-red-500 via-red-400 to-red-700 bg-clip-text text-transparent ${
						!newMovie && 'mt-[10vh]'
					}`}
					variants={titleVariants}
					{...glowPulse}
				>
					Importer un film
				</motion.h1>

				<motion.main
					className='w-full rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.02))] backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] p-6 md:p-8 flex flex-col gap-5 text-gray-100 relative z-1'
					variants={cardVariants}
				>
					<p className='text-2xl font-semibold tracking-wide uppercase text-gray-200'>
						Identifier le film
					</p>

					<div>
						<MovieSearch onSelect={movie => setNewMovie(movie)} />
					</div>

					<AnimatePresence mode='wait'>
						{newMovie && (
							<motion.div
								className='flex flex-col gap-6'
								initial='hidden'
								animate='visible'
								exit='hidden'
							>
								{/* Renommage */}
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
										whileFocus={{
											boxShadow: '0 0 0 4px rgba(229,9,20,0.25)'
										}}
										id='customTitle'
										type='text'
										value={customTitle}
										onChange={e => setCustomTitle(e.target.value)}
										placeholder='Titre personnalisé…'
										className='w-full px-5 py-4 rounded-xl bg-gray-900/60 border border-white/10 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30 outline-none text-lg md:text-xl font-medium placeholder:text-gray-500 transition'
									/>
								</motion.div>

								{/* Lieu de traitement */}
								{isElectron && (
									<motion.div
										className='flex flex-col pt-2 gap-4'
										variants={afterSelectVariants}
										custom={1}
									>
										<label className='text-lg md:text-xl font-semibold uppercase tracking-wide text-gray-200'>
											Lieu de traitement
										</label>
										<motion.div
											className='flex flex-wrap gap-6'
											variants={afterSelectVariants}
											custom={2}
										>
											<motion.label
												whileHover={{ scale: 1.03 }}
												whileTap={{ scale: 0.97 }}
												className='flex items-center gap-3 text-base md:text-lg text-gray-100 cursor-pointer group'
											>
												<input
													type='radio'
													name='processingLocation'
													value='local'
													checked={processingLocation === 'local'}
													onChange={e =>
														setProcessingLocation(e.target.value)
													}
													className='accent-red-600 scale-125'
												/>
												<span className='px-4 py-2 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/10 transition font-medium'>
													Local (ordinateur)
												</span>
											</motion.label>
											<motion.label
												whileHover={{ scale: 1.03 }}
												whileTap={{ scale: 0.97 }}
												className='flex items-center gap-3 text-base md:text-lg text-gray-100 cursor-pointer group'
											>
												<input
													type='radio'
													name='processingLocation'
													value='server'
													checked={processingLocation === 'server'}
													onChange={e =>
														setProcessingLocation(e.target.value)
													}
													className='accent-red-600 scale-125'
												/>
												<span className='px-4 py-2 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/10 transition font-medium'>
													Serveur (API)
												</span>
											</motion.label>
										</motion.div>
										<motion.p
											className='text-gray-400 text-sm md:text-base mt-1 leading-snug'
											variants={afterSelectVariants}
											custom={3}
										>
											{processingLocation === 'local'
												? "Le traitement se lancera sur votre machine après l'upload."
												: "Le traitement sera réalisé côté serveur après l'upload."}
										</motion.p>
									</motion.div>
								)}
							</motion.div>
						)}
					</AnimatePresence>
				</motion.main>

				<AnimatePresence>
					{customTitle.length > 0 && (
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
								note='Sélectionner un fichier vidéo'
								theme='dark'
								showProgressDetails={true}
								lang='fr_FR'
								locale={fr_FR}
							/>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	)
}

export default MovieUploader
