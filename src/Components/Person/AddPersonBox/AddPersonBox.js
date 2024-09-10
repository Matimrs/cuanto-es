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
      className="box container columns mb-4 mx-0 mt-0"
      style={{
        width: "100%",
        boxShadow:
          "0 0 0.8em 0.125em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
      }}
    >
      <div className="column is-four-fifths ">
        <div className="field">
          <label className="label">Name</label>
          <div className="control">
            <input
              ref={inputNameRef}
              id="inputName"
              className="input"
              type="text"
              placeholder="Name"
              value={name}
              onChange={handleNameChange}
              onKeyDown={handleEnter}
              required
            />
            {!flagName && (
              <span className="tag is-danger is-light">Name is necessary</span>
            )}
          </div>
        </div>
      </div>
      <div className="column is-one-fifths is-flex is-flex-direction-row is-justify-content-center is-align-items-center">
        <button
          className="button is-dark pt-1"
          type="submit"
          onClick={handlePersons}
          onKeyDown={handleEnter}
        >
          Add
        </button>
      </div>
    </div>
  );
};
