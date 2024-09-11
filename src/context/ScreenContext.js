import { createContext, useState } from "react";

const ScreenContext =  createContext();

const ScreenProvider = ({ children }) => { 
  const [mainView, setMainView] = useState(true);

  const isSmallScreen = window.innerWidth < 500;

  return (
    <ScreenContext.Provider value={{ isSmallScreen, mainView, setMainView }}>
      {children}
    </ScreenContext.Provider>
  );
}

export { ScreenProvider, ScreenContext };