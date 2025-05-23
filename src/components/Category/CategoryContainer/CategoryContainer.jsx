import { useContext } from "react";
import { AddCategoryBox } from "../AddCategory/AddCategoryBox";
import { ScreenContext } from "../../../context/ScreenContext";
import { CategoryList } from "../CategoryList/CategoryList";
import { useNavigate } from "react-router-dom";
import { CategoryContext } from "../../../context/CategoryContext";
import { ResultContext } from "../../../context/ResultContext";

export const CategoryContainer = () => {
  const { isSmallScreen, isMediumScreen } = useContext(ScreenContext);

  const { categories } = useContext(CategoryContext);

  const { getResult } = useContext(ResultContext);

  const navigate = useNavigate();

  const handleContinue = () => {
    getResult();
    navigate("/result");
  };

  const handleBackClick = () => {
    navigate("/persons");
  };

  return (
    <div
      className="is-flex is-flex-direction-row is-justify-content-center is-align-items-center"
      style={{
        minHeight: `calc(100% - ${isSmallScreen ? "186" : "126"}px)`,
        width: "100%",
      }}
    >
      <div
        style={{
          width: `${isSmallScreen ? "80%" : isMediumScreen ? "60%" : "40%"}`,
          minWidth: "250px",
          paddingTop: "10px",
        }}
      >
        <div className="is-flex is-flex-direction-column is-justify-content-center is-align-items-center">
          <h2
            className="is-size-3 has-text-weight-bold mb-5"
            style={{ color: "black" }}
          >
            CATEGORIAS
          </h2>
          <article>
            <div
              className="message-body"
              style={{
                textAlign: "center",
                color: "black",
                marginBottom: `${isSmallScreen ? "1.5rem" : "1rem"}`,
              }}
            >
              Ingrese todas las categorias que necesite. En cada categoria ingrese las personas correspondientes. Le recomendamos que no
              utilice exactamente el mismo nombre para diferentes categorias.
            </div>
          </article>
          <AddCategoryBox />
          <CategoryList />
          <div
            className="is-flex is-justify-content-space-between"
            style={{ width: "100%" }}
          >
            <button
              className="button is-dark mb-3 label"
              style={{
                boxShadow:
                  "0 0 0.3em 0.025em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
                width: "45%",
              }}
              onClick={handleBackClick}
            >
              Volver
            </button>
            <button
              className="button is-outlined mb-3 label"
              style={{
                boxShadow:
                  "0 0 0.3em 0.025em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
                width: "45%",
              }}
              onClick={handleContinue}
              disabled={
                categories.length === 0 ||
                !categories.every((category) => category.persons.length >= 2)
              }
            >
              Calcular
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
