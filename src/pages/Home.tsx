import { useState, useRef, useEffect } from "react";
import "./Home.css";
import { PageViewport } from "pdfjs-dist"; //
import type { TextContent } from "pdfjs-dist/types/src/display/api";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs";
// import { useAuth } from "./AuthContext";

let url0 = "";
if (window.location.protocol === "http:") {
    url0 = "http://127.0.0.1:8000/";
} else {
    url0 = `https://${window.location.hostname.replace("front", "back")}/`;
}
// function getCookie(name: string): string | null {
//     const match = document.cookie.match(
//         new RegExp("(^| )" + name + "=([^;]+)")
//     );
//     return match ? decodeURIComponent(match[2]) : null;
// }
interface QAResponse {
    file_name: string;
    page_nr: number;
    text: string;
    score: number;
}

function Home() {
    const [input, setInput] = useState<string>("");
    const [qa, setQA] = useState<string[]>([
        "Example question1?",
        "Example answer1!",
        "Example question2?",
        "Example answer2!",
    ]);
    const [files, setFiles] = useState<File[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [textChunk, setTextChunk] = useState("");
    const [apiValid, setApiValid] = useState<Boolean>(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const ctnRef = useRef<HTMLDivElement | null>(null);
    // const { logout } = useAuth();

    const logout = () => {
        sessionStorage.clear();
        window.location.href = "/login";
    };
    const uploadpdf = async (newFiles: File[]) => {
        try {
            const formData = new FormData();
            newFiles.forEach((file) => {
                formData.append("files", file);
            });
            const response = await fetch(`${url0}addpdf/`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${sessionStorage.getItem("access")}`,
                },
                body: formData,
            });
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }
        } catch (err) {
            console.error("Error uploading files:", err);
            alert("File upload failed. Check console for details.");
        }
    };
    const getpdf = async () => {
        const res = await fetch(`${url0}getpdf/`, {
            headers: {
                Authorization: `Bearer ${sessionStorage.getItem("access")}`,
            },
        });
        const fileList = await res.json(); // [{ name, url }]
        const filePromises = fileList.map(
            async (file: { name: string; url: string }) => {
                const res = await fetch(file.url);
                const blob = await res.blob();
                return new File([blob], file.name, { type: blob.type });
            }
        );
        const pdfFiles = await Promise.all(filePromises);
        if (pdfFiles) {
            setSelectedFile(pdfFiles[0]);
            setFiles(pdfFiles);
        }
    };
    const removepdf = async () => {
        if (ctnRef.current) {
            ctnRef.current.innerHTML = ""; // Clear canvas manually
        }
        setFiles([]);
        setSelectedFile(null);
        try {
            const response = await fetch(`${url0}removepdf/`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${sessionStorage.getItem("access")}`,
                },
            });
            if (!response.ok) {
                throw new Error(`Delete failed: ${response.statusText}`);
            }
            console.log("Files deleted successfully");
        } catch (err) {
            console.error("Error deleting files:", err);
            alert("File delete failed.");
        }
    };
    const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const filesArray = Array.from(e.target.files);
        const pdfFiles = filesArray.filter(
            (file) => file.type === "application/pdf"
        );
        const newFiles = pdfFiles.filter(
            (file) => !files.some((existing) => existing.name === file.name)
        );
        if (newFiles.length === 0) return;
        setFiles((prev) => [...prev, ...newFiles]);
        if (!selectedFile && pdfFiles) {
            setSelectedFile(pdfFiles[0]);
        }
        uploadpdf(newFiles);
    };
    const handleClick = () => {
        fileInputRef.current?.click();
    };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (fileInputRef.current) {
            // Create a new DataTransfer object to mimic dropped files on <input>
            const dt = new DataTransfer();
            for (let i = 0; i < files.length; i++) {
                dt.items.add(files[i]);
            }
            fileInputRef.current.files = dt.files;

            // Trigger change event manually
            const event = new Event("change", { bubbles: true });
            fileInputRef.current.dispatchEvent(event);
        }
    };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Necessary to allow drop
    };
    const addAPI = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const input = e.currentTarget.elements.namedItem(
            "inputAPI"
        ) as HTMLInputElement;
        const apiKey = input.value.trim();
        if (!apiKey) {
            alert("Please enter an API key.");
            return;
        }

        try {
            const response = await fetch(
                `${url0}addapi/?api_key=${encodeURIComponent(apiKey)}`,
                { method: "GET" }
            );
            if (!response.ok) {
                throw new Error(`Error api: ${response.status}`);
            }
            const data = await response.json();
            if (data.valid) {
                alert("API key is valid!");
                setApiValid(true);
            } else {
                alert("API key is invalid.");
            }
        } catch (err) {
            console.error("API validation failed:", err);
            alert("API key validation api error.");
        }
    };

    const ask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input) {
            alert("Die Frage darf nicht leer sein.");
            return;
        }
        setQA((prevQA) => [...prevQA, input]);
        setInput("");
        try {
            const response = await fetch(`${url0}ask/?question=${input}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${sessionStorage.getItem("access")}`,
                },
            });
            if (!response.ok) {
                if (response.status === 401) {
                    alert("Login expired. Please logout and login again.");
                } else {
                    throw new Error(`Error ask: ${response.status}`);
                }
            }
            const data: QAResponse = await response.json();
            // change select pdf, scroll to page
            setQA((prevQA) => [
                ...prevQA,
                `File: ${data.file_name}, Page Number: ${
                    data.page_nr
                }, Context: ${data.text}, (Confidence: ${
                    Math.round(data.score * 100) / 100
                })`,
            ]);
            const file = files.find((f) => f.name === data.file_name);
            if (file) {
                setSelectedFile(file);
                setCurrentPage(data.page_nr);
                setTextChunk(data.text);
            }
        } catch (err) {
            setQA((prevQA) => [...prevQA, "ask error"]);
            console.error("Ask failed:", err);
        }
    };

    const test1 = async () => {
        try {
            const response = await fetch(`${url0}test1/`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${sessionStorage.getItem("access")}`,
                },
            });
            if (!response.ok) {
                throw new Error(`Delete failed: ${response.statusText}`);
            }
        } catch (err) {
            console.error("Error test:", err);
        }
    };
    useEffect(() => {
        const renderPdf = async () => {
            if (!ctnRef.current) return;
            ctnRef.current.innerHTML = "";
            if (!selectedFile) return;
            const arrayBuffer = await selectedFile.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer })
                .promise;
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                const viewport = page.getViewport({ scale: 1 });
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: context!, viewport })
                    .promise;
                ctnRef.current.appendChild(canvas);
                if (i === currentPage) {
                    canvas.scrollIntoView();
                }
            }
        };

        renderPdf();
    }, [selectedFile, currentPage, textChunk]);
    useEffect(() => {
        getpdf();
    }, []);
    return (
        <>
            <button type="button" className="btn-top" onClick={logout}>
                Logout
            </button>
            <button type="button" id="btn-test" onClick={test1}>
                test1
            </button>
            <h2>Ragger</h2>
            <div className="ctn-lr">
                <div className="ctn-l">
                    <div id="ctn-pdf" ref={ctnRef}>
                        <p>PDF Vorschau</p>
                    </div>
                </div>
                <div className="ctn-r">
                    <div id="ctn-dragNbutton">
                        <div
                            id="drop-area"
                            onClick={handleClick}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            style={{
                                border: "2px dashed #aaa",
                                padding: "20px",
                                cursor: "pointer",
                            }}
                        >
                            Drag & Drop PDF oder klicken
                            <input
                                type="file"
                                multiple
                                accept="*/*"
                                ref={fileInputRef}
                                onChange={handleInput}
                                style={{ display: "none" }}
                            />
                        </div>
                        <button type="button" onClick={removepdf}>
                            PDF Löschen
                        </button>
                    </div>
                    <div id="ctn-select">
                        <label htmlFor="selectPDF">PDF Dateien:</label>
                        <div id="ctn-select-rp">
                            <select
                                id="selectPDF"
                                onChange={(e) => {
                                    setSelectedFile(
                                        files[parseInt(e.target.value)]
                                    );
                                }}
                            >
                                {files.map((file, ind) => (
                                    <option key={ind} value={ind}>
                                        {file.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <form className="textfield" onSubmit={addAPI}>
                        <input
                            type="password"
                            id="inputAPI"
                            name="inputAPI"
                            placeholder="API Key für ChatGPT eingeben und 'Enter' klicken"
                        />
                    </form>
                    <div id="ctn-qas1">
                        {qa.map((item, index) =>
                            index % 2 === 0 ? (
                                <div key={index} className="question">
                                    <p>{item}</p>
                                </div>
                            ) : (
                                <div key={index} className="answer">
                                    <p>{item}</p>
                                </div>
                            )
                        )}
                    </div>
                    <form className="textfield" onSubmit={ask}>
                        <input
                            type="text"
                            id="inputFrage"
                            name="inputFrage"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Eine Frage stellen und 'Enter' drücken"
                        />
                    </form>
                </div>
            </div>
        </>
    );
}

export default Home;
// after adding file, the first file as selected
// remove pdf vorschau text
