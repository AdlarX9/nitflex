// eslint-disable-next-line
import { motion } from 'framer-motion'
import { useState } from 'react'
import {
	IoPlay,
	IoPause,
	IoClose,
	IoPlayBack,
	IoPlayForward,
	IoTimeOutline,
	IoChevronDown
} from 'react-icons/io5'

const GradientVariants = {
	hide: {
		opacity: 0
	},
	show: {
		opacity: 1
	}
}

export const Gradients = () => (
	<>
		<motion.div
			className='pointer-events-none absolute inset-x-0 top-0 h-44 bg-linear-to-b from-black/90 to-transparent'
			variants={GradientVariants}
			initial='hide'
			animate='show'
			exit='hide'
		/>
		<motion.div
			className='pointer-events-none absolute inset-x-0 bottom-0 h-60 bg-linear-to-t from-black/95 to-transparent'
			variants={GradientVariants}
			initial='hide'
			animate='show'
			exit='hide'
		/>
	</>
)

export const DoubleTapZones = ({ onBack, onForward, onTap }) => (
	<>
		<div
			className='absolute inset-y-0 left-0 w-1/2'
			onDoubleClick={onBack}
			onTouchEnd={() => onTap?.('back')}
		/>
		<div
			className='absolute inset-y-0 right-0 w-1/2'
			onDoubleClick={onForward}
			onTouchEnd={() => onTap?.('forward')}
		/>
	</>
)

export const BufferingSpinner = () => (
	<motion.div
		className='absolute inset-0 flex items-center justify-center pointer-events-none z-30'
		initial={{ opacity: 0 }}
		animate={{ opacity: 1 }}
		exit={{ opacity: 0 }}
	>
		<div className='w-24 h-24 border-4 border-white/20 border-t-red-500 rounded-full animate-spin' />
	</motion.div>
)

export const SeekToastOverlay = ({ text }) => (
	<motion.div
		className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[50%] z-50 pointer-events-none'
		initial={{ opacity: 0, y: 24, scale: 0.9 }}
		animate={{ opacity: 1, y: 0, scale: 1 }}
		exit={{ opacity: 0, y: -12, scale: 0.95 }}
		transition={{ duration: 0.25 }}
	>
		<div className='px-5 py-2.5 rounded-full bg-black/75 backdrop-blur-md text-white text-lg font-bold border border-white/10 shadow-xl shadow-black'>
			{text}
		</div>
	</motion.div>
)

export const MetadataErrorOverlay = ({ message, onBack }) => (
	<motion.div
		className='absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-60 text-red-500 p-10'
		initial={{ opacity: 0 }}
		animate={{ opacity: 1 }}
		exit={{ opacity: 0 }}
	>
		<IoClose size={100} className='mb-8' />
		<h2 className='text-4xl font-bold mb-4'>Média introuvable</h2>
		<p className='text-gray-400 text-center max-w-xl mb-10 text-xl'>
			{message || 'Impossible de charger les informations.'}
		</p>
		<button
			onClick={onBack}
			className='px-10 py-5 rounded-2xl bg-red-600 text-white hover:bg-red-500 transition font-semibold text-lg'
		>
			Retour
		</button>
	</motion.div>
)

export const VideoErrorOverlay = ({ message, onRetry, onBack }) => (
	<motion.div
		className='absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-70 text-red-500 p-10'
		initial={{ opacity: 0 }}
		animate={{ opacity: 1 }}
		exit={{ opacity: 0 }}
	>
		<IoClose size={100} className='mb-8' />
		<h2 className='text-4xl font-bold mb-4'>Erreur de lecture</h2>
		<p className='text-gray-400 text-center max-w-xl mb-10 text-xl'>{message}</p>
		<div className='flex gap-6'>
			<button
				onClick={onRetry}
				className='px-10 py-5 rounded-2xl bg-gray-700 text-white hover:bg-gray-600 transition font-semibold text-lg'
			>
				Réessayer
			</button>
			<button
				onClick={onBack}
				className='px-10 py-5 rounded-2xl bg-red-600 text-white hover:bg-red-500 transition font-semibold text-lg'
			>
				Retour
			</button>
		</div>
	</motion.div>
)

const MenuButton = ({ label, value, onClick }) => (
	<button
		onClick={onClick}
		className='px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-200 inline-flex items-center gap-1'
		title={label}
	>
		<span className='opacity-80'>{label}:</span>
		<strong className='text-white'>{value}</strong>
		<IoChevronDown className='opacity-70' />
	</button>
)

const Dropdown = ({ open, anchor = 'right', children }) => {
	if (!open) return null
	return (
		<div className={`absolute bottom-14 ${anchor === 'right' ? 'right-0' : 'left-0'} z-50`}>
			<div className='rounded-xl bg-black/85 backdrop-blur-md border border-white/10 shadow-xl min-w-[220px] p-2'>
				{children}
			</div>
		</div>
	)
}

