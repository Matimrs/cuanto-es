import NavBar from "./components/NavBar/NavBar";
import MainContainer from "./components/MainContainer/MainContainer";
import ResultContainer from "./components/ResultContainer/ResultContainer";
import Footer from "./components/Footer/Footer";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useState } from "react";
import { CategoryProvider } from "./context/CategoryContext";
import { PersonProvider } from "./context/PersonContext";
import { ScreenProvider } from "./context/ScreenContext";
import { ResultProvider } from "./context/ResultContext";

function App() {
 
  return (
    <div className="App" style={{ height: "100vh" }}>
      <BrowserRouter>
      <ResultProvider>
        <ScreenProvider>
          <CategoryProvider>
            <PersonProvider>
              <NavBar/>
              <Routes>
                <Route
                  path="/"
                  element={
                    <MainContainer
                      setArrayResult={setArrayResult}
                    />
                  }
                />
                <Route
                  path="/result"
                  element={
                    <ResultContainer
                      array={arrayResult}
                    />
                  }
                />
              </Routes>
              <Footer />
            </PersonProvider>
          </CategoryProvider>
        </ScreenProvider>
        </ResultProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
