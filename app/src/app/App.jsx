import { BrowserRouter, Route, Routes } from 'react-router-dom'

import Home from '../pages/Home.jsx'
import Explorer from '../pages/Explorer.jsx'
import Search from '../pages/Search.jsx'
import Viewer from '../pages/Viewer.jsx'
import { MainProvider } from './MainContext.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NavBar from '../components/NavBar.jsx'

const queryClient = new QueryClient()

const App = () => {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<MainProvider>
					<NavBar />
					<Routes>
						<Route path='/' element={<Home />} />
						<Route path='/explorer' element={<Explorer />} />
						<Route path='/search' element={<Search />} />
						<Route path='/viewer' element={<Viewer />} />
					</Routes>
				</MainProvider>
			</BrowserRouter>
		</QueryClientProvider>
	)
}

export default App
