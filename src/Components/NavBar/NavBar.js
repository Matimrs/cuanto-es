import { NavLink } from "react-router-dom";

const NavBar = ({ resultView }) => {

    const isSmallScreen = window.innerWidth < 500;

  return (
    <nav
      class={`navbar is-flex ${(isSmallScreen && resultView)? `is-justify-content-right` : `is-justify-content-center`} is-align-items-center pt-4`}
      role="navigation"
      aria-label="main navigation"
    >
      {resultView && (
        <NavLink to={"/"}>
          <button
            className="button is-black label is-small"
            style={{
              position: "fixed",
              top: "0",
              left: "0",
              margin: "28px 0 0 15px",
              width: "6%",
              minWidth: "80px",
            }}
          >
            Back
          </button>
        </NavLink>
      )}
        <NavLink to={"/"} style={{ 
            width: "50px", 
            height: "50px",
            margin: '0 20px 0 20px' 
            }}>
          <img src="LogoM.png" alt="Logo" style={{ width: "50px" }} />
        </NavLink>
    </nav>
  );
};

export default NavBar;
