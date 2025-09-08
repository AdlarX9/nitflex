import { BrowserRouter, Route, Routes } from 'react-router-dom'

import Home from '../pages/Home.jsx'
import Explorer from '../pages/Explorer.jsx'
import Search from '../pages/Search.jsx'
import Viewer from '../pages/Viewer.jsx'

const App = () => {
	return (
		<BrowserRouter>
			<Routes>
				<Route path='/' element={<Home />} />
				<Route path='/explorer' element={<Explorer />} />
				<Route path='/search' element={<Search />} />
				<Route path='/viewer' element={<Viewer />} />
			</Routes>
		</BrowserRouter>
	)
}

export default App
