import { createContext , useState} from "react";

const ResultContext = createContext();

const ResultProvider = ({ children }) => {
  const [resultView, setResultView] = useState(false);

  const [result, setResult] = useState([]);


  return (
    <ResultContext.Provider value={{ resultView, setResultView, result, setResult}}>
      {children}
    </ResultContext.Provider>
  );
}

export { ResultProvider, ResultContext };