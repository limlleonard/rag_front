import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
let url0 = "";
if (window.location.protocol === "http:") {
    url0 = "http://127.0.0.1:8000/";
} else {
    url0 = `https://${window.location.hostname.replace("front", "back")}/`;
}
// const res = await fetch(`${url0}/api/token/`, {

export default function AuthPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch(`${url0}/api/token/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        if (res.ok) {
            const data = await res.json();
            sessionStorage.setItem("access", data.access);
            sessionStorage.setItem("refresh", data.refresh);
            navigate("/"); // go to main app
        } else {
            alert("Login failed");
        }
    };

    const handleRegister = async () => {
        const res = await fetch(`${url0}register/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        if (res.ok) {
            alert("User registered. You can now log in.");
        } else {
            alert("Register failed.");
        }
    };

    return (
        <form id="login-form">
            <input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" onClick={handleLogin}>
                Login
            </button>
            <button type="button" onClick={handleRegister}>
                Register
            </button>
        </form>
    );
}

// const refreshAccessToken = async () => {
//     const refresh = sessionStorage.getItem("refresh");

//     const res = await fetch("http://127.0.0.1:8000/api/token/refresh/", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ refresh }),
//     });

//     const data = await res.json();
//     sessionStorage.setItem("access", data.access);
// };
// const logout = () => {
//     sessionStorage.clear();
//     window.location.href = "/login";
//   };
