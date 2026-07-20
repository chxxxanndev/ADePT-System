import { createContext, useContext, useState, useMemo } from 'react';
import type { ReactNode } from 'react';

export interface CartItem {
    id: string;
    documentType: string;
    fee: number;
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: CartItem) => void;
    removeItem: (id: string) => void;
    clearCart: () => void;
    totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);

    const addItem = (item: CartItem) => setItems((prev) => [...prev, item]);
    const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
    const clearCart = () => setItems([]);

    const totalAmount = useMemo(() =>
        items.reduce((sum, item) => sum + item.fee, 0),
        [items]);

    const value = useMemo(() => ({
        items, addItem, removeItem, clearCart, totalAmount
    }), [items, totalAmount]);

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}