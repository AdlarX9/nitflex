import { useEffect, useMemo } from 'react'
import Uppy from '@uppy/core'
import XHRUpload from '@uppy/xhr-upload'
import fr_FR from '@uppy/locales/lib/fr_FR.js'
import { Dashboard } from '@uppy/react'
import '../../node_modules/@uppy/core/dist/style.css'
import '../../node_modules/@uppy/dashboard/dist/style.css'
import MovieSearch from '../components/MovieSearch'

const MovieUploader = () => {
	const uppy = useMemo(() => {
		return new Uppy({
			restrictions: {
				maxNumberOfFiles: 1,
				allowedFileTypes: ['video/*'],
				maxFileSize: 40 * 1024 * 1024 * 1024 // 40 Go
			},
			autoProceed: false
		})
			.use(XHRUpload, {
				endpoint: '/movies/upload_chunk',
				fieldName: 'chunk',
				formData: true,
				bundle: false, // chunked!
				headers: {
					// Optionnel
				},
				limit: 2 // Nombre d'uploads simultanés
			})
			.on('complete', result => {
				console.log('résultat des courses :', result)
			})
	}, [])

	useEffect(() => {
		return () => uppy.destroy()
	}, [uppy])

	return (
		<div className='w-screen h-svh flex justify-center items-center scrollable'>
			<div className='flex justify-center items-center flex-col gap-5'>
				<h1 className='text-5xl uppercase red font-bold'>Uploader un film</h1>
				<main className='bg-gray-700 w-[100%] p-4 rounded-md'>
					Identifier son film
					<MovieSearch />
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
