import Nitflex from '/images/nitflex.png'
import { useAPI, useAPIAfter, useMainContext } from '../app/hooks'
import { Link, useNavigate } from 'react-router-dom'
import Person from '/images/person-circle-fill.svg'
import Plus from '/images/plus-circle-fill.svg'
import Loader from '../components/Loader'
import PopUp from '../components/PopUp'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IoCloudUploadOutline } from 'react-icons/io5'

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
				<img src={Person} alt='User Avatar' className='w-auto h-20' />
			</button>
			<p className='m-1 text-2xl'>{user.name.length > 0 ? user.name : '-'}</p>
		</div>
	)
}

const Accounts = () => {
	const [clicked, setClicked] = useState(false)
	const { refetch, data, isPending } = useAPI('GET', '/users')
	const { triggerAsync } = useAPIAfter('POST', '/users')
	const usernameRef = useRef(null)

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
		<div className='flex gap-2 mt-5 flex-wrap justify-center items-start max-w-4/5'>
			{data && data.map(user => <Account key={user.id} user={user} />)}
			{isPending ? (
				<Loader />
			) : (
				<button
					className=' rounded-full cursor-pointer p-1 lighten'
					onClick={() => setClicked(true)}
				>
					<img src={Plus} alt='Add User' className='w-auto h-20' />
				</button>
			)}
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

const Home = () => {
	return (
		<div className='flex flex-col items-center justify-center min-h-svh gap-4 py-4'>
			{createPortal(
				<Link to='/upload' className='fixed top-5 right-5 p-2 px-4 rounded-full cursor-pointer bg-nitflex-red lighten flex items-center gap-2'>
					<IoCloudUploadOutline />
					<span className='text-2xl'>Uploader film</span>
				</Link>,
				document.body
			)}
			<img src={Nitflex} alt='Nitflex Logo' className='w-50 h-auto' />
			<h1 className='uppercase font-bold text-8xl red'>Nitflex</h1>
			<Accounts />
		</div>
	)
}

export default Home
