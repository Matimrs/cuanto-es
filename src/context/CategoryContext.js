import React, { createContext, useState } from 'react';
import Category from '../classes/Category';

const CategoryContext = createContext();

const CategoryProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);

  
  const addCategory = (categoryName) => {
    const category = new Category(categories, categoryName)
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

  const deleteCategory = (categoryId) => {
    const newCategories = categories.filter(category => category.id !== categoryId).map((category, index) => ({ ...category, id: index + 1 }));;
    setCategories(newCategories);
  }

  return (
    <CategoryContext.Provider value={{ categories, addCategory, addPersonToCategory, deleteCategory }}>
      {children}
    </CategoryContext.Provider>
  );
};

export { CategoryProvider, CategoryContext };