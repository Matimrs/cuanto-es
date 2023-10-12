import Result from "../Result/Result";
import { useState } from "react";
class Deudor{
    constructor(name, cant){
        this.name = name
        this.paga = cant
    }
}
/*
const calculate = (array) => {
    let arrayPerson = array.map((e) => e)
    const prom = arrayPerson.reduce((acc,e)=>{return acc + e.gasto},0)

    arrayPerson.forEach((e)=>{  //modificar
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

    console.log(arrayPerson)

    let creditorsArray = arrayPerson.filter(e=>{
        return e.recibe
    })
    return creditorsArray;
}
*/
const ResultContainer = ({array})=>{
    return(
        <div>
            {
            array.map(element => {
                return(
                    element.lepaga.map(x => {
                        return(
                            <Result  debtor={x.name} amount={Number(x.paga.toFixed(2))} creditor={element.name}/>
                        )
                    })
                )
             })   
            }
        </div>
    )
}
//
export default ResultContainer;