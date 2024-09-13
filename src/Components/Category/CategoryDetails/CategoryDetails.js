import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CategoryContext } from "../../../context/CategoryContext";
import { CategoryPersonItem } from "./CategoryPersonItem/CategoryPersonItem";
import { PersonContext } from "../../../context/PersonContext";
import { ScreenContext } from "../../../context/ScreenContext";
import { ResultContext } from "../../../context/ResultContext";


export const CategoryDetails = () => {
  const { id } = useParams();

  const navigate = useNavigate();

    const { isSmallScreen } = useContext(ScreenContext);

  const { getCategory } = useContext(CategoryContext);

  const { persons } = useContext(PersonContext);

  const { getResult } = useContext(ResultContext);

  const [category, setCategory] = useState(null);

  useEffect(() => {
    setCategory(getCategory(id));
  }, [id, getCategory]);

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleAcceptClick = () => {
    if(category.name === "Categoria por defecto" && category.id === 1) {
      getResult();
      navigate(`/result`);
    }
    else navigate(`/categorys`);
  }

  if (!category) {
    return <div>Cargando...</div>; // Mostrar un mensaje o un componente de carga
  }

  return (
    <div
      className="is-flex is-flex-direction-row is-justify-content-center is-align-items-center"
      style={{ minHeight: `calc(100% - ${isSmallScreen ? "186" : "126"}px)` }}
    >
      <div
        className="is-flex is-flex-direction-column is-justify-content-center is-align-items-center my-3"
        style={{ width: "40%", minWidth: "250px" }}
      >
        <h2>{category.name}</h2>
        {persons.map((person) => (
          <CategoryPersonItem
            key={person.id}
            categoryId={category.id}
            personId={person.id}
          />
        ))}
        <div className="is-flex is-justify-content-space-between" style={{width: '100%'}}>
                <button
                  className="button is-outlined mb-3 label"
                  style={{
                    boxShadow:
                      "0 0 0.5em 0.125em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
                      width: '45%'
                  }}
                  onClick={handleBackClick}
                >
                  Volver
                </button>
                <button
                  className="button is-outlined mb-3 label"
                  style={{
                    boxShadow:
                      "0 0 0.5em 0.125em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
                      width: '45%'
                  }}
                  onClick={handleAcceptClick}
                >
                  Aceptar
                </button>
              </div>
      </div>
    </div>
  );
};
