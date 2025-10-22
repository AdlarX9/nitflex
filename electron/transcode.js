/**
 * Electron Local Transcoding Module
 * Handles ffmpeg-based video transcoding with hardware acceleration
 */

const { spawn } = require('child_process')
const os = require('os')
const path = require('path')

/**
 * Get hardware acceleration arguments based on platform
 */
function getHWAccelArgs() {
	const platform = os.platform()
	
	switch (platform) {
		case 'darwin':
			// macOS - VideoToolbox
			return {
				input: [],
				codec: 'h264_videotoolbox',
				extra: []
			}
		case 'win32':
			// Windows - NVENC (if available)
			return {
				input: ['-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda'],
				codec: 'h264_nvenc',
				extra: ['-preset', 'fast']
			}
		case 'linux':
			// Linux - VAAPI (if available)
			return {
				input: ['-hwaccel', 'vaapi', '-hwaccel_device', '/dev/dri/renderD128'],
				codec: 'h264_vaapi',
				extra: []
			}
		default:
			// Fallback to software encoding
			return {
				input: [],
				codec: 'libx264',
				extra: ['-preset', 'veryfast', '-crf', '21']
			}
	}
}

/**
 * Transcode video with progress updates
 * @param {Object} options - Transcoding options
 * @param {string} options.inputPath - Input video path
 * @param {string} options.outputPath - Output video path
 * @param {Function} options.onProgress - Progress callback (0-100)
 * @param {Function} options.onComplete - Completion callback
 * @param {Function} options.onError - Error callback
 * @returns {Object} - Control object with cancel method
 */
function transcodeVideo(options) {
	const { inputPath, outputPath, onProgress, onComplete, onError } = options
	
	const hwaccel = getHWAccelArgs()
	
	// Build ffmpeg arguments
	const args = [
		'-y', // Overwrite output
		...hwaccel.input,
		'-i', inputPath,
		'-c:v', hwaccel.codec,
		'-profile:v', 'high',
		'-level:v', '4.1',
		...hwaccel.extra,
		'-c:a', 'aac',
		'-b:a', '160k',
		'-ac', '2', // Stereo
		'-movflags', '+faststart',
		'-f', 'mp4',
		'-progress', 'pipe:2', // Progress to stderr
		outputPath
	]
	
	console.log('ffmpeg command:', 'ffmpeg', args.join(' '))
	
	const ffmpegProcess = spawn('ffmpeg', args)
	let duration = 0
	let stderr = ''
	
	ffmpegProcess.stderr.on('data', data => {
		const output = data.toString()
		stderr += output
		
		// Extract duration
		const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/)
		if (durationMatch && duration === 0) {
			const hours = parseInt(durationMatch[1])
			const minutes = parseInt(durationMatch[2])
			const seconds = parseFloat(durationMatch[3])
			duration = hours * 3600 + minutes * 60 + seconds
		}
		
		// Extract current time
		const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/)
		if (timeMatch && duration > 0) {
			const hours = parseInt(timeMatch[1])
			const minutes = parseInt(timeMatch[2])
			const seconds = parseFloat(timeMatch[3])
			const currentTime = hours * 3600 + minutes * 60 + seconds
			
			const progress = Math.min(100, (currentTime / duration) * 100)
			if (onProgress) {
				onProgress(progress)
			}
		}
	})
	
	ffmpegProcess.on('close', code => {
		if (code === 0) {
			if (onProgress) onProgress(100)
			if (onComplete) onComplete({ success: true, outputPath })
		} else {
			if (onError) {
				onError({
					success: false,
					error: `ffmpeg exited with code ${code}`,
					stderr
				})
			}
		}
	})
	
	ffmpegProcess.on('error', err => {
		if (onError) {
			onError({
				success: false,
				error: err.message
			})
		}
	})
	
	// Return control object
	return {
		cancel: () => {
			ffmpegProcess.kill('SIGTERM')
		},
		process: ffmpegProcess
	}
}

/**
 * Check if ffmpeg is available
 */
function checkFFmpeg() {
	return new Promise((resolve) => {
		const ffmpeg = spawn('ffmpeg', ['-version'])
		ffmpeg.on('close', code => {
			resolve(code === 0)
		})
		ffmpeg.on('error', () => {
			resolve(false)
		})
	})
}

module.exports = {
	transcodeVideo,
	checkFFmpeg,
	getHWAccelArgs
}
