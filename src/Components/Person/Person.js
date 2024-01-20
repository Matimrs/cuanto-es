const Person = ({id,name,gasto,handlePersonDelete}) => {

        const personDelete = ()=>{
            handlePersonDelete(id);
        }

return(
    <div class="message is-flex-direction-row is-justify-content-space-between is-align-items-center is-dark m-3" style={{ width: "120px"}}>
        <div class="message-header">
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