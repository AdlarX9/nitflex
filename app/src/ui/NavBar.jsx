import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
	IoHome,
	IoHomeOutline,
	IoSearch,
	IoSearchOutline,
	IoPersonCircle,
	IoPersonCircleOutline,
	IoArrowBack
} from 'react-icons/io5'
import { Link, useNavigate, useLocation } from 'react-router-dom'
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion'
import './style.scss'
import { colors } from '../utils/theme'

export const Back = ({ to = '/' }) => {
	return createPortal(
		<motion.header
			className='fixed top-0 left-0 z-60'
			initial={{ opacity: 0, y: -8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, ease: [0.25, 0.8, 0.4, 1] }}
		>
			<Link
				to={to}
				className='group fixed top-5 left-5 flex items-center gap-2 p-3 rounded-full
          bg-[linear-gradient(145deg,rgba(10,10,12,0.85),rgba(35,37,42,0.65))]
          backdrop-blur-xl border border-white/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.6)]
          hover:bg-black/70 hover:shadow-[0_6px_26px_-6px_rgba(0,0,0,0.7)]
          focus:outline-none focus-visible:ring-4 focus-visible:ring-red-600/40
          transition-all duration-300'
				aria-label='Retour'
			>
				<IoArrowBack className='text-2xl md:text-3xl text-white drop-shadow' />
				<span className='sr-only'>Retour</span>
				<span
					aria-hidden
					className='pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100
            bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),transparent_65%)]
            transition-opacity duration-500'
				/>
			</Link>
		</motion.header>,
		document.body
	)
}

const NavBar = () => {
	const location = useLocation()
	const navigate = useNavigate()
	const pathname = location.pathname.replace(/^\/+/, '') // remove leading slash
	const [displayNav, setDisplayNav] = useState(false)
	const prevPathRef = useRef(pathname)

	const allowed = useCallback(p => ['/explorer', '/search', '/account'].includes(p), [])

	useEffect(() => {
		setDisplayNav(allowed(location.pathname))
		prevPathRef.current = pathname
	}, [location.pathname, pathname, allowed])

	// Items configuration (retain order & semantics)
	const items = [
		{
			key: 'explorer',
			path: '/explorer',
			activeIcon: IoHome,
			inactiveIcon: IoHomeOutline,
			label: 'Explorer'
		},
		{
			key: 'search',
			path: '/search',
			activeIcon: IoSearch,
			inactiveIcon: IoSearchOutline,
			label: 'Recherche'
		},
		{
			key: 'account',
			path: '/account',
			activeIcon: IoPersonCircle,
			inactiveIcon: IoPersonCircleOutline,
			label: 'Compte'
		}
	]

	const activeColor = colors.primary

	const navVariants = {
		hidden: { y: 40, opacity: 0, filter: 'blur(6px)' },
		visible: {
			y: 0,
			opacity: 1,
			filter: 'blur(0px)',
			transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
		},
		exit: {
			y: 40,
			opacity: 0,
			filter: 'blur(4px)',
			transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] }
		}
	}

	const indicatorVariants = {
		initial: { opacity: 0, scale: 0.7 },
		animate: {
			opacity: 1,
			scale: 1,
			transition: { duration: 0.4, ease: [0.25, 0.8, 0.4, 1] }
		}
	}

	return createPortal(
		<div className='pointer-events-none fixed inset-0 z-55'>
			<AnimatePresence>
				{displayNav && (
					<motion.footer
						key='nav'
						className={`pointer-events-auto fixed bottom-0 left-0 right-${location.pathname === '/explorer' ? '4' : '0'} flex justify-center pl-4 pr-${location.pathname === '/explorer' ? '0' : '4'} py-3 md:pl-6 md:pr-${location.pathname === '/explorer' ? '2' : '6'} bg-[linear-gradient(145deg,rgba(16,18,22,0.82),rgba(28,30,34,0.7))] backdrop-blur-xl border-t border-white/10 shadow-[0_-6px_30px_-8px_rgba(0,0,0,0.8)] select-none`}
						variants={navVariants}
						initial='hidden'
						animate='visible'
						exit='exit'
					>
						<div className='flex items-center justify-around w-4/5'>
							{/* Animated gradient line background */}
							<motion.div
								aria-hidden
								className='absolute inset-0 pointer-events-none'
								style={{
									background:
										'linear-gradient(120deg,rgba(255,255,255,0.07),rgba(255,255,255,0) 30%,rgba(255,255,255,0) 70%,rgba(255,255,255,0.1))'
								}}
								animate={{
									backgroundPosition: ['0% 0%', '120% 0%', '0% 0%']
								}}
								transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
							/>

							{items.map(
								({
									key,
									path,
									// eslint-disable-next-line
									activeIcon: Active,
									// eslint-disable-next-line
									inactiveIcon: Inactive,
									label
								}) => {
									const isActive = pathname === key
									return (
										<motion.button
											key={key}
											onClick={() => navigate(path)}
											className='relative flex flex-col items-center gap-1 px-2 py-1 md:px-3 rounded-xl focus:outline-none focus-visible:ring-4 cursor-pointer group transition-colors'
											whileTap={{ scale: 0.9 }}
											whileHover={{ y: -2 }}
											aria-label={label}
										>
											{/* Active indicator halo */}
											<AnimatePresence>
												{isActive && (
													<motion.span
														key='halo'
														className='absolute -inset-3 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(229,9,20,0.25),transparent_70%)] opacity-80 pointer-events-none'
														variants={indicatorVariants}
														initial='initial'
														animate='animate'
														exit={{
															opacity: 0,
															scale: 0.5,
															transition: { duration: 0.25 }
														}}
													/>
												)}
											</AnimatePresence>

											<motion.span
												className='relative z-10 flex items-center justify-center'
												animate={{
													scale: isActive ? 1.18 : 1,
													rotate: isActive ? 0 : 0
												}}
												transition={{
													type: 'spring',
													stiffness: 340,
													damping: 22
												}}
											>
												{isActive ? (
													<Active
														style={{
															color: activeColor,
															filter: 'drop-shadow(0 0 6px rgba(229,9,20,0.5))'
														}}
														className='text-[1.9rem] md:text-[2.15rem]'
													/>
												) : (
													<Inactive className='text-[1.9rem] md:text-[2.15rem] text-gray-300 group-hover:text-gray-100 transition-colors' />
												)}
											</motion.span>
											<span
												className={`relative z-10 text-[0.65rem] md:text-[0.75rem] font-medium tracking-wide ${isActive ? 'text-red-400 drop-shadow-[0_0_6px_rgba(229,9,20,0.45)]' : 'text-gray-400 group-hover:text-gray-300'} transition-colors`}
											>
												{label}
											</span>
										</motion.button>
									)
								}
							)}
						</div>
					</motion.footer>
				)}
			</AnimatePresence>
		</div>,
		document.body
	)
}

export default NavBar
