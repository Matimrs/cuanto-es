import { useContext, useState, useEffect } from "react";
import { CategoryContext } from "../../../../context/CategoryContext";
import { PersonContext } from "../../../../context/PersonContext";
import { ScreenContext } from "../../../../context/ScreenContext";
import Checkbox from "@mui/material/Checkbox";

export const CategoryPersonItem = ({
  categoryId,
  personId,
  isDefaultCategory,
  full,
  setFull
}) => {
  const {
    getCategory,
    addPersonToCategory,
    deletePersonInCategory,
    updatePersonInCategory,
  } = useContext(CategoryContext);

  const { getPerson } = useContext(PersonContext);

  const { isSmallScreen } = useContext(ScreenContext);

  const [category, setCategory] = useState(null);
  const [person, setPerson] = useState(null);
  const [inCategory, setInCategory] = useState(false);
  const [isCheck, setIsCheck] = useState(full);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (full) {
      setIsCheck(true);
    }
  }, [full]);

  useEffect(() => {
    const fetchedCategory = getCategory(categoryId);
    const fetchedPerson = getPerson(personId);

    setCategory(fetchedCategory || null);
    setPerson(fetchedPerson || null);

    const personInCategory = fetchedCategory?.persons.find(
      (p) => p.id === Number(personId)
    );

    setInCategory(!!personInCategory || false);

    if (personInCategory) {
      setIsCheck(true);
      setValue(Number(personInCategory.gasto));
    } else if (full) {
      setIsCheck(true);
    } else {
      setIsCheck(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, personId]);

  useEffect(() => {
    if (category && person) {
      if (isCheck) {
        if (inCategory) {
          updatePersonInCategory(categoryId, { ...person, gasto: value || 0 });
        } else {
          addPersonToCategory(categoryId, person, value || 0);
          setInCategory(true);
        }
      } else {
        deletePersonInCategory(categoryId, personId);
        setInCategory(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheck, value]);

  const handleValueChange = (e) => {
    const newValue = e.target.value;
    if (newValue < 0) return;
    setValue(newValue === "" ? "" : Number(newValue));
  };

  const handleBlur = () => {
    // Al perder el foco, si el valor está vacío, establecer 0
    if (value === "" || isNaN(value)) {
      setValue(0);
    }
  };



  const handleCheckChange = () => {
    if(isCheck) setFull(false);
    setIsCheck((prevCheck) => !prevCheck);
  };


  if (!person || !category) {
    return (
      <div>
        <h3 style={{ color: "black" }}>Cargando...</h3>
      </div>
    );
  }

  const divContainerStyle = {
    width: "100%",
    margin: "10px 0",
    padding: "15px 30px",
    display: "flex",
    flexDirection: isSmallScreen ? "column" : "row",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const divInputsStyle = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: isSmallScreen ? "100%" : "200px",
    marginTop: isSmallScreen ? "10px" : "0",
  };

  const h3Style = {
    color: "black",
    textAlign: "start",
    width: isSmallScreen ? "100%" : "auto",
    paddingLeft: isSmallScreen ? "12px" : "0",
  };

  const inputValueStyle = { width: "100%" };

  return (
    <div
      className="message"
      style={divContainerStyle}
      onClick={handleCheckChange}
    >
      <h3 style={h3Style}>
        ({person.id}) <strong>{person.name}</strong>
      </h3>
      <div style={divInputsStyle}>
        <Checkbox
          checked={isCheck}
          disabled={isDefaultCategory}
          color="default"
        />
          <input
            type="number"
            placeholder="Gasto"
            value={value}
            onChange={handleValueChange}
            onBlur={handleBlur}
            disabled={!isCheck}
            style={inputValueStyle}
            onClick={(e) => {
              if (!e.target.disabled) {
                // Detenemos la propagación si el input no está deshabilitado
                e.stopPropagation();
              }
            }}
          />
      </div>
    </div>
  );
};
