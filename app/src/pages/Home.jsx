import Nitflex from '/images/nitflex.png'
import { useAPI, useAPIAfter, useMainContext } from '../app/hooks'
import { Link, useNavigate } from 'react-router-dom'
import Person from '/images/person-circle-fill.svg'
import Plus from '/images/plus-circle-fill.svg'
import Loader from '../components/Loader'
import PopUp from '../components/PopUp'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IoCloudUploadOutline, IoPersonCircle } from 'react-icons/io5'
import { motion } from 'framer-motion'

const Account = ({ user, index }) => {
	const navigate = useNavigate()
	const { setUser } = useMainContext()
	const [isHovered, setIsHovered] = useState(false)

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: index * 0.1 }}
			className='flex flex-col items-center'
		>
			<motion.button
				whileHover={{ scale: 1.1 }}
				whileTap={{ scale: 0.95 }}
				className='bg-gray-700 flex flex-col items-center rounded-xl p-4 cursor-pointer border-2 border-transparent hover:border-nitflex-red transition-all shadow-lg hover:shadow-xl'
				onClick={() => {
					navigate('/explorer')
					setUser(user)
				}}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				<motion.div
					animate={{ rotateY: isHovered ? 360 : 0 }}
					transition={{ duration: 0.6 }}
				>
					<img src={Person} alt='User Avatar' className='w-20 h-20' />
				</motion.div>
			</motion.button>
			<p className='mt-2 text-xl font-medium text-white'>{user.name || '-'}</p>
		</motion.div>
	)
}

const Accounts = () => {
	const [clicked, setClicked] = useState(false)
	const [isCreating, setIsCreating] = useState(false)
	const { refetch, data, isPending } = useAPI('GET', '/users')
	const { triggerAsync } = useAPIAfter('POST', '/users')
	const usernameRef = useRef(null)
	const [error, setError] = useState('')

	const handleSubmit = e => {
		e.preventDefault()
		setError('')
		
		if (!usernameRef.current.value || usernameRef.current.value.trim() === '') {
			setError('Le nom ne peut pas être vide')
			return
		}
		
		setIsCreating(true)
		triggerAsync({ name: usernameRef.current.value.trim() }).then(() => {
			refetch()
			usernameRef.current.value = ''
			setClicked(false)
			setIsCreating(false)
		}).catch(() => {
			setError('Erreur lors de la création du compte')
			setIsCreating(false)
		})
	}

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5, delay: 0.3 }}
			className='flex gap-6 mt-8 flex-wrap justify-center items-start max-w-4xl'
		>
			{data && data.map((user, idx) => <Account key={user.id} user={user} index={idx} />)}
			{isPending ? (
				<Loader />
			) : (
				<motion.button
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3, delay: (data?.length || 0) * 0.1 }}
					whileHover={{ scale: 1.1, rotate: 90 }}
					whileTap={{ scale: 0.95 }}
					className='bg-gray-700 rounded-xl p-4 cursor-pointer border-2 border-dashed border-gray-500 hover:border-nitflex-red transition-all shadow-lg hover:shadow-xl flex items-center justify-center w-28 h-28'
					onClick={() => setClicked(true)}
				>
					<img src={Plus} alt='Add User' className='w-16 h-16' />
				</motion.button>
			)}
			{clicked && (
				<PopUp close={() => setClicked(false)}>
					<motion.div
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						className='p-8 max-w-md w-full'
					>
						<h2 className='text-3xl font-bold text-center text-nitflex-red mb-6'>Créer un compte</h2>
						<form onSubmit={handleSubmit} className='flex flex-col gap-4'>
							<div>
								<label className='block text-white mb-2 font-medium'>Pseudo</label>
								<input
									type='text'
									ref={usernameRef}
									placeholder='Entrez votre pseudo'
									className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-nitflex-red focus:border-transparent'
									autoFocus
								/>
							</div>
							{error && (
								<motion.p
									initial={{ opacity: 0, y: -10 }}
									animate={{ opacity: 1, y: 0 }}
									className='text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3'
								>
									{error}
								</motion.p>
							)}
							<button
								type='submit'
								disabled={isCreating}
								className='bg-nitflex-red hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed p-3 px-8 text-lg rounded-lg text-white font-medium transition-colors'
							>
								{isCreating ? 'Création...' : 'Créer'}
							</button>
						</form>
					</motion.div>
				</PopUp>
			)}
		</motion.div>
	)
}

const Home = () => {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5 }}
			className='flex flex-col items-center justify-center min-h-dvh gap-6 py-8 px-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
		>
			{createPortal(
				<motion.div
					initial={{ y: -20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ duration: 0.5, delay: 0.8 }}
				>
					<Link
						to='/upload'
						className='fixed top-5 right-5 p-3 px-5 rounded-full cursor-pointer bg-nitflex-red hover:bg-red-700 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all z-50'
					>
						<IoCloudUploadOutline size={24} />
						<span className='text-lg font-medium hidden md:inline'>Uploader film</span>
					</Link>
				</motion.div>,
				document.body
			)}
			
			<motion.img
				initial={{ scale: 0 }}
				animate={{ scale: 1 }}
				transition={{ duration: 0.5, type: 'spring' }}
				src={Nitflex}
				alt='Nitflex Logo'
				className='w-32 md:w-50 h-auto'
			/>
			
			<motion.h1
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.5, delay: 0.2 }}
				className='uppercase font-bold text-5xl md:text-8xl text-nitflex-red drop-shadow-2xl'
			>
				Nitflex
			</motion.h1>
			
			<motion.p
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.5, delay: 0.4 }}
				className='text-gray-400 text-center max-w-md px-4'
			>
				Qui regarde ?
			</motion.p>
			
			<Accounts />
		</motion.div>
	)
}

export default Home
