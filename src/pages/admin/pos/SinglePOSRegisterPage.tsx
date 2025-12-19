import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useRequirePermissions } from "@/hooks/use-permissions";
import {
    Search,
    X,
    Plus,
    Minus,
    Trash2,
    Lock,
    ChevronLeft,
    ImageIcon,
    Percent,
    Tag,
    Edit2,
    User,
    Wallet,
    ShoppingCart,
    Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useOrg } from "@/providers/org-provider";
import { api } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { POSRegister, ClosePOSRegisterData } from "@/data/pos-types";
import { Product, Account, Entity, ProductVariant } from "@/data/types";
import POSOrdersDialog from "@/components/modals/POSOrdersDialog";
import POSTransactionsDialog from "@/components/modals/POSTransactionsDialog";
import POSPaymentSummaryDialog from "@/components/modals/POSPaymentSummaryDialog";
import AddPOSTransactionDialog from "@/components/modals/AddPOSTransactionDialog";

interface CartItem {
    productId: string;
    variantId: string;
    name: string;
    variantName: string;
    rate: number;
    quantity: number;
}

interface Charge {
    id: string;
    label: string;
    amount: number;
}

interface Payment {
    accountId: string;
    amount: number;
    details: object;
}

const getVariantStock = (variant?: ProductVariant): number => {
    if (!variant?.stock_fifo_queue) return 0;
    return variant.stock_fifo_queue.reduce((total, entry) => total + entry.availableStock, 0);
};

