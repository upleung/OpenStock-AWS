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

// 引入我们的超级分组看板组件
import WatchlistTable from '@/components/watchlist/WatchlistTable';

// 核心优化：强制动态渲染，防止构建时读取空数据库导致页面卡死
export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        redirect('/sign-in');
    }

    const userId = session.user.id;

    // 并行获取数据 (只请求大盘新闻，去除错误传参，保证 TypeScript 编译 100% 成功)
    const [watchlistItems, alerts, news] = await Promise.all([
        getUserWatchlist(userId),
        getUserAlerts(userId),
        getNews() 
    ]);

    // 修复了 any 带来的严格模式打包报错
    const watchlistSymbols = watchlistItems.map((item: { symbol: string }) => item.symbol);

    return (
        <div className="min-h-screen bg-black text-gray-100 p-6 md:p-8">
            {/* 顶部标题栏 */}
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
                {/* 左侧主内容区 */}
                <div className="lg:col-span-3 space-y-8">
                    <div className="space-y-6">
                        
                        {/* 超级分组表格 */}
                        <WatchlistTable initialStocks={watchlistItems} />

                        {/* TradingView Widget K线图 */}
                        {watchlistSymbols.length > 0 && (
                            <div className="min-h-[550px] mt-8 border border-gray-800 rounded-xl overflow-hidden bg-gray-900/30">
                                <TradingViewWatchlist symbols={watchlistSymbols} />
                            </div>
                        )}
                    </div>

                    {/* 新闻区 (统一传入基础 news，规避数组类型冲突) */}
                    <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-500" /></div>}>
                        <NewsGrid news={news || []} />
                    </Suspense>
                </div>

                {/* 右侧边栏 - 提醒功能 */}
                <div className="lg:col-span-1">
                    <AlertsPanel alerts={alerts} />
                </div>
            </div>
        </div>
    );
}
