import { PersonList } from "../Person/PersonList/PersonList";
import { AddPersonBox } from "../Person/AddPersonBox/AddPersonBox";
import { useContext, useState } from "react";
import { ScreenContext } from "../../context/ScreenContext";
import { PersonContext } from "../../context/PersonContext";
import { useNavigate } from "react-router-dom";
import { CategoryContext } from "../../context/CategoryContext";

export const MainContainer = () => {
  const navigate = useNavigate();

  const { isSmallScreen } = useContext(ScreenContext);

  const { persons } = useContext(PersonContext);

  const { addDefaultCategory, categories } = useContext(CategoryContext);

  const [continueMessage, setContinueMessage] = useState(false);

  const handleContinue = () => {
    if (
      categories?.some(
        (category) =>
          category.name === "Categoria por defecto" && category.id === 1
      )
    ) {
      navigate("/categorys/1");
      setContinueMessage(true);
    } else if (categories.length !== 0) {
      navigate("/categorys");
      setContinueMessage(true);
    } else setContinueMessage(true);
  };

  const HandleContinueWithOneCategory = () => {
    //crear una categoria e ir a poner cuanto gasto cada uno
    addDefaultCategory();
    navigate("/categorys/1");
  };

  const HandleContinueWithMultipleCategories = () => {
    //permitir ingresar los gastos de cada uno en cada categoria
    navigate("/categorys");
  };

  return (
    <div
      className="is-flex is-flex-direction-column is-justify-content-center is-align-items-center"
      style={{ minHeight: `calc(100% - ${isSmallScreen ? "186" : "126"}px)` }}
    >
      <div style={{ width: "40%", minWidth: "250px", paddingTop: "10px" }}>
        {!continueMessage && (
          <div className="is-flex is-flex-direction-column is-justify-content-center is-align-items-center">
            <h2
              className="is-size-3 has-text-weight-bold mb-2"
              style={{ color: "black" }}
            >
              PERSONAS
            </h2>
            <article>
              <div
                className="message-body"
                style={{ textAlign: "justify", marginBottom: "1rem" }}
              >
                Ingrese todas las personas que participaron de la actividad, las
                que gastaron como las que no gastaron. Le recomendamos que no
                utilice exactamente el mismo nombre para diferentes personas.
              </div>
            </article>
            <AddPersonBox />
            <PersonList />
            {persons.length > 1 && (
              <button
                className="button is-outlined is-fullwidth mb-3 label"
                style={{
                  boxShadow:
                    "0 0 0.3em 0.025em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
                }}
                onClick={handleContinue}
              >
                Continuar
              </button>
            )}
          </div>
        )}
        {continueMessage && (
          <div className="is-flex is-flex-direction-column is-justify-content-center is-align-items-center">
            <h2 className="is-size-4 has-text-weight-bold mb-2">
              Desea dividir los gastos en categorias?
            </h2>
            <div
              className="message is-black container my-5 p-2"
              style={{ width: "70%", textAlign: "center" }}
            >
              <div
                className="message-body"
                style={{ textAlign: "justify" }}
              >
                En caso de que desee separar los gastos y junto con ellos las personas involucradas, seleccione que si. En caso contrario, si desea hacer la division como un solo gasto general seleccione que no. 
              </div>
              <div className="is-flex is-flex-direction-row is-justify-content-space-between is-align-items-center">
                <button
                  className="button is-dark m-3 label"
                  style={{
                    boxShadow:
                      "0 0 0.5em 0.125em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
                    width: "45%",
                  }}
                  onClick={HandleContinueWithOneCategory}
                >
                  No
                </button>
                <button
                  className="button is-outlined m-3 label"
                  style={{
                    boxShadow:
                      "0 0 0.3em 0.025em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
                    width: "45%",
                  }}
                  onClick={HandleContinueWithMultipleCategories}
                >
                  Si
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
