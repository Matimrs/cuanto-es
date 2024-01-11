const Person = ({id,name,gasto,handlePersonDelete}) => {

        const personDelete = ()=>{
            handlePersonDelete(id);
        }

return(
    <div class="message is-flex-direction-row is-justify-content-center is-align-items-center is-dark m-3">
        <div class="message-header">
            <p class="mr-2">{name}</p>
            <button class="delete" aria-label="delete" onClick={personDelete}></button>
        </div>
        <div class="message-body">
            ${gasto}
        </div>
    </div>
)
}

export default Person;