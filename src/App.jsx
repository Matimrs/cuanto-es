import { NavBar } from "./components/NavBar/NavBar";
import { Footer } from "./components/Footer/Footer";
import { BrowserRouter } from "react-router-dom";
import { CategoryProvider } from "./context/CategoryContext";
import { PersonProvider } from "./context/PersonContext";
import { ScreenProvider } from "./context/ScreenContext";
import { ResultProvider } from "./context/ResultContext";
import { Navigation } from "./components/Navigation/Navigation";

function App() {
  return (
    <div className="App" style={{ height: "100vh", width: "100wh" }}>
      <BrowserRouter>
        <PersonProvider>
          <CategoryProvider>
            <ResultProvider>
              <ScreenProvider>
                <NavBar />
                <Navigation />
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
