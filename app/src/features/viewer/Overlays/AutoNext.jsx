import { IoCloseCircleOutline } from 'react-icons/io5'

const AutoNext = ({ seconds, title, hasNext, onCancel, onAction }) => (
	<div className='absolute bottom-8 right-8 z-50 flex flex-col items-end gap-2'>
		<div className='bg-black/80 backdrop-blur-md text-white rounded-xl shadow-2xl p-5 max-w-sm border border-white/10'>
			<div className='flex items-start gap-4'>
				<div className='flex-1'>
					<p className='text-sm text-gray-300'>
						{hasNext ? 'Épisode suivant dans' : 'Fin de la lecture dans'} {seconds}s
					</p>
					<p className='font-bold text-lg mt-1 leading-tight'>{title}</p>
				</div>
				<button onClick={onCancel} className='text-gray-400 hover:text-white transition'>
					<IoCloseCircleOutline size={28} />
				</button>
			</div>
			<div className='mt-4 flex justify-end'>
				<button
					onClick={onAction}
					className='px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition'
				>
					{hasNext ? 'Lancer maintenant' : 'Quitter'}
				</button>
			</div>
		</div>
	</div>
)
export default AutoNext
