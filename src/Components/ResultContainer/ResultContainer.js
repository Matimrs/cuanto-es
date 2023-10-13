import Result from "../Result/Result";

const ResultContainer = ({array})=>{
    return(
        <div>
            {
            array.map(element => {
                return(
                    element.lepaga.map(x => {
                        return(
                            <Result key={element.lepaga.indexOf(x)} debtor={x.name} amount={Number(x.paga.toFixed(2))} creditor={element.name}/>
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