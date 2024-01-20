import NavBar from './Components/NavBar/NavBar';
import MainContainer from './Components/MainContainer/MainContainer';
import ResultContainer from './Components/ResultContainer/ResultContainer';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useState } from 'react';


function App() {

  const [arrayResult, setArrayResult] = useState([])

  return (
    <div className='App' style={{height: '100vh'}}>
      <BrowserRouter>
        <NavBar/>
        <Routes>
          <Route path='/' element={<MainContainer setArrayResult={setArrayResult}/>} />
          <Route path='/result' element={<ResultContainer array={arrayResult}/>} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
