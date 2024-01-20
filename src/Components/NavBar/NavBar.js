import { NavLink } from "react-router-dom";


const NavBar = () => {
    return(
        <nav class="navbar is-flex is-flex-direction-row is-justify-content-center is-align-items-center pt-4" role="navigation" aria-label="main navigation">
            <div class="navbar-brand">
                <NavLink to={'/'}>
                    <img src="LogoM.png" alt="Logo" style={{width: '50px'}}/>
                </NavLink>
            </div>
        </nav>
    )
}

export default NavBar;