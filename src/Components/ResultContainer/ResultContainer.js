import Result from "../Result/Result";
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

const ResultContainer = ({array})=>{
    const arrayAux = array.filter((e)=> {
        return e.recibe 
    });

    return(
        <div>
            {
            arrayAux.forEach(element => {
                element.lepaga.forEach(x => {
                    return(
                        <Result debtor={x.name} amount={Number(x.paga.toFixed(2))} creditor={element.name}/>
                    )
                })
             })   
            }
        </div>
    )
}

export default ResultContainer;