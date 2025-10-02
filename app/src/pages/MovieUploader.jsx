import { useEffect, useMemo, useState } from 'react'
import Uppy from '@uppy/core'
import XHRUpload from '@uppy/xhr-upload'
import fr_FR from '@uppy/locales/lib/fr_FR.js'
import { Dashboard } from '@uppy/react'
import '../../node_modules/@uppy/core/dist/style.css'
import '../../node_modules/@uppy/dashboard/dist/style.css'
import MovieSearch from '../components/MovieSearch'
import { Back } from '../components/NavBar'
import { useMainContext } from '../app/hooks'

const MovieUploader = () => {
	const { refetchNewMovies } = useMainContext()
	const [processingLocation, setProcessingLocation] = useState('server')
	const [isElectron, setIsElectron] = useState(false)

	// Check if running in Electron
	useEffect(() => {
		const checkElectron = () => {
			return typeof window !== 'undefined' && window.process && window.process.type
		}
		setIsElectron(checkElectron())
	}, [])

	const uppy = useMemo(() => {
		return new Uppy({
			restrictions: {
				maxFileSize: null, // Illimité
				allowedFileTypes: ['video/*'] // Accepter tous les types de fichiers
			},
			autoProceed: false // L'utilisateur doit cliquer pour démarrer l'upload
		})
	}, [])

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
			console.log('Upload terminé:', result.successful)

			// If local processing and Electron, trigger local processing
			if (isElectron && processingLocation === 'local' && result.successful?.length > 0) {
				const uploadedFile = result.successful[0]
				const response = uploadedFile.response?.body

				if (response?.movie && window.electronAPI?.processMovie) {
					console.log('Triggering local processing...')
					window.electronAPI
						.processMovie(response.movie)
						.then(processResult => {
							console.log('Local processing result:', processResult)
						})
						.catch(error => {
							console.error('Local processing failed:', error)
						})
				}
			}

			refetchNewMovies()
		})
	}, [uppy, refetchNewMovies, isElectron, processingLocation])

	const [customTitle, setCustomTitle] = useState('')
	const [tmdbID, setTmdbID] = useState(null)

	useEffect(() => {
		uppy.on('file-added', file => {
			uppy.setFileMeta(file.id, {
				customTitle,
				tmdbID,
				processingLocation
			})
		})
	}, [customTitle, uppy, tmdbID, processingLocation])

	const [newMovie, setNewMovie] = useState(null)

	useEffect(() => {
		if (newMovie) {
			console.log('newMovie', newMovie)

			setCustomTitle(newMovie.title)
			setTmdbID(newMovie.id)
		} else {
			setCustomTitle('')
			setTmdbID(null)
		}
	}, [newMovie])

	return (
		<div
			className={`w-screen h-dvh flex justify-center ${newMovie && 'items-center'} scrollable`}
		>
			<Back />
			<div className='flex items-center flex-col gap-5 w-full max-w-[750px] px-4'>
				<h1
					className={`text-5xl uppercase red font-bold text-center ${!newMovie && 'mt-[25vh]'}`}
				></h1>
				<main className='bg-gray-700 w-full p-4 rounded-md'>
					Identifier son film
					<MovieSearch onSelect={movie => setNewMovie(movie)} />
					{newMovie && (
						<>
							<div className='flex flex-col pt-5'>
								<label className='text-white'>Renommer le film</label>
								<input
									type='text'
									value={customTitle}
									onChange={e => setCustomTitle(e.target.value)}
									className='w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-800 text-white'
								/>
							</div>

							{/* Processing location option (Electron only) */}
							{isElectron && (
								<div className='flex flex-col pt-5'>
									<label className='text-white mb-2'>Lieu de traitement</label>
									<div className='flex gap-4'>
										<label className='flex items-center gap-2 text-white cursor-pointer'>
											<input
												type='radio'
												name='processingLocation'
												value='local'
												checked={processingLocation === 'local'}
												onChange={e =>
													setProcessingLocation(e.target.value)
												}
												className='accent-nitflex-red'
											/>
											<span>Local (cet ordinateur)</span>
										</label>
										<label className='flex items-center gap-2 text-white cursor-pointer'>
											<input
												type='radio'
												name='processingLocation'
												value='server'
												checked={processingLocation === 'server'}
												onChange={e =>
													setProcessingLocation(e.target.value)
												}
												className='accent-nitflex-red'
											/>
											<span>Serveur (API backend)</span>
										</label>
									</div>
									<p className='text-gray-400 text-sm mt-2'>
										{processingLocation === 'local'
											? "Le traitement sera effectué sur votre ordinateur après l'upload"
											: "Le traitement sera effectué sur le serveur après l'upload"}
									</p>
								</div>
							)}
						</>
					)}
				</main>
				{customTitle.length > 0 && (
					<div className='uppy-Root w-full'>
						<Dashboard
							uppy={uppy}
							height={400}
							width='100%'
							note='Sélectionner un film'
							theme='dark'
							showProgressDetails={true}
							lang='fr_FR'
							locale={fr_FR}
						/>
					</div>
				)}
			</div>
		</div>
	)
}

export default MovieUploader
