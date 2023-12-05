import Person from "../Person/Person";

const PersonList = ({personList,handlePersonDelete})=>{
return(
    <div>
      {personList.map(e=>{
            return (
                <Person key={e.id} handlePersonDelete={handlePersonDelete} {...e}/>
            )
        })}
    </div>
)
}


export default PersonList;