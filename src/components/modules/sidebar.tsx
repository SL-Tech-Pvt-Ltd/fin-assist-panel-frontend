import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils"; // Utility for classNames
import { ChevronDown, ChevronRight } from "lucide-react"; // Replace with your icon set
import { TeamSwitcher } from "../nav/TeamSwitcher";

import AccountIcon from "@/assets/icons/sidebar-account.svg";
import BuyIcon from "@/assets/icons/sidebar-buy.svg";
import DashboardIcon from "@/assets/icons/sidebar-dashboard.svg";
import EntityIcon from "@/assets/icons/sidebar-entity.svg";
import LogoutIcon from "@/assets/icons/sidebar-logout.svg";
import OrgIcon from "@/assets/icons/sidebar-org-settings.svg";
import ProductIcon from "@/assets/icons/sidebar-product.svg";
import ProfileIcon from "@/assets/icons/sidebar-profile.svg";
import SellIcon from "@/assets/icons/sidebar-sell.svg";
import TransactionIcon from "@/assets/icons/sidebar-transaction.svg";
import CategoryIcon from "@/assets/icons/sidebar-category.svg";
import ChequeAccountIcon from "@/assets/icons/sidebar-account-cheque.svg";
import AllAccountIcon from "@/assets/icons/sidebar-all-account.svg";
import BankAccountIcon from "@/assets/icons/sidebar-bank-account.svg";
import { useAuth } from "@/providers/auth-provider"; // Replace with your auth provider
import { Notebook } from "lucide-react";
import { useOrg } from "@/providers/org-provider";
import CashIcon from "@/assets/icons/sidebar-cash-icon.svg"; // Assuming you have a cash icon

interface OrgData {
    id: string;
    name: string;
    logo: React.ReactElement;
    type: string;
    current: boolean;
}

interface SidebarItem {
    name: string;
    path?: string;
    icon: string;
    subItems?: {
        name: string;
        icon: string;
        path: string;
    }[];
}

