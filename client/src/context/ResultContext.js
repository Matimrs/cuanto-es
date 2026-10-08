import { createContext , useContext, useEffect, useState} from "react";
import { CategoryContext } from "./CategoryContext";
import calculate from "../utils/calculate";

const ResultContext = createContext();

const ResultProvider = ({ children }) => {
  const { getCategories } = useContext(CategoryContext);

  const [resultView, setResultView] = useState(false);

  const [result, setResult] = useState([]);

  const getResult = () => {
    const categories = getCategories();
    const aux = calculate(categories);
    setResult(aux);
  }

  return (
    <ResultContext.Provider value={{ resultView, setResultView, result, setResult, getResult}}>
      {children}
    </ResultContext.Provider>
  );
}

export { ResultProvider, ResultContext };