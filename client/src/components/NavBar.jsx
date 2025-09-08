import ImageComponent from "../assets";
import { SidebarContent } from "../utils/constants";
import Hamburger from "./Hamburger";

const NavBar = ({ className }) => {
  return (
    <nav
      className={
        (className || "") +
        " flex justify-between bg-gradient-to-r from-blue-700 to-pink-400 relative"
      }
    >
      <div className="flex items-center gap-4">
        <ImageComponent
          imageName="LogoImage"
          className="h-20"
          alt="AICTE_LOGO"
        />
       <h1 className="text-5xl text-white font-poppins font-semibold "> AICTE Curriculum Design Portal </h1>
      </div>
      <Hamburger siteMapList={SidebarContent} />
    </nav>
  );
};

export default NavBar;
