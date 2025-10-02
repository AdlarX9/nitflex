/**
 * Electron Preload Script
 * Exposes safe APIs to the renderer process
 */

const { contextBridge, ipcRenderer } = require('electron')
const path = require('path')

contextBridge.exposeInMainWorld('electronAPI', {
	/**
	 * Check if running in Electron
	 */
	isElectron: true,

	/**
	 * Process a movie locally
	 * @param {Object} movie - Movie metadata
	 * @returns {Promise<Object>} Processing result
	 */
	processMovie: async movie => {
		return await ipcRenderer.invoke('process-movie', movie)
	},

	/**
	 * Check if processing dependencies are installed
	 * @returns {Promise<boolean>}
	 */
	checkDependencies: async () => {
		return await ipcRenderer.invoke('check-dependencies')
	},

	/**
	 * Get processing progress
	 * @param {string} movieId - Movie ID
	 * @returns {Promise<Object>} Progress info
	 */
	getProcessingProgress: async movieId => {
		return await ipcRenderer.invoke('get-processing-progress', movieId)
	},

	/**
	 * Listen to processing progress updates
	 * @param {Function} callback - Callback function
	 */
	onProcessingProgress: callback => {
		ipcRenderer.on('processing-progress', (event, data) => callback(data))
	},

	/**
	 * Remove processing progress listener
	 */
	removeProcessingProgressListener: () => {
		ipcRenderer.removeAllListeners('processing-progress')
	}
})
