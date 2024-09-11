import { useContext, useState, useEffect } from "react";
import { CategoryContext } from "../../../../context/CategoryContext";
import { PersonContext } from "../../../../context/PersonContext";

export const CategoryPersonItem = ({ categoryId, personId }) => {

    const {getCategory, addPersonToCategory, deletePersonInCategory, updatePersonInCategory} = useContext(CategoryContext);

    const { getPerson } = useContext(PersonContext);

    const [category, setCategory] = useState(getCategory(categoryId));

    const [person, setPerson] = useState(getPerson(personId));

  const personInCategory =
    category.persons.find((p) => p.id === personId) || null;

  const initialIsCheck = Boolean(personInCategory);

  const initialValue = personInCategory
    ? personInCategory.gasto
    : null;

  const [isCheck, setIsCheck] = useState(initialIsCheck);
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    if (isCheck) {
      if (personInCategory) {
        updatePersonInCategory(categoryId, { ...person, gasto: value });
      } else {
        addPersonToCategory(categoryId, { ...person, gasto: value });
      }
    } else {
      deletePersonInCategory(categoryId, personId);
    }
  }, [isCheck, value, categoryId, personId, addPersonToCategory, deletePersonInCategory, updatePersonInCategory, person, personInCategory]);

  const handleValueChange = (e) => {
    setValue(Number(e.target.value));
  };

  const handleCheckChange = () => {
    setIsCheck(!isCheck);
  };


  return (
    <div>
      <h3>{person.name}</h3>
      <input
        type="checkbox"
        checked={isCheck}
        onChange={handleCheckChange}
      ></input>

      <input
        type="number"
        placeholder="Gasto"
        value={value}
        onChange={handleValueChange}
        disabled={!isCheck}
      ></input>
    </div>
  );
};
