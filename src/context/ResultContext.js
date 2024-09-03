import { createContext , useState} from "react";

const ResultContext = createContext();

const ResultProvider = ({ children }) => {
  const [resultView, setResultView] = useState(false);


  return (
    <ResultContext.Provider value={{ resultView, setResultView }}>
      {children}
    </ResultContext.Provider>
  );
}

export { ResultProvider, ResultContext };