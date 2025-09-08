import Nitflex from '../../public/images/nitflex.png'

const Home = () => {
	return (
		<div className='flex flex-col items-center justify-center min-h-screen gap-8'>
			<img src={Nitflex} alt="Nitflex Logo" className='w-80 h-auto' />
			<h1 className='uppercase font-bold text-9xl red'>Nitflex</h1>
		</div>
	)
}

export default Home
