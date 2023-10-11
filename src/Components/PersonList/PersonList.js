import Person from "../Person/Person";

const PersonList = ({personList})=>{
return(
    <div>
      {personList.map(e=>{
            return (
                <Person {...e}/>
            )
        })}
    </div>
)
}


export default PersonList;