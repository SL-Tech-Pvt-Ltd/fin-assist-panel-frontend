import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import { GoogleOAuthProvider } from "@react-oauth/google";

interface LoginData {
    email: string;
    password: string;
}

const Login = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const { login } = useAuth();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginData>();

    const onSubmit = async (data: LoginData) => {
        try {
            await login(data.email, data.password);
            toast({
                title: "Login successful",
                description: "You are now logged in.",
            });
            navigate("/profile"); // Navigate without a delay
        } catch (error: any) {
            console.error("Login Error:", error);
            const status = error.response?.status;
            console.error("Error status:", status);
            const errorMessage = error.response?.data?.message || "Login failed. Please try again.";
            toast({
                title: "Login failed",
                description: errorMessage,
                variant: "destructive",
            });
            if (status === 403) {
                navigate(`/unverified?email=${encodeURIComponent(data.email)}`);
            }
        }
    };

    const renderError = (message?: string) =>
        message && (
            <p className="text-red-500 text-xs font-medium mt-1" role="alert" aria-live="polite">
                {message}
            </p>
        );

    return (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT}>
            <div>
                <h2 className="text-3xl font-semibold mb-2">Login credentials</h2>
                <p className="text-gray-700 mb-6 text-sm font-light">
                    Please log in with your Email ID and password to continue to your personalized
                    dashboard.
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
                    <div className="w-full text-center mb-4 font-light items-center flex flex-col">
                        {/* Google Login Button */}
                        <GoogleLoginButton variant="login" />
                    </div>

                    {/* Divider */}
                    <div className="flex items-center my-4">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="flex-shrink mx-4 text-gray-400 text-sm">or</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    {/* Email Field */}
                    <div>
                        <label htmlFor="email" className="block text-sm text-gray-600 mb-1">
                            Work email
                        </label>
                        <input
                            id="email"
                            type="email"
                            {...register("email", {
                                required: "Email is required",
                                pattern: {
                                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
                                    message: "Please enter a valid email",
                                },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                            disabled={isSubmitting}
                        />
                        {renderError(errors.email?.message)}
                    </div>

                    {/* Password Field */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label htmlFor="password" className="block text-sm text-gray-600">
                                Password
                            </label>
                            <Link
                                to="/auth/forgot-password"
                                className="text-sm font-medium text-blue-600 hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <input
                            type="password"
                            id="password"
                            {...register("password", {
                                required: "Password is required",
                                minLength: {
                                    value: 6,
                                    message: "Password should be at least 6 characters",
                                },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                            disabled={isSubmitting}
                        />
                        {renderError(errors.password?.message)}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full bg-teal-800 text-white py-2 rounded-md transition-colors ${
                            isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:bg-teal-900"
                        }`}
                    >
                        {isSubmitting ? "Logging in..." : "Login"}
                    </button>

                    {/* Sign-Up Link */}
                    <p className="text-center text-sm font-medium text-gray-600">
                        Don't have an account?{" "}
                        <Link to="/auth/register" className="text-blue-800 hover:underline">
                            Sign up
                        </Link>
                    </p>
                </form>
            </div>
        </GoogleOAuthProvider>
    );
};

export default Login;
