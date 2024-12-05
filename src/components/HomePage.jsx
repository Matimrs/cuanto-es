import { useContext } from "react";
import { ScreenContext } from "../context/ScreenContext";
import { useNavigate } from "react-router-dom";

export const HomePage = () => {
  const navigate = useNavigate();

  const { isSmallScreen } = useContext(ScreenContext);

  const handleNavigation = () => {
    navigate("/persons");
  };

  return (
    <div
      className="is-flex is-flex-direction-column is-justify-content-center is-align-items-center"
      style={{ minHeight: `calc(100% - ${isSmallScreen ? "186" : "126"}px)` }}
    >
      <h1 className="title is-size-2 mb-6 is-dark">Cuanto es</h1>
      <p className="is-size-5">
        Bienvenido a <strong>Cuanto es</strong>, aqui podras dividir los gastos
        de un grupo de personas, saber cuanto y a quien debe pagar cada una.
      </p>
      <button
        className="button is-dark mt-6"
        style={{
          fontSize: "1.2rem",
        }}
        onClick={handleNavigation}
      >
        Comenzar
      </button>
    </div>
  );
};
