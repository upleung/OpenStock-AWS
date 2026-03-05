import React, { Suspense } from 'react';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserWatchlist } from '@/lib/actions/watchlist.actions';
import { getUserAlerts } from '@/lib/actions/alert.actions';
import { getNews } from '@/lib/actions/finnhub.actions';
import TradingViewWatchlist from '@/components/watchlist/TradingViewWatchlist';
import AlertsPanel from '@/components/watchlist/AlertsPanel';
import NewsGrid from '@/components/watchlist/NewsGrid';
import SearchCommand from '@/components/SearchCommand';
import { Loader2 } from 'lucide-react';

import WatchlistTable from '@/components/watchlist/WatchlistTable';

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        redirect('/sign-in');
    }

    const userId = session.user.id;

    // 修复点1：并行获取数据，统一只请求大盘新闻，彻底规避类型冲突
    const [watchlistItems, alerts, news] = await Promise.all([
        getUserWatchlist(userId),
        getUserAlerts(userId),
        getNews() 
    ]);

    // 修复点2：明确声明 item 的类型，干掉导致打包失败的 any
    const watchlistSymbols = watchlistItems.map((item: { symbol: string }) => item.symbol);

    return (
        <div className="min-h-screen bg-black text-gray-100 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                        Watchlist
                    </h1>
                    <p className="text-gray-500 mt-1">Track your favorite stocks and manage alerts.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <SearchCommand renderAs="button" label="Add Stock" initialStocks={[]} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-8">
                    <div className="space-y-6">
                        
                        <WatchlistTable initialStocks={watchlistItems} />

                        {watchlistSymbols.length > 0 && (
                            <div className="min-h-[550px] mt-8 border border-gray-800 rounded-xl overflow-hidden bg-gray-900/30">
                                <TradingViewWatchlist symbols={watchlistSymbols} />
                            </div>
                        )}
                    </div>

                    <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-500" /></div>}>
                        <NewsGrid news={news || []} />
                    </Suspense>
                </div>

                <div className="lg:col-span-1">
                    <AlertsPanel alerts={alerts} />
                </div>
            </div>
        </div>
    );
}
