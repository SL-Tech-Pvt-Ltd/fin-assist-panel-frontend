import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Mail, AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { api } from "@/utils/api";

export default function UnverifiedAccountPage() {
    const [searchParams] = useSearchParams();
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [statusType, setStatusType] = useState(""); // 'success' | 'error' | ''

    useEffect(() => {
        const emailFromQuery = searchParams.get("email");
        if (emailFromQuery) {
            setEmail(emailFromQuery);
            setShowEmailForm(true);
        }
    }, [searchParams]);

    const handleResendEmail = async () => {
        if (!email.trim()) {
            setStatus("Please enter a valid email address");
            setStatusType("error");
            return;
        }

        setIsLoading(true);
        setStatus("");

        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Simulate API response (you would replace this with actual API call)
            const response = await api.post("/users/request-verification", {
                email,
            });

            if (response.status === 200) {
                setStatus("Verification email sent successfully! Please check your inbox.");
                setStatusType("success");
                setEmail("");
                setShowEmailForm(false);
            } else {
                throw new Error("Failed to send email");
            }
        } catch (error) {
            setStatus("Failed to send verification email. Please try again.");
            setStatusType("error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                        <Mail className="w-8 h-8 text-amber-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Email Verification Required
                    </h1>
                    <p className="text-gray-600 leading-relaxed">
                        Your email address is not verified. Please check your email for a
                        verification link to activate your account.
                    </p>
                </div>

                {/* Status Message */}
                {status && (
                    <div
                        className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                            statusType === "success"
                                ? "bg-green-50 border border-green-200"
                                : "bg-red-50 border border-red-200"
                        }`}
                    >
                        {statusType === "success" ? (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <p
                            className={`text-sm ${
                                statusType === "success" ? "text-green-800" : "text-red-800"
                            }`}
                        >
                            {status}
                        </p>
                    </div>
                )}

                {/* Email Not Received Section */}
                <div className="space-y-4">
                    {!showEmailForm ? (
                        <button
                            onClick={() => setShowEmailForm(true)}
                            className="w-full text-center text-blue-600 hover:text-blue-700 font-medium py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors duration-200"
                        >
                            Email not received? Click here to resend
                        </button>
                    ) : (
                        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <RefreshCw className="w-4 h-4" />
                                Resend Verification Email
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-medium text-gray-700 mb-2"
                                    >
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email address"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors duration-200"
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleResendEmail}
                                        disabled={isLoading}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Mail className="w-4 h-4" />
                                                Send Email
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => {
                                            setShowEmailForm(false);
                                            setStatus("");
                                            setEmail("");
                                        }}
                                        className="px-4 py-3 text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-colors duration-200"
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                    <p className="text-sm text-gray-500">
                        Need help? Contact our{" "}
                        <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                            support team
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
