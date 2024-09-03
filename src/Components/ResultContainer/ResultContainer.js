import Result from "../Result/Result";
import { useEffect, useContext } from "react";
import { ScreenContext } from "../../context/ScreenContext";
import { ResultContext } from "../../context/ResultContext";

const ResultContainer = ({array})=>{

    const { setResultView } = useContext(ResultContext);

    const { isSmallScreen } = useContext(ScreenContext);

    useEffect(() => {

        setResultView(true);
        
    },[setResultView]);
    
    return(
        <div class="is-flex is-flex-direction-row is-justify-content-center is-align-items-center" style={{minHeight: `calc(100% - ${(isSmallScreen)? "186" : "126"}px)`}}>
            <div className="is-flex is-flex-direction-column is-justify-content-center is-align-items-center my-3" style={{width: '40%', minWidth: '250px' }}>
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
        </div>
    )
}
//
export default ResultContainer;