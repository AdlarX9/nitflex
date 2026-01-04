import { BrowserRouter, Route, Routes } from 'react-router-dom'

import Home from '../pages/Home.jsx'
import MediaUploader from '../features/pipeline/MediaUploader.jsx'
import Explorer from '../pages/Explorer.jsx'
import AccountPage from '../features/account/AccountPage.jsx'
import Search from '../pages/Search.jsx'
import Viewer from '../features/viewer/Viewer.jsx'
import { MainProvider } from '../contexts/MainContext.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NavBar from '../ui/NavBar.jsx'
import Confirmation from '../ui/Confirmation.jsx'
import MovieDetails from '../features/details/MovieDetails.jsx'
import SerieDetails from '../features/details/SerieDetails.jsx'
import PersonDetails from '../features/details/PersonDetails.jsx'

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
						<Route path='/account' element={<AccountPage />} />
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