const DropdownItem = ({ active = false, onClick, children }) => (
	<button
		onClick={onClick}
		className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
			active ? 'bg-red-600/30 text-white' : 'text-gray-200 hover:bg-white/10'
		}`}
	>
		{children}
	</button>
)

export const ControlsOverlay = ({
	title,
	description,
	paused,
	onExit,
	onPlayPause,
	onSeekBack,
	onSeekForward,
	// progress
	timeHover,
	formatTime,
	currentTime,
	duration,
	progressBackground,
	onProgressChange,
	onRangeMouseMove,
	onRangeLeave,
	onTouchStart,
	onTouchMove,
	onTouchEnd,
	remaining,
	isBuffering,
	// advanced
	playbackRate,
	setPlaybackRate,
	isHls,
	qualityLevels,
	currentLevel,
	onSelectLevel,
	audioTracks,
	audioTrack,
	onSelectAudio,
	subtitleTracks,
	subtitleTrack,
	onSelectSubtitle
}) => {
	// local dropdown states
	const [openQuality, setOpenQuality] = useState(false)
	const [openSpeed, setOpenSpeed] = useState(false)
	const [openSubs, setOpenSubs] = useState(false)
	const [openAudio, setOpenAudio] = useState(false)

	const rateLabel = `${playbackRate}x`
	const qualityLabel = isHls
		? currentLevel === -1
			? 'Auto'
			: qualityLevels.find(l => l.index === currentLevel)?.name || 'Qualité'
		: 'Qualité'
	const audioLabel = isHls
		? audioTracks.find(a => a.index === audioTrack)?.name || 'Audio'
		: 'Audio'
	const subsLabel = isHls
		? subtitleTrack === -1
			? 'Sous-titres: off'
			: subtitleTracks.find(s => s.index === subtitleTrack)?.name || 'Sous-titres'
		: 'Sous-titres'

	// close all when one opens
	const closeAll = () => {
		setOpenAudio(false)
		setOpenQuality(false)
		setOpenSpeed(false)
		setOpenSubs(false)
	}

	return (
		<motion.div
			className='absolute inset-0 z-40 flex flex-col justify-between pointer-events-none'
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.25 }}
		>
			{/* Top */}
			<div className='flex items-start justify-between px-10 pt-10 pointer-events-auto'>
				<button
					onClick={onExit}
					className='rounded-full p-4 bg-black/65 hover:bg-black/80 transition text-white border border-white/10'
					title='Retour'
				>
					<IoClose size={40} />
				</button>
				<div className='flex flex-col max-w-[55%] items-end text-right gap-2'>
					{title && (
						<motion.h1
							className='text-white font-bold text-3xl md:text-4xl leading-tight'
							initial={{ y: -10, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
						>
							{title}
						</motion.h1>
					)}
					{description && (
						<motion.p
							className='text-gray-300 text-lg md:text-xl line-clamp-2'
							initial={{ y: -8, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
						>
							{description}
						</motion.p>
					)}
				</div>
			</div>

			{/* Centre */}
			<div className='flex items-center justify-center gap-[14vw] md:gap-32 pointer-events-auto'>
				<button
					onClick={onSeekBack}
					className='rounded-full p-6 bg-black/55 hover:bg-black/70 transition text-white border border-white/10'
					title='Reculer 10 s'
				>
					<IoPlayBack className='w-15 h-auto' />
				</button>
				<button
					onClick={onPlayPause}
					className='rounded-full p-8 bg-black/60 hover:bg-black/75 transition text-white border border-white/10 shadow-2xl'
					title={paused ? 'Lecture' : 'Pause'}
				>
					{paused ? (
						<IoPlay className='w-20 h-auto' />
					) : (
						<IoPause className='w-20 h-auto' />
					)}
				</button>
				<button
					onClick={onSeekForward}
					className='rounded-full p-6 bg-black/55 hover:bg-black/70 transition text-white border border-white/10'
					title='Avancer 10 s'
				>
					<IoPlayForward className='w-15 h-auto' />
				</button>
			</div>

			{/* Bas */}
			<div className='relative w-full px-10 pb-12 pointer-events-auto'>
				{timeHover != null && (
					<div
						className='absolute -top-8 left-0 translate-x-[-50%] px-4 py-2 rounded-xl bg-black/80 text-white text-sm font-semibold border border-white/10'
						style={{
							transform: `translateX(calc(${(timeHover / (duration || 1)) * 100}% - 50%))`
						}}
					>
						{formatTime(timeHover)}
					</div>
				)}

				<div className='flex items-center gap-5 mb-5'>
					<span className='text-gray-200 font-mono text-base md:text-xl min-w-[62px] text-right'>
						{formatTime(currentTime)}
					</span>
					<div className='flex-1 relative'>
						<input
							type='range'
							min={0}
							max={duration || 0}
							step={0.1}
							value={currentTime}
							onChange={onProgressChange}
							onMouseMove={onRangeMouseMove}
							onMouseLeave={onRangeLeave}
							onTouchStart={onTouchStart}
							onTouchMove={onTouchMove}
							onTouchEnd={onTouchEnd}
							className='w-full h-2 rounded appearance-none cursor-pointer flex items-center'
							style={{ background: progressBackground, outline: 'none' }}
						/>
					</div>
					<span className='text-gray-200 font-mono text-base md:text-xl min-w-[62px]'>
						{formatTime(duration)}
					</span>
				</div>

				<div className='flex items-center justify-between text-gray-300 text-base md:text-lg relative'>
					<div className='flex items-center gap-6 flex-wrap'>
						<div className='flex items-center gap-3'>
							<IoTimeOutline className='text-3xl' />
							<span className='font-mono text-lg'>
								-{formatTime(remaining > 0 ? remaining : 0)}
							</span>
						</div>
						{isBuffering && (
							<span className='text-amber-300 animate-pulse font-semibold'>
								Buffering…
							</span>
						)}
					</div>

					{/* Advanced controls menus */}
					<div className='flex items-center gap-3 relative'>
						{/* Speed */}
						<div className='relative'>
							<MenuButton
								label='Vitesse'
								value={rateLabel}
								onClick={() => (closeAll(), setOpenSpeed(v => !v))}
							/>
							<Dropdown open={openSpeed}>
								{[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3].map(r => (
									<DropdownItem
										key={r}
										active={r === playbackRate}
										onClick={() => {
											setPlaybackRate(r)
											setOpenSpeed(false)
										}}
									>
										{r}x
									</DropdownItem>
								))}
							</Dropdown>
						</div>

						{/* Quality (HLS only) */}
						<div className='relative'>
							<MenuButton
								label='Qualité'
								value={qualityLabel}
								onClick={() => (closeAll(), setOpenQuality(v => !v))}
							/>
							<Dropdown open={openQuality}>
								<DropdownItem
									active={currentLevel === -1}
									onClick={() => {
										onSelectLevel?.(-1)
										setOpenQuality(false)
									}}
								>
									Auto
								</DropdownItem>
								{qualityLevels
									?.slice()
									.sort((a, b) => (b.height || 0) - (a.height || 0))
									.map(l => (
										<DropdownItem
											key={l.index}
											active={currentLevel === l.index}
											onClick={() => {
												onSelectLevel?.(l.index)
												setOpenQuality(false)
											}}
										>
											{l.name}{' '}
											{l.bitrate
												? `• ${(l.bitrate / 1000).toFixed(0)} kbps`
												: ''}
										</DropdownItem>
									))}
								{!isHls && (
									<div className='px-3 py-2 text-xs text-gray-400'>
										Qualité fixe (source progressive)
									</div>
								)}
							</Dropdown>
						</div>

						{/* Audio tracks (HLS only) */}
						<div className='relative'>
							<MenuButton
								label='Audio'
								value={audioLabel}
								onClick={() => (closeAll(), setOpenAudio(v => !v))}
							/>
							<Dropdown open={openAudio}>
								{audioTracks?.length ? (
									audioTracks.map(a => (
										<DropdownItem
											key={a.index}
											active={audioTrack === a.index}
											onClick={() => {
												onSelectAudio?.(a.index)
												setOpenAudio(false)
											}}
										>
											{a.name} {a.lang ? `(${a.lang})` : ''}
										</DropdownItem>
									))
								) : (
									<div className='px-3 py-2 text-xs text-gray-400'>
										Aucune autre piste
									</div>
								)}
							</Dropdown>
						</div>

						{/* Subtitles (HLS only) */}
						<div className='relative'>
							<MenuButton
								label='Sous-titres'
								value={subsLabel}
								onClick={() => (closeAll(), setOpenSubs(v => !v))}
							/>
							<Dropdown open={openSubs}>
								<DropdownItem
									active={subtitleTrack === -1}
									onClick={() => {
										onSelectSubtitle?.(-1)
										setOpenSubs(false)
									}}
								>
									Off
								</DropdownItem>
								{subtitleTracks?.length ? (
									subtitleTracks.map(s => (
										<DropdownItem
											key={s.index}
											active={subtitleTrack === s.index}
											onClick={() => {
												onSelectSubtitle?.(s.index)
												setOpenSubs(false)
											}}
										>
											{s.name} {s.lang ? `(${s.lang})` : ''}
										</DropdownItem>
									))
								) : (
									<div className='px-3 py-2 text-xs text-gray-400'>
										Aucun sous-titre
									</div>
								)}
							</Dropdown>
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	)
}
