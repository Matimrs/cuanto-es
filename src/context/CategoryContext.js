import React, { createContext, useContext, useState } from "react";
import Category from "../classes/Category";
import { PersonContext } from "./PersonContext";

const CategoryContext = createContext();

const CategoryProvider = ({ children }) => {

  const { persons } = useContext(PersonContext);

  const [categories, setCategories] = useState([]);

  const getCategories = () => {
    return categories;
  };

  const getCategory = (categoryId) => {
    return categories.find((category) => category.id === Number(categoryId));
  };

  const addDefaultCategory = () => {
    const category = new Category([], "Categoria por defecto");
    persons.forEach(p => {
      category.persons.push({ ...p, gasto: 0 });
    });
    setCategories([category]);
  };

  const addCategory = (categoryName) => {
    setCategories((prevCategories) => [...prevCategories, new Category(prevCategories, categoryName)]);
  };

  const deleteCategory = (categoryId) => {
    const newCategories = categories
      .filter((category) => category.id !== Number(categoryId))
      .map((category, index) => ({ ...category, id: index + 1 }));
    setCategories(newCategories);
  };

  // Función para agregar una persona a una categoría
  const addPersonToCategory = (categoryId, person, gasto) => {
    setCategories(
      categories.map((category) => {
        if (category.id === Number(categoryId)) {
          const updatedCategory = new Category([], category.name, category.id);
          updatedCategory.persons = [...category.persons, { ...person, gasto: Number(gasto) }];
          return updatedCategory;
        }
        return category;
      })
    );
  };

  //newPerson es objeto del tipo Person + atributo gasto (tipo Number)
  const updatePersonInCategory = (categoryId, newPerson) => {
    setCategories((prevCategories) =>
      prevCategories.map((category) => {
        if (category.id === Number(categoryId)) {
          const updatedCategory = new Category([], category.name, category.id);
          updatedCategory.persons = category.persons.map((person) =>
            person.id === newPerson.id ? newPerson : person
          );
          return updatedCategory;
        }
        return category;
      })
    );
  };

  const deletePersonInCategory = (categoryId, personId) => {
    setCategories((prevCategories) =>
      prevCategories.map((category) => {
        if (category.id === Number(categoryId)) {
          const updatedCategory = {
            ...category,
            persons: category.persons.filter((person) => person.id !== personId),
          };
          return updatedCategory;
        }
        return category;
      })
    );
  };

  return (
    <CategoryContext.Provider
      value={{
        getCategories,
        categories,
        getCategory,
        addCategory,
        deleteCategory,
        addDefaultCategory,
        addPersonToCategory,
        updatePersonInCategory,
        deletePersonInCategory
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};

export { CategoryProvider, CategoryContext };
