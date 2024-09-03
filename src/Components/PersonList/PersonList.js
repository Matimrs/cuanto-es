import { useContext } from "react";
import { PersonContext } from "../../context/PersonContext";
import Person from "../Person/Person";

const PersonList = ()=>{

    const {persons} = useContext(PersonContext);
return(
    <div id="personList" className="is-flex is-flex-direction-row is-justify-content-space-around is-align-items-center is-flex-wrap-wrap mb-3" style={{width: '100%'}}>
      {persons.map(e=>{
            return (
                <Person key={e.id} {...e}/>
            )
        })}
    </div>
)
}


export default PersonList;