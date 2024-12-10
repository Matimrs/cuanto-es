import { useContext } from "react";
import { CategoryContext } from "../../../context/CategoryContext";
import { useNavigate } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { ScreenContext } from "../../../context/ScreenContext";

export const CategoryItem = ({ id, name, persons }) => {
  const navigate = useNavigate();

  const { deleteCategory } = useContext(CategoryContext);

  const { isSmallScreen } = useContext(ScreenContext);

  const quantity = persons.length;

  const handleDeleteCategory = () => {
    deleteCategory(id);
  };

  const handleClick = () => {
    navigate(`/categories/${id}`);
  };

  const divMessageStyle = {
    width: isSmallScreen ? "100px" : "120px",
    height: "100%",
    cursor: "pointer",
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
          onClick={handleDeleteCategory}
        ></button>
      </div>
      <div className="message-body px-1 py-4" onClick={handleClick}>
        <div className="has-text-centered">
          <h3 className="is-size-6 has-text-weight-bold">{name}</h3>
          <div className="icon">
            <i className="fas fa-people-group"></i>
          </div>
          {}: {quantity}
        </div>
      </div>
    </div>
  );
};
