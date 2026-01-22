import { useState } from 'react'
import { IoSettingsSharp, IoCheckmark, IoChevronForward } from 'react-icons/io5'

const Settings = ({ logic }) => {
	const [isOpen, setIsOpen] = useState(false)
	const [activeTab, setActiveTab] = useState('main') // main, quality, speed, audio, subs

	if (!isOpen) {
		return (
			<button
				onClick={() => setIsOpen(true)}
				className='p-2 hover:bg-white/10 rounded-full text-white transition rotate-0 hover:rotate-90'
				title='Paramètres'
			>
				<IoSettingsSharp size={24} />
			</button>
		)
	}

	return (
		<div className='relative'>
			{/* Backdrop invisible pour fermer en cliquant à côté */}
			<div className='fixed inset-0 z-40' onClick={() => setIsOpen(false)} />

			<div className='absolute bottom-12 right-0 w-72 max-h-96 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 p-2 flex flex-col'>
				{activeTab === 'main' && (
					<div className='flex flex-col animate-in fade-in slide-in-from-right-4 duration-200'>
						<MenuRow
							label='Vitesse'
							value={`${logic.playbackRate}x`}
							onClick={() => setActiveTab('speed')}
						/>
						{logic.isHls && (
							<>
								<div className='h-px bg-white/10 my-1 mx-2' />
								<MenuRow
									label='Qualité'
									value={
										logic.currentLevel === -1
											? 'Auto'
											: logic.levels[logic.currentLevel]?.name
									}
									onClick={() => setActiveTab('quality')}
								/>
								<MenuRow
									label='Audio'
									value={
										logic.audioTracks[logic.audioTrack]?.name ||
										(logic.audioTracks.length > 0
											? `Piste ${logic.audioTrack + 1}`
											: 'Défaut')
									}
									onClick={() => setActiveTab('audio')}
								/>
								<MenuRow
									label='Sous-titres'
									value={
										logic.subtitleTrack === -1
											? 'Désactivé'
											: logic.subtitleTracks[logic.subtitleTrack]?.name ||
											  `Piste ${logic.subtitleTrack + 1}`
									}
									onClick={() => setActiveTab('subs')}
								/>
							</>
						)}
					</div>
				)}

				{activeTab === 'speed' && (
					<SubMenu
						title='Vitesse de lecture'
						onBack={() => setActiveTab('main')}
						items={[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => ({
							label: `${r}x`,
							active: logic.playbackRate === r,
							onClick: () => {
								logic.setPlaybackRate(r)
								setIsOpen(false)
							}
						}))}
					/>
				)}

				{activeTab === 'quality' && (
					<SubMenu
						title='Qualité vidéo'
						onBack={() => setActiveTab('main')}
						items={[
							{
								label: 'Auto',
								active: logic.currentLevel === -1,
								onClick: () => {
									logic.setLevel(-1)
									setIsOpen(false)
								}
							},
							...logic.levels.map(l => ({
								label: l.name,
								active: logic.currentLevel === l.index,
								onClick: () => {
									logic.setLevel(l.index)
									setIsOpen(false)
								}
							}))
						]}
					/>
				)}

				{activeTab === 'audio' && (
					<SubMenu
						title='Pistes Audio'
						onBack={() => setActiveTab('main')}
						items={logic.audioTracks.map(t => ({
							label: t.name || t.lang || `Piste ${t.index + 1}`,
							active: logic.audioTrack === t.index,
							onClick: () => {
								logic.setAudio(t.index)
								setIsOpen(false)
							}
						}))}
						emptyMessage='Aucune autre piste audio'
					/>
				)}

				{activeTab === 'subs' && (
					<SubMenu
						title='Sous-titres'
						onBack={() => setActiveTab('main')}
						items={[
							{
								label: 'Désactivé',
								active: logic.subtitleTrack === -1,
								onClick: () => {
									logic.setSubtitle(-1)
									setIsOpen(false)
								}
							},
							...logic.subtitleTracks.map(t => ({
								label: t.name || t.lang || `Sous-titre ${t.index + 1}`,
								active: logic.subtitleTrack === t.index,
								onClick: () => {
									logic.setSubtitle(t.index)
									setIsOpen(false)
								}
							}))
						]}
					/>
				)}
			</div>
		</div>
	)
}

// --- Helper Components ---

const MenuRow = ({ label, value, onClick }) => (
	<button
		onClick={onClick}
		className='flex items-center justify-between w-full p-3 hover:bg-white/10 rounded-lg text-sm text-white transition group'
	>
		<span className='font-medium'>{label}</span>
		<div className='flex items-center gap-1 text-gray-400 group-hover:text-white transition'>
			<span className='max-w-[100px] truncate text-right'>{value}</span>
			<IoChevronForward />
		</div>
	</button>
)

const SubMenu = ({ title, onBack, items, emptyMessage }) => (
	<div className='flex flex-col h-full animate-in fade-in slide-in-from-right-10 duration-200'>
		<div className='flex items-center border-b border-white/10 pb-2 mb-2'>
			<button
				onClick={onBack}
				className='p-2 -ml-2 hover:bg-white/10 rounded-full text-white transition'
			>
				<IoChevronForward className='rotate-180' />
			</button>
			<span className='font-semibold text-2xl text-white ml-2'>{title}</span>
		</div>

		<div className='overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2'>
			{items && items.length > 0 ? (
				items.map((item, i) => (
					<button
						key={i}
						onClick={item.onClick}
						className='flex items-center gap-3 w-full p-2.5 hover:bg-white/10 rounded-lg text-sm text-white text-left transition'
					>
						<div className='w-5 flex justify-center'>
							{item.active && <IoCheckmark className='text-red-600 text-lg' />}
						</div>
						<span>{item.label}</span>
					</button>
				))
			) : (
				<div className='text-gray-500 text-sm text-center py-4 italic'>
					{emptyMessage || 'Aucune option disponible'}
				</div>
			)}
		</div>
	</div>
)

export default Settings
