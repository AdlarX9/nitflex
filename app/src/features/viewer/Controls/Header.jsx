import { IoArrowBack, IoClose } from 'react-icons/io5'

const Header = ({ title, description, onExit }) => (
	<div className='flex items-start justify-between p-6 md:p-10'>
		<button
			onClick={onExit}
			className='p-3 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur text-white border border-white/10 transition group'
		>
			<IoArrowBack size={28} className='group-hover:-translate-x-1 transition' />
		</button>
		<div className='text-right max-w-2xl'>
			<h1 className='text-white text-2xl md:text-4xl font-bold drop-shadow-md'>{title}</h1>
			{description && (
				<p className='text-gray-300 text-sm md:text-lg mt-2 line-clamp-2 drop-shadow-sm'>
					{description}
				</p>
			)}
		</div>
	</div>
)
export default Header
