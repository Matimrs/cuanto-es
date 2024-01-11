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
    constructor(nombre,gasto,array){
        this.name=nombre
        this.gasto=parseFloat(gasto)
        this.recibe=false
        this.lepaga = []
        this.id = idGenerator(array)
    }
}

const idGenerator = (array)=>{
    if(array.length === 0) return 1
    else return (array[array.length-1].id + 1)
}

const calculate = (array) => {

    const aux = JSON.parse(JSON.stringify(array));

    let prom = 0

    aux.forEach( e =>{
        prom += (e.gasto) / aux.length;
    })  

    aux.forEach((e)=>{  
        if(e.gasto > prom){
            e.recibe = true
            let paga
            aux.forEach((x)=>{
                if(x !== e){
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


const MainContainer = ()=>{
    
    const [name,setName] = useState('')

    const handleNameChange = (e)=>{
        setName(e.target.value);
    }

    const [value,setValue] = useState('')

    const handleValueChange = (e)=>{
        setValue(e.target.value);
    }

    const [personList, setPersonList] = useState([])

    const [arrayResult, setArrayResult] = useState([])

    const handlePersonList = ()=>{
        if(name && value){
            let person = new Individuo(name,value,personList);
            let aux = JSON.parse(JSON.stringify(personList));
            aux.push(person)
            setPersonList(aux);
            setArrayResult([]);
            setName('');
            setValue('');
        }
    }
    const handlePersonDelete = (id) => {
        let aux = JSON.parse(JSON.stringify(personList));
        setPersonList(aux.filter((p) => p.id !== id ));
        setArrayResult([]);
    }

    const handleEnter = (e)=>{
        if(e.key === 'Enter'){
            handlePersonList();
        }
    }

    const handleArrayResult = ()=>{
        let aux = JSON.parse(JSON.stringify(personList));
        const result = calculate(aux).filter(e=>{
            return e.recibe
        })
        setArrayResult(result)
    }

    return(
        <div className="mainContainer">
            <div>
                <input id="inputName" type="text" placeholder="Name" value={name} onChange={handleNameChange} onKeyDown={handleEnter} required/>
                <input id="inputValue" type="number" placeholder="Spent" value={value} onChange={handleValueChange} onKeyDown={handleEnter} required/>
                <button type="submit" className="button" onClick={handlePersonList}>+</button>
            </div>
            <PersonList personList={personList} handlePersonDelete={handlePersonDelete}/>
            <div>
                <button onClick={handleArrayResult} className="button">=</button>
            </div>
            <ResultContainer array={arrayResult}/>
        </div>
    )
}

export default MainContainer;