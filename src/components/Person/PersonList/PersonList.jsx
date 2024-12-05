import { useContext } from "react";
import { PersonContext } from "../../../context/PersonContext";
import { PersonItem } from "../PersonItem/PersonItem";

export const PersonList = ()=>{

    const {persons} = useContext(PersonContext);

    const divPersonListClassName = "is-flex is-flex-direction-row is-justify-content-space-around is-flex-wrap-wrap my-3"

    const divPersonListStyle = {width: '100%', alignItems: 'stretch'};

    return(
    <div id="personList" className={divPersonListClassName} style={divPersonListStyle}>
      {persons.map(e=>{
            return (
                <PersonItem key={e.id} {...e}/>
            )
        })}
    </div>
)
}
