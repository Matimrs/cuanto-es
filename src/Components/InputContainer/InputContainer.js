import PersonList from "../PersonList/PersonList";
import ResultContainer from "../ResultContainer/ResultContainer";
import { useState } from "react";

class Deudor{
    constructor(name, cant){
        this.name = name
        this.paga = cant
    }
}

class Individuo{
    constructor(nombre,gasto){
        this.name=nombre
        this.gasto=gasto
        this.recibe=false
        this.lepaga = []
    }
}

const InputContainer = ()=>{
   
const [name,setName] = useState('')

const handleNameChange = (e)=>{
    setName(e.target.value);
}

const [value,setValue] = useState('')

const handleValueChange = (e)=>{
    setValue(e.target.value);
}

const [personList, setPersonList] = useState([])

const handlePersonList = ()=>{
    const person = new Individuo(name,value);
    let aux = []
    personList.forEach(e=>{
        aux.push(e)
    })
    aux.push(person)
    setPersonList(aux);
    setName('')
    setValue('')
}


let arrayResult = [];

function calculate(){
    let arrayPerson = [];
    personList.forEach(e=>{
        arrayPerson.push(e)
    })
    let prom = 0
    arrayPerson.forEach((e)=>{
        prom += ((e.gasto) / arrayPerson.length)
    })
    arrayPerson.forEach((e)=>{
        if(e.gasto > prom){
            e.recibe = true
            let paga
            arrayPerson.forEach((x)=>{
                if(x != e){
                    if(x.gasto < prom){
                        if((e.gasto - prom) > (prom - x.gasto)) {
                            e.gasto -= (prom - x.gasto)
                            paga = (prom - x.gasto)
                            x.gasto = prom
                        }
                        else if((e.gasto - prom) < (prom - x.gasto)){
                            paga = (e.gasto - prom)
                            e.gasto = prom
                            x.gasto += paga
                        }
                        else{
                            paga = (e.gasto - prom)
                            e.gasto = prom
                            x.gasto = prom
                        }
                        let aux = new Deudor(x.name, paga)
                        e.lepaga.push(aux)
                    }
                }
            })
        }
    })
    arrayResult = arrayPerson;
}

const analize = () => {
    if(arrayResult.length > 0){
        return(
            <ResultContainer array={arrayResult}/>
        )
    }
    else return(<h1>Nadie debe nada</h1>)
}
    return(
        <div>
            <div>
                <input id="inputName" type="text" placeholder="Name" value={name} onChange={handleNameChange} required/>
                <input id="inputValue" type="number" placeholder="Spent" value={value} onChange={handleValueChange} required/>
                <button type="submit" className="add" onClick={handlePersonList}>+</button>
            </div>
            <PersonList personList={personList}/>
            <div>
                <button onClick={calculate}>=</button>
            </div>
            {analize}
        </div>
    )
}

export default InputContainer;