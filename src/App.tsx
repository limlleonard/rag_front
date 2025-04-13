import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";

const isAuthenticated = () => !!sessionStorage.getItem("access");

export default function App() {
    return (
        <Router>
            <Routes>
                <Route
                    path="/"
                    element={
                        isAuthenticated() ? <Home /> : <Navigate to="/login" />
                    }
                />
                <Route path="/login" element={<Login />} />
            </Routes>
        </Router>
    );
}
