// eslint-disable-next-line
import { motion } from 'framer-motion'
import Header from './Header'
import Transport from './Transport'
import Timeline from './Timeline'
import Settings from './Settings'

const Controls = ({ logic }) => {
	return (
		<motion.div
			className='absolute inset-0 z-40 flex flex-col justify-between pointer-events-none'
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
		>
			<div className='pointer-events-auto'>
				<Header
					title={logic.meta.title}
					description={logic.meta.description}
					onExit={logic.goBack}
				/>
			</div>

			<div className='pointer-events-auto flex justify-center'>
				<Transport
					isPlaying={logic.isPlaying}
					onPlayPause={logic.togglePlay}
					onSeekBackward={() => logic.seek(-10)}
					onSeekForward={() => logic.seek(10)}
				/>
			</div>

			<div className='pointer-events-auto px-6 pb-8 md:px-12 md:pb-10 w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20'>
				<Timeline
					currentTime={logic.currentTime}
					duration={logic.duration}
					bufferedEnd={logic.bufferedEnd}
					hoverTime={logic.timeHover}
					onSeek={logic.setCurrentTime}
					onHover={logic.setTimeHover}
					onScrubStart={() => logic.setIsSeeking(true)}
					onScrubEnd={() => logic.setIsSeeking(false)}
				/>

				<div className='flex items-center justify-between mt-4'>
					{/* Left: Time info */}
					<div className='flex items-center gap-4 text-gray-300 font-medium'>
						<span>
							{formatTime(logic.currentTime)} / {formatTime(logic.duration)}
						</span>
						{logic.isBuffering && (
							<span className='text-xs uppercase tracking-wider text-amber-500 animate-pulse'>
								Buffering
							</span>
						)}
					</div>

					{/* Right: Settings & Fullscreen */}
					<div className='flex items-center gap-4'>
						<Settings logic={logic} />
						<button
							onClick={logic.toggleFullscreen}
							className='p-2 hover:bg-white/10 rounded-lg text-white transition'
							title='Plein écran'
						>
							{logic.isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
						</button>
					</div>
				</div>
			</div>
		</motion.div>
	)
}

// Utility local
const formatTime = t => {
	if (isNaN(t)) return '0:00'
	const h = Math.floor(t / 3600)
	const m = Math.floor((t % 3600) / 60)
	const s = Math.floor(t % 60)
	return h > 0
		? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
		: `${m}:${s.toString().padStart(2, '0')}`
}

export default Controls
