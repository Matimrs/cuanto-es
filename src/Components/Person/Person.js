import { useContext } from "react";
import { PersonContext } from "../../context/PersonContext";

const Person = ({id,name,gasto}) => {
        const { removePerson } = useContext(PersonContext);

        const personDelete = ()=>{
            removePerson(id);
        }

return(
    <div class="message is-flex-direction-row is-justify-content-space-between is-align-items-center is-dark m-3" style={{ width: "120px"}}>
        <div class="message-header">
            <p class="mr-2 is-truncated" style={{ maxWidth: 'calc(100% - 30px)' }}>{id}</p>
            <p class="mr-2 is-truncated" style={{ maxWidth: 'calc(100% - 30px)' }}>{name}</p>
            <button class="delete" aria-label="delete" onClick={personDelete}></button>
        </div>
        <div class="message-body">
            ${gasto}
        </div>
    </div>
)
}

export default Person;