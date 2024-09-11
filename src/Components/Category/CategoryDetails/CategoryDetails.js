import { useContext, useState } from "react";
import { useParams } from "react-router-dom";
import { CategoryContext } from "../../../context/CategoryContext";
import { CategoryPersonItem } from "./CategoryPersonItem/CategoryPersonItem";
import { PersonContext } from "../../../context/PersonContext";

export const CategoryDetails = () => {
    const { id } = useParams();

    const { getCategory } = useContext(CategoryContext);

    const { persons } = useContext(PersonContext);

    const [category, setCategory] = useState(getCategory(id));

    if (!category) {
        return <div>Cargando...</div>; // Mostrar un mensaje o un componente de carga
      }

    return (
        <div>
            <h2>{category.name}</h2>
            {persons.map(person => (
                <CategoryPersonItem categoryId={category.id} personId={person.id}/>
            )
            )}
            
        </div>
    )
}