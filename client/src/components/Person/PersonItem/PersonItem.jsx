import { useContext } from "react";
import { PersonContext } from "../../../context/PersonContext";
import { ScreenContext } from "../../../context/ScreenContext";

export const PersonItem = ({ id, name }) => {
  const { removePerson } = useContext(PersonContext);
  const { isSmallScreen } = useContext(ScreenContext);

  const personDelete = () => {
    removePerson(id);
  };

  return (
    <div className="message is-dark m-3" style={{
      width: isSmallScreen ? "100px" : "120px",
      height: "100%!important",
    }}>
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
        className="message-body"
        style={{display:'flex', justifyContent: 'center', alignItems:'center', width: "100%", textAlign: "center" }}
      >
        <div>{name}</div>
      </div>
    </div>
  );
};
