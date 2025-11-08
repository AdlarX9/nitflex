import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'

export default function TranscodeOptions({
	files = [],
	transcodeMode,
	setTranscodeMode,
	onChange,
	apiBase = import.meta.env.VITE_API,
	isElectron,
	className = ''
}) {
	const [probing, setProbing] = useState(false)
	const [error, setError] = useState('')
	const [audioTracks, setAudioTracks] = useState([])
	const [subtitleTracks, setSubtitleTracks] = useState([])
	const [selectedAudio, setSelectedAudio] = useState([])
	const [selectedSubs, setSelectedSubs] = useState([])

	const firstFile = useMemo(() => (Array.isArray(files) && files.length > 0 ? files[0] : null), [files])

	useEffect(() => {
		setAudioTracks([])
		setSubtitleTracks([])
		setSelectedAudio([])
		setSelectedSubs([])
		setError('')
		if (!firstFile || !firstFile.data) return
		let cancelled = false
		;(async () => {
			try {
				setProbing(true)
				const fd = new FormData()
				const file = firstFile.data
				const name = file.name || firstFile.name || 'input'
				fd.append('file', file, name)
				const res = await fetch(`${apiBase}/probe_streams`, { method: 'POST', body: fd })
				if (!res.ok) throw new Error('probe failed')
				const data = await res.json()
				if (cancelled) return
				setAudioTracks(Array.isArray(data?.audio) ? data.audio : [])
				setSubtitleTracks(Array.isArray(data?.subtitles) ? data.subtitles : [])
				const defaultAud = (data?.audio || []).map((_, i) => i).slice(0, 1)
				setSelectedAudio(defaultAud)
				setSelectedSubs([])
				onChange?.({ audioStreams: defaultAud, subtitleStreams: [] })
			} catch {
				setError('Impossible d\'analyser les pistes du fichier.')
			} finally {
				setProbing(false)
			}
		})()
		return () => {
			cancelled = true
		}
	}, [firstFile, apiBase, onChange])

	useEffect(() => {
		onChange?.({ audioStreams: selectedAudio, subtitleStreams: selectedSubs })
	}, [selectedAudio, selectedSubs, onChange])

	const toggleAll = (type, checked) => {
		if (type === 'audio') setSelectedAudio(checked ? audioTracks.map((_, i) => i) : [])
		if (type === 'subs') setSelectedSubs(checked ? subtitleTracks.map((_, i) => i) : [])
	}

	return (
		<motion.div className={`flex flex-col pt-2 gap-4 ${className || ''}`}>
			<label className='text-lg md:text-xl font-semibold uppercase tracking-wide text-gray-200'>
				Transcodage
			</label>
			<div className='flex flex-wrap gap-4'>
				<motion.label whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className='flex items-center gap-3 text-base text-gray-100 cursor-pointer group'>
					<input
						type='radio'
						name='transcodeMode'
						value='none'
						checked={transcodeMode === 'none'}
						onChange={e => setTranscodeMode?.(e.target.value)}
						className='accent-red-600 scale-125'
					/>
					<span className='px-4 py-2 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/10 transition font-medium'>
						Aucun
					</span>
				</motion.label>
				<motion.label whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className='flex items-center gap-3 text-base text-gray-100 cursor-pointer group'>
					<input
						type='radio'
						name='transcodeMode'
						value='server'
						checked={transcodeMode === 'server'}
						onChange={e => setTranscodeMode?.(e.target.value)}
						className='accent-red-600 scale-125'
					/>
					<span className='px-4 py-2 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/10 transition font-medium'>
						Serveur
					</span>
				</motion.label>
				{isElectron && (
					<motion.label whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className='flex items-center gap-3 text-base text-gray-100 cursor-pointer group'>
						<input
							type='radio'
							name='transcodeMode'
							value='local'
							checked={transcodeMode === 'local'}
							onChange={e => setTranscodeMode?.(e.target.value)}
							className='accent-red-600 scale-125'
						/>
						<span className='px-4 py-2 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/10 transition font-medium'>
							Local
						</span>
					</motion.label>
				)}
			</div>
			{transcodeMode !== 'none' && (
				<div className='grid gap-4 md:grid-cols-2'>
					<div className='p-3 rounded-xl bg-gray-900/50 border border-white/10'>
						<div className='flex items-center justify-between mb-2'>
							<p className='text-sm uppercase tracking-wide text-gray-300 font-semibold'>Pistes audio</p>
							<label className='text-sm text-gray-300 inline-flex items-center gap-2'>
								<input type='checkbox' onChange={e => toggleAll('audio', e.target.checked)} />
								Tout
							</label>
						</div>
						<div className='flex flex-col gap-2 max-h-52 overflow-auto pr-1'>
							{probing && <div className='text-gray-400 text-sm'>Analyse…</div>}
							{!probing && audioTracks.length === 0 && <div className='text-gray-500 text-sm'>Aucune piste détectée</div>}
							{audioTracks.map((t, i) => {
								const id = `a_${i}`
								const checked = selectedAudio.includes(i)
								const label = `A${i + 1} • ${t.lang || 'und'} • ${t.codec || ''} ${t.channels ? `• ${t.channels}ch` : ''} ${t.title ? `• ${t.title}` : ''}`
								return (
									<label key={id} htmlFor={id} className='flex items-center gap-2 text-sm text-gray-200'>
										<input id={id} type='checkbox' checked={checked} onChange={e => {
											setSelectedAudio(prev => (e.target.checked ? [...prev, i] : prev.filter(x => x !== i)))
										}} />
										<span className='truncate'>{label}</span>
									</label>
								)
							})}
						</div>
					</div>
					<div className='p-3 rounded-xl bg-gray-900/50 border border-white/10'>
						<div className='flex items-center justify-between mb-2'>
							<p className='text-sm uppercase tracking-wide text-gray-300 font-semibold'>Sous-titres</p>
							<label className='text-sm text-gray-300 inline-flex items-center gap-2'>
								<input type='checkbox' onChange={e => toggleAll('subs', e.target.checked)} />
								Tout
							</label>
						</div>
						<div className='flex flex-col gap-2 max-h-52 overflow-auto pr-1'>
							{probing && <div className='text-gray-400 text-sm'>Analyse…</div>}
							{!probing && subtitleTracks.length === 0 && <div className='text-gray-500 text-sm'>Aucun sous-titre</div>}
							{subtitleTracks.map((t, i) => {
								const id = `s_${i}`
								const checked = selectedSubs.includes(i)
								const label = `S${i + 1} • ${t.lang || 'und'} • ${t.codec || ''} ${t.title ? `• ${t.title}` : ''}`
								return (
									<label key={id} htmlFor={id} className='flex items-center gap-2 text-sm text-gray-200'>
										<input id={id} type='checkbox' checked={checked} onChange={e => {
											setSelectedSubs(prev => (e.target.checked ? [...prev, i] : prev.filter(x => x !== i)))
										}} />
										<span className='truncate'>{label}</span>
									</label>
								)
							})}
						</div>
					</div>
				</div>
			)}
			{error && <div className='text-red-500 text-sm'>{error}</div>}
		</motion.div>
	)
}
