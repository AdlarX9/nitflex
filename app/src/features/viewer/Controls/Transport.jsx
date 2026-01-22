import { IoPlay, IoPause, IoPlayBack, IoPlayForward } from 'react-icons/io5'

const Transport = ({ isPlaying, onPlayPause, onSeekBackward, onSeekForward }) => (
	<div className='flex items-center gap-10 md:gap-16'>
		<button
			onClick={onSeekBackward}
			className='text-white/80 hover:text-white transition hover:scale-110 active:scale-95'
		>
			<IoPlayBack size={40} />
		</button>

		<button
			onClick={onPlayPause}
			className='w-20 h-20 md:w-24 md:h-24 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-xl'
		>
			{isPlaying ? (
				<IoPause size={40} className='ml-0.5' />
			) : (
				<IoPlay size={40} className='ml-1.5' />
			)}
		</button>

		<button
			onClick={onSeekForward}
			className='text-white/80 hover:text-white transition hover:scale-110 active:scale-95'
		>
			<IoPlayForward size={40} />
		</button>
	</div>
)
export default Transport
