import { NavBar } from "./components/NavBar/NavBar";
import { MainContainer } from "./components/MainContainer/MainContainer"
import { CategoryContainer } from "./components/Category/CategoryContainer/CategoryContainer";
import { ResultContainer } from "./components/Result/ResultContainer/ResultContainer"
import { Footer } from "./components/Footer/Footer";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { CategoryProvider } from "./context/CategoryContext";
import { PersonProvider } from "./context/PersonContext";
import { ScreenProvider } from "./context/ScreenContext";
import { ResultProvider } from "./context/ResultContext";
import { CategoryDetails } from "./components/Category/CategoryDetails/CategoryDetails";

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
                    />
                  }
                />
                <Route
                  path="/categorys"
                  element={
                    <CategoryContainer
                    />
                  }
                />
                <Route
                  path="/categorys/:id"
                  element={
                    <CategoryDetails
                    />
                  }
                />
                <Route
                  path="/result"
                  element={
                    <ResultContainer
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