export default function SinglePOSRegisterPage() {
    useRequirePermissions("POS_READ");
    // const { hasPermission } = usePermissions();
    const { orgId } = useOrg();
    const { registerId } = useParams<{ registerId: string }>();

    // Core states
    const [loading, setLoading] = useState(true);
    const [register, setRegister] = useState<POSRegister | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [entities, setEntities] = useState<Entity[]>([]);

    // POS states
    const [cart, setCart] = useState<CartItem[]>([]);
    const [charges, setCharges] = useState<Charge[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [discount, setDiscount] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingRateIndex, setEditingRateIndex] = useState<number | null>(null);

    // Dialog states
    const [showCloseDialog, setShowCloseDialog] = useState(false);
    const [showOrdersDialog, setShowOrdersDialog] = useState(false);
    const [showTransactionsDialog, setShowTransactionsDialog] = useState(false);
    const [showPaymentSummaryDialog, setShowPaymentSummaryDialog] = useState(false);
    const [showAddTransactionDialog, setShowAddTransactionDialog] = useState(false);
    const [closeFormData, setCloseFormData] = useState<ClosePOSRegisterData>({
        actualClosingBalance: 0,
    });

    // Load all data
    useEffect(() => {
        if (orgId && registerId) loadAllData();
    }, [orgId, registerId]);

    // Auto-select default entity
    useEffect(() => {
        const defaultEntity = entities.find((e) => e.isDefault);
        if (defaultEntity && !selectedEntity) {
            setSelectedEntity(defaultEntity);
        }
    }, [entities]);

    const loadAllData = async () => {
        try {
            setLoading(true);
            const [registerRes, productsRes, accountsRes, entitiesRes] = await Promise.all([
                api.get(`/orgs/${orgId}/pos-registers/${registerId}`),
                api.get(`/orgs/${orgId}/products`),
                api.get(`/orgs/${orgId}/accounts`),
                api.get(`/orgs/${orgId}/entities`),
            ]);
            setRegister(registerRes.data);
            setProducts(productsRes.data || []);
            setAccounts(accountsRes.data || []);
            setEntities(entitiesRes.data || []);
        } catch (error) {
            toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // Refetch just the register (for after order/transaction creation)
    const refetchRegister = async () => {
        try {
            const registerRes = await api.get(`/orgs/${orgId}/pos-registers/${registerId}`);
            setRegister(registerRes.data);
        } catch (error) {
            console.error("Failed to refetch register", error);
        }
    };

    // Categories from products
    const categories = useMemo(() => {
        const cats = new Set<string>();
        products.forEach((p) => p.category?.name && cats.add(p.category.name));
        return Array.from(cats);
    }, [products]);

    // Filtered products
    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            const matchesSearch =
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.variants?.some((v) => v.name.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCategory = !selectedCategory || p.category?.name === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, selectedCategory]);

    // Cart calculations
    const calculations = useMemo(() => {
        const subTotal = cart.reduce((sum, item) => sum + item.rate * item.quantity, 0);
        const chargesTotal = charges.reduce((sum, charge) => sum + charge.amount, 0);
        const total = Math.max(subTotal + chargesTotal - discount, 0);
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = Math.max(total - totalPaid, 0);
        return {
            subTotal,
            chargesTotal,
            total,
            totalPaid,
            remaining,
            itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
        };
    }, [cart, discount, charges, payments]);

    // Payment summary grouped by account (with in/out breakdown)
    const paymentSummary = useMemo(() => {
        const transactions = register?.transactions || [];
        const summaryMap = new Map<
            string,
            {
                accountId: string;
                accountName: string;
                accountType: string;
                totalIn: number;
                totalOut: number;
                countIn: number;
                countOut: number;
            }
        >();

        transactions.forEach((txn) => {
            const accountId = txn.account?.id || txn.accountId || "unknown";
            const isMoneyIn = txn.type === "SELL" || txn.type === "MISC";
            const existing = summaryMap.get(accountId);

            if (existing) {
                if (isMoneyIn) {
                    existing.totalIn += txn.amount;
                    existing.countIn += 1;
                } else {
                    existing.totalOut += txn.amount;
                    existing.countOut += 1;
                }
            } else {
                summaryMap.set(accountId, {
                    accountId,
                    accountName: txn.account?.name || "Unknown",
                    accountType: txn.account?.type || "OTHER",
                    totalIn: isMoneyIn ? txn.amount : 0,
                    totalOut: isMoneyIn ? 0 : txn.amount,
                    countIn: isMoneyIn ? 1 : 0,
                    countOut: isMoneyIn ? 0 : 1,
                });
            }
        });

        return Array.from(summaryMap.values());
    }, [register?.transactions]);

    // Calculate totals
    const totalMoneyIn = paymentSummary.reduce((sum, item) => sum + item.totalIn, 0);
    const totalMoneyOut = paymentSummary.reduce((sum, item) => sum + item.totalOut, 0);
    const totalCollected = totalMoneyIn - totalMoneyOut;

    // Add to cart
    const addToCart = (product: Product, variant: ProductVariant) => {
        const existingIndex = cart.findIndex(
            (item) => item.productId === product.id && item.variantId === variant.id
        );

        if (existingIndex >= 0) {
            const updated = [...cart];
            updated[existingIndex].quantity += 1;
            setCart(updated);
        } else {
            setCart([
                ...cart,
                {
                    productId: product.id,
                    variantId: variant.id,
                    name: product.name,
                    variantName: variant.name,
                    rate: variant.price,
                    quantity: 1,
                },
            ]);
        }
    };

    // Update cart quantity
    const updateQuantity = (index: number, delta: number) => {
        const updated = [...cart];
        updated[index].quantity = Math.max(1, updated[index].quantity + delta);
        setCart(updated);
    };

    // Update cart item rate
    const updateRate = (index: number, newRate: number) => {
        const updated = [...cart];
        updated[index].rate = newRate;
        setCart(updated);
        setEditingRateIndex(null);
    };

    // Remove from cart
    const removeFromCart = (index: number) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    // Add charge
    const addCharge = () => {
        setCharges([...charges, { id: Date.now().toString(), label: "", amount: 0 }]);
    };

    // Update charge
    const updateCharge = (id: string, updates: Partial<Charge>) => {
        setCharges(charges.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    };

    // Remove charge
    const removeCharge = (id: string) => {
        setCharges(charges.filter((c) => c.id !== id));
    };

    // Clear cart
    const clearCart = () => {
        setCart([]);
        setCharges([]);
        setPayments([]);
        setDiscount(0);
        setSelectedEntity(null);
    };

    // Add payment (always add new, allow multiple for same account)
    const addPayment = (accountId: string, amount: number) => {
        setPayments([...payments, { accountId, amount, details: {} }]);
    };

    // Update payment amount by index
    const updatePayment = (index: number, amount: number) => {
        setPayments(payments.map((p, i) => (i === index ? { ...p, amount } : p)));
    };

    // Remove payment by index
    const removePayment = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    // Handle sale
    const handleSale = async () => {
        if (cart.length === 0) {
            toast({ title: "Error", description: "Cart is empty", variant: "destructive" });
            return;
        }

        // Validate payments cover the total or entity is selected for credit
        if (calculations.remaining > 0 && !selectedEntity) {
            toast({
                title: "Error",
                description: "Select an entity for unpaid orders or add full payment",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsSubmitting(true);

            const orderData = {
                entityId: selectedEntity?.id,
                products: cart.map((item) => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    rate: item.rate,
                    quantity: item.quantity,
                    description: "",
                })),
                discount,
                charges: charges
                    .filter((c) => c.label && c.amount > 0)
                    .map((c) => ({
                        label: c.label,
                        amount: c.amount,
                        bearedByEntity: true,
                    })),
                type: "SELL",
                payments,
                posRegisterId: registerId,
            };

            await api.post(`/orgs/${orgId}/orders`, orderData);

            // Refetch register to get accurate state (orders, transactions, balance)
            await refetchRegister();

            toast({ title: "Success", description: "Sale completed" });
            clearCart();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to complete sale",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Close register
    const handleCloseRegister = async () => {
        if (!register) return;
        try {
            setIsSubmitting(true);
            await api.post(`/orgs/${orgId}/pos-registers/${register.id}/close`, closeFormData);
            toast({ title: "Success", description: "Register closed" });
            setShowCloseDialog(false);
            loadAllData();
        } catch {
            toast({
                title: "Error",
                description: "Failed to close register",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => `Rs ${amount.toFixed(2)}`;

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!register) {
        return (
            <div className="h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">Register not found</p>
                <Link to={`/org/${orgId}/pos`}>
                    <Button variant="outline">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                </Link>
            </div>
        );
    }

    if (register.isClosed) {
        return (
            <div className="h-screen flex flex-col items-center justify-center gap-4">
                <Lock className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">This register is closed</p>
                <p className="text-sm text-muted-foreground">
                    Final Balance: {formatCurrency(register.actualClosingBalance)}
                </p>
                <Link to={`/org/${orgId}/pos`}>
                    <Button variant="outline">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Registers
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-60px)] flex flex-col bg-gray-50">
            {/* Top Bar */}
            <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        to={`/org/${orgId}/pos`}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="font-semibold">{register.title}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowOrdersDialog(true)}>
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Orders ({register.orders?.length || 0})
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTransactionsDialog(true)}
                    >
                        <Receipt className="h-4 w-4 mr-1" />
                        Txns ({register.transactions?.length || 0})
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPaymentSummaryDialog(true)}
                    >
                        <Wallet className="h-4 w-4 mr-1" />
                        {formatCurrency(totalCollected + register.openingBalance)}
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowAddTransactionDialog(true)}
                    >
                        <Plus className="h-4 w-4 mr-1" /> Add Txn
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                            setCloseFormData({
                                actualClosingBalance: register.expectedClosingBalance,
                            });
                            setShowCloseDialog(true);
                        }}
                    >
                        <Lock className="h-4 w-4 mr-1" /> Close
                    </Button>
                </div>
            </div>

            {/* Main Content - Cart and Products side by side */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Cart (50%) */}
                <div className="w-1/2 bg-white border-r flex flex-col">
                    {/* Cart Header */}
                    <div className="p-3 border-b flex items-center justify-between">
                        <span className="font-medium">Cart ({calculations.itemCount})</span>
                        {cart.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={clearCart}>
                                <X className="h-4 w-4 mr-1" /> Clear
                            </Button>
                        )}
                    </div>

                    {/* Cart Items */}
                    <ScrollArea className="flex-1">
                        {cart.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <p>Cart is empty</p>
                                <p className="text-sm">Click products to add</p>
                            </div>
                        ) : (
                            <div className="p-2 space-y-2">
                                {cart.map((item, index) => (
                                    <div
                                        key={`${item.productId}-${item.variantId}-${index}`}
                                        className="p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.variantName}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(index)}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => updateQuantity(index, -1)}
                                                    className="h-6 w-6 rounded bg-white border flex items-center justify-center hover:bg-gray-100"
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </button>
                                                <span className="w-6 text-center text-sm font-medium">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateQuantity(index, 1)}
                                                    className="h-6 w-6 rounded bg-white border flex items-center justify-center hover:bg-gray-100"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {editingRateIndex === index ? (
                                                    <Input
                                                        type="number"
                                                        defaultValue={item.rate}
                                                        onBlur={(e) =>
                                                            updateRate(
                                                                index,
                                                                parseFloat(e.target.value) || 0
                                                            )
                                                        }
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                updateRate(
                                                                    index,
                                                                    parseFloat(
                                                                        (
                                                                            e.target as HTMLInputElement
                                                                        ).value
                                                                    ) || 0
                                                                );
                                                            }
                                                        }}
                                                        className="w-20 h-6 text-xs text-right"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <button
                                                        onClick={() => setEditingRateIndex(index)}
                                                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                                    >
                                                        @{formatCurrency(item.rate)}
                                                        <Edit2 className="h-3 w-3" />
                                                    </button>
                                                )}
                                                <span className="font-medium text-sm">
                                                    = {formatCurrency(item.rate * item.quantity)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Right: Products (50%) */}
                <div className="w-1/2 flex flex-col overflow-hidden">
                    {/* Search & Categories */}
                    <div className="p-3 bg-white border-b space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                                    !selectedCategory
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-gray-100 hover:bg-gray-200"
                                }`}
                            >
                                All
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                                        selectedCategory === cat
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-gray-100 hover:bg-gray-200"
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Grid */}
                    <ScrollArea className="flex-1 p-3">
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {filteredProducts.map((product) =>
                                product.variants?.map((variant) => {
                                    const stock = getVariantStock(variant);
                                    const isOutOfStock = stock <= 0;
                                    return (
                                        <button
                                            key={variant.id}
                                            onClick={() =>
                                                !isOutOfStock && addToCart(product, variant)
                                            }
                                            disabled={isOutOfStock}
                                            className={`relative bg-white rounded-lg border p-3 text-left transition-all hover:shadow-md ${
                                                isOutOfStock
                                                    ? "opacity-50 cursor-not-allowed"
                                                    : "hover:border-primary"
                                            }`}
                                        >
                                            {/* Stock Badge */}
                                            <Badge
                                                variant={
                                                    isOutOfStock
                                                        ? "destructive"
                                                        : stock < 10
                                                        ? "secondary"
                                                        : "default"
                                                }
                                                className="absolute top-2 right-2 text-xs"
                                            >
                                                {stock}
                                            </Badge>

                                            {/* Image placeholder */}
                                            <div className="aspect-square rounded-md bg-gray-100 mb-2 flex items-center justify-center overflow-hidden">
                                                {variant.imageUrls &&
                                                variant.imageUrls.length > 0 ? (
                                                    <img
                                                        src={variant.imageUrls[0]}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <ImageIcon className="h-8 w-8 text-gray-300" />
                                                )}
                                            </div>

                                            {/* Info */}
                                            <p className="font-medium text-sm truncate">
                                                {product.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {variant.name}
                                            </p>
                                            <p className="font-semibold text-sm mt-1">
                                                {formatCurrency(variant.price)}
                                            </p>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                        {filteredProducts.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                No products found
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </div>

            {/* Bottom Bar - Charges, Discount, Payments, Total */}
            <div className="bg-white border-t px-4 py-3">
                <div className="flex items-start gap-6">
                    {/* Entity Selector */}
                    <div className="w-48">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Customer
                            </span>
                            {selectedEntity && !selectedEntity.isDefault && (
                                <button
                                    onClick={() => {
                                        const defaultEntity = entities.find((e) => e.isDefault);
                                        setSelectedEntity(defaultEntity || null);
                                    }}
                                    className="text-xs text-muted-foreground hover:text-destructive"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                        <select
                            className="w-full h-8 px-2 rounded border text-sm"
                            value={selectedEntity?.id || ""}
                            onChange={(e) => {
                                const entity = entities.find((ent) => ent.id === e.target.value);
                                setSelectedEntity(entity || null);
                            }}
                        >
                            <option value="">Select customer</option>
                            {entities
                                .filter((e) => e.isMerchant || e.isDefault)
                                .map((entity) => (
                                    <option key={entity.id} value={entity.id}>
                                        {entity.name} {entity.isDefault && "(Default)"}
                                    </option>
                                ))}
                        </select>
                    </div>

                    {/* Charges & Discount */}
                    <div className="flex-1 flex gap-4">
                        {/* Charges */}
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Tag className="h-3 w-3" />
                                    Charges
                                </span>
                                <button
                                    onClick={addCharge}
                                    className="text-xs text-primary hover:underline"
                                >
                                    + Add
                                </button>
                            </div>
                            {charges.length > 0 ? (
                                <div className="space-y-1">
                                    {charges.map((charge) => (
                                        <div key={charge.id} className="flex items-center gap-1">
                                            <Input
                                                placeholder="Label"
                                                value={charge.label}
                                                onChange={(e) =>
                                                    updateCharge(charge.id, {
                                                        label: e.target.value,
                                                    })
                                                }
                                                className="flex-1 h-7 text-xs"
                                            />
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                value={charge.amount || ""}
                                                onChange={(e) =>
                                                    updateCharge(charge.id, {
                                                        amount: parseFloat(e.target.value) || 0,
                                                    })
                                                }
                                                className="w-20 h-7 text-xs text-right"
                                            />
                                            <button
                                                onClick={() => removeCharge(charge.id)}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">No charges</p>
                            )}
                        </div>

                        {/* Discount */}
                        <div className="w-32">
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                <Percent className="h-3 w-3" />
                                Discount
                            </span>
                            <Input
                                type="number"
                                value={discount || ""}
                                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                className="h-8 text-sm"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Payments */}
                    <div className="w-64">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Wallet className="h-3 w-3" />
                                Payments
                            </span>
                            <span className="text-xs">
                                {calculations.remaining > 0 && (
                                    <span className="text-orange-600">
                                        Due: {formatCurrency(calculations.remaining)}
                                    </span>
                                )}
                            </span>
                        </div>
                        {/* Payment List */}
                        {payments.length > 0 && (
                            <div className="space-y-1 mb-1 max-h-20 overflow-y-auto">
                                {payments.map((payment, index) => {
                                    const account = accounts.find(
                                        (a) => a.id === payment.accountId
                                    );
                                    return (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-1 bg-green-50 rounded text-xs gap-1"
                                        >
                                            <span className="truncate flex-1">{account?.name}</span>
                                            <Input
                                                type="number"
                                                value={payment.amount || ""}
                                                onChange={(e) =>
                                                    updatePayment(
                                                        index,
                                                        parseFloat(e.target.value) || 0
                                                    )
                                                }
                                                className="w-20 h-6 text-xs text-right"
                                            />
                                            <button
                                                onClick={() => removePayment(index)}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {/* Add Payment */}
                        <div className="flex gap-1">
                            <select
                                id="payment-account"
                                className="flex-1 h-7 px-2 rounded border text-xs"
                                defaultValue=""
                                onChange={(e) => {
                                    if (e.target.value && calculations.remaining > 0) {
                                        addPayment(e.target.value, calculations.remaining);
                                        e.target.value = "";
                                    }
                                }}
                            >
                                <option value="">Add payment...</option>
                                {accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Totals & Complete Button */}
                    <div className="w-48 text-right">
                        <div className="text-sm space-y-0.5 mb-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal:</span>
                                <span>{formatCurrency(calculations.subTotal)}</span>
                            </div>
                            {calculations.chargesTotal > 0 && (
                                <div className="flex justify-between text-orange-600">
                                    <span>Charges:</span>
                                    <span>+{formatCurrency(calculations.chargesTotal)}</span>
                                </div>
                            )}
                            {discount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Discount:</span>
                                    <span>-{formatCurrency(discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-semibold text-base border-t pt-1">
                                <span>Total:</span>
                                <span>{formatCurrency(calculations.total)}</span>
                            </div>
                            {calculations.totalPaid > 0 && (
                                <div className="flex justify-between text-green-600 text-xs">
                                    <span>Paid:</span>
                                    <span>{formatCurrency(calculations.totalPaid)}</span>
                                </div>
                            )}
                        </div>
                        <Button
                            onClick={handleSale}
                            disabled={cart.length === 0 || isSubmitting}
                            className="w-full bg-green-600 hover:bg-green-700"
                        >
                            {isSubmitting ? "Processing..." : "Complete Sale"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Close Register Dialog */}
            <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Close Register</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Opening</span>
                                <span>{formatCurrency(register.openingBalance)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                                <span className="text-muted-foreground">Expected</span>
                                <span className="text-green-600">
                                    {formatCurrency(register.expectedClosingBalance)}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Actual Balance</Label>
                            <Input
                                type="number"
                                value={closeFormData.actualClosingBalance || ""}
                                onChange={(e) =>
                                    setCloseFormData({
                                        actualClosingBalance: parseFloat(e.target.value) || 0,
                                    })
                                }
                            />
                        </div>
                        {closeFormData.actualClosingBalance !== register.expectedClosingBalance && (
                            <div
                                className={`text-sm p-2 rounded ${
                                    closeFormData.actualClosingBalance <
                                    register.expectedClosingBalance
                                        ? "bg-red-50 text-red-600"
                                        : "bg-green-50 text-green-600"
                                }`}
                            >
                                Diff:{" "}
                                {formatCurrency(
                                    Math.abs(
                                        closeFormData.actualClosingBalance -
                                            register.expectedClosingBalance
                                    )
                                )}
                                {closeFormData.actualClosingBalance <
                                register.expectedClosingBalance
                                    ? " short"
                                    : " over"}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCloseRegister} disabled={isSubmitting}>
                            {isSubmitting ? "Closing..." : "Close Register"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Orders Dialog */}
            <POSOrdersDialog
                open={showOrdersDialog}
                onOpenChange={setShowOrdersDialog}
                orders={register.orders || []}
            />

            {/* Transactions Dialog */}
            <POSTransactionsDialog
                open={showTransactionsDialog}
                onOpenChange={setShowTransactionsDialog}
                transactions={register.transactions || []}
            />

            {/* Payment Summary Dialog */}
            <POSPaymentSummaryDialog
                open={showPaymentSummaryDialog}
                onOpenChange={setShowPaymentSummaryDialog}
                paymentSummary={paymentSummary}
                openingBalance={register.openingBalance}
                totalMoneyIn={totalMoneyIn}
                totalMoneyOut={totalMoneyOut}
                expectedBalance={register.openingBalance + totalMoneyIn - totalMoneyOut}
                orderCount={register.orders?.length || 0}
                transactionCount={register.transactions?.length || 0}
                registerOpenedAt={register.createdAt}
            />

            {/* Add Transaction Dialog */}
            <AddPOSTransactionDialog
                open={showAddTransactionDialog}
                onOpenChange={setShowAddTransactionDialog}
                orgId={orgId || ""}
                posRegisterId={registerId || ""}
                accounts={accounts}
                onTransactionAdded={() => {
                    // Refetch register to get accurate state
                    refetchRegister();
                }}
            />
        </div>
    );
}
