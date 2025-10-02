/**
 * Movie Processing Utility
 * Handles local video processing in Electron app
 */

import { spawn } from 'child_process'
import path from 'path'

/**
 * Process a movie locally using the Python script
 * @param {Object} movie - Movie metadata
 * @param {string} videoPath - Path to the video file
 * @param {string} outputDir - Output directory for processed file
 * @returns {Promise<Object>} Processing result
 */
export async function processMovieLocally(movie, videoPath, outputDir) {
	return new Promise((resolve, reject) => {
		const scriptPath = path.join(__dirname, '../../../scripts/transform_movie.py')
		const movieJson = JSON.stringify({
			...movie,
			video_path: videoPath,
			customTitle: movie.customTitle
		})

		const args = [scriptPath, movieJson]
		if (outputDir) {
			args.push('--output-dir', outputDir)
		}

		console.log('Starting local processing:', args)

		const pythonProcess = spawn('python3', args)
		let stdout = ''
		let stderr = ''

		pythonProcess.stdout.on('data', data => {
			const output = data.toString()
			stdout += output
			console.log('[Python]', output)
		})

		pythonProcess.stderr.on('data', data => {
			const output = data.toString()
			stderr += output
			console.error('[Python Error]', output)
		})

		pythonProcess.on('close', code => {
			if (code === 0) {
				try {
					// Try to parse JSON output
					const result = JSON.parse(stdout.trim())
					resolve(result)
				} catch (e) {
					// Fallback if not JSON
					resolve({
						success: true,
						output: stdout,
						message: 'Processing completed'
					})
				}
			} else {
				reject({
					success: false,
					error: `Process exited with code ${code}`,
					stderr: stderr,
					stdout: stdout
				})
			}
		})

		pythonProcess.on('error', err => {
			reject({
				success: false,
				error: err.message,
				stderr: stderr
			})
		})
	})
}

/**
 * Check if required dependencies are installed
 * @returns {Promise<boolean>}
 */
export async function checkDependencies() {
	return new Promise((resolve, reject) => {
		const scriptPath = path.join(__dirname, '../../../scripts/transform_movie.py')
		const pythonProcess = spawn('python3', [scriptPath, '--check-deps'])

		pythonProcess.on('close', code => {
			resolve(code === 0)
		})

		pythonProcess.on('error', () => {
			resolve(false)
		})
	})
}

/**
 * Handle upload complete event
 * If processing location is local, trigger local processing
 */
export async function handleUploadComplete(result, processingLocation) {
	if (processingLocation === 'local' && result.successful && result.successful.length > 0) {
		const uploadedFile = result.successful[0]
		const response = uploadedFile.response?.body

		if (response && response.movie) {
			try {
				console.log('Starting local processing for:', response.movie.title)
				const videoPath = path.join(
					process.cwd(),
					'api',
					'uploads',
					response.movie.customTitle
				)

				const processResult = await processMovieLocally(
					response.movie,
					videoPath,
					path.join(process.cwd(), 'api', 'uploads')
				)

				console.log('Local processing completed:', processResult)
				return {
					success: true,
					...processResult
				}
			} catch (error) {
				console.error('Local processing failed:', error)
				return {
					success: false,
					error: error.message || 'Processing failed'
				}
			}
		}
	}

	return { success: true, message: 'Upload completed, server will process' }
}
