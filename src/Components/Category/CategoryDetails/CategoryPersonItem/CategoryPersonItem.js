import { useContext, useState, useEffect, useCallback } from "react";
import { CategoryContext } from "../../../../context/CategoryContext";
import { PersonContext } from "../../../../context/PersonContext";

export const CategoryPersonItem = ({ categoryId, personId }) => {
  const {
    getCategory,
    addPersonToCategory,
    deletePersonInCategory,
    updatePersonInCategory,
  } = useContext(CategoryContext);

  const { getPerson } = useContext(PersonContext);

  const [category, setCategory] = useState(null);
  const [person, setPerson] = useState(null);
  const [inCategory, setInCategory] = useState(false);
  const [isCheck, setIsCheck] = useState(false);
  const [value, setValue] = useState(0);


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
    } else {
      setIsCheck(false);
    }
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
  }, [isCheck, value]);

  const handleValueChange = (e) => {
    if (e.target.value !== "" || e.target.value !== undefined)
      setValue(Number(e.target.value));
  };

  const handleCheckChange = () => {
    setIsCheck((prevCheck) => !prevCheck);
  };

  if (!person || !category) {
    return <div>Cargando...</div>;
  }

  return (
    <div
      className="is-flex flex-direction-row is-justify-content-space-between"
      style={{ width: "100%" }}
    >
      <h3>{person.name}</h3>
      <div>
        <input
          type="checkbox"
          checked={isCheck}
          onChange={handleCheckChange}
        ></input>

        <input
          type="number"
          placeholder="Gasto"
          value={value || ""}
          onChange={handleValueChange}
          disabled={!isCheck}
        ></input>
      </div>
    </div>
  );
};
