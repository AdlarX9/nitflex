import { useEffect, useMemo, useState } from 'react'
import Uppy from '@uppy/core'
import XHRUpload from '@uppy/xhr-upload'
import fr_FR from '@uppy/locales/lib/fr_FR.js'
import { Dashboard } from '@uppy/react'
import '../../node_modules/@uppy/core/dist/style.css'
import '../../node_modules/@uppy/dashboard/dist/style.css'
import MovieSearch from '../components/MovieSearch'
import { Back } from '../components/NavBar'

const MovieUploader = () => {
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
			endpoint: import.meta.env.VITE_API + '/movies', // URL de l'API backend
			formData: true, // Utiliser FormData pour envoyer le fichier
			fieldName: 'file'
		})
		uppy.on('complete', result => {
			console.log('Upload terminé:', result.successful)
		})

		return () => uppy.destroy()
	}, [uppy])

	const [customTitle, setCustomTitle] = useState('')
	const [imdbID, setImdbID] = useState(null)

	useEffect(() => {
		uppy.on('file-added', file => {
			uppy.setFileMeta(file.id, { customTitle, imdbID })
		})
	}, [customTitle, uppy, imdbID])

	const [newMovie, setNewMovie] = useState(null)

	useEffect(() => {
		if (newMovie) {
			setCustomTitle(newMovie.Title)
			setImdbID(newMovie.imdbID)
		} else {
			setCustomTitle('')
			setImdbID(null)
		}
	}, [newMovie])

	return (
		<div className='w-screen h-dvh flex justify-center items-center scrollable'>
			<Back />
			<div className='flex justify-center items-center flex-col gap-5 w-full max-w-[750px] px-4'>
				<h1 className='text-5xl uppercase red font-bold text-center'>Uploader un film</h1>
				<main className='bg-gray-700 w-full p-4 rounded-md'>
					Identifier son film
					<MovieSearch onSelect={movie => setNewMovie(movie)} />
					{newMovie && (
						<div className='flex flex-col pt-5'>
							<label className='text-white'>Renommer le film</label>
							<input
								type='text'
								value={customTitle}
								onChange={e => setCustomTitle(e.target.value)}
								className='w-full px-4 py-2 border border-gray-300 rounded-md'
							/>
						</div>
					)}
				</main>
				{customTitle.length > 0 && (
					<div className='uppy-Root w-full'>
						<Dashboard
							uppy={uppy}
							proudlyDisplayPoweredByUppy={false}
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
