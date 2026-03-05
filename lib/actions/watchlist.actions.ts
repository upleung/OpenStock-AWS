'use server';

import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { revalidatePath } from 'next/cache';


// --- 找到类似这段定义的地方，增加 category 参数，默认值为 '默认列表' ---
export async function addStockToWatchlist(symbol: string, path: string, category: string = "默认列表") {
  try {
    await connectToDatabase();
    const session = await auth(); // 或者获取 user 的逻辑
    if (!session) throw new Error("Unauthorized");

    // 检查是否已经存在
    const existing = await Watchlist.findOne({ userId: session.user.id, symbol });
    if (existing) {
      return { success: false, message: "Stock already in watchlist" };
    }

    // 👇 --- 在创建时存入 category --- 👇
    await Watchlist.create({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
      category: category, // 保存分组
      order: Date.now(), // 用时间戳做初始排序权重
    });

    revalidatePath(path);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to add stock" };
  }
}

// -- CRUD Operations --

export async function addToWatchlist(userId: string, symbol: string, company: string) {
    try {
        await connectToDatabase();

        // Upsert to avoid duplicates/errors if it already exists
        const newItem = await Watchlist.findOneAndUpdate(
            { userId, symbol: symbol.toUpperCase() },
            {
                userId,
                symbol: symbol.toUpperCase(),
                company,
                addedAt: new Date()
            },
            { upsert: true, new: true }
        );

        revalidatePath('/watchlist');
        return JSON.parse(JSON.stringify(newItem));
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        throw new Error('Failed to add to watchlist');
    }
}

export async function removeFromWatchlist(userId: string, symbol: string) {
    try {
        await connectToDatabase();
        await Watchlist.findOneAndDelete({ userId, symbol: symbol.toUpperCase() });
        revalidatePath('/watchlist');
        revalidatePath('/'); // In case it's used elsewhere
        return { success: true };
    } catch (error) {
        console.error('Error removing from watchlist:', error);
        throw new Error('Failed to remove from watchlist');
    }
}

export async function getUserWatchlist(userId: string) {
    try {
        await connectToDatabase();
        const watchlist = await Watchlist.find({ userId }).sort({ addedAt: -1 });
        return JSON.parse(JSON.stringify(watchlist));
    } catch (error) {
        console.error('Error fetching watchlist:', error);
        return [];
    }
}

// Check if a symbol is in the user's watchlist
export async function isStockInWatchlist(userId: string, symbol: string) {
    try {
        await connectToDatabase();
        const item = await Watchlist.findOne({ userId, symbol: symbol.toUpperCase() });
        return !!item;
    } catch (error) {
        console.error('Error checking watchlist status:', error);
        return false;
    }
}

// -- Legacy Support (if needed by other components) --

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
    if (!email) return [];

    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) throw new Error('MongoDB connection not found');

        // Better Auth stores users in the "user" collection
        const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

        if (!user) return [];

        const userId = (user.id as string) || String(user._id || '');
        if (!userId) return [];

        const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
        return items.map((i) => String(i.symbol));
    } catch (err) {
        console.error('getWatchlistSymbolsByEmail error:', err);
        return [];
    }
}

// 👇 --- 复制粘贴这个全新的函数到文件最下面 --- 👇
export async function updateStockCategory(symbol: string, newCategory: string, path: string) {
  try {
    await connectToDatabase();
    const session = await auth();
    if (!session) return { success: false };

    await Watchlist.findOneAndUpdate(
      { userId: session.user.id, symbol: symbol },
      { category: newCategory }
    );

    revalidatePath(path);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}
