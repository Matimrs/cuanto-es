import Person from "../Person/Person";

const PersonList = ({personList})=>{
return(
    <div>
      {personList.map(e=>{
            return (
                <Person key={e.id} {...e}/>
            )
        })}
    </div>
)
}


export default PersonList;