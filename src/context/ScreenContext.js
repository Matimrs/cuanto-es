import { createContext } from "react";

const ScreenContext =  createContext();

const ScreenProvider = ({ children }) => { 
  const isSmallScreen = window.innerWidth < 500;

  return (
    <ScreenContext.Provider value={{ isSmallScreen }}>
      {children}
    </ScreenContext.Provider>
  );
}

export { ScreenProvider, ScreenContext };