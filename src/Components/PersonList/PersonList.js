import Person from "../Person/Person";

const PersonList = ({personList,handlePersonDelete})=>{
return(
    <div id="personList" className="is-flex is-flex-direction-row is-justify-content-center is-align-items-center is-flex-wrap-wrap mb-3">
      {personList.map(e=>{
            return (
                <Person key={e.id} handlePersonDelete={handlePersonDelete} {...e}/>
            )
        })}
    </div>
)
}


export default PersonList;