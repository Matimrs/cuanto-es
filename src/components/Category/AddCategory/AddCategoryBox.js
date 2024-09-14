import React, { useState } from "react";
import { CategoryContext } from "../../../context/CategoryContext";
import { useContext } from "react";
export const AddCategoryBox = () => {
  const [category, setCategory] = useState("");

  const [flagCategory, setFlagCategory] = useState(true);

  const { addCategory } = useContext(CategoryContext);

  const handleAddCategory = () => {
    if (category.trim().length <= 0) {
      setFlagCategory(false);
    } else {
      addCategory(category);
      setCategory("");
    }
  };

  const handleCategoryNameChange = (e) => {
    setFlagCategory(true);
    setCategory(e.target.value);
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") {
      handleAddCategory();
    }
  };

  return (
    <div
      className="box container columns m-0"
      style={{
        width: "100%",
        height: "200px",
        boxShadow:
          "0 0 0.5em 0.125em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
      }}
    >
      <div className="column is-9 is-flex is-flex-direction-column is-justify-content-center is-align-items-center" style={{paddingRight: '22px'}}>
        <div className="field" style={{width:'100%'}}>
          <label className="label">Agregar categoria</label>
          <div className="control">
            <input
              id="inputName"
              className="input"
              style={{marginBottom: `${flagCategory ? '32px' : '0px'}`}}
              type="text"
              name="category"
              placeholder="Categoria"
              value={category}
              onChange={handleCategoryNameChange}
              onKeyDown={handleEnter}
              required
            />
            {!flagCategory && (
              <span className="tag is-danger is-light mt-2" style={{height:'24px'}}>
                Categoria necesaria
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="column is-3 is-flex is-flex-direction-row is-justify-content-center is-align-items-center" style={{paddingLeft:'22px'}}>
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
