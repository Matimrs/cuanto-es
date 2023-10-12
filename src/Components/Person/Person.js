const Person = ({name,gasto}) => {
return(
    <div>
        <h3>Nombre: {name}</h3>
        <h3>Gasto: ${gasto}</h3>
    </div>
)
}

export default Person;