export default function Sidebar() {
    const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});
    const { orgId } = useOrg(); // Assuming you have a context or provider for organization data
    const { user } = useAuth();
    const bottomItems = [
        { name: "Profile", path: "/profile", icon: user?.avatar || ProfileIcon },
        { name: "Log out", path: "/logout", icon: LogoutIcon },
    ];

    const getPathname = (path: string) => {
        return `/org/${orgId}/${path}`;
    };
    const sidebarItems: SidebarItem[] = [
        {
            name: "Dashboard",
            path: getPathname("dashboard"),
            icon: DashboardIcon,
        },
        {
            name: "Buy Product",
            path: getPathname("orders/buy"),
            icon: BuyIcon,
        },
        {
            name: "Sell Product",
            path: getPathname("orders/sell"),
            icon: SellIcon,
        },
        {
            name: "POS",
            path: getPathname("pos"),
            icon: DashboardIcon,
        },
        {
            name: "Products",
            path: "/products",
            icon: ProductIcon,
            subItems: [
                {
                    name: "All",
                    path: getPathname("products"),
                    icon: ProductIcon,
                },
                {
                    name: "Create",
                    path: getPathname("products/create"),
                    icon: ProductIcon,
                },
                {
                    name: "Categories",
                    path: getPathname("categories"),
                    icon: CategoryIcon,
                },
            ],
        },
        {
            name: "Entity/Party",
            path: getPathname("entity"),
            icon: EntityIcon,
        },
        {
            name: "Reports",
            path: getPathname("report"),
            icon: CashIcon,
        },
        {
            name: "Transactions",
            icon: TransactionIcon,
            subItems: [
                {
                    name: "All",
                    path: getPathname("transactions/all"),
                    icon: TransactionIcon,
                },
                {
                    name: "Buy",
                    path: getPathname("transactions/buy"),
                    icon: TransactionIcon,
                },
                {
                    name: "Sell",
                    path: getPathname("transactions/sell"),
                    icon: TransactionIcon,
                },
                {
                    name: "VAT",
                    path: getPathname("transactions/vat"),
                    icon: TransactionIcon,
                },
            ],
        },
        // {
        //     name: "Profit & Loss",
        //     path: getPathname("transactions/profit-loss"),
        //     icon: TransactionIcon,
        // },
        {
            name: "Expenses & Income",
            icon: TransactionIcon,
            subItems: [
                {
                    name: "Expenses",
                    path: getPathname("expenses"),
                    icon: TransactionIcon,
                },
                {
                    name: "Income",
                    path: getPathname("income"),
                    icon: TransactionIcon,
                },
                {
                    name: "Recurring",
                    path: getPathname("recurring"),
                    icon: TransactionIcon,
                },
            ],
        },
        {
            name: "Accounts",
            icon: AccountIcon,
            subItems: [
                {
                    name: "All",
                    path: getPathname("accounts/view"),
                    icon: AllAccountIcon,
                },
                {
                    name: "Bank",
                    path: getPathname("accounts/bank"),
                    icon: BankAccountIcon,
                },
                {
                    name: "Bank-OD",
                    path: getPathname("accounts/bank-od"),
                    icon: BankAccountIcon,
                },
                {
                    name: "Cheque",
                    path: getPathname("accounts/cheques"),
                    icon: ChequeAccountIcon,
                },
                {
                    name: "Cash",
                    path: getPathname("accounts/cash_counter"),
                    icon: CashIcon,
                },
            ],
        },
        {
            name: "Org Settings",
            path: getPathname("info"),
            icon: OrgIcon,
        },
        {
            name: "Team",
            path: getPathname("users"),
            icon: OrgIcon,
        },
        {
            name: "Roles",
            path: getPathname("roles"),
            icon: OrgIcon,
        },
    ];

    const toggleMenu = (name: string) => {
        setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));
    };

    const { orgs, permissions } = useAuth();
    const [teams, setTeams] = useState<OrgData[]>([]);

    useEffect(() => {
        const ownedOrgs: OrgData[] =
            orgs
                ?.filter((org) => org.id !== undefined)
                .map((org) => ({
                    id: org.id as string,
                    name: org.name,
                    logo: <Notebook />,
                    type: "Owned",
                    current: org.id === orgId,
                })) || [];
        const permittedOrgs: OrgData[] =
            permissions
                ?.filter((perm) => !ownedOrgs.some((org) => org.id === perm.organizationId))
                .map((perm) => ({
                    id: perm.organizationId,
                    name: perm.organization?.name || "Shared Org",
                    logo: <Notebook />,
                    type: "Shared",
                    current: perm.organizationId === orgId,
                })) || [];
        setTeams([...ownedOrgs, ...permittedOrgs]);
    }, [orgs, permissions, orgId]);

    const renderItem = (item: any) => {
        const isActive = openMenus[item.name];
        return (
            <div key={item.name}>
                <div
                    onClick={() => item.subItems && toggleMenu(item.name)}
                    className={cn(
                        "flex relative items-center border-r-4 border-transparent justify-between gap-2 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 text-sm",
                        !item.subItems && "justify-start",
                        item.path === window.location.pathname &&
                            "bg-gray-200 dark:bg-gray-800 text-black dark:text-white border-gray-500"
                    )}
                >
                    <div className="flex items-center gap-4">
                        <img src={item.icon} alt={item.name} className="w-5 h-5" />
                        <span className="text-sm">{item.name}</span>
                    </div>
                    {!item.subItems && (
                        <NavLink
                            to={item.path}
                            className="absolute inset-0 opacity-0 text-transparent bg-transparent"
                        />
                    )}
                    {item.subItems &&
                        (isActive ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                </div>
                {item.subItems && isActive && (
                    <div className="pl-8 flex flex-col gap-2 mt-3">
                        {item.subItems.map((sub: any) => (
                            <NavLink
                                key={sub.name}
                                to={sub.path}
                                className={cn(
                                    "text-sm text-gray-600 px-2 dark:text-gray-400 border-r-4 border-transparent hover:text-black dark:hover:text-white hover:bg-gray-200 dark:bg-gray-700 rounded-md",
                                    sub.path === window.location.pathname &&
                                        "bg-gray-200 dark:bg-gray-800 text-black dark:text-white border-gray-500"
                                )}
                            >
                                <div className="flex items-center gap-3 px-2 py-2">
                                    <img src={sub.icon} alt={sub.name} className="w-4 h-4" />
                                    {sub.name}
                                </div>
                            </NavLink>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-64 bg-[#F6F6FB] h-full flex flex-col justify-between shadow-lg border-r">
            <div className="p-4 space-y-4 overflow-y-auto select-none">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-8">
                    <TeamSwitcher teams={teams} />
                </div>
                {sidebarItems.map(renderItem)}
            </div>
            <div className="p-4 space-y-2 border-t border-gray-200 dark:border-gray-700">
                {bottomItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        className="flex items-center gap-4 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
                    >
                        {item.icon && (
                            <img src={item.icon} alt={item.name} className="w-6 h-6 rounded-full" />
                        )}
                        {item.name}
                    </NavLink>
                ))}
            </div>
        </div>
    );
}
