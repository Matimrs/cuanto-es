import { PersonList } from "../Person/PersonList/PersonList";
import { AddPersonBox } from "../Person/AddPersonBox/AddPersonBox";
import { useState, useEffect } from "react";
import { useContext } from "react";
import { ScreenContext } from "../../context/ScreenContext";
import { ResultContext } from "../../context/ResultContext";
import { PersonContext } from "../../context/PersonContext";
import { Link } from "react-router-dom";
import { calculate } from "../../utils/calculate";


export const MainContainer = () => {

  const { isSmallScreen } = useContext(ScreenContext);

  const { setResultView, setResult } = useContext(ResultContext);

  const { persons} = useContext(PersonContext);

  useEffect(() => {
    setResultView(false);
  }, [setResultView]);

  const [loading, setLoading] = useState(false);

  const handleResult = () => {
    let aux = JSON.parse(JSON.stringify(persons));
    const result = calculate(aux).filter((e) => {
      return e.recibe;
    });
    setLoading(true);
    setResult(result);
  };

  return (
    <div
      className="is-flex is-flex-direction-row is-justify-content-center is-align-items-center"
      style={{ minHeight: `calc(100% - ${(isSmallScreen)? "186" : "126"}px)` }}
    >
      <div style={{ width: "40%", minWidth: "250px", paddingTop: "10px" }}>
        <div className="is-flex is-flex-direction-column is-justify-content-center is-align-items-center">
          <AddPersonBox
          />
          <PersonList
          />
          {persons.length > 1 && (
            <Link to={"/result"} style={{ width: "100%" }}>
              {!loading && (
                <button
                  onClick={handleResult}
                  className="button is-outlined is-fullwidth mb-3 label"
                  style={{
                    boxShadow:
                      "0 0 0.5em 0.125em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
                  }}
                >
                  Continue
                </button>
              )}
              {loading && (
                <button
                  className="button is-loading is-fullwidth mb-3"
                  style={{
                    boxShadow:
                      "0 0 0.5em 0.125em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
                  }}
                />
              )}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
