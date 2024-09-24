import { createContext, useState, useEffect } from "react";

const ScreenContext =  createContext();

const ScreenProvider = ({ children }) => { 
  const [mainView, setMainView] = useState(true);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 800);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 800);
    };

    // Agregar event listener cuando el componente se monta
    window.addEventListener("resize", handleResize);

    // Limpiar el event listener cuando el componente se desmonta
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []); // Solo se ejecuta al montar y desmontar el componente

  return (
    <ScreenContext.Provider value={{ isSmallScreen, mainView, setMainView }}>
      {children}
    </ScreenContext.Provider>
  );
}

export { ScreenProvider, ScreenContext };