import { useEffect, useMemo, useRef, useState } from 'react'
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
			endpoint: 'http://localhost:8080/upload', // URL de l'API backend
			formData: true, // Utiliser FormData pour envoyer le fichier
			fieldName: 'file', // Nom du champ correspondant au fichier
			getResponseData: responseText => {
				// Analyser la réponse manuellement si elle n'est pas en JSON
				return {
					url: responseText // Supposons que le serveur retourne une URL brute
				}
			}
		})

		uppy.on('complete', result => {
			console.log('Upload terminé:', result.successful)
			alert('Upload réussi !')
		})

		return () => uppy.destroy()
	}, [uppy])

	const [newMovie, setNewMovie] = useState(null)
	const movieNameRef = useRef('')

	useEffect(() => {
		if (newMovie) {
			console.log(newMovie)
		}
	}, [newMovie])

	return (
		<div className='w-screen h-dvh flex justify-center items-center scrollable'>
			<Back />
			<div className='flex justify-center items-center flex-col gap-5'>
				<h1 className='text-5xl uppercase red font-bold'>Uploader un film</h1>
				<main className='bg-gray-700 w-[100%] p-4 rounded-md'>
					Identifier son film
					<MovieSearch onSelect={movie => setNewMovie(movie)} />
					{newMovie && (
						<>
							<label className='text-white'>Renommer le film</label>
							<input type='text' ref={movieNameRef} defaultValue={newMovie.Title} />
						</>
					)}
				</main>
				<div className='uppy-Root'>
					<Dashboard
						uppy={uppy}
						proudlyDisplayPoweredByUppy={false}
						height={400}
						note='Sélectionner un film'
						theme='dark'
						showProgressDetails={true}
						lang='fr_FR'
						locale={fr_FR}
					/>
				</div>
			</div>
		</div>
	)
}

export default MovieUploader
