import { useContext } from "react";
import { PersonContext } from "../../context/PersonContext";

export const AddPersonBox = () => {

  const { handlePersons, inputNameRef, name, handleNameChange, handleEnter, flagName, inputValueRef, value, handleValueChange, flagValue } = useContext(PersonContext);

  return (
    <div
      class="box container columns mb-4 mx-0 mt-0"
      style={{
        width: "100%",
        boxShadow:
          "0 0 0.8em 0.125em rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.02)",
      }}
    >
      <div class="column is-four-fifths">
        <div class="field">
          <label class="label">Name</label>
          <div class="control">
            <input
              ref={inputNameRef}
              id="inputName"
              class="input"
              type="text"
              placeholder="Name"
              value={name}
              onChange={handleNameChange}
              onKeyDown={handleEnter}
              required
            />
            {!flagName && (
              <span class="tag is-danger is-light">Name is necessary</span>
            )}
          </div>
        </div>
        <div class="field">
          <label class="label">Spent</label>
          <div class="control">
            <input
              ref={inputValueRef}
              class="input"
              id="inputValue"
              type="number"
              placeholder="Spent"
              value={value}
              onChange={handleValueChange}
              onKeyDown={handleEnter}
              required
            />
            {!flagValue && (
              <span class="tag is-danger is-light">Spending is necessary</span>
            )}
          </div>
        </div>
      </div>
      <div class="column is-one-fifths is-flex is-flex-direction-row is-justify-content-center is-align-items-center">
        <button
          class="button is-dark pt-1"
          type="submit"
          onClick={handlePersons}
        >
          +
        </button>
      </div>
    </div>
  );
};
