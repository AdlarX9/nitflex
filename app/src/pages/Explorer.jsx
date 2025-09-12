import { useEffect } from 'react'
import { useMainContext } from '../hooks/hooks'

const Explorer = () => {
	const { user } = useMainContext()

	useEffect(() => {
		console.log(user)
	}, [user])

	return (
		<div>
			<h1 className='mt-30'>Welcome to the Explorer Page</h1>
		</div>
	)
}

export default Explorer
