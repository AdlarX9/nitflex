import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
	IoHome,
	IoHomeOutline,
	IoSearch,
	IoSearchOutline,
	IoPersonCircle,
	IoPersonCircleOutline,
	IoChevronBackOutline
} from 'react-icons/io5'
import { Link, useNavigate } from 'react-router-dom'
import './style.scss'
import Button from './Button'
import { mainColor } from '../app/hooks'

export const Back = ({ to = '/' }) => {
	return (
		<>
			{createPortal(
				<header className='fixed top-0 left-0 flex p-3'>
					<Link
						to={to}
						className='rounded-full shadow-md shadow-black pointer-events-auto'
					>
						<Button>
							<IoChevronBackOutline />
						</Button>
					</Link>
				</header>,
				document.body
			)}
		</>
	)
}

const NavBar = () => {
	const currentPage = window.location.pathname.slice(1)
	const navigate = useNavigate()
	const [displayNav, setDisplayNav] = useState(false)

	useEffect(() => {
		if (
			window.location.pathname === '/explorer' ||
			window.location.pathname === '/search' ||
			window.location.pathname === '/account'
		) {
			setDisplayNav(true)
		} else {
			setDisplayNav(false)
		}
	}, [navigate])

	return (
		<>
			{createPortal(
				<div className='pointer-events-none navbar h-dvh fixed top-0'>
					<footer
						className='fixed w-screen bottom-0 flex justify-around p-4 bg-white/10 pointer-events-auto'
						style={{ display: !displayNav && 'none', backdropFilter: 'blur(10px)' }}
					>
						<button onClick={() => navigate('/explorer')} className='cursor-pointer'>
							{currentPage === 'explorer' ? (
								<IoHome color={mainColor} />
							) : (
								<IoHomeOutline />
							)}
						</button>
						<button onClick={() => navigate('/search')} className='cursor-pointer'>
							{currentPage === 'search' ? (
								<IoSearch color={mainColor} />
							) : (
								<IoSearchOutline />
							)}
						</button>
						<button onClick={() => navigate('/account')} className='cursor-pointer'>
							{currentPage === 'account' ? (
								<IoPersonCircle color={mainColor} />
							) : (
								<IoPersonCircleOutline />
							)}
						</button>
					</footer>
				</div>,
				document.body
			)}
		</>
	)
}

export default NavBar
