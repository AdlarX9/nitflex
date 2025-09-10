import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
	IoHome,
	IoHomeOutline,
	IoSearch,
	IoSearchOutline,
	IoDownload,
	IoDownloadOutline
} from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'

const NavBar = () => {
	const currentPage = window.location.pathname.slice(1)
	const navigate = useNavigate()
	const [displayNav, setDisplayNav] = useState(false)

	useEffect(() => {
		if (window.location.pathname === '/') {
			setDisplayNav(false)
		} else {
			setDisplayNav(true)
		}
	}, [navigate])

	return (
		<>
			{createPortal(
				<>
					<header
						className='fixed w-screen top-0 flex'
						style={{ display: !displayNav && 'none' }}
					>
						<div>Profil</div>
						<div></div>
					</header>
					<footer
						className='fixed w-screen bottom-0 flex justify-around p-3'
						style={{ display: !displayNav && 'none' }}
					>
						<button onClick={() => navigate('/explorer')} className='cursor-pointer'>
							{currentPage === 'explorer' ? <IoHome /> : <IoHomeOutline />}
						</button>
						<button onClick={() => navigate('/downloads')} className='cursor-pointer'>
							{currentPage === 'downloads' ? <IoDownload /> : <IoDownloadOutline />}
						</button>
						<button onClick={() => navigate('/search')} className='cursor-pointer'>
							{currentPage === 'search' ? <IoSearch /> : <IoSearchOutline />}
						</button>
					</footer>
				</>,
				document.body
			)}
		</>
	)
}

export default NavBar
