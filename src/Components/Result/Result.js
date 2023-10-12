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

const Result = ({debtor,amount,creditor}) => {
    return(
        <div>
            <h2>{debtor} le paga ${amount} a {creditor}</h2>
        </div>
    )
}

export default Result;