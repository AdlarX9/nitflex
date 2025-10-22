/**
 * Electron Main Process
 * Handles movie processing and IPC communication
 */

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const { transcodeVideo, checkFFmpeg } = require('./transcode')

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
 * Process a movie using local transcoding
 */
ipcMain.handle('process-movie', async (event, movie) => {
	const uploadsDir = path.join(__dirname, '../api/uploads')
	const videoPath = path.join(uploadsDir, movie.customTitle)

	// Check if video file exists
	if (!fs.existsSync(videoPath)) {
		return {
			success: false,
			error: `Video file not found: ${videoPath}`
		}
	}

	// Check if ffmpeg is available
	const hasFFmpeg = await checkFFmpeg()
	if (!hasFFmpeg) {
		return {
			success: false,
			error: 'ffmpeg not found. Please install ffmpeg to use local transcoding.'
		}
	}

	const taskId = movie.id || Date.now().toString()
	const outputFilename = `${path.parse(movie.customTitle).name}_transcoded.mp4`
	const outputPath = path.join(uploadsDir, outputFilename)

	return new Promise((resolve) => {
		const transcodeControl = transcodeVideo({
			inputPath: videoPath,
			outputPath: outputPath,
			onProgress: (progress) => {
				// Update task status
				processingTasks.set(taskId, {
					status: 'processing',
					progress: progress,
					movie: movie
				})

				// Send progress to renderer
				mainWindow?.webContents.send('processing-progress', {
					taskId,
					status: 'processing',
					progress: progress
				})
			},
			onComplete: (result) => {
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

				resolve({
					success: true,
					outputPath: result.outputPath,
					message: 'Transcoding completed successfully'
				})
			},
			onError: (error) => {
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

		// Store task with cancel control
		processingTasks.set(taskId, {
			status: 'processing',
			progress: 0,
			movie: movie,
			control: transcodeControl
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
