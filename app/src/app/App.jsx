import { BrowserRouter, Route, Routes } from 'react-router-dom'

import Home from '../pages/Home.jsx'
import MediaUploader from '../pages/MediaUploader.jsx'
import Explorer from '../pages/Explorer.jsx'
import Account from '../pages/Account.jsx'
import Search from '../pages/Search.jsx'
import Viewer from '../pages/Viewer.jsx'
import { MainProvider } from './MainContext.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NavBar from '../components/NavBar.jsx'
import Confirmation from '../components/Confirmation.jsx'
import MovieDetails from '../pages/MovieDetails.jsx'
import SerieDetails from '../pages/SerieDetails.jsx'
import PersonDetails from '../pages/PersonDetails.jsx'

const queryClient = new QueryClient()

const App = () => {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<MainProvider>
					<NavBar />
					<Confirmation />
					<Routes>
						<Route path='/' element={<Home />} />
						<Route path='/upload' element={<MediaUploader />} />
						<Route path='/explorer' element={<Explorer />} />
						<Route path='/search' element={<Search />} />
						<Route path='/account' element={<Account />} />
						<Route path='/movie/:tmdbID' element={<MovieDetails />} />
						<Route path='/person/:personID' element={<PersonDetails />} />
						<Route path='/series/:tmdbID' element={<SerieDetails />} />
						<Route path='/viewer/movie/:tmdbID' element={<Viewer />} />
						<Route path='/viewer/episode/:episodeID' element={<Viewer />} />
					</Routes>
				</MainProvider>
			</BrowserRouter>
		</QueryClientProvider>
	)
}

export default App
