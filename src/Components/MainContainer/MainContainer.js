import { PersonList } from "../Person/PersonList/PersonList";
import { AddPersonBox } from "../Person/AddPersonBox/AddPersonBox";
import { useContext } from "react";
import { ScreenContext } from "../../context/ScreenContext";
import { PersonContext } from "../../context/PersonContext";
import { Link } from "react-router-dom";


export const MainContainer = () => {

  const { isSmallScreen } = useContext(ScreenContext);

  const { persons } = useContext(PersonContext);

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
            <Link to={"/categorys"} style={{ width: "100%" }}>
              
                <button
                  className="button is-outlined is-fullwidth mb-3 label"
                  style={{
                    boxShadow:
                      "0 0 0.5em 0.125em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
                  }}
                >
                  Continuar
                </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
