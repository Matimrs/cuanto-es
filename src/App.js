import NavBar from "./Components/NavBar/NavBar";
import MainContainer from "./Components/MainContainer/MainContainer";
import ResultContainer from "./Components/ResultContainer/ResultContainer";
import Footer from "./Components/Footer/Footer";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useState } from "react";

function App() {
  const [arrayResult, setArrayResult] = useState([]);

  const [resultView, setResultView] = useState(false);

  const isSmallScreen = window.innerWidth < 500;

  return (
    <div className="App" style={{ height: "100vh" }}>
      <BrowserRouter>
        <NavBar resultView={resultView} isSmallScreen={isSmallScreen} />
        <Routes>
          <Route
            path="/"
            element={
              <MainContainer
                setResultView={setResultView}
                setArrayResult={setArrayResult}
                isSmallScreen={isSmallScreen}
              />
            }
          />
          <Route
            path="/result"
            element={
              <ResultContainer
                setResultView={setResultView}
                array={arrayResult}
              />
            }
          />
        </Routes>
        <Footer isSmallScreen={isSmallScreen} />
      </BrowserRouter>
    </div>
  );
}

export default App;
