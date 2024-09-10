import { useEffect, useContext } from "react";
import { ScreenContext } from "../../../context/ScreenContext";
import { ResultContext } from "../../../context/ResultContext";
import { ResultItem } from "../ResultItem/ResultItem";

export const ResultContainer = ()=>{

    const { setResultView , result} = useContext(ResultContext);

    const { isSmallScreen } = useContext(ScreenContext);

    useEffect(() => {

        setResultView(true);
        
    },[setResultView]);
    
    return(
        <div className="is-flex is-flex-direction-row is-justify-content-center is-align-items-center" style={{minHeight: `calc(100% - ${(isSmallScreen)? "186" : "126"}px)`}}>
            <div className="is-flex is-flex-direction-column is-justify-content-center is-align-items-center my-3" style={{width: '40%', minWidth: '250px' }}>
                {
                    result.map(element => {
                        const lePaga = element.lepaga.filter(e => e.paga !== 0)
                        return(
                            lePaga.map(x => {
                                    return(
                                        <ResultItem key={lePaga.indexOf(x)} debtor={x.name} amount={Number(x.paga.toFixed(2))} creditor={element.name}/>
                                    )
                                
                            })
                        )
                    })
                }  
            </div>
        </div>
    )
}