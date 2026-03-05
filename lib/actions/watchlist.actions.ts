'use server';

import { connectToDatabase } from '@/database/mongoose';
import Watchlist from '@/database/models/watchlist.model';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';

// 内部函数：安全获取当前用户ID
async function getUserId() {
    try {
        const session = await auth({ headers: await headers() });
        return session?.user?.id;
    } catch (error) {
        return null;
    }
}

// 1. 添加自选（支持分类）
export async function addStockToWatchlist(symbol: string, path: string, category: string = "默认列表") {
    try {
        await connectToDatabase();
        const userId = await getUserId();
        if (!userId) return { success: false, message: "Unauthorized" };

        const existing = await Watchlist.findOne({ userId, symbol: symbol.toUpperCase() });
        if (existing) {
            return { success: false, message: "Stock already in watchlist" };
        }

        await Watchlist.create({
            userId,
            symbol: symbol.toUpperCase(),
            category: category,
            order: Date.now(),
        });

        revalidatePath(path);
        revalidatePath('/watchlist');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Failed to add stock" };
    }
}

// 2. 移除自选
export async function removeStock(symbol: string, path: string) {
    try {
        await connectToDatabase();
        const userId = await getUserId();
        if (!userId) return { success: false, message: "Unauthorized" };

        await Watchlist.findOneAndDelete({ userId, symbol: symbol.toUpperCase() });
        revalidatePath(path);
        revalidatePath('/watchlist');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Failed to remove stock" };
    }
}

// 3. 更新分类（移动分组）
export async function updateStockCategory(symbol: string, newCategory: string, path: string) {
    try {
        await connectToDatabase();
        const userId = await getUserId();
        if (!userId) return { success: false };

        await Watchlist.findOneAndUpdate(
            { userId, symbol: symbol.toUpperCase() },
            { category: newCategory }
        );

        revalidatePath(path);
        revalidatePath('/watchlist');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false };
    }
}

// === 以下保留你原来的旧函数，防止其他组件报错 ===
export async function addToWatchlist(userId: string, symbol: string, company: string) {
    try {
        await connectToDatabase();
        const newItem = await Watchlist.findOneAndUpdate(
            { userId, symbol: symbol.toUpperCase() },
            { userId, symbol: symbol.toUpperCase(), company, addedAt: new Date() },
            { upsert: true, new: true }
        );
        revalidatePath('/watchlist');
        return JSON.parse(JSON.stringify(newItem));
    } catch (error) {
        throw new Error('Failed to add to watchlist');
    }
}

export async function removeFromWatchlist(userId: string, symbol: string) {
    try {
        await connectToDatabase();
        await Watchlist.findOneAndDelete({ userId, symbol: symbol.toUpperCase() });
        revalidatePath('/watchlist');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        throw new Error('Failed to remove from watchlist');
    }
}

export async function getUserWatchlist(userId: string) {
    try {
        await connectToDatabase();
        const watchlist = await Watchlist.find({ userId }).sort({ addedAt: -1 });
        return JSON.parse(JSON.stringify(watchlist));
    } catch (error) {
        return [];
    }
}

export async function isStockInWatchlist(userId: string, symbol: string) {
    try {
        await connectToDatabase();
        const item = await Watchlist.findOne({ userId, symbol: symbol.toUpperCase() });
        return !!item;
    } catch (error) {
        return false;
    }
}

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
    if (!email) return [];
    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) throw new Error('MongoDB connection not found');
        const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>({ email });
        if (!user) return [];
        const userId = (user.id as string) || String(user._id || '');
        if (!userId) return [];
        const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
        return items.map((i) => String(i.symbol));
    } catch (err) {
        return [];
    }
}
