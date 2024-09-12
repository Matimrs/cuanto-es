import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { CategoryContext } from "../../../context/CategoryContext";
import { CategoryItem } from "../CategoryItem/CategoryItem"

export const CategoryList = () => {

    const {categories} = useContext(CategoryContext);

    const navigate = useNavigate();

   


    if(categories.length === 0){
        return <div>Cargando...</div>
    }

    return (
        <div className="is-flex is-flex-direction-row is-justify-content-space-around is-align-items-center is-flex-wrap-wrap mb-3" style={{width: '100%'}}>
            {categories.map(category => (
                <CategoryItem key={category.id} id={category.id} name={category.name} persons={category.persons} />))}
        </div>
    )
}