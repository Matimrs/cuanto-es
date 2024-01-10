const Person = ({id,name,gasto,handlePersonDelete}) => {

        const personDelete = ()=>{
            handlePersonDelete(id);
        }

return(
    <article class="message is-dark container">
        <div class="message-header">
            <p>{name}</p>
            <button class="delete" aria-label="delete" onClick={personDelete}></button>
        </div>
        <div class="message-body">
            ${gasto}
        </div>
    </article>
)
}

export default Person;