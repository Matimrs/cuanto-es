import { NavBar } from "./components/NavBar/NavBar";
import { MainContainer } from "./components/MainContainer/MainContainer";
import { CategoryContainer } from "./components/Category/CategoryContainer/CategoryContainer";
import { ResultContainer } from "./components/Result/ResultContainer/ResultContainer";
import { Footer } from "./components/Footer/Footer";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { CategoryProvider } from "./context/CategoryContext";
import { PersonProvider } from "./context/PersonContext";
import { ScreenProvider } from "./context/ScreenContext";
import { ResultProvider } from "./context/ResultContext";
import { CategoryDetails } from "./components/Category/CategoryDetails/CategoryDetails";
import { HomePage } from "./components/HomePage";

function App() {
  return (
    <div className="App" style={{ height: "100vh" }}>
      <BrowserRouter>
      <PersonProvider>
      <CategoryProvider>
        <ResultProvider>
          <ScreenProvider>
            
              
                <NavBar />
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/persons" element={<MainContainer />} />
                  <Route path="/categorys" element={<CategoryContainer />} />
                  <Route path="/categorys/:id" element={<CategoryDetails />} />
                  <Route path="/result" element={<ResultContainer />} />
                </Routes>
                <Footer />
              
          </ScreenProvider>
        </ResultProvider>
        </CategoryProvider>
        </PersonProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
