import React, { createContext, useState } from 'react';

// Crear el contexto para las categorías
const CategoryContext = createContext();

// Proveedor del contexto para las categorías
const CategoryProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);

  // Función para agregar una nueva categoría
  const addCategory = (category) => {
    setCategories([...categories, category]);
  };

  // Función para agregar una persona a una categoría
  const addPersonToCategory = (categoryId, person, gasto) => {
    setCategories(categories.map(category => {
      if (category.id === categoryId) {
        const updatedCategory = category;
        updatedCategory.addPerson(person, gasto);
        return updatedCategory;
      }
      return category;
    }));
  };

  return (
    <CategoryContext.Provider value={{ categories, addCategory, addPersonToCategory }}>
      {children}
    </CategoryContext.Provider>
  );
};

export { CategoryProvider, CategoryContext };