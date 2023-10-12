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

const calculate = (array) => {

    const aux = JSON.parse(JSON.stringify(array));

    let prom = 0

    aux.map(e=>{
        prom += (e.gasto) / aux.length
    })  

    aux.forEach((e)=>{  //modificar
        if(e.gasto > prom){
            e.recibe = true
            let paga
            aux.forEach((x)=>{
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
    return aux;
}

const InputContainer = ()=>{
   
const [name,setName] = useState('')

const handleNameChange = (e)=>{
    setName(e.target.value);
}

const [value,setValue] = useState()

const handleValueChange = (e)=>{
    setValue(e.target.value);
}

const [personList, setPersonList] = useState([])

const [arrayResult, setArrayResult] = useState([])

const handlePersonList = ()=>{
    let person = new Individuo(name,value);
    let aux = JSON.parse(JSON.stringify(personList));
    aux.push(person)
    setPersonList(aux);
    setArrayResult([]);
    setName('');
    setValue('');
}

const handleArrayResult = ()=>{
    let aux = JSON.parse(JSON.stringify(personList));
    const result = calculate(aux).filter(e=>{
        return e.recibe
    })
    setArrayResult(result)
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
                <button onClick={handleArrayResult}>=</button>
            </div>
            <ResultContainer array={arrayResult}/>
        </div>
    )
}

export default InputContainer;