import Nitflex from '/images/nitflex.png'
import { useAPI, useAPIAfter, useMainContext } from '../hooks/hooks'
import { useNavigate } from 'react-router-dom'
import Person from '/images/person-circle-fill.svg'
import Plus from '/images/plus-circle-fill.svg'
import Loader from '../components/Loader'
import PopUp from '../components/PopUp'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const Account = ({ user }) => {
	const navigate = useNavigate()
	const { setUser } = useMainContext()

	return (
		<div className='flex flex-col items-center'>
			<button
				className='bg-gray-700 flex flex-col items-center rounded-md lighten max-w-100 cursor-pointer p-1'
				onClick={() => {
					navigate('/explorer')
					setUser(user)
				}}
			>
				<img src={Person} alt='User Avatar' className='w-20 h-auto' />
			</button>
			<p className='m-1 text-2xl'>{user.name.length > 0 ? user.name : '-'}</p>
		</div>
	)
}

const Accounts = ({ query }) => {
	const { data, isPending } = query

	return (
		<div className='flex gap-2 mt-5 flex-wrap justify-center max-w-4/5'>
			{isPending && <Loader />}
			{data && data.map(user => <Account key={user.id} user={user} />)}
		</div>
	)
}

const Home = () => {
	const [clicked, setClicked] = useState(false)
	const usernameRef = useRef(null)
	const { triggerAsync } = useAPIAfter('POST', '/users')
	const { refetch, ...query } = useAPI('GET', '/users')

	const handleSubmit = e => {
		e.preventDefault()
		if (usernameRef.current.value.length > 0) {
			triggerAsync({ name: usernameRef.current.value }).then(() => {
				refetch()
				usernameRef.current.value = ''
			})
		}
	}

	return (
		<div className='flex flex-col items-center justify-center min-h-svh gap-4 py-4'>
			{createPortal(
				<button
					className='top-5 right-5 p-2 rounded-full cursor-pointer fixed'
					onClick={() => setClicked(true)}
				>
					<img src={Plus} alt='Add User' className='w-10 h-auto' />
				</button>,
				document.body
			)}
			<img src={Nitflex} alt='Nitflex Logo' className='w-50 h-auto' />
			<h1 className='uppercase font-bold text-8xl red'>Nitflex</h1>
			<Accounts query={query} />
			{clicked && (
				<PopUp close={() => setClicked(false)}>
					<center className='text-4xl red font-bold mb-4'>Créer un compte</center>
					<form className='flex flex-col items-start'>
						<label>Pseudo</label>
						<input
							type='text'
							ref={usernameRef}
							placeholder='Entrez votre pseudo'
							className='bg-gray-700 p-1 rounded-md text-2xl w-max'
						/>
						<button
							className='bg-blue-500 p-2 px-8 text-xl rounded-md text-white self-center mt-4 cursor-pointer lighten'
							onClick={handleSubmit}
						>
							Créer
						</button>
					</form>
				</PopUp>
			)}
		</div>
	)
}

export default Home
