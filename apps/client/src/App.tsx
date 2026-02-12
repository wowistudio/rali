import { BrowserRouter, Route, Routes } from "react-router";
import { BatchPage } from "./pages/BatchPage";
import { HomePage } from "./pages/HomePage";

export function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/batch/:batchId" element={<BatchPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;