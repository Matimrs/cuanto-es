import PersonList from "../PersonList/PersonList";
import { useState, useRef, useEffect } from "react";
import { useContext } from "react";
import { ScreenContext } from "../../context/ScreenContext";
import { ResultContext } from "../../context/ResultContext";
import { PersonContext } from "../../context/PersonContext";
import { Link } from "react-router-dom";
import { AddPersonBox } from "../AddPersonBox/AddPersonBox";
import { calculate } from "../../utils/calculate";
import Individuo from "../../classes/Individuo";


const MainContainer = ({ setArrayResult }) => {

  const { isSmallScreen } = useContext(ScreenContext);

  const { setResultView } = useContext(ResultContext);

  const { persons, handlePersons, removePerson, updatePerson, inputNameRef } = useContext(PersonContext);

  useEffect(() => {
    setResultView(false);
  }, [setResultView]);

  const [loading, setLoading] = useState(false);


  const handleDeletePerson = (id) => {
    removePerson(id);
    setArrayResult([]);
  };

  const handleUpdatePerson = (id, newPerson) => {};

  const handleEnter = (e) => {
    if (e.key === "Enter") {
      inputNameRef.current.focus();
      handlePersons();
    }
  };

  const handleArrayResult = () => {
    let aux = JSON.parse(JSON.stringify(persons));
    const result = calculate(aux).filter((e) => {
      return e.recibe;
    });
    setLoading(true);
    setArrayResult(result);
  };

  return (
    <div
      class="is-flex is-flex-direction-row is-justify-content-center is-align-items-center"
      style={{ minHeight: `calc(100% - ${(isSmallScreen)? "186" : "126"}px)` }}
    >
      <div style={{ width: "40%", minWidth: "250px", paddingTop: "10px" }}>
        <div class="is-flex is-flex-direction-column is-justify-content-center is-align-items-center">
          <AddPersonBox
          />
          <PersonList
            persons={persons}
            handleDeletePerson={handleDeletePerson}
          />
          {persons.length > 1 && (
            <Link to={"/result"} style={{ width: "100%" }}>
              {!loading && (
                <button
                  onClick={handleArrayResult}
                  class="button is-outlined is-fullwidth mb-3 label"
                  style={{
                    boxShadow:
                      "0 0 0.5em 0.125em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
                  }}
                >
                  Calculate
                </button>
              )}
              {loading && (
                <button
                  onClick={handleArrayResult}
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

export default MainContainer;
