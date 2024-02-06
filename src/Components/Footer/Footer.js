import { AiFillInstagram, AiFillLinkedin, AiFillGithub } from "react-icons/ai";
import { IconContext } from "react-icons";

const Footer = ({ isSmallScreen }) => {
  const iconSize = "2em";

  return (
    <IconContext.Provider value={{ size: `${iconSize}`, color: "black" }}>
      <footer
        className="is-flex is-justify-content-center is-align-items-center is-flex-wrap-wrap"
        style={{
          height: `${isSmallScreen ? "120px" : "60px"}`,
          paddingBottom: "16px",
        }}
      >
        <p style={{ width: "200px" }}>Powered by Matias Morales </p>
        <hr />
        <div
          className="is-flex is-justify-content-space-around is-align-items-center"
          style={{ width: "200px" }}
        >
          <a
            className="is-flex is-justify-content-center is-align-items-center"
            href="https://www.instagram.com/matimoralest/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <AiFillInstagram />
          </a>
          <a
            className="is-flex is-justify-content-center is-align-items-center"
            href="https://www.linkedin.com/in/matias-morales-2a2978248/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <AiFillLinkedin />
          </a>
          <a
            className="is-flex is-justify-content-center is-align-items-center"
            href="https://github.com/Matimrs"
            target="_blank"
            rel="noopener noreferrer"
          >
            <AiFillGithub />
          </a>
        </div>
      </footer>
    </IconContext.Provider>
  );
};

export default Footer;
