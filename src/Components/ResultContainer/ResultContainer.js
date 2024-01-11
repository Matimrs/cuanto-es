import Result from "../Result/Result";

const ResultContainer = ({array})=>{
    
    return(
        <div>
            {
                array.map(element => {
                    const lePaga = element.lepaga.filter(e => e.paga !== 0)
                    return(
                        lePaga.map(x => {
                                return(
                                    <Result key={lePaga.indexOf(x)} debtor={x.name} amount={Number(x.paga.toFixed(2))} creditor={element.name}/>
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