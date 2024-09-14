import { useContext } from "react";
import { PersonContext } from "../../../context/PersonContext";

export const AddPersonBox = () => {

  const { handlePersons, inputNameRef, name, handleNameChange, flagName} = useContext(PersonContext);

  const handleEnter = (e) => {
    if (e.key === "Enter") {
      handlePersons();
    }
  }

  return (
    <div
      className="box container columns m-0"
      style={{
        width: "100%",
        height: "200px",
        boxShadow:
          "0 0 0.5em 0.125em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
      }}
    >
      <div className="column is-9 is-flex is-flex-direction-column is-justify-content-center is-align-items-center" style={{paddingRight: '22px'}} >
        <div className="field " style={{width:'100%'}}>
          <label className="label">Nueva persona</label>
          <div className="control">
            <input
              ref={inputNameRef}
              id="inputName"
              className="input"
              style={{marginBottom: `${flagName ? '32px' : '0px'}`}}
              type="text"
              name="name"
              placeholder="Nombre"
              value={name}
              onChange={handleNameChange}
              onKeyDown={handleEnter}
              required
            />
            {!flagName && (
              <span className="tag is-danger is-light mt-2" style={{height:'24px'}}>Nombre necesario</span>
            )}
          </div>
        </div>
      </div>
      <div className="column is-3 is-flex is-flex-direction-row is-justify-content-center is-align-items-center" style={{paddingLeft:'22px'}}>
        <button
          className="button is-dark pt-1"
          type="submit"
          onClick={handlePersons}
          onKeyDown={handleEnter}
        >
          Agregar
        </button>
        </div>
    </div>
  );
};
