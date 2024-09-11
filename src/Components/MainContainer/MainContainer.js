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

  const {addDefaultCategory} = useContext(CategoryContext)

  const [ continueMessage, setContinueMessage ] = useState(false);

  const handleContinue = () => {
    setContinueMessage(true);
  };

  const HandleContinueWithOneCategory = () => {
    //crear una categoria e ir a poner cuanto gasto cada uno
    addDefaultCategory();
    navigate("/categorys/1")
  };

  const HandleContinueWithMultipleCategories = () => {
    //permitir ingresar los gastos de cada uno en cada categoria
    navigate("/categorys");
  }

  return (
    <div
      className="is-flex is-flex-direction-row is-justify-content-center is-align-items-center"
      style={{ minHeight: `calc(100% - ${(isSmallScreen)? "186" : "126"}px)` }}
    >
      <div style={{ width: "40%", minWidth: "250px", paddingTop: "10px" }}>
      {!continueMessage && 
      <div className="is-flex is-flex-direction-column is-justify-content-center is-align-items-center">
          <AddPersonBox
          />
          <PersonList
          />
          {persons.length > 1 && (
              
                <button
                  className="button is-outlined is-fullwidth mb-3 label"
                  style={{
                    boxShadow:
                      "0 0 0.5em 0.125em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
                  }}
                  onClick={handleContinue}
                >
                  Continuar
                </button>
          )}
        </div>}
        {continueMessage && 
        <div>
          <h3>Desea dividir los gastos en categorias?</h3>
          <div className="is-flex is-flex-direction-row is-justify-content-space-between is-align-items-center"> 
          <button onClick={HandleContinueWithOneCategory}>No</button>
          <button onClick={HandleContinueWithMultipleCategories}>Si</button>
          </div>
          

        </div>
        }
      </div>
    </div>
  );
};
