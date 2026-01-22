import { AnimatePresence } from 'framer-motion'
import Loader from '../../ui/Loader'
import { useViewerLogic } from './useViewerLogic'
import VideoPlayer from './VideoPlayer'
import Controls from './Controls'
import {
	Gradients,
	BufferingSpinner,
	SeekToast,
	MetadataError,
	VideoError,
	AutoNext,
	DoubleTapZones
} from './Overlays'

const Viewer = () => {
	const logic = useViewerLogic()

	const surfaceClick = e => {
		// Ignore clicks on controls
		if (e.target.closest('button') || e.target.closest('input')) return
		logic.setControlsVisible(v => !v)
		if (logic.isPlaying) logic.scheduleHide()
	}

	if (logic.isPending) {
		return (
			<div className='fixed inset-0 bg-black flex flex-col items-center justify-center z-50'>
				<Loader />
				<p className='text-white mt-4'>Chargement...</p>
			</div>
		)
	}

	if (logic.isError) {
		return <MetadataError message={logic.errorMessage} onBack={logic.goBack} />
	}

	return (
		<div
			ref={logic.wrapperRef}
			className='fixed inset-0 h-dvh bg-black select-none overflow-hidden group'
			onClick={surfaceClick}
		>
			<VideoPlayer
				ref={logic.videoRef}
				poster={logic.meta.poster}
				onError={e => console.error(e)}
			/>

			{/* UI Layers */}
			<AnimatePresence>
				{logic.controlsVisible && <Gradients key='gradients' />}
				{logic.isBuffering && <BufferingSpinner key='buffering' />}
				{logic.seekToast && <SeekToast text={logic.seekToast} key='toast' />}
				{logic.videoError && (
					<VideoError
						message={logic.videoError}
						onRetry={() => window.location.reload()}
						onBack={logic.goBack}
						key='video-error'
					/>
				)}
				{logic.controlsVisible && !logic.videoError && (
					<Controls logic={logic} key='controls' />
				)}
			</AnimatePresence>

			{/* Invisible interaction layers */}
			<DoubleTapZones
				onBack={() => logic.seek(-10)}
				onForward={() => logic.seek(10)}
				onTap={logic.handleZoneTap}
			/>

			{logic.autoNextVisible && (
				<AutoNext
					seconds={logic.autoNextCountdown}
					title={logic.meta.nextTitle}
					hasNext={logic.meta.hasNext}
					onCancel={logic.cancelAutoNext}
					onAction={logic.performAutoAction}
				/>
			)}
		</div>
	)
}

export default Viewer
