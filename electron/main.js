/**
 * Electron Main Process
 * Handles movie processing and IPC communication
 */

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

let mainWindow

// Processing tasks registry
const processingTasks = new Map()

/**
 * Create the main window
 */
function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: false,
			contextIsolation: true
		}
	})

	// Load the app
	if (process.env.NODE_ENV === 'development') {
		mainWindow.loadURL('http://localhost:5173')
		mainWindow.webContents.openDevTools()
	} else {
		mainWindow.loadFile(path.join(__dirname, '../app/dist/index.html'))
	}
}

/**
 * Process a movie using the Python script
 */
ipcMain.handle('process-movie', async (event, movie) => {
	const scriptPath = path.join(__dirname, '../scripts/transform_movie.py')
	const uploadsDir = path.join(__dirname, '../api/uploads')
	const videoPath = path.join(uploadsDir, movie.customTitle)

	// Check if video file exists
	if (!fs.existsSync(videoPath)) {
		return {
			success: false,
			error: `Video file not found: ${videoPath}`
		}
	}

	const movieJson = JSON.stringify({
		...movie,
		video_path: videoPath,
		customTitle: movie.customTitle
	})

	return new Promise((resolve, reject) => {
		const args = [scriptPath, movieJson, '--output-dir', uploadsDir]
		const pythonProcess = spawn('python3', args)

		let stdout = ''
		let stderr = ''
		const taskId = movie.id || Date.now().toString()

		// Store task
		processingTasks.set(taskId, {
			status: 'processing',
			progress: 0,
			movie: movie
		})

		pythonProcess.stdout.on('data', data => {
			const output = data.toString()
			stdout += output
			console.log('[Python]', output)

			// Send progress update to renderer
			mainWindow?.webContents.send('processing-progress', {
				taskId,
				status: 'processing',
				output: output
			})
		})

		pythonProcess.stderr.on('data', data => {
			const output = data.toString()
			stderr += output
			console.error('[Python Error]', output)
		})

		pythonProcess.on('close', code => {
			if (code === 0) {
				try {
					const result = JSON.parse(stdout.trim())
					processingTasks.set(taskId, {
						status: 'completed',
						progress: 100,
						result
					})

					mainWindow?.webContents.send('processing-progress', {
						taskId,
						status: 'completed',
						result
					})

					resolve(result)
				} catch (e) {
					const result = {
						success: true,
						output: stdout,
						message: 'Processing completed'
					}
					processingTasks.set(taskId, {
						status: 'completed',
						progress: 100,
						result
					})
					resolve(result)
				}
			} else {
				const error = {
					success: false,
					error: `Process exited with code ${code}`,
					stderr: stderr,
					stdout: stdout
				}

				processingTasks.set(taskId, {
					status: 'error',
					error
				})

				mainWindow?.webContents.send('processing-progress', {
					taskId,
					status: 'error',
					error
				})

				resolve(error)
			}
		})

		pythonProcess.on('error', err => {
			const error = {
				success: false,
				error: err.message
			}

			processingTasks.set(taskId, {
				status: 'error',
				error
			})

			resolve(error)
		})
	})
})

/**
 * Check if dependencies are installed
 */
ipcMain.handle('check-dependencies', async () => {
	const scriptPath = path.join(__dirname, '../scripts/transform_movie.py')

	return new Promise(resolve => {
		const pythonProcess = spawn('python3', [scriptPath, '--check-deps'])

		pythonProcess.on('close', code => {
			resolve(code === 0)
		})

		pythonProcess.on('error', () => {
			resolve(false)
		})
	})
})

/**
 * Get processing progress for a task
 */
ipcMain.handle('get-processing-progress', async (event, taskId) => {
	return processingTasks.get(taskId) || null
})

// App lifecycle
app.whenReady().then(() => {
	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})
