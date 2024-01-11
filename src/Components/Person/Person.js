const Person = ({id,name,gasto,handlePersonDelete}) => {

        const personDelete = ()=>{
            handlePersonDelete(id);
        }

return(
    <div>
        <p><b>{name}</b> gasto: <b>${gasto}</b></p>
        <button className="button" onClick={personDelete}>x</button>
    </div>
)
}

export default Person;