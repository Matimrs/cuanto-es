import { useContext } from "react";
import { CategoryContext } from "../../../context/CategoryContext";
import { useNavigate } from "react-router-dom";
import '@fortawesome/fontawesome-free/css/all.min.css';

export const CategoryItem = ({ id, name, persons }) => {
  const navigate = useNavigate();

  const { deleteCategory } = useContext(CategoryContext);

  const quantity = persons.length;

  const handleDeleteCategory = () => {
    deleteCategory(id);
  };

  const handleClick = () => {
    navigate(`/categorys/${id}`);
  };

  return (
    <div className="message is-dark m-3" style={{ width: "120px", cursor:'pointer' }}>
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
      <div className="message-body" onClick={handleClick}>
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
