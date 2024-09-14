import { useContext } from "react";
import { CategoryContext } from "../../../context/CategoryContext";
import { CategoryItem } from "../CategoryItem/CategoryItem"

export const CategoryList = () => {

    const {categories} = useContext(CategoryContext);


    if(categories.length === 0){
        return <div className="m-3"></div>
    }

    return (
        <div className="is-flex is-flex-direction-row is-justify-content-space-around is-align-items-center is-flex-wrap-wrap my-3" style={{width: '100%'}}>
            {categories.map(category => (
                <CategoryItem key={category.id} id={category.id} name={category.name.toUpperCase()} persons={category.persons} />))}
        </div>
    )
}