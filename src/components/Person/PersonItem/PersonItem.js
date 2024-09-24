import { useContext } from "react";
import { PersonContext } from "../../../context/PersonContext";
import { ScreenContext } from "../../../context/ScreenContext";

export const PersonItem = ({ id, name }) => {
  const { removePerson } = useContext(PersonContext);
  const { isSmallScreen } = useContext(ScreenContext);

  const personDelete = () => {
    removePerson(id);
  };

  const divMessageStyle = {
    width: isSmallScreen ? "100px" : "120px",
    height: "100%",
  };

  return (
    <div className="message is-dark m-3" style={divMessageStyle}>
      <div className="message-header ">
        <p
          className="mr-2 is-truncated"
          style={{ maxWidth: "calc(100% - 30px)" }}
        >
          {id}
        </p>
        <button
          className="delete is-small"
          aria-label="delete"
          onClick={personDelete}
        ></button>
      </div>
      <div
        className="message-body has-text-centered"
        style={{ height: "100%" }}
      >
        <div>{name}</div>
      </div>
    </div>
  );
};
