import { createBrowserRouter, RouteObject } from "react-router-dom";
import App from "./App";
import AuthLayout from "./layouts/AuthLayout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Logout from "./pages/auth/logout";
import SettingLayout from "./layouts/SettingLayout";
import ProfilePage from "./pages/settings/Profile";
import UserOrgs from "./pages/settings/Orgs";
import OrgUsers from "./pages/admin/org/users";
import OrgRoles from "./pages/admin/org/roles";
import { MainLayout } from "./layouts/MainLayout";
import OrgInfoPage from "./pages/admin/org/info";
import OrgCategories from "./pages/admin/products/all-categories";
import OrgProducts from "./pages/admin/products/all-products";
import EntityInfo from "./pages/admin/entity/all-entities";
import ViewAccountPage from "./pages/admin/accounts/all";
import SingleOrderPage from "./pages/admin/order/single-order";
import DashboardPage from "./pages/admin/basic/dashboard";
import AllTransactionPage from "./pages/admin/transactions/all";
import BuyTransactionPage from "./pages/admin/transactions/buy";
import SellTransactionPage from "./pages/admin/transactions/sell";
import BankAccounts from "./pages/admin/accounts/bank";
import BuyOrderPage from "./pages/admin/order/create-buy-order";
import SellOrderPage from "./pages/admin/order/create-sell-order";
import ChequeAccounts from "./pages/admin/accounts/cheques";
import BankODAccounts from "./pages/admin/accounts/bank-od";
import UserInvitePages from "./pages/settings/invites";
import CASHACCOUNTS from "./pages/admin/accounts/cash";
import NotFoundPage from "./pages/error/404";
import CreateProductPage from "./pages/admin/products/create-product";
import SingleProductPage from "./pages/admin/products/single-product-page";
import ProductSuccessPage from "./pages/admin/products/product-success";
import ForgotPassword from "./pages/auth/Forgot-Password";
import ResetPassword from "./pages/auth/ResetPassword";
import SingleEntityPage from "./pages/admin/entity/single-entity";
import NotVerifiedPage from "./pages/auth/NotVerified";
import VerificationPage from "./pages/auth/VerifyEmail";
import VATPage from "./pages/admin/transactions/vat";
import ExpensesPage from "./pages/admin/expenses/expense";
import IncomePage from "./pages/admin/expenses/income";
import RecurringTransactionsPage from "./pages/admin/expenses/recurring";
import FinAssistHomepage from "./pages/HomePage";
import ReportPage from "./pages/admin/basic/report";
import POSRegistersPage from "./pages/admin/pos/all-pos";
import SinglePOSRegisterPage from "./pages/admin/pos/single-pos";

export const routes: RouteObject[] = [
    {
        element: <App />,
        children: [
            {
                path: "/",
                element: <FinAssistHomepage />,
            },
            {
                path: "auth",
                element: <AuthLayout />,
                children: [
                    {
                        path: "login",
                        element: <Login />,
                    },
                    {
                        path: "register",
                        element: <Register />,
                    },
                    {
                        path: "logout",
                        element: <Logout />,
                    },
                    {
                        path: "forgot-password",
                        element: <ForgotPassword />,
                    },
                    {
                        path: "reset-password",
                        element: <ResetPassword />,
                    },
                    {
                        path: "verify-email",
                        element: <VerificationPage />,
                    },
                ],
            },
            {
                path: "/logout",
                element: <Logout />,
            },
            {
                path: "/unverified",
                element: <NotVerifiedPage />,
            },
            {
                path: "org/:orgId",
                element: <MainLayout />,
                children: [
                    {
                        element: <DashboardPage />,
                        path: "dashboard",
                    },
                    {
                        element: <ReportPage />,
                        path: "report",
                    },
                    {
                        element: <OrgUsers />,
                        path: "users",
                    },
                    {
                        element: <OrgRoles />,
                        path: "roles",
                    },
                    {
                        element: <OrgInfoPage />,
                        path: "info",
                    },
                    {
                        path: "accounts",
                        children: [
                            {
                                element: <ViewAccountPage />,
                                path: "view",
                            },
                            {
                                element: <BankAccounts />,
                                path: "bank",
                            },

                            {
                                element: <ChequeAccounts />,
                                path: "cheques",
                            },
                            {
                                element: <BankODAccounts />,
                                path: "bank-od",
                            },
                            {
                                element: <CASHACCOUNTS />,
                                path: "cash_counter",
                            },
                        ],
                    },
                    {
                        path: "categories",
                        element: <OrgCategories />,
                    },
                    {
                        path: "products",
                        // element: <OrgProducts />,
                        children: [
                            {
                                element: <OrgProducts />,
                                path: "",
                            },
                            {
                                element: <CreateProductPage />,
                                path: "create",
                            },
                            {
                                element: <ProductSuccessPage />,
                                path: "success",
                            },
                            {
                                element: <SingleProductPage />,
                                path: ":productId",
                            },
                        ],
                    },
                    {
                        path: "entity",
                        // element: <EntityInfo />,
                        children: [
                            {
                                element: <EntityInfo />,
                                path: "",
                            },
                            {
                                element: <SingleEntityPage />,
                                path: ":entityId",
                            },
                        ],
                    },
                    {
                        path: "orders",
                        children: [
                            {
                                element: <SingleOrderPage />,
                                path: ":orderId",
                            },
                            // {
                            //     element: <EditOrderPage />,
                            //     path: ":orderId/edit",
                            // },
                            {
                                element: <BuyOrderPage />,
                                path: "buy",
                            },
                            {
                                element: <SellOrderPage />,
                                path: "sell",
                            },
                        ],
                    },
                    {
                        path: "transactions",
                        children: [
                            {
                                element: <AllTransactionPage />,
                                path: "all",
                            },
                            {
                                element: <BuyTransactionPage />,
                                path: "buy",
                            },
                            {
                                element: <SellTransactionPage />,
                                path: "sell",
                            },
                            {
                                element: <VATPage />,
                                path: "vat",
                            },
                        ],
                    },
                    {
                        path: "expenses",
                        element: <ExpensesPage />,
                    },
                    {
                        path: "income",
                        element: <IncomePage />,
                    },
                    {
                        path: "recurring",
                        element: <RecurringTransactionsPage />,
                    },
                    {
                        path: "pos",
                        children: [
                            {
                                path: "",
                                element: <POSRegistersPage />,
                            },
                            {
                                path: ":registerId",
                                element: <SinglePOSRegisterPage />,
                            },
                        ],
                    },
                ],
            },
            {
                path: "profile",
                element: <SettingLayout />,

                children: [
                    {
                        path: "",
                        element: <ProfilePage />,
                    },
                    {
                        path: "orgs",
                        element: <UserOrgs />,
                    },
                    {
                        path: "invites",
                        element: <UserInvitePages />,
                    },
                ],
            },
        ],
    },
    {
        path: "*",
        element: <NotFoundPage />,
    },
];

export const router = createBrowserRouter(routes);
