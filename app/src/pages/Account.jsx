import { useRef } from 'react'
import { useAPIAfter, useMainContext } from '../hooks/hooks.js'
import { IoTrashBin, IoSend } from 'react-icons/io5'
import { confirm } from '../components/Confirmation.jsx'

const Account = () => {
	const { user, setUser } = useMainContext()
	const { triggerAsync: changeName } = useAPIAfter('POST', '/user/change_name')
	const { triggerAsync: deleteAccount } = useAPIAfter('DELETE', '/user/delete')
	const nameRef = useRef(null)
	const errorRef = useRef(null)

	const handleSubmit = e => {
		e.preventDefault()
		if (errorRef.current.value === '') {
			errorRef.current.innerText = 'Le nom ne peut pas être vide'
			return
		}
		changeName({ name: nameRef.current.value }).then(res => {
			if (res.error) {
				errorRef.current.innerText = res.error
			} else {
				nameRef.current.value = ''
				setUser({ ...user, name: nameRef.current.value })
			}
		})
	}

	const handleDelete = () => {
		confirm({ message: 'Êtes-vous sûr de vouloir supprimer votre compte ?' }).then(res => {
			if (res) {
				deleteAccount({ id: user.id }).then(res => {
					if (res.error) {
						console.log('error', res.error)
					} else {
						setUser(null)
					}
				})
			} else {
				console.log('no')
			}
		})
	}

	return (
		<center>
			<div className='max-w-180 w-screen p-5 pt-15 h-svh' style={{ textAlign: 'left' }}>
				<center>
					<h1 className='text-6xl'>{user.name}</h1>
				</center>
				<div
					className='h-1 m-5'
					style={{
						background:
							'linear-gradient(to right, transparent, var(--red), transparent)'
					}}
				></div>
				<div className='dotted-txt'>ID : {user.id}</div>
				<div className='flex items-center gap-3'>
					Nom :
					<form className='flex items-center' onSubmit={handleSubmit}>
						<input
							className='border-1 border-gray-300 p-1 rounded-md bg-gray-700 w-80'
							defaultValue={user.name}
							ref={nameRef}
						/>
						<button
							type='submit'
							className='pr-4 cursor-pointer'
							style={{ transform: 'translateX(-100%)' }}
						>
							<IoSend />
						</button>
					</form>
				</div>
				<p className='text-3xl font-bold text-red-500' ref={errorRef}></p>
				<button
					className='text-red-600 flex items-center gap-3 cursor-pointer'
					onClick={() => handleDelete()}
				>
					<IoTrashBin />
					Supprimer le compte
				</button>
			</div>
		</center>
	)
}

export default Account
