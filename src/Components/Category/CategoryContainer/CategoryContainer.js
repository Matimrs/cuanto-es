import { CategoryContext } from "../../../context/CategoryContext"
import { useContext } from "react"
import { AddCategoryBox } from "../AddCategory/AddCategoryBox"
import { ScreenContext } from "../../../context/ScreenContext"
import { CategoryList } from "../CategoryList/CategoryList"

export const CategoryContainer =()=>{
    const {isSmallScreen} = useContext(ScreenContext)

    return <div
    className="is-flex is-flex-direction-row is-justify-content-center is-align-items-center"
    style={{ minHeight: `calc(100% - ${(isSmallScreen)? "186" : "126"}px)` }}
  >
    <div style={{ width: "40%", minWidth: "250px", paddingTop: "10px" }}>
      <div className="is-flex is-flex-direction-column is-justify-content-center is-align-items-center">
        <AddCategoryBox />
        <CategoryList />
        
      </div>
    </div>
  </div>

}