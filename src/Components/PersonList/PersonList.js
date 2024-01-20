import Person from "../Person/Person";

const PersonList = ({personList,handlePersonDelete})=>{
return(
    <div id="personList" className="is-flex is-flex-direction-row is-justify-content-space-around is-align-items-center is-flex-wrap-wrap mb-3" style={{width: '100%'}}>
      {personList.map(e=>{
            return (
                <Person key={e.id} handlePersonDelete={handlePersonDelete} {...e}/>
            )
        })}
    </div>
)
}


export default PersonList;