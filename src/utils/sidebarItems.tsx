import { IconType } from "react-icons/lib";
import { LuLayoutDashboard } from "react-icons/lu";
import { MdOutlineSettings } from "react-icons/md";
import { LuUsers } from "react-icons/lu";
import { LuShield } from "react-icons/lu";
import { TbUsersGroup } from "react-icons/tb";
import { FaShoppingBag } from "react-icons/fa";
import { MdSell } from "react-icons/md";
import { AiOutlineTransaction } from "react-icons/ai";
import { AiFillProduct } from "react-icons/ai";

interface MainNavItems {
    name: string;
    url: string;
    icon: IconType;
}

export const getMainNavItems = (orgId: string): MainNavItems[] => {
    return [
        {
            name: "Dashboard",
            url: "/org/" + orgId + "/dashboard",
            icon: LuLayoutDashboard,
        },
        {
            name: "Settings",
            url: "/org/" + orgId + "/info",
            icon: MdOutlineSettings,
        },
        {
            name: "Users",
            url: "/org/" + orgId + "/users",
            icon: LuUsers,
        },
        {
            name: "Roles",
            url: "/org/" + orgId + "/roles",
            icon: LuShield,
        },
        {
            name: "Entities",
            url: "/org/" + orgId + "/entity",
            icon: TbUsersGroup,
        },
        {
            name: "Buy Products",
            url: "/org/" + orgId + "/orders/buy",
            icon: FaShoppingBag,
        },
        {
            name: "Sell Products",
            url: "/org/" + orgId + "/orders/sell",
            icon: MdSell,
        },
    ];
};

interface DropDownItems {
    title: string;
    url: string;
    icon: IconType;
    isActive?: boolean;
    items?: {
        title: string;
        url: string;
    }[];
}

export const getDropDownItems = (orgId: string): DropDownItems[] => {
    return [
        {
            title: "Products",
            url: "#",
            icon: AiFillProduct,
            isActive: true,
            items: [
                {
                    title: "Categories",
                    url: "/org/" + orgId + "/categories",
                },
                {
                    title: "Products",
                    url: "/org/" + orgId + "/products",
                },
            ],
        },
        {
            title: "Accounts",
            url: "#",
            icon: LuUsers,
            isActive: false,
            items: [
                {
                    title: "View All",
                    url: "/org/" + orgId + "/accounts/view",
                },
                {
                    title: "Bank",
                    url: "/org/" + orgId + "/accounts/bank",
                },
                {
                    title: "Bank OD",
                    url: "/org/" + orgId + "/accounts/bank-od",
                },
                {
                    title: "Cheque",
                    url: "/org/" + orgId + "/accounts/cheques",
                },
            ],
        },
        // {
        //     title: "Orders",
        //     url: "#",
        //     icon: LuUsers,
        //     isActive: true,
        //     items: [
        //         {
        //             title: "Add",
        //             url: "/org/" + orgId + "/orders/create",
        //         },
        //         {
        //             title: "View",
        //             url: "/org/" + orgId + "/orders/view",
        //         },
        //     ],
        // },
        {
            title: "Transactions",
            url: "#",
            icon: AiOutlineTransaction,
            isActive: false,
            items: [
                {
                    title: "All",
                    url: "/org/" + orgId + "/transactions/all",
                },
                {
                    title: "Buy",
                    url: "/org/" + orgId + "/transactions/buy",
                },
                {
                    title: "Sell",
                    url: "/org/" + orgId + "/transactions/sell",
                },
            ],
        },
    ];
};
