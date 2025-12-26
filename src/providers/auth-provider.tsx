import { Organization, User, RoleAccess } from "@/data/types";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "@/utils/api";
import { useNavigate } from "react-router-dom";

interface AuthContextData {
    user: User | null;
    orgs: Organization[] | null;
    permissions: RoleAccess[] | null;
    login: (email: string, password: string) => Promise<void>;
    googleLogin: (token: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
    refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

interface AuthProviderProps {
    children: React.ReactNode;
}

const NonAuthRoutes = ["/unverified", "/"];

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [orgs, setOrgs] = useState<Organization[] | null>(null);
    const [permissions, setPermissions] = useState<RoleAccess[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const router = useNavigate();

    const initializeAuth = async () => {
        setLoading(true);
        try {
            const res = (await api.get("/users/me", { withCredentials: true })).data as User;

            setUser(res);
            setOrgs(res.organizations || []);
            setPermissions(res.roleAccess || []);
            // if user is in an auth route, redirect to home
            if (
                window.location.pathname.startsWith("/auth") ||
                NonAuthRoutes.includes(window.location.pathname)
            ) {
                router("/profile");
            }
        } catch (error: any) {
            console.error("Failed to fetch user details:", error);
            if (error.response?.status === 401) {
                // User is not authenticated
                setUser(null);
                setOrgs(null);
                setPermissions(null);
                // if already in some /auth route, stay there
                if (window.location.pathname.startsWith("/auth")) return;
                if (NonAuthRoutes.includes(window.location.pathname)) return;
                router("/auth/login");
            } else {
                logout();
            }
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        const res = (await api.post("/users/login", { email, password }, { withCredentials: true }))
            .data as {
            user: User;
            organizations: Organization[];
            permissions: RoleAccess[];
        };

        setUser(res.user);
        setOrgs(res.organizations);
        setPermissions(res.permissions);
    };

    const googleLogin = async (token: string) => {
        const res = (await api.post("/users/google-login", { token }, { withCredentials: true }))
            .data as {
            user: User;
            organizations: Organization[];
            permissions: RoleAccess[];
        };

        setUser(res.user);
        setOrgs(res.organizations);
        setPermissions(res.permissions);
    };

    const logout = useCallback(async () => {
        try {
            await api.post("/users/logout", {}, { withCredentials: true });
        } catch (error) {
            console.error("Logout failed:", error);
        }
        setUser(null);
        setOrgs(null);
        setPermissions(null);
    }, []);

    useEffect(() => {
        initializeAuth();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                orgs,
                permissions,
                login,
                googleLogin,
                logout,
                loading,
                refetch: initializeAuth,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use AuthContext
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
