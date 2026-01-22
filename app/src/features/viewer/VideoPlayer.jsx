import { forwardRef } from 'react'

const VideoPlayer = forwardRef(({ poster, ...props }, ref) => (
	<video
		ref={ref}
		poster={poster ? `https://image.tmdb.org/t/p/w780${poster}` : undefined}
		autoPlay
		playsInline
		className='absolute inset-0 w-full h-full object-contain bg-black'
		tabIndex={-1}
		{...props}
	/>
))

VideoPlayer.displayName = 'VideoPlayer'
export default VideoPlayer
