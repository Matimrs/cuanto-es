import { useContext } from "react";
import { PersonContext } from "../../../context/PersonContext";
import { PersonItem } from "../PersonItem/PersonItem";

export const PersonList = ()=>{

    const {persons} = useContext(PersonContext);
return(
    <div id="personList" className="is-flex is-flex-direction-row is-justify-content-space-around is-align-items-center is-flex-wrap-wrap mb-3" style={{width: '100%'}}>
      {persons.map(e=>{
            return (
                <PersonItem key={e.id} {...e}/>
            )
        })}
    </div>
)
}
