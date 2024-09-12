import { useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenContext } from "../../../context/ScreenContext";
import { ResultContext } from "../../../context/ResultContext";
import { ResultItem } from "../ResultItem/ResultItem";

export const ResultContainer = ()=>{

    const { setResultView , result, getResult} = useContext(ResultContext);

    const { isSmallScreen } = useContext(ScreenContext);

    const navigate = useNavigate();

    useEffect(() => {

        getResult();

        setResultView(true);
        
    },[setResultView]);

    const handleBackClick = () => {
        navigate(-1);
    }
    
    return(
        <div className="is-flex is-flex-direction-row is-justify-content-center is-align-items-center" style={{minHeight: `calc(100% - ${(isSmallScreen)? "186" : "126"}px)`}}>
            <div className="is-flex is-flex-direction-column is-justify-content-center is-align-items-center my-3" style={{width: '40%', minWidth: '250px' }}>
                {result.length === 0 ? <h3>Nadie debe nada!</h3> :
                    result.map((peer, idx) => {
                        return <ResultItem key={idx} peer={peer}/>
                    })
                } 
                <button
                  className="button is-outlined is-fullwidth mb-3 label"
                  style={{
                    boxShadow:
                      "0 0 0.5em 0.125em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
                  }}
                  onClick={handleBackClick}
                >
                  Volver
                </button>
            </div>
        </div>
    )
}