import { useRef, useState } from 'react'
import { useAPIAfter, useMainContext } from '../app/hooks.js'
import { IoTrashBin, IoSend, IoPersonCircle } from 'react-icons/io5'
import { confirm } from '../components/Confirmation.jsx'
/* eslint-disable-next-line */
import { motion } from 'framer-motion'

const Account = () => {
	const { user, setUser } = useMainContext()
	const { triggerAsync: changeName } = useAPIAfter('POST', '/users/change_name/' + user.id)
	const { triggerAsync: deleteAccount } = useAPIAfter('DELETE', '/users/' + user.id)
	const nameRef = useRef(null)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState(false)

	const handleSubmit = e => {
		e.preventDefault()
		setError('')
		setSuccess(false)

		if (!nameRef.current.value || nameRef.current.value.trim() === '') {
			setError('Le nom ne peut pas être vide')
			return
		}

		if (nameRef.current.value === user.name) {
			setError('Le nouveau nom doit être différent')
			return
		}

		changeName({ name: nameRef.current.value.trim() }).then(res => {
			if (res?.error) {
				setError(res.error)
			} else {
				setUser({ ...user, name: nameRef.current.value.trim() })
				setSuccess(true)
				nameRef.current.value = ''
				setTimeout(() => setSuccess(false), 3000)
			}
		})
	}

	const handleDelete = () => {
		confirm({ message: 'Êtes-vous sûr de vouloir supprimer votre compte ?' }).then(res => {
			if (res) {
				deleteAccount({ id: user.id }).then(res => {
					if (res?.error) {
						console.log('error', res.error)
					} else {
						setUser({})
					}
				})
			} else {
				console.log('no')
			}
		})
	}

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5 }}
			className='min-h-dvh w-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-5'
		>
			<motion.div
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.5, delay: 0.2 }}
				className='max-w-2xl w-full bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-12'
			>
				{/* Profile Header */}
				<div className='flex flex-col items-center mb-8'>
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ duration: 0.5, delay: 0.4, type: 'spring' }}
						className='mb-4'
					>
						<IoPersonCircle size={100} className='text-nitflex-red' />
					</motion.div>
					<h1 className='text-4xl md:text-5xl font-bold text-white mb-2'>{user.name}</h1>
					<p className='text-gray-400 text-sm'>ID: {user.id}</p>
				</div>

				{/* Divider */}
				<div className='h-px bg-linear-to-r from-transparent via-nitflex-red to-transparent mb-8' />

				{/* Name Change Form */}
				<div className='mb-8'>
					<h2 className='text-xl font-semibold text-white mb-4'>Modifier le nom</h2>
					<form onSubmit={handleSubmit} className='space-y-4'>
						<div className='relative'>
							<input
								type='text'
								ref={nameRef}
								defaultValue={user.name}
								placeholder='Nouveau nom'
								className='w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-nitflex-red focus:border-transparent transition-all'
							/>
							<button
								type='submit'
								className='absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-white hover:text-nitflex-red transition-colors'
								title='Enregistrer'
							>
								<IoSend size={20} />
							</button>
						</div>

						{/* Error Message */}
						{error && (
							<motion.div
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								className='text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3'
							>
								{error}
							</motion.div>
						)}

						{/* Success Message */}
						{success && (
							<motion.div
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								className='text-green-500 text-sm bg-green-500/10 border border-green-500/20 rounded-lg p-3'
							>
								✓ Nom modifié avec succès
							</motion.div>
						)}
					</form>
				</div>

				{/* Divider */}
				<div className='h-px bg-linear-to-r from-transparent via-gray-700 to-transparent mb-8' />

				{/* Danger Zone */}
				<div>
					<h2 className='text-xl font-semibold text-white mb-4'>Zone de danger</h2>
					<button
						onClick={handleDelete}
						className='flex items-center gap-3 px-6 py-3 bg-red-600/10 border border-red-600 rounded-lg text-red-600 hover:bg-red-600 hover:text-white transition-all duration-300 group w-full md:w-auto justify-center'
					>
						<IoTrashBin className='group-hover:animate-pulse' size={20} />
						Supprimer le compte
					</button>
					<p className='text-gray-500 text-xs mt-2'>Cette action est irréversible</p>
				</div>
			</motion.div>
		</motion.div>
	)
}

export default Account
