import { Outlet } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider } from "./providers/auth-provider";

function App() {
    return (
        <AuthProvider>
            <main className="w-full">
                <Outlet />
                <Toaster />
            </main>
        </AuthProvider>
    );
}

export default App;
