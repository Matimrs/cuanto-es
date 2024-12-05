import React, { useState } from "react";
import { CategoryContext } from "../../../context/CategoryContext";
import { useContext } from "react";
import { ScreenContext } from "../../../context/ScreenContext";
export const AddCategoryBox = () => {
  const [category, setCategory] = useState("");

  const [flagCategory, setFlagCategory] = useState(true);
  const [flagCategoryName, setFlagCategoryName] = useState(true);

  const {isSmallScreen} = useContext(ScreenContext);

  const { addCategory } = useContext(CategoryContext);

  const handleAddCategory = () => {
    if (category.trim().length <= 0) {
      setFlagCategory(false);
    } else if(category === "Categoria por defecto"){
      setFlagCategoryName(false);
    }
    else {
      addCategory(category);
      setCategory("");
    }
  };

  const handleCategoryNameChange = (e) => {
    setFlagCategoryName(true);
    setFlagCategory(true);
    setCategory(e.target.value);
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") {
      handleAddCategory();
    }
  };

  const divContainerClassNames = `box container is-flex ${
    isSmallScreen
      ? "is-flex-direction-column is-justify-content-space-between"
      : "is-flex-direction-row is-justify-content-space-around"
  }  is-align-items-center`;

  const divContainerStyle = {
    width: "100%",
    height: isSmallScreen ? "200px" : "150px",
    boxShadow:
      "0 0 0.5em 0.125em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
  };

  const divFormClassNames =
    "is-flex is-flex-direction-column is-justify-content-center is-align-items-center";

    const divFormStyle = isSmallScreen
    ? {}
    : { paddingRight: "22px", width: "70%" };

    const divAgregarStyle = isSmallScreen
    ? { width: "100%" }
    : { paddingLeft: "22px" };

  const divAgregarClassNames =
    "is-flex is-justify-content-center is-align-items-center";

  return (
    <div
      className={divContainerClassNames}
      style={divContainerStyle}
    >
      <div className={divFormClassNames} style={divFormStyle}>
        <div className="field" style={{width:'100%'}}>
          <label className="label">Agregar categoria</label>
          <div className="control">
            <input
              id="inputName"
              className="input"
              style={{marginBottom: `${(flagCategory && flagCategoryName) ? '32px' : '0px'}`}}
              type="text"
              name="category"
              placeholder="Categoria"
              value={category}
              onChange={handleCategoryNameChange}
              onKeyDown={handleEnter}
              required
            />
            {(!flagCategory) &&  (
              <span className="tag is-danger is-light mt-2" style={{height:'24px'}}>
                Categoria requerida
               </span>)
               
               }
               {(flagCategory && !flagCategoryName) &&  (
              <span className="tag is-danger is-light mt-2" style={{height:'24px'}}>
                Nombre no permitido
               </span>)
               
               }
            
          </div>
        </div>
      </div>
      <div className={divAgregarClassNames} style={divAgregarStyle}>
        <button
          className="button is-dark pt-1"
          type="submit"
          onClick={handleAddCategory}
          onKeyDown={handleEnter}
        >
          Agregar
        </button>
      </div>
    </div>
  );
};
