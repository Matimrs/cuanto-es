import { useContext } from "react";
import { PersonContext } from "../../../context/PersonContext";

export const PersonItem = ({ id, name }) => {
  const { removePerson } = useContext(PersonContext);

  const personDelete = () => {
    removePerson(id);
  };

  return (
    <div className="message is-dark m-3" style={{ width: "120px" }}>
      <div className="message-header ">
        <p className="mr-2 is-truncated" style={{ maxWidth: "calc(100% - 30px)" }}>
          {id}
        </p>
        <button
          className="delete is-small"
          aria-label="delete"
          onClick={personDelete}
        ></button>
      </div>
      <div className="message-body">
        <div className="has-text-centered">
          {name}
        </div>
      </div>
    </div>
  );
};

