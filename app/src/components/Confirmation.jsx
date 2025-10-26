import PopUp from './PopUp.jsx'
import { useRef, useState } from 'react'

const confirmAction = {
	current: () => Promise.resolve(true)
}

/* eslint-disable react-refresh/only-export-components */
export const confirm = props => {
	return confirmAction.current(props)
}

const Confirmation = () => {
	const [open, setOpen] = useState(false)
	const [props, setProps] = useState({})
	const resolveRef = useRef(null)

	confirmAction.current = props => {
		return new Promise(resolve => {
			setProps(props)
			setOpen(true)
			resolveRef.current = resolve
		})
	}

	const handleCancel = () => {
		if (resolveRef.current) {
			resolveRef.current(false)
		}
		setOpen(false)
	}

	const handleConfirm = () => {
		if (resolveRef.current) {
			resolveRef.current(true)
		}
		setOpen(false)
	}

	return (
		<>
			{open && (
				<PopUp close={() => setOpen(false)} className='p-10'>
					<div className='text-5xl p-4 pb-8 text-center'>{props.message}</div>
					<div className='flex justify-around gap-5'>
						<button
							onClick={handleCancel}
							className='bg-red-700 p-2 px-5 rounded-md border border-red-600'
						>
							Cancel
						</button>
						<button
							onClick={handleConfirm}
							className='bg-blue-600 p-2 px-5 rounded-md border border-blue-500'
						>
							Confirm
						</button>
					</div>
				</PopUp>
			)}
		</>
	)
}

export default Confirmation
