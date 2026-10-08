import { useContext } from "react";
import { CategoryContext } from "../../../context/CategoryContext";
import { CategoryItem } from "../CategoryItem/CategoryItem"

export const CategoryList = () => {

    const {categories} = useContext(CategoryContext);


    if(categories.length === 0){
        return <div className="m-3"></div>
    }

    const divCategoryListClassName = "is-flex is-flex-direction-row is-justify-content-space-around is-align-items-start is-flex-wrap-wrap"

    const divCategoryListStyle = {width: '100%', marginBottom: '24px'};

    return (
        <div className={divCategoryListClassName} style={divCategoryListStyle}>
            {categories.map(category => (
                <CategoryItem key={category.id} id={category.id} name={category.name.toUpperCase()} persons={category.persons} />))}
        </div>
    )
}