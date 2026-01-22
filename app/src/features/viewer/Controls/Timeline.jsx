const Timeline = ({
	currentTime,
	duration,
	bufferedEnd,
	hoverTime,
	onSeek,
	onHover,
	onScrubStart,
	onScrubEnd
}) => {
	const progressPercent = duration ? (currentTime / duration) * 100 : 0
	const bufferPercent = duration ? (bufferedEnd / duration) * 100 : 0
	const hoverPercent = duration && hoverTime ? (hoverTime / duration) * 100 : 0

	return (
		<div className='relative w-full group h-4 flex items-center cursor-pointer'>
			{/* Hover Popup */}
			{hoverTime !== null && (
				<div
					className='absolute bottom-8 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded border border-white/20'
					style={{ left: `${hoverPercent}%` }}
				>
					{formatTime(hoverTime)}
				</div>
			)}

			{/* Background Track */}
			<div className='absolute w-full h-1 bg-white/20 rounded-full group-hover:h-1.5 transition-all overflow-hidden'>
				{/* Buffer */}
				<div
					className='absolute h-full bg-white/30'
					style={{ width: `${bufferPercent}%` }}
				/>
				{/* Progress */}
				<div
					className='absolute h-full bg-red-600'
					style={{ width: `${progressPercent}%` }}
				/>
			</div>

			{/* Handle (visible on hover) */}
			<div
				className='absolute w-4 h-4 bg-red-600 rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform'
				style={{ left: `calc(${progressPercent}% - 8px)` }}
			/>

			{/* Actual Input for interaction */}
			<input
				type='range'
				min={0}
				max={duration || 100}
				step={0.1}
				value={currentTime}
				onChange={e => onSeek(parseFloat(e.target.value))}
				onMouseDown={onScrubStart}
				onMouseUp={onScrubEnd}
				onTouchStart={onScrubStart}
				onTouchEnd={onScrubEnd}
				onMouseMove={e => {
					const rect = e.target.getBoundingClientRect()
					const pos = (e.clientX - rect.left) / rect.width
					onHover(pos * duration)
				}}
				onMouseLeave={() => onHover(null)}
				className='absolute w-full h-full opacity-0 cursor-pointer z-10'
			/>
		</div>
	)
}

const formatTime = t => {
	if (!t) return '0:00'
	const m = Math.floor(t / 60)
	const s = Math.floor(t % 60)
	return `${m}:${s < 10 ? '0' : ''}${s}`
}

export default Timeline