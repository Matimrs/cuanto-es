import { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "../HomePage";
import { MainContainer } from "../MainContainer/MainContainer";
import { CategoryContainer } from "../Category/CategoryContainer/CategoryContainer";
import { CategoryDetails } from "../Category/CategoryDetails/CategoryDetails";
import { ResultContainer } from "../Result/ResultContainer/ResultContainer";
import { PersonContext } from "../../context/PersonContext";
import { CategoryContext } from "../../context/CategoryContext";
import { ResultContext } from "../../context/ResultContext";

export const Navigation = () => {
  const { persons } = useContext(PersonContext);
  const { categories } = useContext(CategoryContext);
  const { result } = useContext(ResultContext);
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/persons" element={<MainContainer />} />
      <Route
        path="/categories"
        element={
          persons?.length > 0 ? (
            <CategoryContainer />
          ) : (
            <Navigate to="/persons" replace />
          )
        }
      />
      <Route
        path="/categories/:id"
        element={
          persons?.length > 0 ? (
            <CategoryDetails />
          ) : (
            <Navigate to="/persons" replace />
          )
        }
      />
      <Route
        path="/result"
        element={
          categories?.length > 0 ? (
            <ResultContainer />
          ) : (
            <Navigate to="/categories" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
