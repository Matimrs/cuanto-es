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
            <p><b>{debtor}</b> le paga <b>${amount}</b> a <b>{creditor}</b></p>
        </div>
    )
}

export default Result;