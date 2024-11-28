import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import { Outlet } from "react-router-dom";

function App() {
    return (
        <>
            <Outlet />
            <ToastContainer />
        </>
    );
}

export default App;
